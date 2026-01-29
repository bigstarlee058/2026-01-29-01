import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useDispatch } from 'react-redux';
import {
  saveTimelineState,
   
} from '../../../redux/timeline/timelineSlice';
import { updateAnimationWithAutoSync } from '../entity/AnimationResource';
import styles from './DurationTimeline.module.scss';

const DurationTimeline = observer(
  ({
    store,
    selectedElement,
    selectedElementAnimations,
    animationsConfig,
    onEditAnimation,
  }) => {
    const dispatch = useDispatch();
      const [draggingAnimation, setDraggingAnimation] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredAnimationId, setHoveredAnimationId] = useState(null);
  const [resizingAnimation, setResizingAnimation] = useState(null);
  const [resizeType, setResizeType] = useState(null);
  const [resizeStartData, setResizeStartData] = useState(null);
    const [tooltipData, setTooltipData] = useState({
      isVisible: false,
      position: { x: 0, y: 0 },
      content: null,
      animationId: null,
    });

    const effectRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastUpdateTime = useRef(0);
    const lastPosition = useRef({ x: 0, y: 0 });
    const isHoveringTooltipRef = useRef(false);
    const [mouseInAnimation, setMouseInAnimation] = useState(false);
    const [mouseInTooltip, setMouseInTooltip] = useState(false);
    const closeTimeoutRef = useRef(null);

    // Add useEffect for managing tooltip close delay
    useEffect(() => {
      if (!mouseInAnimation && !mouseInTooltip) {
        closeTimeoutRef.current = setTimeout(() => {
          setHoveredAnimationId(null);
          setTooltipData(prev => ({ ...prev, isVisible: false }));
        }, 500);
      }
      return () => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }, [mouseInAnimation, mouseInTooltip]);

    const handleAnimationMouseEnter = (e, animation) => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setMouseInAnimation(true);
      
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top - 40,
      };

      setHoveredAnimationId(animation.id);
      setTooltipData({
        isVisible: true,
        position,
        content: animation,
        animationId: animation.id,
      });
    };

    const handleAnimationMouseLeave = () => {
      setMouseInAnimation(false);
    };

    const handleTooltipMouseEnter = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setMouseInTooltip(true);
      isHoveringTooltipRef.current = true;
    };

    const handleTooltipMouseLeave = () => {
      setMouseInTooltip(false);
      isHoveringTooltipRef.current = false;
    };

    const getActiveAnimationsForTimeline = () => {
      if (!selectedElement) return [];

      const activeAnimations = [];

      // Add regular animations
      selectedElementAnimations.forEach(anim => {
        const matchedConfig = animationsConfig.find(
          config => config.type === anim.type
        );
        if (matchedConfig) {
          activeAnimations.push({
            ...anim,
            config: matchedConfig,
            elementTimeFrame: selectedElement.timeFrame,
          });
        }
      });

      return activeAnimations;
    };

    const getMaxAllowedDuration = (animationId, animationType) => {
      const totalDuration =
        selectedElement.timeFrame.end - selectedElement.timeFrame.start;
      const allAnimations = getActiveAnimationsForTimeline();
      const otherAnimations = allAnimations.filter(a => a.id !== animationId);

      if (otherAnimations.length === 0) {
        return totalDuration;
      }

      let maxDuration = totalDuration;

      for (const otherAnim of otherAnimations) {
        let otherStart, otherEnd;

        if (otherAnim.type.endsWith('Out')) {
          otherStart = totalDuration - otherAnim.duration;
          otherEnd = totalDuration;
        } else if (otherAnim.type.endsWith('In')) {
          otherStart = 0;
          otherEnd = otherAnim.duration;
        } else {
          const otherStartTime = otherAnim.properties?.startTime || 0;
          otherStart = otherStartTime;
          otherEnd = otherStartTime + otherAnim.duration;
        }

        if (animationType.endsWith('Out')) {
          // For Out animations, we can't start before other animations end
          if (otherStart < totalDuration) {
            maxDuration = Math.min(maxDuration, totalDuration - otherEnd);
          }
        } else if (animationType.endsWith('In')) {
          // For In animations, we can't end after other animations start
          if (otherEnd > 0) {
            maxDuration = Math.min(maxDuration, otherStart);
          }
        }
      }

      return Math.max(100, maxDuration); // Minimum 100ms
    };



    const handleAnimationDragStart = (e, animation) => {
      // Only allow dragging for Effect animations
      if (!animation.type.endsWith('Effect')) return;

      // Don't start drag if clicking on resize handle or action buttons
      if (
        e.target.closest(`.${styles.resizeHandle}`) ||
        e.target.closest(`.${styles.animationActions}`)
      )
        return;

      e.preventDefault();
      setDraggingAnimation(animation);
      setIsDragging(true);

      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleAnimationDrag = useCallback(
      e => {
        if (!draggingAnimation || !effectRef.current) return;

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

          const timelineRect = effectRef.current.getBoundingClientRect();
          const relativeX = e.clientX - timelineRect.left - dragOffset.x;
          const timelineWidth = timelineRect.width;

          const newTimePosition =
            (relativeX / timelineWidth) *
            (selectedElement.timeFrame.end - selectedElement.timeFrame.start);
          const targetElement = selectedElement;

          if (!targetElement) return;

          const properties = draggingAnimation.properties || {};
          const originalDuration = draggingAnimation.duration;

          // Calculate new relative start time within the element
          const elementStart = targetElement.timeFrame.start;
          const elementEnd = targetElement.timeFrame.end;
          const elementDuration = elementEnd - elementStart;

          let newRelativeStart = newTimePosition;

          // Constrain within element bounds
          newRelativeStart = Math.max(
            0,
            Math.min(newRelativeStart, elementDuration - originalDuration)
          );

          const newRelativeEnd = newRelativeStart + originalDuration;

          // Update the animation with auto-sync
          const animationUpdate = {
            duration: originalDuration,
            properties: {
              ...draggingAnimation.properties,
              startTime: newRelativeStart,
              endTime: newRelativeEnd,
            },
          };

          updateAnimationWithAutoSync(draggingAnimation, animationUpdate, store, selectedElement);
        });
      },
      [draggingAnimation, dragOffset, selectedElement, store.animations]
    );

      const handleResizeStart = (e, animationId, handle) => {
    e.preventDefault();
    e.stopPropagation();

    const animation = store.animations.find(a => a.id === animationId);
    setResizingAnimation(animation);
    setResizeType(handle);
    
    // Store initial data for resize - using same approach as EffectVisualizer
    const properties = animation.properties || {};
    setResizeStartData({
      startTime: properties.startTime || 0,
      endTime: properties.endTime || animation.duration || 1000,
      duration: animation.duration,
      mouseX: e.clientX,
    });
  };

  const handleResizeDrag = useCallback(
    e => {
      if (!resizingAnimation || !resizeStartData || !effectRef.current) return;

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

        const timelineRect = effectRef.current.getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left;
        const timelineWidth = timelineRect.width;
        const newTimePosition = (relativeX / timelineWidth) * (selectedElement.timeFrame.end - selectedElement.timeFrame.start);

        const animationIndex = store.animations.findIndex(
          a => a.id === resizingAnimation.id
        );
        if (animationIndex === -1) return;

        const animation = store.animations[animationIndex];
        const minDuration = 100; // Minimum 100ms
        const maxDuration = selectedElement.timeFrame.end - selectedElement.timeFrame.start; // Max = element duration

        let animationUpdate = null;

        if (animation.type.endsWith('Effect')) {
          // For Effect animations - same logic as EffectVisualizer
          if (resizeType === 'start') {
            let newStartTime = Math.max(
              0,
              Math.min(newTimePosition, resizeStartData.endTime - minDuration)
            );
            const newDuration = resizeStartData.endTime - newStartTime;

            if (newDuration >= minDuration && newDuration <= maxDuration) {
              animationUpdate = {
                duration: newDuration,
                properties: {
                  ...animation.properties,
                  startTime: newStartTime,
                  endTime: resizeStartData.endTime,
                },
              };
            }
          } else if (resizeType === 'end') {
            let newEndTime = Math.min(
              maxDuration,
              Math.max(newTimePosition, resizeStartData.startTime + minDuration)
            );
            const newDuration = newEndTime - resizeStartData.startTime;

            if (newDuration >= minDuration && newDuration <= maxDuration) {
              animationUpdate = {
                duration: newDuration,
                properties: {
                  ...animation.properties,
                  startTime: resizeStartData.startTime,
                  endTime: newEndTime,
                },
              };
            }
          }
        } else {
          // For In/Out animations
          let newDuration;
          
          if (resizeType === 'start' && animation.type.endsWith('Out')) {
            // For Out animations - dragging left handle changes duration
            const totalDuration = selectedElement.timeFrame.end - selectedElement.timeFrame.start;
            newDuration = totalDuration - newTimePosition;
          } else if (resizeType === 'end' && animation.type.endsWith('In')) {
            // For In animations - dragging right handle changes duration
            newDuration = newTimePosition;
          }

          if (newDuration && newDuration >= minDuration && newDuration <= maxDuration) {
            animationUpdate = {
              duration: newDuration,
            };
          }
        }

        // Apply update with auto-sync
        if (animationUpdate) {
          updateAnimationWithAutoSync(animation, animationUpdate, store, selectedElement);
        }
      });
    },
    [
      resizingAnimation,
      resizeStartData,
      resizeType,
      selectedElement,
      store.animations,
    ]
  );

    const handleMouseUp = useCallback(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (draggingAnimation || resizingAnimation) {
        store.refreshAnimations();

        window.dispatchEvent(
          new CustomEvent('animationUpdated', {
            detail: {
              animationId: draggingAnimation?.id || resizingAnimation?.id,
              action: draggingAnimation ? 'drag' : 'resize',
            },
          })
        );
      }

      setDraggingAnimation(null);
      setResizingAnimation(null);
      setResizeType(null);
      setResizeStartData(null);
      setDragOffset({ x: 0, y: 0 });
      lastPosition.current = { x: 0, y: 0 };

      setTimeout(() => setIsDragging(false), 100);
    }, [draggingAnimation, resizingAnimation, store]);

    useEffect(() => {
      const handleMouseMove = e => {
        if (draggingAnimation) {
          handleAnimationDrag(e);
        } else if (resizingAnimation) {
          handleResizeDrag(e);
        }
      };

      if (draggingAnimation || resizingAnimation) {
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
    }, [draggingAnimation, resizingAnimation, handleAnimationDrag, handleResizeDrag, handleMouseUp]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }, []);

    const activeAnimations = getActiveAnimationsForTimeline();
    const elementTimeFrame = selectedElement?.timeFrame;

    if (!elementTimeFrame || activeAnimations.length === 0) {
      return null;
    }

    const totalDuration = elementTimeFrame.end - elementTimeFrame.start;
    const timelineWidth = '100%'; // Fixed width for timeline

    return (
      <div className={styles.durationTimeline}>
        <div className={styles.timelineContainer}>
          <div
            className={styles.timelineTrack}
            style={{ width: timelineWidth }}
            ref={effectRef}
          >
            {/* Background timeline */}
            <div className={styles.timelineBackground}></div>

            {/* Show available space indicators */}
            {activeAnimations.map(animation => {
              const maxAllowedDuration = getMaxAllowedDuration(
                animation.id,
                animation.type
              );
              const maxDurationPercent =
                (maxAllowedDuration / totalDuration) * 100;

              let maxStartPercent = 0;
              if (animation.type.endsWith('Out')) {
                maxStartPercent = Math.max(0, 100 - maxDurationPercent);
              }

              return (
                <div
                  key={`max-${animation.id}`}
                  className={styles.maxSizeIndicator}
                  style={{
                    left: `${maxStartPercent}%`,
                    width: `${maxDurationPercent}%`,
                  }}
                ></div>
              );
            })}

            {/* Animation blocks */}
            {activeAnimations.map(animation => {
              let startPercent = 0;
              let durationPercent = Math.min(
                100,
                (animation.duration / totalDuration) * 100
              );

              // Calculate position based on animation type
              if (animation.type.endsWith('Out')) {
                // Out animations should appear at the end
                startPercent = Math.max(0, 100 - durationPercent);
              } else if (animation.type.endsWith('Effect')) {
                // Effect animations can have custom start time
                const animationStartTime = animation.properties?.startTime || 0;
                startPercent = (animationStartTime / totalDuration) * 100;

                // For effect animations, use the actual duration from startTime to endTime
                const animationEndTime =
                  animation.properties?.endTime || animation.duration;
                const effectDuration = animationEndTime - animationStartTime;
                durationPercent = Math.min(
                  100 - startPercent,
                  (effectDuration / totalDuration) * 100
                );
              } else {
                // In animations start from beginning (0%)
                startPercent = 0;
              }

              // Calculate max allowed duration for visual feedback
              const maxAllowedDuration = getMaxAllowedDuration(
                animation.id,
                animation.type
              );
              const maxDurationPercent =
                (maxAllowedDuration / totalDuration) * 100;
              const isAtMaxSize = animation.duration >= maxAllowedDuration - 50; // 50ms tolerance

              return (
                <div
                  key={animation.id}
                  className={`${styles.animationBlock} ${
                    animation.type.endsWith('In')
                      ? styles.animationIn
                      : animation.type.endsWith('Out')
                      ? styles.animationOut
                      : animation.type.endsWith('Effect')
                      ? styles.animationEffect
                      : ''
                  } ${isAtMaxSize ? styles.animationAtMaxSize : ''} ${
                    draggingAnimation?.id === animation.id
                      ? styles.dragging
                      : ''
                  }`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${durationPercent}%`,
                  }}
                  onMouseDown={
                    animation.type.endsWith('Effect')
                      ? e => handleAnimationDragStart(e, animation)
                      : undefined
                  }
                  onMouseEnter={e => handleAnimationMouseEnter(e, animation)}
                  onMouseLeave={handleAnimationMouseLeave}
                  title={
                    (() => {
                      let displayName;
                      // For unified effects, determine the correct display name based on properties
                      if (animation.type === 'zoomEffect') {
                        const properties = animation.properties || {};
                        const initialScale = properties.scaleFactor || properties.initialScale || 1.0;
                        const targetScale = properties.targetScale || properties.endScale || 2.0;
                        const direction = initialScale < targetScale ? 'In' : 'Out';
                        displayName = `Zoom ${direction}`;
                      } else if (animation.type === 'fadeEffect') {
                        const properties = animation.properties || {};
                        const initialOpacity = properties.opacity || properties.initialOpacity || 1.0;
                        const targetOpacity = properties.targetOpacity || properties.endOpacity || 0.0;
                        const direction = initialOpacity < targetOpacity ? 'In' : 'Out';
                        displayName = `Fade ${direction}`;
                      } else {
                        displayName = animation.config.name;
                      }
                      
                      return animation.type.endsWith('Effect')
                        ? `${displayName} - Drag to move`
                        : displayName;
                    })()
                  }
                >
                  <div className={styles.animationInfo}>
                    <div className={styles.animationIcon}>
                      {animation.type.endsWith('In') ? (
                        <svg viewBox="0 0 24 24" width="9" height="9">
                          <path
                            d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.58L20 12l-8-8-8 8z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : animation.type.endsWith('Out') ? (
                        <svg viewBox="0 0 24 24" width="9" height="9">
                          <path
                            d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.58L4 12l8 8 8-8z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="9" height="9">
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                            fill="currentColor"
                          />
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                        </svg>
                      )}
                    </div>
                    <span className={styles.animationName}>
                      {(() => {
                        // For unified effects, determine the correct display name based on properties
                        if (animation.type === 'zoomEffect') {
                          const properties = animation.properties || {};
                          const initialScale = properties.scaleFactor || properties.initialScale || 1.0;
                          const targetScale = properties.targetScale || properties.endScale || 2.0;
                          const direction = initialScale < targetScale ? 'In' : 'Out';
                          return `Zoom ${direction}`;
                        } else if (animation.type === 'fadeEffect') {
                          const properties = animation.properties || {};
                          const initialOpacity = properties.opacity || properties.initialOpacity || 1.0;
                          const targetOpacity = properties.targetOpacity || properties.endOpacity || 0.0;
                          const direction = initialOpacity < targetOpacity ? 'In' : 'Out';
                          return `Fade ${direction}`;
                        }
                        // For regular animations, use config name
                        return animation.config.name;
                      })()}
                    </span>
                  </div>

                  {/* Start time on the left */}
                  {(() => {
                    let startTime;

                    if (animation.type.endsWith('In')) {
                      startTime = 0;
                    } else if (animation.type.endsWith('Out')) {
                      startTime = totalDuration - animation.duration;
                    } else if (animation.type.endsWith('Effect')) {
                      startTime = animation.properties?.startTime || 0;
                    } else {
                      startTime = 0;
                    }

                    const formatTime = time => {
                      return `${Math.floor(time / 1000)}.${String(
                        Math.floor((time % 1000) / 10)
                      ).padStart(2, '0')}s`;
                    };

                    // Only show start time if it's not 0.00s
                    if (startTime > 0) {
                      return (
                        <div className={styles.startTime}>
                          {formatTime(startTime)}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* End time on the right */}
                  {(() => {
                    let endTime;

                    if (animation.type.endsWith('In')) {
                      endTime = animation.duration;
                    } else if (animation.type.endsWith('Out')) {
                      endTime = totalDuration;
                    } else if (animation.type.endsWith('Effect')) {
                      endTime =
                        animation.properties?.endTime ||
                        (animation.properties?.startTime || 0) +
                          animation.duration;
                    } else {
                      endTime = animation.duration;
                    }

                    const formatTime = time => {
                      return `${Math.floor(time / 1000)}.${String(
                        Math.floor((time % 1000) / 10)
                      ).padStart(2, '0')}s`;
                    };

                    // Only show end time if it's not at the total duration
                    if (endTime < totalDuration) {
                      return (
                        <div className={styles.endTime}>
                          {formatTime(endTime)}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Resize handles */}
                  {animation.type.endsWith('Effect') ? (
                    <>
                      {/* Left handle for Effect animations */}
                      <div
                        className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`}
                        onMouseDown={e => {
                          e.stopPropagation();
                          handleResizeStart(e, animation.id, 'start');
                        }}
                        title="Drag to change start time"
                      ></div>
                      {/* Right handle for Effect animations */}
                      <div
                        className={`${styles.resizeHandle} ${styles.resizeHandleRight}`}
                        onMouseDown={e => {
                          e.stopPropagation();
                          handleResizeStart(e, animation.id, 'end');
                        }}
                        title="Drag to change end time"
                      ></div>
                    </>
                  ) : (
                    <div
                      className={`${styles.resizeHandle} ${
                        animation.type.endsWith('Out')
                          ? styles.resizeHandleLeft
                          : styles.resizeHandleRight
                      }`}
                      onMouseDown={e => {
                        e.stopPropagation();
                        handleResizeStart(
                          e,
                          animation.id,
                          animation.type.endsWith('Out') ? 'start' : 'end'
                        );
                      }}
                      title={
                        isAtMaxSize
                          ? `Maximum size reached. Cannot overlap with other animations.`
                          : animation.type.endsWith('Out')
                          ? 'Drag to change start time'
                          : 'Drag to change duration'
                      }
                    ></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time markers */}
          <div className={styles.timeMarkers}>
            <span>0s</span>
            <span>
              {Math.floor(totalDuration / 1000)}.
              {String(Math.floor((totalDuration % 1000) / 10)).padStart(2, '0')}
              s
            </span>
          </div>
        </div>

        <ButtonWithIcon
          icon="PlusIcon"
          size="8"
          color="#ABABAB"
          accentColor="white"
          marginLeft="0px"
          classNameButton={styles.plusButton}
        />

        {/* Portal Tooltip */}
        {tooltipData.isVisible &&
          tooltipData.content &&
          createPortal(
            <div
              className={styles.tooltip}
              style={{
                position: 'fixed',
                left: tooltipData.position.x,
                top: tooltipData.position.y + 6,
                transform: 'translateX(-50%)',
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              <div className={styles.tooltipContent}>
                <div className={styles.tooltipActions}>
                  <ButtonWithIcon
                    icon="EditIcon"
                    size="10"
                    color="white"
                    accentColor="var(--accent-color)"
                    tooltipText="Edit animation"
                    onClick={e => {
                      e.stopPropagation();
                      onEditAnimation(tooltipData.content);
                    }}
                    classNameButton={styles.tooltipButton}
                  />
                  <ButtonWithIcon
                    icon="DeleteIcon"
                    size="10"
                    color="white"
                    accentColor="var(--accent-color)"
                    tooltipText="Delete animation"
                    onClick={e => {
                      e.stopPropagation();
                      store.removeAnimation(tooltipData.content.id);
                       
                       
                    }}
                    classNameButton={styles.tooltipButton}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }
);

export { DurationTimeline };
