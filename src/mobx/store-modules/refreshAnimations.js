import anime from 'animejs';

export const refreshAnimationsUtil = store => {
  if (store.isRefreshingAnimations) return;
  store.isRefreshingAnimations = true;

  // Clear GL transition cache since animations are refreshing
  store.clearGLTransitionCache();

  // Reconcile orphans between animations and editor elements
  try {
    const validElementIds = new Set(
      store.editorElements
        .filter(el => el.type !== 'animation')
        .map(el => el.id)
    );

    // Keep only animations that still reference existing editor elements
    const nextAnimations = [];
    const keptAnimationIds = new Set();
    for (const anim of store.animations) {
      if (anim.type === 'glTransition') {
        if (validElementIds.has(anim.fromElementId) && validElementIds.has(anim.toElementId)) {
          nextAnimations.push(anim);
          keptAnimationIds.add(anim.id);
        }
      } else {
        const targetIds = anim.targetIds || (anim.targetId ? [anim.targetId] : []);
        if (targetIds.length > 0 && targetIds.some(tid => validElementIds.has(tid))) {
          nextAnimations.push(anim);
          keptAnimationIds.add(anim.id);
        }
      }
    }
    store.animations = nextAnimations;

    // Drop GL transition renderers that no longer have a backing animation
    Array.from(store.glTransitionElements.keys()).forEach(transitionId => {
      if (!keptAnimationIds.has(transitionId)) {
        store.removeGLTransition(transitionId);
      }
    });
  } catch (e) {
    console.warn('refreshAnimations: failed to reconcile orphan animations', e);
  }

  // Purge orphan timeline animation elements whose animationId no longer exists
  try {
    const animationIds = new Set(store.animations.map(a => a.id));
    const before = store.editorElements.length;
    store.editorElements = store.editorElements.filter(el => {
      if (el.type !== 'animation') return true;
      const derivedId = el.animationId || (typeof el.id === 'string' && el.id.startsWith('animation-') ? el.id.slice('animation-'.length) : null) || el.properties?.originalAnimation?.id;
      if (!derivedId) return false;
      return animationIds.has(derivedId);
    });
    const after = store.editorElements.length;
    if (before !== after && store.canvas) {
      store.canvas.requestRenderAll();
    }
  } catch (e) {
    console.warn('refreshAnimations: failed to purge orphan animation elements', e);
  }

  // Clear existing animations
  anime.remove(store.animationTimeLine);
  store.animationTimeLine = anime.timeline({
    duration: store.maxTime,
    autoplay: false,
  });

  // Group animations by target element for batch processing
  const animationsByTarget = new Map();
  store.animations.forEach(animation => {
    // Handle both old targetId and new targetIds systems
    const targetIds =
      animation.targetIds || (animation.targetId ? [animation.targetId] : []);

    targetIds.forEach(targetId => {
      if (!animationsByTarget.has(targetId)) {
        animationsByTarget.set(targetId, []);
      }
      animationsByTarget.get(targetId).push(animation);
    });
  });

  // Process animations in batches by target
  animationsByTarget.forEach((animations, targetId) => {
    const editorElement = store.editorElements.find(
      element => element.id === targetId
    );
    const fabricObject = editorElement?.fabricObject;
    if (!editorElement || !fabricObject) return;

    // Store initial state once per element
    if (!editorElement.initialState) {
      editorElement.initialState = {
        scaleX: fabricObject.scaleX,
        scaleY: fabricObject.scaleY,
        left: fabricObject.left,
        top: fabricObject.top,
        opacity: fabricObject.opacity,
      };
    }

    // Check if store element is part of an active GL transition
    const isPartOfActiveGLTransition = Array.from(
      store.glTransitionElements.values()
    ).some(transitionElement => {
      const animation = store.animations.find(
        anim => anim.id === transitionElement.animation?.id
      );
      if (!animation || animation.type !== 'glTransition') {
        return false;
      }
      const currentTime = store.currentTimeInMs;
      const isTransitionActive =
        currentTime >= animation.startTime && currentTime <= animation.endTime;
      return (
        isTransitionActive &&
        (animation.fromElementId === editorElement.id ||
          animation.toElementId === editorElement.id)
      );
    });

    // Only clear clipPath if element is not part of active GL transition
    if (!isPartOfActiveGLTransition) {
      fabricObject.clipPath = undefined;
    }

    // Don't reset animation state - allow animations to stack/overlay
    // Instead of resetting, use current state as base for new animations
    const currentState = {
      scaleX: fabricObject.scaleX,
      scaleY: fabricObject.scaleY,
      left: fabricObject.left,
      top: fabricObject.top,
      opacity: fabricObject.opacity,
    };

    // Use initial state for reference but don't reset to it
    const initialState = editorElement.initialState;

    // Process each animation for store element
    animations.forEach(animation => {
      const W = animation.properties?.W || 4;
      const elementDuration =
        editorElement.timeFrame.end - editorElement.timeFrame.start;
      let animationDuration = animation.duration || elementDuration * (W / 100);

      switch (animation.type) {
        case 'slideIn': {
          const direction = animation.properties.direction || 'left';
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 1000;
          const animationDuration = endTime - startTime;

          // Use initial state for position reference, not current position
          const initialState = editorElement.initialState || {
            left: fabricObject.left,
            top: fabricObject.top,
          };

          const targetLeft = initialState.left;
          const targetTop = initialState.top;
          let startPosition = {};

          // Calculate start position relative to target (final) element position
          if (direction === 'left') {
            startPosition = { left: targetLeft - fabricObject.width * 2 };
          } else if (direction === 'right') {
            startPosition = { left: targetLeft + fabricObject.width * 2 };
          } else if (direction === 'top') {
            startPosition = { top: targetTop - fabricObject.height * 2 };
          } else if (direction === 'bottom') {
            startPosition = { top: targetTop + fabricObject.height * 2 };
          }

          // Set initial position immediately for slideIn
          fabricObject.set({
            left: startPosition.left || targetLeft,
            top: startPosition.top || targetTop,
          });
          fabricObject.setCoords();

          // Calculate absolute timing
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );

          store.animationTimeLine.add(
            {
              targets: fabricObject,
              left: [startPosition.left || targetLeft, targetLeft],
              top: [startPosition.top || targetTop, targetTop],
              duration: animationDuration,
              easing: store.getEasingFromAnimation(animation, 'easeOutCubic'),
              update: () => {
                fabricObject.setCoords();
                store.canvas.requestRenderAll();
              },
            },
            animationStart
          );
          break;
        }

        case 'slideOut': {
          const direction = animation.properties.direction || 'left';
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 1000;
          const animationDuration = endTime - startTime;

          // Use initial state for position reference, not current position
          const initialState = editorElement.initialState || {
            left: fabricObject.left,
            top: fabricObject.top,
          };

          const startLeft = initialState.left;
          const startTop = initialState.top;
          let endPosition = {};

          // Calculate end position relative to start (initial) element position
          if (direction === 'left') {
            endPosition = { left: startLeft - fabricObject.width * 2 };
          } else if (direction === 'right') {
            endPosition = { left: startLeft + fabricObject.width * 2 };
          } else if (direction === 'top') {
            endPosition = { top: startTop - fabricObject.height * 2 };
          } else if (direction === 'bottom') {
            endPosition = { top: startTop + fabricObject.height * 2 };
          }

          // Set initial position for slideOut (start at normal position)
          fabricObject.set({
            left: startLeft,
            top: startTop,
          });
          fabricObject.setCoords();

          // Calculate absolute timing
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );

          store.animationTimeLine.add(
            {
              targets: fabricObject,
              left: [startLeft, endPosition.left || startLeft],
              top: [startTop, endPosition.top || startTop],
              duration: animationDuration,
              easing: store.getEasingFromAnimation(animation, 'easeInCubic'),
              update: () => {
                fabricObject.setCoords();
                store.canvas.requestRenderAll();
              },
            },
            animationStart
          );
          break;
        }

        case 'dropIn': {
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 600;
          const animationDuration = endTime - startTime;

          const initialScaleX = initialState.scaleX;
          const initialScaleY = initialState.scaleY;
          const scaleFactor = animation.properties.scaleFactor || 1.5;
          const origin = animation.properties.origin || 'center';

          const targetScaleX = initialScaleX * scaleFactor;
          const targetScaleY = initialScaleY * scaleFactor;

          let adjustLeft = initialState.left;
          let adjustTop = initialState.top;

          switch (origin) {
            case 'center':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            case 'top-left':
              break;
            case 'top-right':
              adjustLeft =
                initialState.left + fabricObject.width * (1 - scaleFactor);
              break;
            case 'bottom-left':
              adjustTop =
                initialState.top + fabricObject.height * (1 - scaleFactor);
              break;
            case 'bottom-right':
              adjustLeft =
                initialState.left + fabricObject.width * (1 - scaleFactor);
              adjustTop =
                initialState.top + fabricObject.height * (1 - scaleFactor);
              break;
            case 'top':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              break;
            case 'bottom':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              adjustTop =
                initialState.top + fabricObject.height * (1 - scaleFactor);
              break;
            case 'left':
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            case 'right':
              adjustLeft =
                initialState.left + fabricObject.width * (1 - scaleFactor);
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            default:
              break;
          }

          // Set initial state for dropIn (large and invisible)
          fabricObject.set({
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            left: adjustLeft,
            top: adjustTop,
            opacity: 0,
          });
          fabricObject.setCoords();

          // Calculate absolute timing
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );

          store.animationTimeLine.add(
            {
              targets: fabricObject,
              scaleX: [targetScaleX, initialScaleX],
              scaleY: [targetScaleY, initialScaleY],
              left: [adjustLeft, initialState.left],
              top: [adjustTop, initialState.top],
              opacity: [0, 1],
              duration: animationDuration,
              easing: store.getEasingFromAnimation(animation, 'easeOutQuad'),
              update: () => {
                fabricObject.setCoords();
                store.canvas.requestRenderAll();
              },
              complete: () => {
                fabricObject.opacity = 1;
                fabricObject.setCoords();
              },
            },
            animationStart
          );
          break;
        }

        case 'dropOut': {
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 600;
          const animationDuration = endTime - startTime;

          const initialScaleX = initialState.scaleX;
          const initialScaleY = initialState.scaleY;
          const scaleFactor = animation.properties.scaleFactor || 1.5;
          const origin = animation.properties.origin || 'center';

          const targetScaleX = initialScaleX * scaleFactor;
          const targetScaleY = initialScaleY * scaleFactor;

          let adjustLeft = initialState.left;
          let adjustTop = initialState.top;

          switch (origin) {
            case 'center':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            case 'top-left':
              break;
            case 'top-right':
              adjustLeft =
                initialState.left - fabricObject.width * (scaleFactor - 1);
              break;
            case 'bottom-left':
              adjustTop =
                initialState.top - fabricObject.height * (scaleFactor - 1);
              break;
            case 'bottom-right':
              adjustLeft =
                initialState.left - fabricObject.width * (scaleFactor - 1);
              adjustTop =
                initialState.top - fabricObject.height * (scaleFactor - 1);
              break;
            case 'top':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              break;
            case 'bottom':
              adjustLeft =
                initialState.left -
                (fabricObject.width * (targetScaleX - initialScaleX)) / 2;
              adjustTop =
                initialState.top - fabricObject.height * (scaleFactor - 1);
              break;
            case 'left':
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            case 'right':
              adjustLeft =
                initialState.left - fabricObject.width * (scaleFactor - 1);
              adjustTop =
                initialState.top -
                (fabricObject.height * (targetScaleY - initialScaleY)) / 2;
              break;
            default:
              break;
          }

          // Set initial state for dropOut (normal position and scale)
          fabricObject.set({
            scaleX: initialScaleX,
            scaleY: initialScaleY,
            left: initialState.left,
            top: initialState.top,
            opacity: 1,
          });
          fabricObject.setCoords();

          // Calculate absolute timing
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );

          store.animationTimeLine.add(
            {
              targets: fabricObject,
              scaleX: [initialScaleX, targetScaleX],
              scaleY: [initialScaleY, targetScaleY],
              left: [initialState.left, adjustLeft],
              top: [initialState.top, adjustTop],
              opacity: [1, 0],
              duration: animationDuration,
              easing: store.getEasingFromAnimation(animation, 'easeInQuad'),
              update: () => {
                fabricObject.setCoords();
                store.canvas.requestRenderAll();
              },
              complete: () => {
                fabricObject.opacity = 0;
                fabricObject.setCoords();
              },
            },
            animationStart
          );
          break;
        }

        case 'slideEffect': {
          const isAutoSpeed = animation.properties.isAutoSpeed ?? true;
          const speed = animation.properties.speed || 1.0;
          const direction = animation.properties.direction || 'left';
          const scaleFactor = animation.properties.scaleFactor || 1.2;

          // Get original dimensions
          const originalWidth = fabricObject.width;
          const originalHeight = fabricObject.height;
          const canvasWidth = store.canvas.width;
          const canvasHeight = store.canvas.height;

          // Calculate scale to fit height while maintaining aspect ratio
          const heightScale = canvasHeight / originalHeight;
          const finalScaleY = heightScale * scaleFactor;
          const finalScaleX = heightScale * scaleFactor;

          // Calculate scaled dimensions
          const scaledWidth = originalWidth * finalScaleX;
          const scaledHeight = originalHeight * finalScaleY;

          // Calculate positions
          let startLeft, endLeft;
          if (direction === 'left') {
            // For left movement (right to left)
            startLeft = 0; // Start from visible position at left
            endLeft = -scaledWidth; // Move to completely off screen to the left
          } else {
            // For right movement (left to right)
            startLeft = canvasWidth - scaledWidth; // Start from visible position at right
            endLeft = canvasWidth; // Move to completely off screen to the right
          }

          // Calculate duration
          const duration = isAutoSpeed
            ? editorElement.timeFrame.end - editorElement.timeFrame.start
            : 1000 / speed;

          // Set initial position and scale
          fabricObject.set({
            scaleX: finalScaleX,
            scaleY: finalScaleY,
            top: 0, // Align to top since we're scaling to full height
            left: startLeft,
          });
          fabricObject.setCoords();

          // Create the animation
          store.animationTimeLine.add(
            {
              targets: fabricObject,
              left: [startLeft, endLeft],
              duration: duration,
              easing: store.getEasingFromAnimation(animation, 'linear'),
              update: () => {
                fabricObject.setCoords();
                store.canvas.requestRenderAll();
              },
            },
            editorElement.timeFrame.start
          );
          break;
        }

        case 'zoomEffect': {
          // Apply static base opacity if set in FrameEditingPanel
          if (animation.properties?.opacity !== undefined) {
            fabricObject.set({ opacity: animation.properties.opacity });
          }

          const animationType = animation.properties.animationType || 'zoomIn';
          const scaleFactor = animation.properties.scaleFactor || 1.0; // Початковий масштаб
          const targetScale = animation.properties.targetScale ?? 2.0; // Цільовий масштаб
          const smoothReturn = animation.properties.smoothReturn ?? false;
          const isAutoSpeed = animation.properties.isAutoSpeed ?? true;
          const speed = animation.properties.speed || 1.0;
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 1000;
          const curveData = animation.properties.curveData;
          const origin = animation.properties.origin || 'center';

          // Calculate animation timing
          const elementStart = editorElement.timeFrame.start;
          const elementEnd = editorElement.timeFrame.end;
          const elementDuration = elementEnd - elementStart;
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );
          const animationEnd = store.getAnimationEndTime(
            animation,
            editorElement,
            endTime
          );
          const animationDuration = endTime - startTime;

          // Create easing from curve data using the universal helper function
          const customEasing = store.getEasingFromAnimation(
            animation,
            'easeOutQuad'
          );

          // Get initial state
          const initialState = editorElement.initialState || {
            scaleX: fabricObject.scaleX,
            scaleY: fabricObject.scaleY,
            left: fabricObject.left,
            top: fabricObject.top,
            opacity: fabricObject.opacity,
          };

          // Define original (initial) state using scaleFactor as initial scale
          const originalValues = {
            scaleX: initialState.scaleX * scaleFactor,
            scaleY: initialState.scaleY * scaleFactor,
            left: initialState.left,
            top: initialState.top,
          };

          // Define true initial state for reset (without scaleFactor)
          const trueInitialState = {
            scaleX: initialState.scaleX,
            scaleY: initialState.scaleY,
            left: initialState.left,
            top: initialState.top,
            opacity: initialState.opacity,
          };

          // Calculate effect values based on animation type
          let effectValues = {};

          effectValues = {
            scaleX: initialState.scaleX * targetScale,
            scaleY: initialState.scaleY * targetScale,
          };

          // Validate effect values to ensure they're reasonable - allow negative scales
          effectValues.scaleX = Math.max(-5, Math.min(5, effectValues.scaleX));
          effectValues.scaleY = Math.max(-5, Math.min(5, effectValues.scaleY));
          // no opacity track in zoomEffect to avoid conflicts with fade effects

          // Calculate dimensions
          const width = fabricObject.width;
          const height = fabricObject.height;

          // Calculate position adjustments based on origin point
          let originalLeft = originalValues.left;
          let originalTop = originalValues.top;
          let effectLeft = originalValues.left;
          let effectTop = originalValues.top;

          if (
            origin.type === 'custom' &&
            typeof origin.x === 'number' &&
            typeof origin.y === 'number'
          ) {
            // For custom origin, calculate the offset from the origin point
            const originX = width * (origin.x / 100);
            const originY = height * (origin.y / 100);

            // Calculate the position adjustment for original scale
            const originalScaleChangeX =
              originalValues.scaleX - initialState.scaleX;
            const originalScaleChangeY =
              originalValues.scaleY - initialState.scaleY;

            originalLeft = initialState.left - originX * originalScaleChangeX;
            originalTop = initialState.top - originY * originalScaleChangeY;

            // Calculate the position adjustment for effect scale
            const effectScaleChangeX =
              effectValues.scaleX - initialState.scaleX;
            const effectScaleChangeY =
              effectValues.scaleY - initialState.scaleY;

            effectLeft = initialState.left - originX * effectScaleChangeX;
            effectTop = initialState.top - originY * effectScaleChangeY;
          } else {
            // For predefined origins
            const originalScaleChangeX =
              originalValues.scaleX - initialState.scaleX;
            const originalScaleChangeY =
              originalValues.scaleY - initialState.scaleY;
            const effectScaleChangeX =
              effectValues.scaleX - initialState.scaleX;
            const effectScaleChangeY =
              effectValues.scaleY - initialState.scaleY;

            switch (origin) {
              case 'top':
                originalLeft =
                  initialState.left - (width * originalScaleChangeX) / 2;
                originalTop = initialState.top;
                effectLeft =
                  initialState.left - (width * effectScaleChangeX) / 2;
                effectTop = initialState.top;
                break;
              case 'bottom':
                originalLeft =
                  initialState.left - (width * originalScaleChangeX) / 2;
                originalTop = initialState.top - height * originalScaleChangeY;
                effectLeft =
                  initialState.left - (width * effectScaleChangeX) / 2;
                effectTop = initialState.top - height * effectScaleChangeY;
                break;
              case 'left':
                originalLeft = initialState.left;
                originalTop =
                  initialState.top - (height * originalScaleChangeY) / 2;
                effectLeft = initialState.left;
                effectTop =
                  initialState.top - (height * effectScaleChangeY) / 2;
                break;
              case 'right':
                originalLeft = initialState.left - width * originalScaleChangeX;
                originalTop =
                  initialState.top - (height * originalScaleChangeY) / 2;
                effectLeft = initialState.left - width * effectScaleChangeX;
                effectTop =
                  initialState.top - (height * effectScaleChangeY) / 2;
                break;
              default: // center
                originalLeft =
                  initialState.left - (width * originalScaleChangeX) / 2;
                originalTop =
                  initialState.top - (height * originalScaleChangeY) / 2;
                effectLeft =
                  initialState.left - (width * effectScaleChangeX) / 2;
                effectTop =
                  initialState.top - (height * effectScaleChangeY) / 2;
            }
          }

          // Update position values
          originalValues.left = originalLeft;
          originalValues.top = originalTop;
          effectValues.left = effectLeft;
          effectValues.top = effectTop;

          // Set initial state to original for unified effects
          fabricObject.set(originalValues);
          fabricObject.setCoords();

          // Create the effect animation (original → effect)
          try {
            // Apply speed multiplier to animation duration (higher speed = shorter duration)
            const effectiveAnimationDuration = isAutoSpeed
              ? animationDuration
              : Math.max(100, animationDuration / speed); // Minimum 100ms

            store.animationTimeLine.add(
              {
                targets: fabricObject,
                scaleX: [originalValues.scaleX, effectValues.scaleX],
                scaleY: [originalValues.scaleY, effectValues.scaleY],
                left: [originalValues.left, effectValues.left],
                top: [originalValues.top, effectValues.top],
                // do not animate opacity in zoomEffect
                duration: effectiveAnimationDuration,
                easing: customEasing,
                update: () => {
                  try {
                    fabricObject.setCoords();
                    store.canvas.requestRenderAll();
                  } catch (e) {
                    console.warn('Effect animation update error:', e);
                  }
                },
                complete: () => {
                  try {
                    // Only reset to true initial state if smooth return is disabled
                    // or there's no time for smooth return
                    if (!smoothReturn || animationEnd >= elementEnd) {
                      fabricObject.set({
                        scaleX: trueInitialState.scaleX,
                        scaleY: trueInitialState.scaleY,
                        left: trueInitialState.left,
                        top: trueInitialState.top,
                      });
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    }
                  } catch (e) {
                    console.warn('Failed to handle animation completion:', e);
                    // Fallback only if no smooth return is expected
                    if (!smoothReturn || animationEnd >= elementEnd) {
                      try {
                        fabricObject.set({
                          scaleX: trueInitialState.scaleX,
                          scaleY: trueInitialState.scaleY,
                          left: trueInitialState.left,
                          top: trueInitialState.top,
                        });
                        fabricObject.setCoords();
                        store.canvas.requestRenderAll();
                      } catch (fallbackError) {
                        console.error(
                          'Failed fallback restoration:',
                          fallbackError
                        );
                      }
                    }
                  }
                },
              },
              animationStart
            );

            // Create smooth return animation only if smoothReturn is enabled and needed
            if (smoothReturn && animationEnd < elementEnd) {
              const returnDuration = Math.min(
                animationDuration,
                elementEnd - animationEnd
              );

              // For fadeOut, we might want to stay in effect state or return gradually
              let returnToValues = trueInitialState;

              if (animationType === 'fadeOut') {
                // For fadeOut, return to original slowly to create a lingering effect
                returnToValues = {
                  ...trueInitialState,
                  opacity: Math.max(
                    trueInitialState.opacity * 0.8,
                    effectValues.opacity
                  ),
                };
              }

              // Apply speed multiplier to return animation duration
              const effectiveReturnDuration = isAutoSpeed
                ? returnDuration
                : Math.max(100, returnDuration / speed); // Minimum 100ms

              store.animationTimeLine.add(
                {
                  targets: fabricObject,
                  scaleX: [effectValues.scaleX, returnToValues.scaleX],
                  scaleY: [effectValues.scaleY, returnToValues.scaleY],
                  left: [effectValues.left, returnToValues.left],
                  top: [effectValues.top, returnToValues.top],
                  // do not animate opacity in zoomEffect
                  duration: effectiveReturnDuration,
                  easing: customEasing,
                  update: () => {
                    try {
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    } catch (e) {
                      console.warn('Return animation update error:', e);
                    }
                  },
                  complete: () => {
                    try {
                      // Ensure we reset to the true initial state when smooth return completes
                      fabricObject.set({
                        scaleX: trueInitialState.scaleX,
                        scaleY: trueInitialState.scaleY,
                        left: trueInitialState.left,
                        top: trueInitialState.top,
                      });
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    } catch (e) {
                      console.warn('Return animation complete error:', e);
                      // Fallback
                      try {
                        fabricObject.set({
                          scaleX: trueInitialState.scaleX,
                          scaleY: trueInitialState.scaleY,
                          left: trueInitialState.left,
                          top: trueInitialState.top,
                        });
                        fabricObject.setCoords();
                        store.canvas.requestRenderAll();
                      } catch (fallbackError) {
                        console.error(
                          'Failed smooth return reset:',
                          fallbackError
                        );
                      }
                    }
                  },
                },
                animationEnd
              );
            }
          } catch (e) {
            console.error('Failed to create zoomEffect animation:', e);
            // Fallback to simple linear animation
            const effectiveFallbackDuration = isAutoSpeed
              ? animationDuration
              : Math.max(100, animationDuration / speed); // Minimum 100ms

            store.animationTimeLine.add(
              {
                targets: fabricObject,
                scaleX: [originalValues.scaleX, effectValues.scaleX],
                scaleY: [originalValues.scaleY, effectValues.scaleY],
                left: [originalValues.left, effectValues.left],
                top: [originalValues.top, effectValues.top],
                // do not animate opacity in zoomEffect
                duration: effectiveFallbackDuration,
                easing: 'linear',
                update: () => {
                  fabricObject.setCoords();
                  store.canvas.requestRenderAll();
                },
                complete: () => {
                  // Reset transform/position after fallback animation
                  fabricObject.set({
                    scaleX: trueInitialState.scaleX,
                    scaleY: trueInitialState.scaleY,
                    left: trueInitialState.left,
                    top: trueInitialState.top,
                  });
                  fabricObject.setCoords();
                  store.canvas.requestRenderAll();
                },
              },
              animationStart
            );
          }
          break;
        }

        case 'fadeEffect': {
          // Apply static base opacity if set in FrameEditingPanel
          if (animation.properties?.opacity !== undefined) {
            fabricObject.set({ opacity: animation.properties.opacity });
          }

          const animationType = animation.properties.animationType || 'fadeIn';
          const opacityFactor = animation.properties.opacity || 1.0;
          const targetOpacity = animation.properties.targetOpacity ?? 0.3;
          const scaleFactor = animation.properties.scaleFactor ?? 1.0; // Get scaleFactor from animation
          const smoothReturn = animation.properties.smoothReturn ?? false;
          const isAutoSpeed = animation.properties.isAutoSpeed ?? true;
          const speed = animation.properties.speed || 1.0;
          const startTime = animation.properties.startTime || 0;
          const endTime =
            animation.properties.endTime || animation.duration || 1000;
          const curveData = animation.properties.curveData;

          // Calculate animation timing
          const elementStart = editorElement.timeFrame.start;
          const elementEnd = editorElement.timeFrame.end;
          const elementDuration = elementEnd - elementStart;
          const animationStart = store.getAnimationStartTime(
            animation,
            editorElement,
            startTime
          );
          const animationEnd = store.getAnimationEndTime(
            animation,
            editorElement,
            endTime
          );
          const animationDuration = endTime - startTime;

          // Create easing from curve data using the universal helper function
          const customEasing = store.getEasingFromAnimation(
            animation,
            'easeOutQuad'
          );

          // Use initial state consistently with zoomEffect for proper stacking
          const baseState = editorElement.initialState || {
            scaleX: fabricObject.scaleX,
            scaleY: fabricObject.scaleY,
            left: fabricObject.left,
            top: fabricObject.top,
            opacity: fabricObject.opacity,
          };

          // Define original (normal) state - apply scaleFactor here
          const originalValues = {
            opacity: animation.properties?.opacity ?? 1,
            scaleX: baseState.scaleX * scaleFactor, // Apply scaleFactor
            scaleY: baseState.scaleY * scaleFactor, // Apply scaleFactor
            left: baseState.left,
            top: baseState.top,
          };

          // Calculate center position for scaling
          const centerX =
            baseState.left + (fabricObject.width * baseState.scaleX) / 2;
          const centerY =
            baseState.top + (fabricObject.height * baseState.scaleY) / 2;

          // Adjust position to maintain center scaling
          originalValues.left =
            centerX - (fabricObject.width * originalValues.scaleX) / 2;
          originalValues.top =
            centerY - (fabricObject.height * originalValues.scaleY) / 2;

          // Calculate effect values based on animation type
          let effectValues = {};

          effectValues = {
            opacity: Math.max(0, Math.min(1, targetOpacity)),
            scaleX: originalValues.scaleX, // Use the scaled values
            scaleY: originalValues.scaleY, // Use the scaled values
            left: originalValues.left,
            top: originalValues.top,
          };

          // Validate opacity values
          effectValues.opacity = Math.max(0, Math.min(1, effectValues.opacity));

          // Set only the properties that fadeEffect controls (avoid overriding position from zoomEffect)
          fabricObject.set({
            opacity: originalValues.opacity,
            // Only set scale if fadeEffect has its own scaleFactor different from 1.0
            ...(scaleFactor !== 1.0
              ? {
                  scaleX: originalValues.scaleX,
                  scaleY: originalValues.scaleY,
                  left: originalValues.left,
                  top: originalValues.top,
                }
              : {}),
          });
          fabricObject.setCoords();

          // Create the fade effect animation (original → effect)
          try {
            // Apply speed multiplier to animation duration (higher speed = shorter duration)
            const effectiveAnimationDuration = isAutoSpeed
              ? animationDuration
              : Math.max(100, animationDuration / speed); // Minimum 100ms

            store.animationTimeLine.add(
              {
                targets: fabricObject,
                opacity: [originalValues.opacity, effectValues.opacity],
                // Only animate scale and position if fadeEffect has its own scaleFactor
                ...(scaleFactor !== 1.0
                  ? {
                      scaleX: [originalValues.scaleX, effectValues.scaleX],
                      scaleY: [originalValues.scaleY, effectValues.scaleY],
                      left: [originalValues.left, effectValues.left],
                      top: [originalValues.top, effectValues.top],
                    }
                  : {}),
                duration: effectiveAnimationDuration,
                easing: customEasing,
                update: () => {
                  try {
                    fabricObject.setCoords();
                    store.canvas.requestRenderAll();
                  } catch (e) {
                    console.warn('fadeEffect animation update error:', e);
                  }
                },
                complete: () => {
                  try {
                    // Only reset to true initial state if smooth return is disabled
                    // or there's no time for smooth return
                    if (!smoothReturn || animationEnd >= elementEnd) {
                      // Only reset the properties that fadeEffect controls
                      fabricObject.set({
                        opacity: baseState.opacity,
                        // Only reset scale/position if fadeEffect has its own scaleFactor
                        ...(scaleFactor !== 1.0
                          ? {
                              scaleX: baseState.scaleX,
                              scaleY: baseState.scaleY,
                              left: baseState.left,
                              top: baseState.top,
                            }
                          : {}),
                      });
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    }
                  } catch (e) {
                    console.warn(
                      'Failed to handle fadeEffect animation completion:',
                      e
                    );
                    // Only try to reset on error if no smooth return is expected
                    if (!smoothReturn || animationEnd >= elementEnd) {
                      try {
                        // Only reset the properties that fadeEffect controls
                        fabricObject.set({
                          opacity: baseState.opacity,
                          // Only reset scale/position if fadeEffect has its own scaleFactor
                          ...(scaleFactor !== 1.0
                            ? {
                                scaleX: baseState.scaleX,
                                scaleY: baseState.scaleY,
                                left: baseState.left,
                                top: baseState.top,
                              }
                            : {}),
                        });
                        fabricObject.setCoords();
                        store.canvas.requestRenderAll();
                      } catch (fallbackError) {
                        console.error(
                          'Failed fadeEffect fallback restoration:',
                          fallbackError
                        );
                      }
                    }
                  }
                },
              },
              animationStart
            );

            // Create smooth return animation only if smoothReturn is enabled and needed
            if (smoothReturn && animationEnd < elementEnd) {
              const returnDuration = Math.min(
                animationDuration,
                elementEnd - animationEnd
              );

              // Apply speed multiplier to return animation duration
              const effectiveReturnDuration = isAutoSpeed
                ? returnDuration
                : Math.max(100, returnDuration / speed); // Minimum 100ms

              store.animationTimeLine.add(
                {
                  targets: fabricObject,
                  opacity: [effectValues.opacity, baseState.opacity],
                  // Only animate scale and position if fadeEffect has its own scaleFactor
                  ...(scaleFactor !== 1.0
                    ? {
                        scaleX: [effectValues.scaleX, baseState.scaleX],
                        scaleY: [effectValues.scaleY, baseState.scaleY],
                        left: [effectValues.left, baseState.left],
                        top: [effectValues.top, baseState.top],
                      }
                    : {}),
                  duration: effectiveReturnDuration,
                  easing: customEasing,
                  update: () => {
                    try {
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    } catch (e) {
                      console.warn(
                        'fadeEffect return animation update error:',
                        e
                      );
                    }
                  },
                  complete: () => {
                    try {
                      // Ensure we reset to the base state when smooth return completes
                      fabricObject.set({
                        opacity: baseState.opacity,
                        // Only reset scale/position if fadeEffect has its own scaleFactor
                        ...(scaleFactor !== 1.0
                          ? {
                              scaleX: baseState.scaleX,
                              scaleY: baseState.scaleY,
                              left: baseState.left,
                              top: baseState.top,
                            }
                          : {}),
                      });
                      fabricObject.setCoords();
                      store.canvas.requestRenderAll();
                    } catch (e) {
                      console.warn(
                        'fadeEffect return animation complete error:',
                        e
                      );
                      // Fallback
                      try {
                        fabricObject.set({
                          opacity: baseState.opacity,
                          // Only reset scale/position if fadeEffect has its own scaleFactor
                          ...(scaleFactor !== 1.0
                            ? {
                                scaleX: baseState.scaleX,
                                scaleY: baseState.scaleY,
                                left: baseState.left,
                                top: baseState.top,
                              }
                            : {}),
                        });
                        fabricObject.setCoords();
                        store.canvas.requestRenderAll();
                      } catch (fallbackError) {
                        console.error(
                          'Failed fadeEffect smooth return reset:',
                          fallbackError
                        );
                      }
                    }
                  },
                },
                animationEnd
              );
            }
          } catch (e) {
            console.error('Failed to create fadeEffect animation:', e);
            // Fallback to simple linear animation
            store.animationTimeLine.add(
              {
                targets: fabricObject,
                opacity: [originalValues.opacity, effectValues.opacity],
                scaleX: [originalValues.scaleX, effectValues.scaleX],
                scaleY: [originalValues.scaleY, effectValues.scaleY],
                left: [originalValues.left, effectValues.left],
                top: [originalValues.top, effectValues.top],
                duration: animationDuration,
                easing: 'linear',
                update: () => {
                  fabricObject.setCoords();
                  store.canvas.requestRenderAll();
                },
                complete: () => {
                  // Reset to base state after fallback animation
                  const trueInitialState = {
                    opacity: baseState.opacity,
                    scaleX: baseState.scaleX,
                    scaleY: baseState.scaleY,
                    left: baseState.left,
                    top: baseState.top,
                  };
                  fabricObject.set(trueInitialState);
                  fabricObject.setCoords();
                  store.canvas.requestRenderAll();
                },
              },
              animationStart
            );
          }
          break;
        }

        // Add new case for text word animation
        case 'textWordHighlight': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];
            const defaultColor = editorElement.properties.color || '#ffffff';
            const activeColor =
              editorElement.properties.highlightColor || '#FFD700';

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                // Check if the word should be visible initially
                const currentTime = store.currentTimeInMs;
                const isInTimeFrame =
                  editorElement.timeFrame.start <= currentTime &&
                  currentTime <= editorElement.timeFrame.end;

                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: defaultColor,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: fabricObject.originY,
                    paintFirst: fabricObject.paintFirst,
                    opacity: 0,
                    visible: false,
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);
                textObjects.push(wordObject);
                store.canvas.add(wordObject);
                wordObject.bringToFront();
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;
            editorElement.properties.defaultColor = defaultColor;
            editorElement.properties.activeColor = activeColor;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);

            // Force update to current time to show words correctly
            store.updateTimeTo(store.currentTimeInMs);
          }
          break;
        }

        case 'textWordAnimation': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: fabricObject.fill,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: fabricObject.originY,
                    paintFirst: fabricObject.paintFirst,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);
                textObjects.push(wordObject);
                store.canvas.add(wordObject);
                wordObject.bringToFront();
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);

            // Animate each word
            words.forEach((word, index) => {
              const wordObject = textObjects[index];
              if (!wordObject) return;

              const wordStart = word.start;
              const wordDuration = 200;

              // Set initial position (20px above)
              const finalTop = wordObject.top;
              const startTop = finalTop + 20;

              wordObject.set({
                top: startTop,
                opacity: 0,
              });

              // Slide up + fade in animation
              store.animationTimeLine.add(
                {
                  targets: wordObject,
                  top: [startTop, finalTop],
                  opacity: [0, 1],
                  duration: wordDuration,
                  easing: 'easeOutCubic',
                  begin: () => {
                    wordObject.set('opacity', 0);
                    store.canvas.requestRenderAll();
                  },
                  update: () => {
                    store.canvas.requestRenderAll();
                  },
                },
                wordStart
              );

              // Add a "hold" animation to keep the word visible
              const holdDuration =
                editorElement.timeFrame.end - wordStart - wordDuration * 2;
              if (holdDuration > 0) {
                store.animationTimeLine.add(
                  {
                    targets: wordObject,
                    opacity: 1,
                    duration: holdDuration,
                    easing: 'linear',
                  },
                  wordStart + wordDuration
                );
              }
            });
          }
          break;
        }

        case 'glTransition': {
          // Handle GL transitions between images
          const transitionElement = store.glTransitionElements.get(
            animation.id
          );
          if (transitionElement) {
            const startTime = animation.startTime;
            const endTime = animation.endTime;
            const duration = endTime - startTime;

            // Add fade-in/fade-out logic for elements involved in transition
            const fromElement = store.editorElements.find(
              el => el.id === animation.fromElementId
            );
            const toElement = store.editorElements.find(
              el => el.id === animation.toElementId
            );

            store.animationTimeLine.add(
              {
                targets: { progress: 0 },
                progress: [0, 1],
                duration: duration,
                easing: 'linear',
                update: anim => {
                  const progress = anim.animations[0].currentValue;
                  // More frequent updates for smoother transitions
                  requestAnimationFrame(() => {
                    store
                      .updateGLTransition(animation.id, progress)
                      .catch(error => {
                        console.error(
                          'Error updating GL transition during animation:',
                          error
                        );
                      });
                  });
                },
                begin: () => {
                  // Show transition element
                  transitionElement.fabricObject.set('opacity', 1);

                  // Only hide elements if they're not being used by other active GL transitions
                  const currentTime = store.currentTimeInMs;

                  if (fromElement && fromElement.fabricObject) {
                    const otherActiveTransitions = store.animations.filter(
                      anim =>
                        anim.type === 'glTransition' &&
                        anim.id !== animation.id &&
                        currentTime >= anim.startTime &&
                        currentTime <= anim.endTime &&
                        (anim.fromElementId === fromElement.id ||
                          anim.toElementId === fromElement.id)
                    );

                    if (otherActiveTransitions.length === 0) {
                      fromElement.fabricObject.set('visible', false);
                    }
                  }

                  if (toElement && toElement.fabricObject) {
                    const otherActiveTransitions = store.animations.filter(
                      anim =>
                        anim.type === 'glTransition' &&
                        anim.id !== animation.id &&
                        currentTime >= anim.startTime &&
                        currentTime <= anim.endTime &&
                        (anim.fromElementId === toElement.id ||
                          anim.toElementId === toElement.id)
                    );

                    if (otherActiveTransitions.length === 0) {
                      toElement.fabricObject.set('visible', false);
                    }
                  }

                  store.canvas.requestRenderAll();
                },
                complete: () => {
                  // Hide transition element
                  transitionElement.fabricObject.set('opacity', 0);

                  const currentTime = store.currentTimeInMs;

                  // Show the "to" element after transition completes, but only if not used by other active transitions
                  if (toElement && toElement.fabricObject) {
                    const toIsVisible =
                      toElement.timeFrame.start <= currentTime &&
                      currentTime <= toElement.timeFrame.end;

                    const otherActiveTransitions = store.animations.filter(
                      anim =>
                        anim.type === 'glTransition' &&
                        anim.id !== animation.id &&
                        currentTime >= anim.startTime &&
                        currentTime <= anim.endTime &&
                        (anim.fromElementId === toElement.id ||
                          anim.toElementId === toElement.id)
                    );

                    // Only show if visible in timeline and not used by other active transitions
                    if (toIsVisible && otherActiveTransitions.length === 0) {
                      toElement.fabricObject.set('visible', true);
                    }
                  }

                  // Show the "from" element after transition completes, but only if not used by other active transitions
                  if (fromElement && fromElement.fabricObject) {
                    const fromIsVisible =
                      fromElement.timeFrame.start <= currentTime &&
                      currentTime <= fromElement.timeFrame.end;

                    const otherActiveTransitions = store.animations.filter(
                      anim =>
                        anim.type === 'glTransition' &&
                        anim.id !== animation.id &&
                        currentTime >= anim.startTime &&
                        currentTime <= anim.endTime &&
                        (anim.fromElementId === fromElement.id ||
                          anim.toElementId === fromElement.id)
                    );

                    // Only show if visible in timeline and not used by other active transitions
                    if (fromIsVisible && otherActiveTransitions.length === 0) {
                      fromElement.fabricObject.set('visible', true);
                    }
                  }

                  store.canvas.requestRenderAll();
                },
              },
              startTime
            );
          }
          break;
        }

        case 'textWordStatic': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];
            const defaultColor = editorElement.properties.color || '#ffffff'; // використовуємо колір шрифту

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              // Check if the word should be visible initially
              const currentTime = store.currentTimeInMs;
              const isInTimeFrame =
                editorElement.timeFrame.start <= currentTime &&
                currentTime <= editorElement.timeFrame.end;

              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: defaultColor,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: fabricObject.originY,
                    paintFirst: fabricObject.paintFirst,
                    opacity: isInTimeFrame ? 1 : 0, // Only visible if in time frame
                    visible: isInTimeFrame, // Only visible if in time frame
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);
                textObjects.push(wordObject);
                store.canvas.add(wordObject);
                wordObject.bringToFront();
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;
            editorElement.properties.defaultColor = defaultColor;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);
          }
          break;
        }

        case 'textWordMotion': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  // Remove the background rectangle if it exists
                  if (
                    obj._backgroundRect &&
                    store.canvas.contains(obj._backgroundRect)
                  ) {
                    store.canvas.remove(obj._backgroundRect);
                  }
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];
            const defaultColor = editorElement.properties.color || '#ffffff'; // колір тексту
            const motionColor =
              editorElement.properties.motionColor || '#FFD700'; // колір фону для motion

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: defaultColor,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: 'top', // Change to 'top' for consistent positioning
                    paintFirst: fabricObject.paintFirst,
                    opacity: 0,
                    visible: false,
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                // Create a background rectangle for store word with dynamic padding
                const horizontalPadding = Math.max(
                  6,
                  fabricObject.fontSize * 0.1
                ); // 10% of font size, min 6px
                const verticalPadding = Math.max(
                  4,
                  fabricObject.fontSize * 0.08
                ); // 8% of font size, min 4px
                const borderRadius = Math.max(6, fabricObject.fontSize * 0.12); // 12% of font size for rounded corners, min 6px

                // Calculate actual text width for store specific word
                const tempText = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                  }
                );
                const actualWordWidth = tempText.width;

                // Clean up temporary object
                tempText.dispose && tempText.dispose();

                const wordBackground = new fabric.Rect({
                  left: currentLeft - horizontalPadding,
                  top: adjustedTop - verticalPadding,
                  width: actualWordWidth + horizontalPadding * 2,
                  height: fabricObject.fontSize + verticalPadding * 2,
                  fill: 'transparent',
                  opacity: 0,
                  selectable: false,
                  evented: false,
                  visible: true,
                  rx: borderRadius, // Rounded corners
                  ry: borderRadius,
                  originX: 'left',
                  originY: 'top',
                });

                // Initialize motion state for proper tracking
                wordObject._lastMotionState = {
                  wasActive: false,
                  backgroundColor: 'transparent',
                };
                wordObject._isAnimatingBackground = false;
                wordObject._backgroundRect = wordBackground;

                // Sync background position with text position
                wordBackground._textObject = wordObject;

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);

                // Add background first (so it's behind the text)
                store.canvas.add(wordBackground);
                // Then add the text on top
                store.canvas.add(wordObject);
                wordObject.bringToFront();

                // Ensure background position is perfectly aligned
                store.syncBackgroundPosition(wordObject);

                // Debug: log positions to verify alignment

                textObjects.push(wordObject);
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;
            editorElement.properties.defaultColor = defaultColor;
            editorElement.properties.motionColor = motionColor;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);

            // Force update to current time to show words correctly
            store.updateTimeTo(store.currentTimeInMs);
          }
          break;
        }

        case 'textWordFalling': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: fabricObject.fill,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: fabricObject.originY,
                    paintFirst: fabricObject.paintFirst,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);
                textObjects.push(wordObject);
                store.canvas.add(wordObject);
                wordObject.bringToFront();
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);

            // Animate each word with falling effect
            words.forEach((word, index) => {
              const wordObject = textObjects[index];
              if (!wordObject) return;

              const wordStart = word.start;
              const wordDuration = 300; // Slightly longer for falling effect

              // Set initial position and scale (large scale, above final position)
              const finalTop = wordObject.top;
              const finalLeft = wordObject.left;
              const finalScaleX = 1;
              const finalScaleY = 1;

              // Initial state: larger scale, higher position
              const startScaleX = 2.5; // Start 2.5x larger
              const startScaleY = 2.5;
              const startTop = finalTop - 100; // Start 100px above

              // Calculate initial left position to keep word centered while scaled
              const scaleDiff = startScaleX - finalScaleX;
              const wordWidth = wordObject.width;
              const startLeft = finalLeft - (wordWidth * scaleDiff) / 2;

              wordObject.set({
                left: startLeft,
                top: startTop,
                scaleX: startScaleX,
                scaleY: startScaleY,
                opacity: 0,
              });

              // Falling + scale down + fade in animation
              store.animationTimeLine.add(
                {
                  targets: wordObject,
                  left: [startLeft, finalLeft],
                  top: [startTop, finalTop],
                  scaleX: [startScaleX, finalScaleX],
                  scaleY: [startScaleY, finalScaleY],
                  opacity: [0, 1],
                  duration: wordDuration,
                  easing: 'linear', // Linear movement for smooth falling
                  begin: () => {
                    wordObject.set('opacity', 0);
                    store.canvas.requestRenderAll();
                  },
                  update: () => {
                    wordObject.setCoords();
                    store.canvas.requestRenderAll();
                  },
                },
                wordStart
              );

              // Add a "hold" animation to keep the word visible
              const fadeOutDuration = 200; // Duration for fade out
              const holdDuration =
                editorElement.timeFrame.end -
                wordStart -
                wordDuration -
                fadeOutDuration;
              if (holdDuration > 0) {
                store.animationTimeLine.add(
                  {
                    targets: wordObject,
                    opacity: 1,
                    duration: holdDuration,
                    easing: 'linear',
                  },
                  wordStart + wordDuration
                );
              }

              // Add fade out animation at the end
              store.animationTimeLine.add(
                {
                  targets: wordObject,
                  opacity: [1, 0],
                  duration: fadeOutDuration,
                  easing: 'easeOutCubic',
                  update: () => {
                    store.canvas.requestRenderAll();
                  },
                },
                editorElement.timeFrame.end - fadeOutDuration
              );
            });
          }
          break;
        }

        case 'textWordPopUp': {
          if (
            editorElement.type === 'text' &&
            editorElement.properties.words?.length > 0
          ) {
            // Remove existing word objects if they exist
            if (editorElement.properties.wordObjects?.length > 0) {
              editorElement.properties.wordObjects.forEach(obj => {
                if (obj && store.canvas.contains(obj)) {
                  store.canvas.remove(obj);
                }
              });
            }

            const words = editorElement.properties.words;
            const textObjects = [];

            // Get text metrics from original object
            const originalWidth = fabricObject.width;
            const originalLeft = fabricObject.left;
            const originalTop = fabricObject.top;

            // Calculate space width based on font size and word spacing factor
            const baseSpaceWidth = fabricObject.fontSize / 3;
            const spaceWidth =
              baseSpaceWidth + store.subtitlesPanelState.wordSpacingFactor;

            // Calculate lines and positions using the centralized method
            const { lines, lineHeights } = store.calculateWordLines(
              words,
              fabricObject,
              originalWidth,
              spaceWidth
            );

            // Calculate total height adjustment needed for centering all lines
            const totalLinesHeight = lineHeights.reduce(
              (sum, height) => sum + height,
              0
            );
            const originalTotalHeight =
              lineHeights.length * fabricObject.fontSize;
            const totalExtraSpace = totalLinesHeight - originalTotalHeight;
            const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

            // Create and position word objects line by line
            let currentTop = originalTop + startingTopAdjustment;
            lines.forEach((line, lineIndex) => {
              const lineLeft = store.calculateLineStartPosition(
                line,
                originalLeft,
                originalWidth,
                fabricObject.textAlign,
                spaceWidth
              );

              // Calculate vertical centering for store line
              const lineHeight =
                lineHeights[lineIndex] || fabricObject.fontSize;
              const extraSpace = lineHeight - fabricObject.fontSize;
              const verticalOffset = extraSpace / 2;
              const adjustedTop = currentTop + verticalOffset;

              let currentLeft = lineLeft;

              line.forEach((wordData, wordIndex) => {
                const wordObject = new fabric.Text(
                  wordData.word.word || wordData.word.text || '',
                  {
                    left: currentLeft,
                    top: adjustedTop,
                    fontSize: fabricObject.fontSize,
                    fontWeight: fabricObject.fontWeight,
                    fontFamily: fabricObject.fontFamily,
                    fontStyle: fabricObject.fontStyle || 'normal',
                    fill: fabricObject.fill,
                    stroke: fabricObject.stroke,
                    strokeWidth: fabricObject.strokeWidth,
                    strokeMiterLimit: fabricObject.strokeMiterLimit,
                    shadow: fabricObject.shadow,
                    textAlign: 'left',
                    originX: 'left',
                    originY: fabricObject.originY,
                    paintFirst: fabricObject.paintFirst,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    objectCaching: true,
                    charSpacing:
                      store.subtitlesPanelState.letterSpacingFactor || 0,
                    lineHeight:
                      store.subtitlesPanelState.lineHeightFactor || 1.2,
                  }
                );

                currentLeft +=
                  wordData.width +
                  (wordIndex < line.length - 1 ? spaceWidth : 0);
                textObjects.push(wordObject);
                store.canvas.add(wordObject);
                wordObject.bringToFront();
              });

              currentTop += lineHeight;
            });

            // Store word objects reference
            editorElement.properties.wordObjects = textObjects;

            // Set proper z-index for words based on shadow angle
            store.updateWordZIndex(editorElement);

            // Hide original text object
            fabricObject.set('opacity', 0);

            // Animate each word with pop up effect
            words.forEach((word, index) => {
              const wordObject = textObjects[index];
              if (!wordObject) return;

              const wordStart = word.start;
              const wordDuration = 400; // Slightly longer for pop up effect

              // Set initial position and scale (small scale, far away)
              const finalTop = wordObject.top;
              const finalLeft = wordObject.left;
              const finalScaleX = 1;
              const finalScaleY = 1;

              // Initial state: small scale (far away) and slightly above
              const startScaleX = 0.2; // Start small (far away)
              const startScaleY = 0.2;
              const startTop = finalTop - 30; // Just slightly above for perspective

              // Calculate initial left position to keep word centered
              const wordWidth = wordObject.width;
              const startLeft = finalLeft + wordWidth * 0.4; // Slight offset for perspective

              wordObject.set({
                left: startLeft,
                top: startTop,
                scaleX: startScaleX,
                scaleY: startScaleY,
                opacity: 0,
              });

              // Pop up animation (from small/far to large/close)
              store.animationTimeLine.add(
                {
                  targets: wordObject,
                  left: [startLeft, finalLeft],
                  top: [startTop, finalTop],
                  scaleX: [startScaleX, finalScaleX],
                  scaleY: [startScaleY, finalScaleY],
                  opacity: [0, 1],
                  duration: wordDuration,
                  easing: 'easeOutQuart', // Smooth deceleration for Z-axis movement
                  begin: () => {
                    wordObject.set('opacity', 0);
                    store.canvas.requestRenderAll();
                  },
                  update: () => {
                    wordObject.setCoords();
                    store.canvas.requestRenderAll();
                  },
                },
                wordStart
              );

              // Add a "hold" animation to keep the word visible
              const fadeOutDuration = 200; // Duration for fade out
              const holdDuration =
                editorElement.timeFrame.end -
                wordStart -
                wordDuration -
                fadeOutDuration;
              if (holdDuration > 0) {
                store.animationTimeLine.add(
                  {
                    targets: wordObject,
                    opacity: 1,
                    duration: holdDuration,
                    easing: 'linear',
                  },
                  wordStart + wordDuration
                );
              }

              // Add fade out animation at the end
              store.animationTimeLine.add(
                {
                  targets: wordObject,
                  opacity: [1, 0],
                  duration: fadeOutDuration,
                  easing: 'easeOutCubic',
                  update: () => {
                    store.canvas.requestRenderAll();
                  },
                },
                editorElement.timeFrame.end - fadeOutDuration
              );
            });
          }
          break;
        }

        default:
          break;
      }
    });
  });

  // Process GL transitions separately
  store.animations.forEach(animation => {
    if (animation.type === 'glTransition') {
      const transitionElement = store.glTransitionElements.get(animation.id);
      if (transitionElement) {
        // Update timing based on related elements
        const fromElement = store.editorElements.find(
          el => el.id === animation.fromElementId
        );
        const toElement = store.editorElements.find(
          el => el.id === animation.toElementId
        );

        if (fromElement && toElement) {
          // Only auto-calculate timing if it hasn't been manually adjusted
          if (!animation.manuallyAdjusted) {
            // Store original duration if not already stored to prevent feedback loop
            if (!animation.originalDuration) {
              animation.originalDuration = animation.duration;
            }

            // Use original duration for calculations to prevent doubling
            const originalDuration = animation.originalDuration;

            // Calculate optimal transition timing
            const transitionStart = Math.max(
              fromElement.timeFrame.end - originalDuration,
              fromElement.timeFrame.start
            );
            const transitionEnd = Math.min(
              toElement.timeFrame.start + originalDuration,
              toElement.timeFrame.end
            );

            animation.startTime = transitionStart;
            animation.endTime = transitionEnd;
            // NEVER change duration for auto-calculated transitions - keep original
            animation.duration = originalDuration;
            if (animation.properties) {
              animation.properties.duration = originalDuration;
            }
          } else {
            // For manually adjusted transitions, ensure duration is consistent
            const actualDuration = animation.endTime - animation.startTime;
            if (Math.abs(animation.duration - actualDuration) > 1) {
              animation.duration = actualDuration;
              if (animation.properties) {
                animation.properties.duration = actualDuration;
              }
            }
          }
        }
      }
    }
  });

  // Optimize canvas rendering
  const debouncedRender = () => {
    if (store.canvas) {
      requestAnimationFrame(() => {
        store.canvas.requestRenderAll();
      });
    }
  };

  // Update the timeline's update callback to use the debounced render
  store.animationTimeLine.update = debouncedRender;

  // Clear GL transition state cache and ensure proper states after animation refresh
  store.glTransitionElements.forEach((transitionElement, transitionId) => {
    const animation = store.animations.find(anim => anim.id === transitionId);
    if (!animation || animation.type !== 'glTransition') {
      return;
    }

    // Clear cached states to force fresh texture updates
    // This prevents using outdated textures from moved/changed animations
    transitionElement.lastFromState = null;
    transitionElement.lastToState = null;

    const currentTime = store.currentTimeInMs;
    const isTransitionActive =
      currentTime >= animation.startTime && currentTime <= animation.endTime;

    if (isTransitionActive) {
      // Ensure transition element is visible during active transition
      transitionElement.fabricObject.set('opacity', 1);

      // Ensure original elements are hidden during transition
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
    }
  });

  // Ensure proper z-order for all elements after all animation updates
  store.ensureElementsZOrder();

  store.isRefreshingAnimations = false;

  store.updateTimeTo(store.currentTimeInMs);
};
