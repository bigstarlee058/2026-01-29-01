import React, {
  useState,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './EffectVisualizer.module.scss';
import { updateAnimationWithAutoSync } from '../PlayerComponent/entity/AnimationResource';

const EffectVisualizer = observer(({ rowIndex, onOpenEffectPanel }) => {
  const store = useContext(StoreContext);
  const [draggingEffect, setDraggingEffect] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingEffect, setResizingEffect] = useState(null);
  const [resizeType, setResizeType] = useState(null); // 'left' or 'right'
  const [hoveredGap, setHoveredGap] = useState(null);
  const [resizeStartData, setResizeStartData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const effectRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const lastPosition = useRef({ x: 0, y: 0 });
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Get image elements for current row
  const getImageElementsForRow = useCallback(
    row => {
      return store.editorElements
        .filter(
          el =>
            el.row === row && (el.type === 'image' || el.type === 'imageUrl')
        )
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);
    },
    [store.editorElements]
  );

  // Get effect gaps for adding new effects
  const getEffectGaps = useCallback(() => {
    const imageElements = getImageElementsForRow(rowIndex);
    const gaps = [];

    imageElements.forEach(element => {
      // Check if element already has any animation effect
      const hasEffect = store.animations.some(
        anim =>
          anim.targetId === element.id &&
          (anim.type.endsWith('Effect') ||
            anim.type.endsWith('In') ||
            anim.type.endsWith('Out'))
      );

      if (!hasEffect) {
        // Calculate gap position - center of element
        const gapCenter = (element.timeFrame.start + element.timeFrame.end) / 2;

        gaps.push({
          id: `gap-${element.id}`,
          element,
          gapCenter,
          position: (gapCenter / store.maxTime) * 100,
        });
      }
    });

    return gaps;
  }, [getImageElementsForRow, rowIndex, store.animations, store.maxTime]);

  // Get effects for current row
  const getEffectsForRow = useCallback(
    row => {
      const rowElements = store.editorElements
        .filter(el => el.row === row)
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

      const effects = store.animations
        .filter(
          anim =>
            anim.type.endsWith('Effect') ||
            anim.type.endsWith('In') ||
            anim.type.endsWith('Out')
        )
        .map(effect => {
          const targetElement = rowElements.find(
            el => el.id === effect.targetId
          );

          if (!targetElement) return null;

          const properties = effect.properties || {};
          let startTime = properties.startTime || 0;
          let endTime = properties.endTime || effect.duration || 1000;

          // For Out animations, position them at the end of the element if startTime is 0
          if (effect.type.endsWith('Out') && startTime === 0) {
            const elementDuration = targetElement.timeFrame.end - targetElement.timeFrame.start;
            const animationDuration = endTime - startTime;
            startTime = Math.max(0, elementDuration - animationDuration);
            endTime = startTime + animationDuration; // Keep it relative, not absolute
          }

          // Calculate absolute timing and constrain within element bounds
          const absoluteStart = targetElement.timeFrame.start + startTime;
          const absoluteEnd = Math.min(
            targetElement.timeFrame.start + endTime,
            targetElement.timeFrame.end
          );

          // Determine effect direction for visual representation
          let effectDirection = 'in';
          if (effect.type === 'zoomEffect') {
            // Compare initial vs target scale to determine direction
            const initialScale = properties.scaleFactor || properties.initialScale || 1.0;
            const targetScale = properties.targetScale || properties.endScale || 2.0;
            effectDirection = initialScale < targetScale ? 'in' : 'out';
          } else if (effect.type === 'fadeEffect') {
            // Compare initial vs target opacity to determine direction
            const initialOpacity = properties.opacity || properties.initialOpacity || 1.0;
            const targetOpacity = properties.targetOpacity || properties.endOpacity || 0.0;
            effectDirection = initialOpacity < targetOpacity ? 'in' : 'out';
          }

          return {
            ...effect,
            targetElement,
            absoluteStart,
            absoluteEnd,
            effectDirection,
            displayName: (() => {
              // Get base animation type for display name
              const baseType = effect.type.replace(/In$|Out$|Effect$/, '');
              const capitalizedType =
                baseType.charAt(0).toUpperCase() + baseType.slice(1);

              if (effect.type.endsWith('Effect')) {
                // For unified effects like zoomEffect, fadeEffect, use the determined direction
                return `${capitalizedType} ${
                  effectDirection === 'in'
                    ? 'In'
                    : effectDirection === 'out'
                    ? 'Out'
                    : 'Effect'
                }`;
              } else if (effect.type.endsWith('In')) {
                return `${capitalizedType} In`;
              } else if (effect.type.endsWith('Out')) {
                return `${capitalizedType} Out`;
              } else {
                // Fallback
                return `${capitalizedType} Effect`;
              }
            })(),
          };
        })
        .filter(Boolean);

      return effects;
    },
    [store.editorElements, store.animations]
  );

  const effects = getEffectsForRow(rowIndex);
  const effectGaps = getEffectGaps();

  // Stabilize effects during playback to prevent visual glitches
  const [stableEffects, setStableEffects] = useState([]);
  const [lastPlayingState, setLastPlayingState] = useState(store.playing);

  // Use stable effects during playback, live effects when paused
  const displayEffects = effects;

  // Handle opening effect panel for selection
  const handleOpenEffectSelection = gap => {
    if (onOpenEffectPanel) {
      onOpenEffectPanel({
        type: 'create',
        element: gap.element,
        gap: gap,
      });
    }
  };

  const handleEffectClick = (e, effect) => {
    // Don't open panel if user actually dragged or if currently dragging
    if (isDragging || hasDraggedRef.current) {
      return;
    }

    // Check if click was on resize handle or delete button
    if (
      e.target.closest('[class*="resizeHandle"]') ||
      e.target.closest('[class*="deleteButton"]')
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    // Just open animation sidebar with "all" tab - no DetailPanel
    window.dispatchEvent(
      new CustomEvent('openAnimationSidebar', {
        detail: { 
          type: 'transition',
          activeTab: 'all'
        },
      })
    );

    // Set selected element
    if (effect.targetElement && store.setSelectedElement) {
      store.setSelectedElement(effect.targetElement);
    }
  };

  const handleEffectDragStart = (e, effect) => {
    e.preventDefault();
    setDraggingEffect(effect);
    setIsDragging(true);
    hasDraggedRef.current = false;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    // Store start position for drag detection
    dragStartPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeStart = (e, effect, type) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingEffect(effect);
    setResizeType(type);
    hasDraggedRef.current = true; // Mark as dragged to prevent click

    const properties = effect.properties || {};
    setResizeStartData({
      startTime: properties.startTime || 0,
      endTime: properties.endTime || effect.duration || 1000,
      duration:
        (properties.endTime || effect.duration || 1000) -
        (properties.startTime || 0),
      mouseX: e.clientX,
    });
  };

  const handleEffectDrag = useCallback(
    e => {
      if (!draggingEffect || !effectRef.current) return;

      // Check if user has moved more than 5 pixels (threshold for drag)
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragStartPosition.current.x, 2) +
          Math.pow(e.clientY - dragStartPosition.current.y, 2)
      );

      if (dragDistance > 5) {
        hasDraggedRef.current = true;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const currentTime = Date.now();

        if (currentTime - lastUpdateTime.current < 16) {
          return;
        }

        const deltaX = Math.abs(e.clientX - lastPosition.current.x);
        const deltaY = Math.abs(e.clientY - lastPosition.current.y);
        if (deltaX < 2 && deltaY < 2) {
          return;
        }

        lastUpdateTime.current = currentTime;
        lastPosition.current = { x: e.clientX, y: e.clientY };

        const timelineRect = effectRef.current
          .closest('[data-timeline-row]')
          .getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left - dragOffset.x;
        const timelineWidth = timelineRect.width;

        const newTimePosition = (relativeX / timelineWidth) * store.maxTime;
        const targetElement = draggingEffect.targetElement;

        if (!targetElement) return;

        const properties = draggingEffect.properties || {};
        const originalDuration =
          (properties.endTime || draggingEffect.duration || 1000) -
          (properties.startTime || 0);

        // Calculate new relative start time within the element
        const elementStart = targetElement.timeFrame.start;
        const elementEnd = targetElement.timeFrame.end;
        const elementDuration = elementEnd - elementStart;

        let newRelativeStart = newTimePosition - elementStart;

        // Constrain within element bounds
        newRelativeStart = Math.max(
          0,
          Math.min(newRelativeStart, elementDuration - originalDuration)
        );

        const newRelativeEnd = newRelativeStart + originalDuration;

        // Update the effect with auto-sync
        const selectedElement = store.editorElements.find(el => el.id === draggingEffect.targetId);
        const animationUpdate = {
          duration: originalDuration,
          properties: {
            ...draggingEffect.properties,
            startTime: newRelativeStart,
            endTime: newRelativeEnd,
          },
        };

        updateAnimationWithAutoSync(draggingEffect, animationUpdate, store, selectedElement);
      });
    },
    [draggingEffect, dragOffset, store.maxTime, store.animations]
  );

  const handleResizeDrag = useCallback(
    e => {
      if (!resizingEffect || !resizeStartData || !effectRef.current) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const currentTime = Date.now();

        if (currentTime - lastUpdateTime.current < 16) {
          return;
        }

        const deltaX = Math.abs(e.clientX - lastPosition.current.x);
        const deltaY = Math.abs(e.clientY - lastPosition.current.y);
        if (deltaX < 2 && deltaY < 2) {
          return;
        }

        lastUpdateTime.current = currentTime;
        lastPosition.current = { x: e.clientX, y: e.clientY };

        const timelineRect = effectRef.current
          .closest('[data-timeline-row]')
          .getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left;
        const timelineWidth = timelineRect.width;
        const newTimePosition = (relativeX / timelineWidth) * store.maxTime;

        const effectIndex = store.animations.findIndex(
          a => a.id === resizingEffect.id
        );
        if (effectIndex === -1) return;

        const effect = store.animations[effectIndex];
        const targetElement = resizingEffect.targetElement;

        if (!targetElement) return;

        const minDuration = 100; // Minimum 100ms
        const maxDuration =
          targetElement.timeFrame.end - targetElement.timeFrame.start; // Max = element duration

        const elementStart = targetElement.timeFrame.start;
        const newRelativeTime = newTimePosition - elementStart;

        let animationUpdate = null;

        if (resizeType === 'left') {
          let newStartTime = Math.max(
            0,
            Math.min(newRelativeTime, resizeStartData.endTime - minDuration)
          );
          const newDuration = resizeStartData.endTime - newStartTime;

          if (newDuration >= minDuration && newDuration <= maxDuration) {
            animationUpdate = {
              duration: newDuration,
              properties: {
                ...effect.properties,
                startTime: newStartTime,
                endTime: resizeStartData.endTime,
              },
            };
          }
        } else if (resizeType === 'right') {
          let newEndTime = Math.min(
            maxDuration,
            Math.max(newRelativeTime, resizeStartData.startTime + minDuration)
          );
          const newDuration = newEndTime - resizeStartData.startTime;

          if (newDuration >= minDuration && newDuration <= maxDuration) {
            animationUpdate = {
              duration: newDuration,
              properties: {
                ...effect.properties,
                startTime: resizeStartData.startTime,
                endTime: newEndTime,
              },
            };
          }
        }

        // Apply update with auto-sync
        if (animationUpdate) {
          const selectedElement = store.editorElements.find(el => el.id === resizingEffect.targetId);
          updateAnimationWithAutoSync(resizingEffect, animationUpdate, store, selectedElement);
        }
      });
    },
    [
      resizingEffect,
      resizeStartData,
      resizeType,
      store.maxTime,
      store.animations,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (draggingEffect || resizingEffect) {
      store.refreshAnimations();

      window.dispatchEvent(
        new CustomEvent('effectUpdated', {
          detail: {
            effectId: draggingEffect?.id || resizingEffect?.id,
            action: draggingEffect ? 'drag' : 'resize',
          },
        })
      );
    }

    setDraggingEffect(null);
    setResizingEffect(null);
    setResizeType(null);
    setResizeStartData(null);
    setDragOffset({ x: 0, y: 0 });
    lastPosition.current = { x: 0, y: 0 };
    dragStartPosition.current = { x: 0, y: 0 };

    // Set isDragging to false immediately instead of using setTimeout
    setIsDragging(false);

    // Reset drag flag after a short delay to allow click to work
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 10);
  }, [draggingEffect, resizingEffect, store]);

  const handleEffectDelete = effect => {
    const effectIndex = store.animations.findIndex(a => a.id === effect.id);
    if (effectIndex !== -1) {
      store.animations.splice(effectIndex, 1);
      store.refreshAnimations();
    }
  };

  useEffect(() => {
    const handleMouseMove = e => {
      if (draggingEffect) {
        handleEffectDrag(e);
      } else if (resizingEffect) {
        handleResizeDrag(e);
      }
    };

    if (draggingEffect || resizingEffect) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [
    draggingEffect,
    resizingEffect,
    handleEffectDrag,
    handleResizeDrag,
    handleMouseUp,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (displayEffects.length === 0 && effectGaps.length === 0) return null;

  return (
    <div className={styles.effectLayer} ref={effectRef} data-timeline-row>
      {/* Render existing effects */}
      {displayEffects.map(effect => {
        // Use simple positioning like TransitionVisualizer - just use absoluteStart/absoluteEnd directly
        const leftPercent = (effect.absoluteStart / store.maxTime) * 100;
        const widthPercent = ((effect.absoluteEnd - effect.absoluteStart) / store.maxTime) * 100;

        return (
          <div
            key={effect.id}
            className={`${styles.effectVisualizer} ${
              draggingEffect?.id === effect.id ? styles.dragging : ''
            } ${resizingEffect?.id === effect.id ? styles.resizing : ''} ${
              store.playing ? styles.playing : ''
            } ${
              effect.type === 'zoomEffect' ||
              effect.type === 'fadeEffect' ||
              effect.type === 'glTransition'
                ? styles.draggable
                : styles.resizeOnly
            }`}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
            }}
            data-effect-type={effect.type}
            data-effect-direction={effect.effectDirection}
            onMouseDown={
              store.playing
                ? undefined
                : e => {
                    // Don't start drag if clicking on resize handle or delete button
                    if (
                      e.target.closest('[class*="resizeHandle"]') ||
                      e.target.closest('[class*="deleteButton"]')
                    ) {
                      return;
                    }

                    // Only allow dragging for zoomEffect, fadeEffect, and GL transitions
                    const isDraggable =
                      effect.type === 'zoomEffect' ||
                      effect.type === 'fadeEffect' ||
                      effect.type === 'glTransition';

                    if (isDraggable) {
                      handleEffectDragStart(e, effect);
                    }
                  }
            }
            onClick={
              store.playing ? undefined : e => handleEffectClick(e, effect)
            }
            title={`${effect.displayName} - Click to edit`}
          >
            {/* Effect Icon */}
            <div className={styles.effectIcon}>
              {(() => {
                // Get base animation type for icon selection
                const baseType = effect.type
                  .replace(/In$|Out$|Effect$/, '')
                  .toLowerCase();
                const isIn =
                  effect.type.endsWith('In') || effect.effectDirection === 'in';
                const isOut =
                  effect.type.endsWith('Out') ||
                  effect.effectDirection === 'out';

                switch (baseType) {
                  case 'zoom':
                    return (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path
                          d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                          fill="currentColor"
                        />
                        {isIn ? (
                          <path d="M12 8l-2 2h4l-2-2z" fill="currentColor" />
                        ) : isOut ? (
                          <path d="M12 16l2-2h-4l2 2z" fill="currentColor" />
                        ) : null}
                      </svg>
                    );
                  case 'fade':
                    return (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                          fill="currentColor"
                          opacity={isOut ? '0.5' : '1'}
                        />
                        {isIn && (
                          <path
                            d="M12 6v12"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        )}
                        {isOut && (
                          <path
                            d="M12 18V6"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.5"
                          />
                        )}
                      </svg>
                    );
                  case 'slide':
                    return (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path
                          d="M3 12h18"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        {isIn ? (
                          <path
                            d="M15 8l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        ) : isOut ? (
                          <path
                            d="M9 16l-4-4 4-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        ) : (
                          <>
                            <path
                              d="M15 8l4 4-4 4"
                              stroke="currentColor"
                              strokeWidth="1"
                              fill="none"
                            />
                            <path
                              d="M9 16l-4-4 4-4"
                              stroke="currentColor"
                              strokeWidth="1"
                              fill="none"
                            />
                          </>
                        )}
                      </svg>
                    );
                  case 'drop':
                    return (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path
                          d="M12 3v18"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        {isIn ? (
                          <path
                            d="M8 15l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        ) : isOut ? (
                          <path
                            d="M16 9l-4-4-4 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        ) : (
                          <>
                            <path
                              d="M8 15l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1"
                              fill="none"
                            />
                            <path
                              d="M16 9l-4-4-4 4"
                              stroke="currentColor"
                              strokeWidth="1"
                              fill="none"
                            />
                          </>
                        )}
                      </svg>
                    );
                  default:
                    // Generic animation icon
                    return (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                          fill="currentColor"
                        />
                        <path d="M8 12l4-4 4 4-4 4-4-4z" fill="white" />
                      </svg>
                    );
                }
              })()}
            </div>

            {/* Effect Label */}
            <div className={styles.effectLabel}>{effect.displayName}</div>

            {/* Effect Duration */}
            <div className={styles.effectDuration}>
              {((effect.absoluteEnd - effect.absoluteStart) / 1000).toFixed(1)}s
            </div>

            {/* Resize handles (disabled during playback) */}
            {!store.playing && (
              <>
                <div
                  className={`${styles.resizeHandle} ${styles.resizeLeft}`}
                  onMouseDown={e => {
                    e.stopPropagation();
                    handleResizeStart(e, effect, 'left');
                  }}
                  title="Resize effect start"
                />
                <div
                  className={`${styles.resizeHandle} ${styles.resizeRight}`}
                  onMouseDown={e => {
                    e.stopPropagation();
                    handleResizeStart(e, effect, 'right');
                  }}
                  title="Resize effect end"
                />
              </>
            )}
          </div>
        );
      })}

      
    </div>
  );
});

export default EffectVisualizer;
