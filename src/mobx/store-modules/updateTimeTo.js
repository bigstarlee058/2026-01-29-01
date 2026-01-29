import { captureFabricObjectState } from '../../utils/fabric-utils';

export const updateTimeToUtil = ({ newTime, store }) => {
  if (newTime >= store.lastElementEnd) {
    store.setCurrentTimeInMs(store.lastElementEnd);
    return;
  }

  // Clear GL transition cache on seek to ensure fresh state capture
  store.clearGLTransitionCache();

  store.setCurrentTimeInMs(newTime);
  store.animationTimeLine.seek(newTime);

  // Reset elements to initial state if their animations have ended
  store.resetCompletedAnimations(newTime);

  if (store.canvas) {
    // Update global frame fill based on current time
    store.updateCanvasFrameFill();
  }

  // Handle GL transitions - optimize for performance
  let needsCanvasRender = false;
  let needsSubtitleReorder = false;

  // Clean up orphaned GL transitions first (with grace re-checks to avoid false positives)
  const orphanedTransitions = [];
  store.glTransitionElements.forEach((transitionElement, transitionId) => {
    // Always get fresh animation data from store.animations instead of cached reference
    const animation = store.animations.find(anim => anim.id === transitionId);
    if (!animation || animation.type !== 'glTransition') {
      const misses = (store._glOrphanMissCounts.get(transitionId) || 0) + 1;
      store._glOrphanMissCounts.set(transitionId, misses);
      if (misses >= 3) {
        orphanedTransitions.push(transitionId);
      }
      return;
    } else {
      if (store._glOrphanMissCounts.has(transitionId)) {
        store._glOrphanMissCounts.delete(transitionId);
      }
    }

    // Check if elements still exist
    const fromElement = store.editorElements.find(
      el => el.id === animation.fromElementId
    );
    const toElement = store.editorElements.find(
      el => el.id === animation.toElementId
    );
    if (!fromElement || !toElement) {
      const misses = (store._glOrphanMissCounts.get(transitionId) || 0) + 1;
      store._glOrphanMissCounts.set(transitionId, misses);
      if (misses >= 3) {
        orphanedTransitions.push(transitionId);
      }
      return;
    } else {
      if (store._glOrphanMissCounts.has(transitionId)) {
        store._glOrphanMissCounts.delete(transitionId);
      }
    }
  });

  // Remove orphaned transitions
  orphanedTransitions.forEach(transitionId => {
    console.warn(`Removing orphaned GL transition: ${transitionId}`);
    store.removeGLTransition(transitionId);
  });

  // Ensure GL transition elements exist for active/nearby transitions
  const nearWindowMs = 1500;
  const nowTime = newTime;
  const glAnims = store.animations.filter(a => a.type === 'glTransition');
  for (const anim of glAnims) {
    const exists = store.glTransitionElements.has(anim.id);
    const isNear = nowTime >= (anim.startTime - nearWindowMs) && nowTime <= (anim.endTime + nearWindowMs);
    if (!exists && isNear) {
      const fromElement = store.editorElements.find(el => el.id === anim.fromElementId);
      const toElement = store.editorElements.find(el => el.id === anim.toElementId);
      if (fromElement && toElement) {
        // Fire and forget; renderer and fabricObject will be attached when ready
        store
          .setupGLTransitionRenderer(anim.id, fromElement, toElement, anim.transitionType)
          .catch(() => {});
      }
    }
  }

  // Process remaining valid GL transitions
  store.glTransitionElements.forEach((transitionElement, transitionId) => {
    // Always get fresh animation data from store.animations instead of cached reference
    const animation = store.animations.find(anim => anim.id === transitionId);
    if (!animation || animation.type !== 'glTransition') {
      return;
    }

    // Ensure transition element is properly positioned on canvas
    if (transitionElement.fabricObject && store.canvas) {
      // Make sure the transition element is on top when it should be visible
      const isOnCanvas = store.canvas.contains(transitionElement.fabricObject);
      if (!isOnCanvas) {
        console.warn(
          'GL transition element not on canvas, re-adding:',
          transitionId
        );
        store.canvas.add(transitionElement.fabricObject);
        store.canvas.bringToFront(transitionElement.fabricObject);
        needsSubtitleReorder = true;
        needsCanvasRender = true;
      }
    }

    const isTransitionActive =
      newTime >= animation.startTime && newTime <= animation.endTime;

    if (isTransitionActive) {
      // Recreate renderer on-demand if it was evicted
      if (!transitionElement.renderer) {
        const fromElement = store.editorElements.find(
          el => el.id === animation.fromElementId
        );
        const toElement = store.editorElements.find(
          el => el.id === animation.toElementId
        );
        if (fromElement && toElement) {
          // Fire and forget; follow-up render below will use it when ready
          store
            .setupGLTransitionRenderer(
              transitionId,
              fromElement,
              toElement,
              animation.transitionType
            )
            .catch(() => {});
        }
      }
      // Calculate progress
      const progress =
        (newTime - animation.startTime) /
        (animation.endTime - animation.startTime);
      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Update transition without immediate canvas render
      if (transitionElement && transitionElement.renderer) {
        try {
          // Get custom parameters from the animation properties
          const customParams = animation?.properties?.customParams || {};

          // Get current fabric objects for source elements
          const fromElement = store.editorElements.find(
            el => el.id === animation.fromElementId
          );
          const toElement = store.editorElements.find(
            el => el.id === animation.toElementId
          );

          // Update textures with current fabric object state during seek (throttled)
          if (fromElement?.fabricObject && toElement?.fabricObject) {
            const nowTs = performance.now();
            if (nowTs - (store._glSeekTextureUpdateTs || 0) >= store.GL_SEEK_TEXTURE_UPDATE_INTERVAL_MS) {
              store._glSeekTextureUpdateTs = nowTs;
            // Always update textures during seek for smoothness
            const currentFromState = {
              opacity: fromElement.fabricObject.opacity,
              scaleX: fromElement.fabricObject.scaleX,
              scaleY: fromElement.fabricObject.scaleY,
            };
            const currentToState = {
              opacity: toElement.fabricObject.opacity,
              scaleX: toElement.fabricObject.scaleX,
              scaleY: toElement.fabricObject.scaleY,
            };

            // Only log significant opacity changes during seek
            const hasOpacityChange =
              currentFromState.opacity < 0.95 || currentToState.opacity < 0.95;
            if (hasOpacityChange) {
            }

            // Use actual object dimensions for proper capture
            const fromCanvas = captureFabricObjectState(
              fromElement.fabricObject,
              fromElement.fabricObject.width * fromElement.fabricObject.scaleX,
              fromElement.fabricObject.height * fromElement.fabricObject.scaleY
            );
            const toCanvas = captureFabricObjectState(
              toElement.fabricObject,
              toElement.fabricObject.width * toElement.fabricObject.scaleX,
              toElement.fabricObject.height * toElement.fabricObject.scaleY
            );

            if (fromCanvas && toCanvas) {
              // Update textures synchronously during seek for better performance
              transitionElement.renderer
                .updateTextures(fromCanvas, toCanvas)
                .then(success => {
                  if (success) {
                    // Store last state for smooth transitions
                    transitionElement.lastFromState = { ...currentFromState };
                    transitionElement.lastToState = { ...currentToState };
                  }
                })
                .catch(error => {
                  console.warn(
                    'Failed to update GL transition textures during seek:',
                    error
                  );
                });
            }
            }
          }

          // Render transition frame with custom parameters
          transitionElement.renderer.render(clampedProgress, customParams);
          transitionElement.fabricObject.setElement(
            transitionElement.renderer.getCanvas()
          );
          needsCanvasRender = true;
        } catch (error) {
          console.error('Error updating GL transition:', transitionId, error);
          // Skip this transition to prevent freezing
          return;
        }
      }

      // Make sure transition element is visible
      transitionElement.fabricObject.set('opacity', 1);

      // Hide original images involved in the transition
      const fromElement = store.editorElements.find(
        el => el.id === animation.fromElementId
      );
      const toElement = store.editorElements.find(
        el => el.id === animation.toElementId
      );

      if (fromElement && fromElement.fabricObject) {
        fromElement.fabricObject.set('visible', false);
      }
      if (toElement && toElement.fabricObject) {
        toElement.fabricObject.set('visible', false);
      }
    } else {
      // Hide transition element when not active
      transitionElement.fabricObject.set('opacity', 0);
      // If renderer exists and is far from current time, dispose to free contexts
      const farWindow = 4000; // ms
      const isFar = newTime < animation.startTime - farWindow || newTime > animation.endTime + farWindow;
      if (isFar && transitionElement.renderer) {
        try {
          transitionElement.renderer.dispose();
        } catch (_) {}
        transitionElement.renderer = null;
      }

      // Restore visibility of original images
      const fromElement = store.editorElements.find(
        el => el.id === animation.fromElementId
      );
      const toElement = store.editorElements.find(
        el => el.id === animation.toElementId
      );

      if (fromElement && fromElement.fabricObject) {
        const fromIsInside =
          fromElement.timeFrame.start <= newTime &&
          newTime <= fromElement.timeFrame.end;
        fromElement.fabricObject.set('visible', fromIsInside);

        // Restore original dimensions for video elements when transition becomes inactive
        if (
          fromElement.type === 'video' &&
          fromElement.glTransitionOriginalState
        ) {
          const originalState = fromElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            fromElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            fromElement.fabricObject.setCoords();
          }
        }
      }
      if (toElement && toElement.fabricObject) {
        const toIsInside =
          toElement.timeFrame.start <= newTime &&
          newTime <= toElement.timeFrame.end;
        toElement.fabricObject.set('visible', toIsInside);

        // Restore original dimensions for video elements when transition becomes inactive
        if (
            toElement.type === 'video' &&
          toElement.glTransitionOriginalState
        ) {
          const originalState = toElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            toElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            toElement.fabricObject.setCoords();
          }
        }
      }

      // Ensure z-order is restored when transition becomes inactive
      needsSubtitleReorder = true;
    }
  });

  // Batch canvas operations for better performance
  if (needsSubtitleReorder) {
    store.ensureElementsZOrder();
  }
  if (needsCanvasRender) {
    store.canvas.requestRenderAll();
  }

  store.editorElements.forEach(e => {
    const isInside = e.timeFrame.start <= newTime && newTime <= e.timeFrame.end;

    // Check if this element is part of an active GL transition
    const isPartOfActiveTransition = Array.from(
      store.glTransitionElements.values()
    ).some(transitionElement => {
      const transitionId = transitionElement.animation.id;
      const animation = store.animations.find(anim => anim.id === transitionId);
      if (!animation || animation.type !== 'glTransition') {
        return false;
      }
      const isTransitionActive =
        newTime >= animation.startTime && newTime <= animation.endTime;
      return (
        isTransitionActive &&
        (animation.fromElementId === e.id || animation.toElementId === e.id)
      );
    });

    if (e.fabricObject) {
      // Skip standard visibility logic for elements in active GL transitions
      if (isPartOfActiveTransition) {
        // GL transition logic will handle visibility
        return;
      }

      if (e.fabricObject.visible !== isInside) {
        e.fabricObject.set('visible', isInside);

        // Handle word objects visibility when segment visibility changes
        if (e.type === 'text' && e.properties.wordObjects) {
          e.properties.wordObjects.forEach(wordObj => {
            if (wordObj) {
              wordObj.set({
                visible: isInside,
                opacity: isInside ? 1 : 0,
              });
              // Also handle background rect visibility
              if (wordObj._backgroundRect) {
                wordObj._backgroundRect.set({
                  visible: isInside,
                });
              }
            }
          });
        }

        store.canvas.renderAll();
      }

      // Reset animation state if element is visible but no animations are active
      if (isInside) {
        // Check if any animations are currently active for this element
        const activeAnimations = store.animations.filter(animation => {
          if (
            animation.targetId !== e.id &&
            !(animation.targetIds && animation.targetIds.includes(e.id))
          )
            return false;

          const startTime = animation.properties?.startTime || 0;
          const endTime = animation.properties?.endTime || animation.duration;
          const animationStart = e.timeFrame.start + startTime;
          const animationEnd = e.timeFrame.start + endTime;
          const smoothReturn = animation.properties?.smoothReturn ?? false;

          // For In animations (like dropIn), they should be active from their start until element end
          if (animation.type.endsWith('In')) {
            return newTime >= animationStart && newTime <= e.timeFrame.end;
          }

          // For Out animations, they should be active from their start until element end
          if (animation.type.endsWith('Out')) {
            return newTime >= animationStart && newTime <= e.timeFrame.end;
          }

          // For Effect animations, check specific time range with smooth return consideration
          if (animation.type.endsWith('Effect')) {
            // For regular animation period
            if (newTime >= animationStart && newTime <= animationEnd) {
              return true;
            }

            // For smooth return period
            if (
              smoothReturn &&
              animationEnd < e.timeFrame.end &&
              newTime > animationEnd &&
              newTime <= e.timeFrame.end
            ) {
              return true;
            }

            return false;
          }

          // For other animations, use the element's timeframe
          return newTime >= e.timeFrame.start && newTime <= e.timeFrame.end;
        });

        // If no animations are active and we have a default state, reset to it
        if (activeAnimations.length === 0 && e.defaultState) {
          const fabricObject = e.fabricObject;
          const currentValues = {
            scaleX: fabricObject.scaleX,
            scaleY: fabricObject.scaleY,
            left: fabricObject.left,
            top: fabricObject.top,
            opacity: fabricObject.opacity,
          };

          const defaultValues = {
            scaleX: e.defaultState.scaleX,
            scaleY: e.defaultState.scaleY,
            left: e.defaultState.left,
            top: e.defaultState.top,
            opacity: e.defaultState.opacity,
          };

          // Only update if values are different to avoid unnecessary renders
          const needsUpdate = Object.keys(defaultValues).some(
            key => Math.abs(currentValues[key] - defaultValues[key]) > 0.001
          );

          if (needsUpdate) {
            fabricObject.set(defaultValues);
            fabricObject.setCoords();
            needsCanvasRender = true;
          }
        }
        // Special handling for opacity restoration between animations to prevent black screens
        else if (activeAnimations.length === 0) {
          // No default state but no active animations - ensure opacity is reasonable
          const currentOpacity = e.fabricObject.opacity;
          const baseOpacity = e.initialState?.opacity || 1;

          // If current opacity is too low (from previous animation), restore base opacity
          if (currentOpacity < 0.1 && baseOpacity > 0.1) {
            e.fabricObject.set('opacity', baseOpacity);
            needsCanvasRender = true;
          }
        }
      }

      // Reset animation state for elements that are outside animation time range
      // This ensures that effects are properly reset when the timeline position is outside their active range
      if (isInside && e.initialState) {
        // Check ALL animations for this element, not just specific types
        const allElementAnimations = store.animations.filter(
          animation =>
            animation.targetId === e.id ||
            (animation.targetIds && animation.targetIds.includes(e.id))
        );

        if (allElementAnimations.length > 0) {
          // Check if we're currently within ANY animation's time range
          const isWithinAnyAnimation = allElementAnimations.some(animation => {
            const startTime = animation.properties?.startTime || 0;
            const endTime =
              animation.properties?.endTime || animation.duration || 1000;
            const smoothReturn = animation.properties?.smoothReturn ?? false;
            const animationStart = e.timeFrame.start + startTime;
            const animationEnd = e.timeFrame.start + endTime;

            // For In animations (like dropIn), they should be active from their start until element end
            if (animation.type.endsWith('In')) {
              return newTime >= animationStart && newTime <= e.timeFrame.end;
            }

            // For Out animations, they should be active from their start until element end
            if (animation.type.endsWith('Out')) {
              return newTime >= animationStart && newTime <= e.timeFrame.end;
            }

            // For Effect animations, check normal range with smooth return consideration
            if (animation.type.endsWith('Effect')) {
              if (smoothReturn && animationEnd < e.timeFrame.end) {
                // Animation is active during its range and smooth return period
                return newTime >= animationStart && newTime <= e.timeFrame.end;
              } else {
                // Animation is only active during its specified range
                return newTime >= animationStart && newTime <= animationEnd;
              }
            }

            // For other animations, use element timeframe
            return newTime >= e.timeFrame.start && newTime <= e.timeFrame.end;
          });

          // Only reset to initial state if we're completely outside all animations
          // AND the current time is before the first animation starts
          const earliestAnimationStart = Math.min(
            ...allElementAnimations.map(animation => {
              const startTime = animation.properties?.startTime || 0;
              return e.timeFrame.start + startTime;
            })
          );

          const shouldReset =
            !isWithinAnyAnimation && newTime < earliestAnimationStart;

          if (shouldReset) {
            const fabricObject = e.fabricObject;
            const initialState = e.initialState;

            // Only reset if current values differ from initial state
            const currentValues = {
              scaleX: fabricObject.scaleX,
              scaleY: fabricObject.scaleY,
              left: fabricObject.left,
              top: fabricObject.top,
              opacity: fabricObject.opacity,
            };

            const needsReset = Object.keys(initialState).some(
              key => Math.abs(currentValues[key] - initialState[key]) > 0.001
            );

            if (needsReset) {
              fabricObject.set({
                scaleX: initialState.scaleX,
                scaleY: initialState.scaleY,
                left: initialState.left,
                top: initialState.top,
                opacity: initialState.opacity,
              });
              fabricObject.setCoords();
              store.canvas.requestRenderAll();
            }
          }
        }
      }

      // Ensure zoom never sticks after it finishes: if no active zoomEffect in current time, restore base transform
      if (isInside && e.initialState && e.fabricObject) {
        const elementZoomEffects = store.animations.filter(
          a => a.targetId === e.id && a.type === 'zoomEffect'
        );

        if (elementZoomEffects.length > 0) {
          // Are we inside any zoom effect or its smooth return period?
          const insideZoomNow = elementZoomEffects.some(a => {
            const start = (a.properties?.startTime || 0) + e.timeFrame.start;
            const end =
              (a.properties?.endTime || a.duration || 0) + e.timeFrame.start;
            const smoothReturn = a.properties?.smoothReturn ?? false;
            if (smoothReturn && end < e.timeFrame.end) {
              return newTime >= start && newTime <= e.timeFrame.end;
            }
            return newTime >= start && newTime <= end;
          });

          if (!insideZoomNow) {
            const fo = e.fabricObject;
            const base = e.initialState;
            const needsReset =
              Math.abs(fo.scaleX - base.scaleX) > 0.001 ||
              Math.abs(fo.scaleY - base.scaleY) > 0.001 ||
              Math.abs(fo.left - base.left) > 0.001 ||
              Math.abs(fo.top - base.top) > 0.001;

            if (needsReset) {
              fo.set({
                scaleX: base.scaleX,
                scaleY: base.scaleY,
                left: base.left,
                top: base.top,
              });
              fo.setCoords();
              store.canvas.requestRenderAll();
            }
          }
        }
      }

      // Handle word animations
      if (
        e.type === 'text' &&
        isInside &&
        e.properties.words &&
        e.properties.wordObjects
      ) {
        // Check if this element has textWordHighlight animation
        const hasHighlight = store.animations.some(
          a => a.targetId === e.id && a.type === 'textWordHighlight'
        );

        // Check if this element has textWordAnimation
        const hasWordAnimation = store.animations.some(
          a => a.targetId === e.id && a.type === 'textWordAnimation'
        );

        // Check if this element has textWordMotion animation
        const hasMotion = store.animations.some(
          a => a.targetId === e.id && a.type === 'textWordMotion'
        );

        // Check if this element has textWordFalling animation
        const hasFalling = store.animations.some(
          a => a.targetId === e.id && a.type === 'textWordFalling'
        );

        // Check if this element has textWordPopUp animation
        const hasPopUp = store.animations.some(
          a => a.targetId === e.id && a.type === 'textWordPopUp'
        );

        // For motion animation, first determine which word should be active
        let activeWordIndex = -1;
        if (hasMotion) {
          e.properties.words.forEach((word, index) => {
            const wordStart = word.start;
            const wordEnd = word.wordEnd || word.end || word.start + 300;
            const isWordActive = newTime >= wordStart && newTime < wordEnd;
            if (isWordActive) {
              activeWordIndex = index;
            }
          });
        }

        e.properties.words.forEach((word, index) => {
          const wordObj = e.properties.wordObjects[index];
          if (!wordObj) return;

          if (hasHighlight) {
            // Handle highlighting animation
            const wordStart = word.start;
            const wordEnd = word.end || word.start + 300;
            const isWordActive = newTime >= wordStart && newTime <= wordEnd;
            const defaultColor = e.properties.defaultColor || '#ffffff';
            const activeColor = e.properties.activeColor || '#FFD700';

            // First ensure the word is visible with full opacity when segment is active
            if (
              wordObj.visible !== isInside ||
              (isInside && wordObj.opacity !== 1)
            ) {
              wordObj.set({
                visible: isInside,
                opacity: isInside ? 1 : 0,
              });
            }

            // Then update its color if needed
            if (wordObj.fill !== (isWordActive ? activeColor : defaultColor)) {
              wordObj.set('fill', isWordActive ? activeColor : defaultColor);
              store.canvas.requestRenderAll();
            }
          } else if (hasMotion) {
            // Handle motion animation (background highlighting)
            // Only the word at activeWordIndex should have background, others should be transparent
            const isWordActive = index === activeWordIndex;
            const motionColor = e.properties.motionColor || '#FFD700';

            // First ensure the word is visible with full opacity when segment is active
            if (
              wordObj.visible !== isInside ||
              (isInside && wordObj.opacity !== 1)
            ) {
              wordObj.set({
                visible: isInside,
                opacity: isInside ? 1 : 0,
              });
            }

            // Handle background highlighting with improved logic to prevent flickering
            const currentBackgroundColor =
              wordObj._backgroundRect && wordObj._backgroundRect.opacity > 0
                ? wordObj._backgroundRect.fill
                : 'transparent';
            const targetBackgroundColor = isWordActive
              ? motionColor
              : 'transparent';

            // Store the last known state to prevent unnecessary changes
            if (!wordObj._lastMotionState) {
              wordObj._lastMotionState = {
                wasActive: false,
                backgroundColor: 'transparent',
              };
            }

            const lastState = wordObj._lastMotionState;

            // Only make changes when the state actually changes
            if (isWordActive !== lastState.wasActive) {
              if (isWordActive) {
                // Word becomes active - animate background appearing
                lastState.wasActive = true;
                lastState.backgroundColor = motionColor;
                // Only animate if not already animating to avoid conflicts
                if (!wordObj._isAnimatingBackground) {
                  store.animateBackgroundColor(
                    wordObj,
                    'transparent',
                    motionColor,
                    150
                  );
                }
              } else if (lastState.wasActive) {
                // Word becomes inactive - animate background disappearing
                lastState.wasActive = false;
                lastState.backgroundColor = 'transparent';
                // Get the current actual background color for smooth transition
                const currentBgColor =
                  wordObj._backgroundRect && wordObj._backgroundRect.opacity > 0
                    ? wordObj._backgroundRect.fill
                    : motionColor;
                store.animateBackgroundColor(
                  wordObj,
                  currentBgColor,
                  'transparent',
                  150
                );
              }
            }
          } else if (hasWordAnimation || hasFalling || hasPopUp) {
            // Handle standard word animation and falling animation
            const wordIsInside = word.start <= newTime && newTime <= word.end;
            if (wordObj.visible !== wordIsInside) {
              wordObj.set('visible', wordIsInside);
              store.canvas.renderAll();
            }
          }
        });
      }
    }
  });

  store.updateVideoElements();
  store.updateAudioElements();
};
