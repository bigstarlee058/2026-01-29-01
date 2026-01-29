import React, {
  useContext,
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import styles from '../Player.module.scss';
import { ButtonWithDropdown } from 'components/ButtonWithDropdown/ButtonWithDropdown';
import { AnimationPreviewFrames } from './AnimationPreviewFrames';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { RangeInput } from 'components/reusableComponents/RangeInput/RangeInput';
import { getUid } from '../../../utils';
import TimeRangeInput from 'components/reusableComponents/TimeRangeInput/TimeRangeInput';
import { CustomCheckbox } from 'components/reusableComponents/CustomCheckbox/CustomCheckbox';

// Helper function to get the first target ID from animation (supports both old and new systems)
const getAnimationTargetId = animation => {
  if (animation?.targetId) {
    return animation.targetId;
  } else if (animation?.targetIds && animation.targetIds.length > 0) {
    return animation.targetIds[0];
  }
  return null;
};

// Helper function to get target element from animation
const getAnimationTargetElement = (animation, store) => {
  const targetId = getAnimationTargetId(animation);
  return targetId ? store.editorElements.find(el => el.id === targetId) : null;
};

// Convert curve points to anime.js compatible easing function
const createEasingFromCurve = curvePoints => {
  if (!curvePoints || curvePoints.length < 2) {
    return 'linear';
  }

  // Sort points by x coordinate to ensure proper interpolation
  const sortedPoints = [...curvePoints].sort((a, b) => a.x - b.x);

  // Anime.js compatible easing function
  return function (t) {
    // t is normalized time (0 to 1)
    if (t <= 0) return sortedPoints[0].y;
    if (t >= 1) return sortedPoints[sortedPoints.length - 1].y;

    // Find the two points to interpolate between
    let leftPoint = sortedPoints[0];
    let rightPoint = sortedPoints[sortedPoints.length - 1];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (t >= sortedPoints[i].x && t <= sortedPoints[i + 1].x) {
        leftPoint = sortedPoints[i];
        rightPoint = sortedPoints[i + 1];
        break;
      }
    }

    // Linear interpolation between the two points
    if (leftPoint.x === rightPoint.x) {
      return leftPoint.y;
    }

    const ratio = (t - leftPoint.x) / (rightPoint.x - leftPoint.x);
    const result = leftPoint.y + (rightPoint.y - leftPoint.y) * ratio;

    // Ensure result is always between 0 and 1 for anime.js
    return Math.max(0, Math.min(1, result));
  };
};

// Convert curve to CSS cubic-bezier if possible (for CSS animations)
const curveToCubicBezier = curvePoints => {
  if (!curvePoints || curvePoints.length < 4) {
    return 'linear';
  }

  // Use the middle two points as control points for cubic-bezier
  const sortedPoints = [...curvePoints].sort((a, b) => a.x - b.x);
  const p1 = sortedPoints[1];
  const p2 = sortedPoints[sortedPoints.length - 2];

  return `cubic-bezier(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y})`;
};

// Enhanced curve to easing conversion with multiple format support
const convertCurveToEasing = (curvePoints, format = 'anime') => {
  if (!curvePoints || !Array.isArray(curvePoints) || curvePoints.length < 2) {
    console.warn('Invalid curve data, using default easing');
    return format === 'css' ? 'ease' : 'easeOutQuad';
  }

  try {
    // Sort points by x coordinate
    const sortedPoints = [...curvePoints].sort((a, b) => a.x - b.x);

    // Validate point structure
    const validPoints = sortedPoints.filter(
      point =>
        point &&
        typeof point === 'object' &&
        typeof point.x === 'number' &&
        typeof point.y === 'number' &&
        !isNaN(point.x) &&
        !isNaN(point.y)
    );

    if (validPoints.length < 2) {
      console.warn('Not enough valid points in curve data');
      return format === 'css' ? 'ease' : 'easeOutQuad';
    }

    // For exactly 4 points, use cubic-bezier
    if (validPoints.length === 4) {
      const p1 = validPoints[1];
      const p2 = validPoints[2];

      if (format === 'css') {
        return `cubic-bezier(${p1.x.toFixed(4)}, ${p1.y.toFixed(
          4
        )}, ${p2.x.toFixed(4)}, ${p2.y.toFixed(4)})`;
      } else {
        return `cubicBezier(${p1.x.toFixed(4)}, ${p1.y.toFixed(
          4
        )}, ${p2.x.toFixed(4)}, ${p2.y.toFixed(4)})`;
      }
    }

    // For more points, create linear() or custom function
    if (validPoints.length > 4) {
      if (format === 'css-linear') {
        // Create CSS linear() function
        const linearValues = validPoints
          .map(point => point.y.toFixed(4))
          .join(', ');
        return `linear(${linearValues})`;
      } else if (format === 'css') {
        // For CSS, fallback to approximated cubic-bezier
        const firstHalf = validPoints[Math.floor(validPoints.length * 0.33)];
        const secondHalf = validPoints[Math.floor(validPoints.length * 0.66)];
        return `cubic-bezier(${firstHalf.x.toFixed(4)}, ${firstHalf.y.toFixed(
          4
        )}, ${secondHalf.x.toFixed(4)}, ${secondHalf.y.toFixed(4)})`;
      } else {
        // For anime.js, return custom function
        return function (t) {
          if (t <= 0) return validPoints[0].y;
          if (t >= 1) return validPoints[validPoints.length - 1].y;

          // Find interpolation points
          let leftPoint = validPoints[0];
          let rightPoint = validPoints[validPoints.length - 1];

          for (let i = 0; i < validPoints.length - 1; i++) {
            if (t >= validPoints[i].x && t <= validPoints[i + 1].x) {
              leftPoint = validPoints[i];
              rightPoint = validPoints[i + 1];
              break;
            }
          }

          // Linear interpolation
          if (leftPoint.x === rightPoint.x) {
            return leftPoint.y;
          }

          const ratio = (t - leftPoint.x) / (rightPoint.x - leftPoint.x);
          const result = leftPoint.y + (rightPoint.y - leftPoint.y) * ratio;

          return Math.max(0, Math.min(1, result));
        };
      }
    }

    // For 2-3 points, create simple cubic-bezier
    if (validPoints.length >= 2) {
      const firstPoint = validPoints[0];
      const lastPoint = validPoints[validPoints.length - 1];

      if (validPoints.length === 3) {
        const midPoint = validPoints[1];
        if (format === 'css') {
          return `cubic-bezier(${midPoint.x.toFixed(4)}, ${midPoint.y.toFixed(
            4
          )}, ${midPoint.x.toFixed(4)}, ${midPoint.y.toFixed(4)})`;
        } else {
          return `cubicBezier(${midPoint.x.toFixed(4)}, ${midPoint.y.toFixed(
            4
          )}, ${midPoint.x.toFixed(4)}, ${midPoint.y.toFixed(4)})`;
        }
      } else {
        // Simple linear interpolation for 2 points
        const midX = (firstPoint.x + lastPoint.x) / 2;
        const midY = (firstPoint.y + lastPoint.y) / 2;
        if (format === 'css') {
          return `cubic-bezier(${midX.toFixed(4)}, ${midY.toFixed(
            4
          )}, ${midX.toFixed(4)}, ${midY.toFixed(4)})`;
        } else {
          return `cubicBezier(${midX.toFixed(4)}, ${midY.toFixed(
            4
          )}, ${midX.toFixed(4)}, ${midY.toFixed(4)})`;
        }
      }
    }
  } catch (error) {
    console.error('Error converting curve to easing:', error);
    return format === 'css' ? 'ease' : 'easeOutQuad';
  }
};

// Helper function to convert between different easing formats
const convertEasingFormat = (easing, fromFormat, toFormat) => {
  if (fromFormat === toFormat) return easing;

  // If it's a function, we can't easily convert
  if (typeof easing === 'function') {
    console.warn('Cannot convert function easing between formats');
    return toFormat === 'css' ? 'ease' : 'easeOutQuad';
  }

  // Convert cubic-bezier formats
  const cubicBezierMatch = easing.match(/cubic-?[Bb]ezier\(([^)]+)\)/);
  if (cubicBezierMatch) {
    const values = cubicBezierMatch[1];
    if (toFormat === 'css') {
      return `cubic-bezier(${values})`;
    } else {
      return `cubicBezier(${values})`;
    }
  }

  // Convert named easings
  const easingMap = {
    ease: { css: 'ease', anime: 'easeOutQuad' },
    'ease-in': { css: 'ease-in', anime: 'easeInQuad' },
    'ease-out': { css: 'ease-out', anime: 'easeOutQuad' },
    'ease-in-out': { css: 'ease-in-out', anime: 'easeInOutQuad' },
    linear: { css: 'linear', anime: 'linear' },
  };

  const mapping = easingMap[easing.toLowerCase()];
  if (mapping) {
    return mapping[toFormat] || easing;
  }

  return easing;
};

// Test function to verify curve conversion (for development)
const testCurveConversion = () => {
  const testCurves = [
    // 4-point curve (should become cubic-bezier)
    [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.8 },
      { x: 1, y: 1 },
    ],
    // 5-point curve (should become custom function)
    [
      { x: 0, y: 0 },
      { x: 0.2, y: 0.5 },
      { x: 0.5, y: 0.8 },
      { x: 0.8, y: 0.6 },
      { x: 1, y: 1 },
    ],
    // 2-point curve (should become simple cubic-bezier)
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  ];
  testCurves.forEach((curve, index) => {
    // Test all formats
    const animeEasing = convertCurveToEasing(curve, 'anime');
    const cssEasing = convertCurveToEasing(curve, 'css');
    const cssLinearEasing = convertCurveToEasing(curve, 'css-linear');
  });
  const exampleEasing = 'cubicBezier(0.3, 0.2, 0.7, 0.8)';
};

// Usage examples:
/*
// Example 1: Generate CSS cubic-bezier from curve
const cssEasing = convertCurveToEasing(curvePoints, 'css');
// Returns: "cubic-bezier(0.3000, 0.2000, 0.7000, 0.8000)"

// Example 2: Generate CSS linear() from multi-point curve  
const cssLinear = convertCurveToEasing(curvePoints, 'css-linear');
// Returns: "linear(0, 0.0874, 0.2047, 0.3429, 0.4929, 0.6464, 0.7961, 0.9357, 1.06, 1.1656, 1.25)"

// Example 3: Generate anime.js easing
const animeEasing = convertCurveToEasing(curvePoints, 'anime');
// Returns: "cubicBezier(0.3000, 0.2000, 0.7000, 0.8000)" or custom function

// Example 4: Convert between formats
const cssFormat = convertEasingFormat('cubicBezier(0.25, 0.1, 0.25, 1)', 'anime', 'css');
// Returns: "cubic-bezier(0.25, 0.1, 0.25, 1)"

// Example 5: Use in Web Animations API
const element = document.querySelector('.element');
element.animate({
  transform: 'scale(1.5)',
  opacity: 0.5
}, {
  duration: 1000,
  easing: convertCurveToEasing(curvePoints, 'css')
});

// Example 6: Use in anime.js
anime({
  targets: '.element',
  scale: 1.5,
  opacity: 0.5,
  duration: 1000,
  easing: convertCurveToEasing(curvePoints, 'anime')
});
*/

// Export updated functions
export {
  createEasingFromCurve,
  curveToCubicBezier,
  convertCurveToEasing,
  convertEasingFormat,
  testCurveConversion,
  applyAnimationToAllScenesWithProportionalTiming,
  applyGLTransitionToAllGaps,
  isAnimationAppliedToAllScenes,
  removeAnimationFromAllOtherScenes,
  removeAnimationFromAllScenes,
  updateAnimationWithAutoSync,
  updateAnimationWithAutoSyncForResource,
  determineEffectVariant,
  calculateGLTransitionDuration,
};

// Helper function to calculate proportional duration based on scene length
const calculateProportionalDuration = (
  originalDuration,
  originalSceneDuration,
  targetSceneDuration
) => {
  if (!originalSceneDuration || originalSceneDuration === 0)
    return originalDuration;

  // Calculate the proportion of the original scene that the animation takes
  const proportion = originalDuration / originalSceneDuration;

  // Apply the same proportion to the target scene
  const newDuration = Math.min(
    proportion * targetSceneDuration,
    targetSceneDuration
  );

  // Ensure minimum duration of 100ms
  return Math.max(newDuration, 100);
};

// Helper function to calculate GL transition duration based on gap size
const calculateGLTransitionDuration = (
  gapDuration,
  originalDuration = null
) => {
  let proportionalDuration;

  if (gapDuration <= 0) {
    // If elements overlap or touch, use minimum duration
    proportionalDuration = 600;
  } else if (gapDuration <= 500) {
    // For small gaps (≤0.5s), use 60% of gap
    proportionalDuration = Math.max(600, gapDuration * 0.6);
  } else if (gapDuration <= 2000) {
    // For medium gaps (0.5s-2s), use 50% of gap
    proportionalDuration = Math.max(600, gapDuration * 0.5);
  } else {
    // For large gaps (>2s), use 30% but cap at 2000ms
    proportionalDuration = Math.min(2000, Math.max(600, gapDuration * 0.3));
  }

  // If original animation has a specific duration preference, blend it with proportional
  if (originalDuration) {
    // Blend 70% proportional + 30% original preference
    return Math.round(proportionalDuration * 0.7 + originalDuration * 0.3);
  }

  // Use pure proportional if no original duration
  return Math.round(proportionalDuration);
};

// DEPRECATED: This function has been replaced by updateAnimationWithAutoSync
const updateAnimationForAll = (animation, animationUpdate, store) => {
  // First, remove any existing animations of the same type for this target
  const animationType = animation.type.replace(/In$|Out$|Effect$/, ''); // Get base type (fade, slide, zoom, drop)
  const existingAnimations = store.animations.filter(anim => {
    const currentType = anim.type.replace(/In$|Out$|Effect$/, '');
    return (
      (anim.targetId === animation.targetId ||
        (anim.targetIds &&
          animation.targetIds &&
          anim.targetIds.some(id => animation.targetIds.includes(id)))) &&
      currentType === animationType &&
      anim.id !== animation.id
    );
  });
  // Remove existing animations
  existingAnimations.forEach(anim => {
    store.removeAnimation(anim.id);
  });

  // Update the current animation
  store.updateAnimation(animation.id, animationUpdate);

  // Handle apply to all if enabled - but now with proportional timing
  if (store.applyToAll) {
    const selectedElement = getAnimationTargetElement(animation, store);

    if (selectedElement) {
      const originalSceneDuration =
        selectedElement.timeFrame.end - selectedElement.timeFrame.start;

      store.animations.forEach(anim => {
        const targetElement = store.editorElements.find(
          el => el.id === anim.targetId
        );

        if (
          anim.id !== animation.id &&
          targetElement?.type === selectedElement.type &&
          anim.type === animation.type
        ) {
          // Calculate proportional duration for this element
          const targetSceneDuration =
            targetElement.timeFrame.end - targetElement.timeFrame.start;
          const updatedAnimation = { ...animationUpdate };

          // Update duration proportionally if it's being changed
          if (animationUpdate.duration) {
            updatedAnimation.duration = calculateProportionalDuration(
              animationUpdate.duration,
              originalSceneDuration,
              targetSceneDuration
            );
          }

          // For unified effects, recalculate timing based on proportional duration
          if (
            (animation.type === 'zoomEffect' ||
              animation.type === 'fadeEffect') &&
            (animationUpdate.properties?.startTime !== undefined ||
              animationUpdate.properties?.endTime !== undefined)
          ) {
            const originalProperties = animationUpdate.properties || {};
            const positionType = originalProperties.animationType?.includes(
              'In'
            )
              ? 'in'
              : originalProperties.animationType?.includes('Out')
              ? 'out'
              : 'effect';

            if (positionType === 'in') {
              updatedAnimation.properties = {
                ...originalProperties,
                startTime: 0,
                endTime:
                  updatedAnimation.duration || originalProperties.endTime,
              };
            } else if (positionType === 'out') {
              updatedAnimation.properties = {
                ...originalProperties,
                startTime:
                  targetSceneDuration -
                  (updatedAnimation.duration ||
                    originalProperties.duration ||
                    1000),
                endTime: targetSceneDuration,
              };
            } else {
              // For effects, maintain relative position if possible
              const originalStartTime = originalProperties.startTime || 0;
              const originalEndTime =
                originalProperties.endTime ||
                originalProperties.duration ||
                1000;

              const startProportion = originalStartTime / originalSceneDuration;
              const endProportion = originalEndTime / originalSceneDuration;

              updatedAnimation.properties = {
                ...originalProperties,
                startTime: Math.max(0, startProportion * targetSceneDuration),
                endTime: Math.min(
                  targetSceneDuration,
                  endProportion * targetSceneDuration
                ),
              };
            }
          }

          // Remove existing animations for other elements too
          const otherExistingAnimations = store.animations.filter(otherAnim => {
            const currentType = otherAnim.type.replace(/In$|Out$|Effect$/, '');
            return (
              otherAnim.targetId === anim.targetId &&
              currentType === animationType &&
              otherAnim.id !== anim.id
            );
          });

          otherExistingAnimations.forEach(otherAnim => {
            store.removeAnimation(otherAnim.id);
          });

          // Update the animation with proportional values
          store.updateAnimation(anim.id, {
            ...anim,
            ...updatedAnimation,
            id: anim.id,
            targetId: anim.targetId,
          });
        }
      });
    }
  }
};

// Function specifically for AnimationResource components that need store.updateAnimation
const updateAnimationWithAutoSyncForResource = (
  animation,
  animationUpdate,
  store,
  selectedElement
) => {
  if (!animation || !animationUpdate || !store) return;

  // First update the current animation using store.updateAnimation (for UI components)
  store.updateAnimation(animation.id, animationUpdate);

  // Ensure corresponding timeline element updates for current animation
  try {
    const current = store.animations.find(a => a.id === animation.id);
    if (current && store.updateTimelineElementForAnimation) {
      store.updateTimelineElementForAnimation(current);
    }
    if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(store);
    }
  } catch (_) {}

  // Check if this animation is applied to all scenes and sync is enabled
  if (
    selectedElement &&
    animation.syncToAllScenes !== false &&
    isAnimationAppliedToAllScenes(animation, store, selectedElement)
  ) {
    const originalSceneDuration =
      selectedElement.timeFrame.end - selectedElement.timeFrame.start;

    // Find all matching animations on other scenes
    const elementsToSync = store.editorElements.filter(
      element =>
        element.id !== selectedElement.id &&
        element.type === selectedElement.type &&
        element.type !== 'audio'
    );

    elementsToSync.forEach(element => {
      const matchingAnimations = store.animations.filter(
        anim =>
          anim.targetId === element.id &&
          anim.id !== animation.id &&
          isSameEffectVariant(anim, animation)
      );

      matchingAnimations.forEach(matchingAnim => {
        const targetSceneDuration =
          element.timeFrame.end - element.timeFrame.start;

        // Update all properties from the original animation
        if (animationUpdate.properties) {
          // Copy all properties except timing-related ones
          const propertiesToSync = { ...animationUpdate.properties };

          // Handle timing properties with proportional scaling
          if (
            animationUpdate.properties.startTime !== undefined ||
            animationUpdate.properties.endTime !== undefined
          ) {
            if (
              animation.type === 'zoomEffect' ||
              animation.type === 'fadeEffect'
            ) {
              // For unified effects, calculate proportional timing
              const originalStartTime =
                animationUpdate.properties.startTime ??
                animation.properties?.startTime ??
                0;
              const originalEndTime =
                animationUpdate.properties.endTime ??
                animation.properties?.endTime ??
                animation.duration;

              const startProportion = originalStartTime / originalSceneDuration;
              const endProportion = originalEndTime / originalSceneDuration;

              propertiesToSync.startTime = Math.max(
                0,
                startProportion * targetSceneDuration
              );
              propertiesToSync.endTime = Math.min(
                targetSceneDuration,
                endProportion * targetSceneDuration
              );
            }
          }

          matchingAnim.properties = {
            ...matchingAnim.properties,
            ...propertiesToSync,
          };
        }

        // Update duration proportionally if it was changed
        if (animationUpdate.duration !== undefined) {
          const newDuration = calculateProportionalDuration(
            animationUpdate.duration,
            originalSceneDuration,
            targetSceneDuration
          );
          matchingAnim.duration = newDuration;

          // For unified effects, also update endTime if startTime is set
          if (
            (animation.type === 'zoomEffect' ||
              animation.type === 'fadeEffect') &&
            matchingAnim.properties?.startTime !== undefined
          ) {
            matchingAnim.properties.endTime =
              matchingAnim.properties.startTime + newDuration;
          }
        }

        // Update corresponding timeline element for each synced animation
        try {
          if (store.updateTimelineElementForAnimation) {
            store.updateTimelineElementForAnimation(matchingAnim);
          }
        } catch (_) {}
      });
    });
  }
};

// Helper function to apply GL transitions to all gaps between images
const applyGLTransitionToAllGaps = async (
  animation,
  store,
  selectedElement
) => {
  if (!selectedElement || animation.type !== 'glTransition') return false;

  // Get all image elements sorted by start time within each row
  const imageElementsByRow = new Map();

  store.editorElements
    .filter(el => el.type === 'imageUrl')
    .forEach(el => {
      if (!imageElementsByRow.has(el.row)) {
        imageElementsByRow.set(el.row, []);
      }
      imageElementsByRow.get(el.row).push(el);
    });

  // Sort elements within each row by start time
  imageElementsByRow.forEach((elements, row) => {
    elements.sort((a, b) => a.timeFrame.start - b.timeFrame.start);
  });

  let allSuccess = true;
  let transitionsCreated = 0;

  // Apply transitions to all consecutive image pairs in all rows
  for (const [row, elements] of imageElementsByRow) {
    for (let i = 0; i < elements.length - 1; i++) {
      const fromElement = elements[i];
      const toElement = elements[i + 1];

      // Check if there's a gap between images (not overlapping)
      if (fromElement.timeFrame.end <= toElement.timeFrame.start) {
        // Remove existing transition if any
        const existingTransition = store.animations.find(
          anim =>
            anim.type === 'glTransition' &&
            anim.fromElementId === fromElement.id &&
            anim.toElementId === toElement.id
        );

        if (existingTransition) {
          store.removeGLTransition(existingTransition.id);
        }

        // Calculate gap duration and proportional transition duration
        const gapDuration =
          toElement.timeFrame.start - fromElement.timeFrame.end;
        const originalDuration =
          animation.duration || animation.endTime - animation.startTime;
        const finalDuration = calculateGLTransitionDuration(
          gapDuration,
          originalDuration
        );
        try {
          const transitionId = await store.addGLTransition(
            fromElement.id,
            toElement.id,
            animation.transitionType,
            finalDuration
          );

          if (transitionId) {
            // Copy custom parameters if they exist in the original animation
            if (animation.properties && animation.properties.customParams) {
              store.updateGLTransitionProperties(transitionId, {
                customParams: animation.properties.customParams,
              });
            }

            transitionsCreated++;
            // Add small delay between transitions to prevent race conditions
            if (transitionsCreated > 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } else {
            allSuccess = false;
            console.error(
              `❌ Failed to create GL transition for gap: ${fromElement.id} -> ${toElement.id}`
            );
          }
        } catch (error) {
          console.error(`❌ Error creating GL transition:`, error);
          allSuccess = false;
        }
      }
    }
  }
  // Force a refresh of the timeline to ensure all transitions are properly activated
  if (transitionsCreated > 0 && store.updateTimeTo) {
    const currentTime = store.currentTimeInMs;
    setTimeout(() => {
      store.updateTimeTo(currentTime);
    }, 100);
  }

  return allSuccess && transitionsCreated > 0;
};

// New function specifically for applying animation to all scenes with proportional timing
const applyAnimationToAllScenesWithProportionalTiming = async (
  animation,
  store,
  selectedElement
) => {
  if (!selectedElement || !animation) return false;

  // Special handling for GL transitions
  if (animation.type === 'glTransition') {
    return await applyGLTransitionToAllGaps(animation, store, selectedElement);
  }

  const elementsToAnimate = store.editorElements.filter(
    element =>
      element.id !== selectedElement.id &&
      element.type === selectedElement.type &&
      element.type !== 'audio' // Exclude audio elements
  );

  if (elementsToAnimate.length === 0) return false;

  const originalSceneDuration =
    selectedElement.timeFrame.end - selectedElement.timeFrame.start;
  let allSuccess = true;

  elementsToAnimate.forEach(element => {
    const targetSceneDuration = element.timeFrame.end - element.timeFrame.start;

    // Calculate proportional duration
    const newDuration = calculateProportionalDuration(
      animation.duration,
      originalSceneDuration,
      targetSceneDuration
    );

    // Create new animation with proportional timing
    const newAnimation = {
      ...animation,
      id: getUid(),
      targetId: element.id,
      duration: newDuration,
      effectVariant:
        animation.effectVariant || determineEffectVariant(animation),
      syncToAllScenes: true, // Enable sync for animations applied to all scenes
    };

    // For unified effects, recalculate timing based on proportional duration
    if (animation.type === 'zoomEffect' || animation.type === 'fadeEffect') {
      const originalProperties = animation.properties || {};
      const positionType = originalProperties.animationType?.includes('In')
        ? 'in'
        : originalProperties.animationType?.includes('Out')
        ? 'out'
        : 'effect';

      if (positionType === 'in') {
        newAnimation.properties = {
          ...originalProperties,
          startTime: 0,
          endTime: newDuration,
        };
      } else if (positionType === 'out') {
        newAnimation.properties = {
          ...originalProperties,
          startTime: targetSceneDuration - newDuration,
          endTime: targetSceneDuration,
        };
      } else {
        // For effects, maintain relative position if possible
        const originalStartTime = originalProperties.startTime || 0;
        const originalEndTime =
          originalProperties.endTime || animation.duration;

        const startProportion = originalStartTime / originalSceneDuration;
        const endProportion = originalEndTime / originalSceneDuration;

        newAnimation.properties = {
          ...originalProperties,
          startTime: Math.max(0, startProportion * targetSceneDuration),
          endTime: Math.min(
            targetSceneDuration,
            endProportion * targetSceneDuration
          ),
        };
      }
    }

    // Remove existing conflicting animations
    const existingAnimations = store.animations.filter(
      anim =>
        anim.targetId === element.id && isSameEffectVariant(anim, animation)
    );

    existingAnimations.forEach(existingAnim => {
      store.removeAnimation(existingAnim.id);
    });

    // Add new animation
    if (!store.addAnimation(newAnimation)) {
      allSuccess = false;
    }
  });

  return allSuccess;
};

// Helper function to determine effect variant based on animation properties
const determineEffectVariant = animation => {
  if (animation.type === 'zoomEffect') {
    const properties = animation.properties || {};
    const initialScale =
      properties.scaleFactor || properties.initialScale || 1.0;
    const targetScale = properties.targetScale || properties.endScale || 2.0;
    return initialScale < targetScale ? 'in' : 'out';
  } else if (animation.type === 'fadeEffect') {
    const properties = animation.properties || {};
    const initialOpacity =
      properties.opacity || properties.initialOpacity || 1.0;
    const targetOpacity =
      properties.targetOpacity || properties.endOpacity || 0.0;
    return initialOpacity < targetOpacity ? 'in' : 'out';
  } else if (animation.type.endsWith('In')) {
    return 'in';
  } else if (animation.type.endsWith('Out')) {
    return 'out';
  } else if (animation.type.endsWith('Effect')) {
    return 'effect';
  }
  return 'effect'; // Default fallback
};

// Helper function to check if two animations are the same unified effect variant
const isSameEffectVariant = (anim1, anim2) => {
  // For unified effects, check both type and effectVariant
  if (
    (anim1.type === 'zoomEffect' || anim1.type === 'fadeEffect') &&
    (anim2.type === 'zoomEffect' || anim2.type === 'fadeEffect')
  ) {
    const variant1 = anim1.effectVariant || determineEffectVariant(anim1);
    const variant2 = anim2.effectVariant || determineEffectVariant(anim2);
    return anim1.type === anim2.type && variant1 === variant2;
  }

  // For traditional animations, use the old logic
  return (
    anim1.type === anim2.type ||
    anim1.type.replace(/In$|Out$|Effect$/, '') ===
      anim2.type.replace(/In$|Out$|Effect$/, '')
  );
};

// Function to check if GL transition is applied to all gaps
const isGLTransitionAppliedToAllGaps = (animation, store, selectedElement) => {
  if (!selectedElement || !animation || animation.type !== 'glTransition')
    return false;

  // Get all image elements sorted by start time within each row
  const imageElementsByRow = new Map();

  store.editorElements
    .filter(el => el.type === 'imageUrl')
    .forEach(el => {
      if (!imageElementsByRow.has(el.row)) {
        imageElementsByRow.set(el.row, []);
      }
      imageElementsByRow.get(el.row).push(el);
    });

  // Sort elements within each row by start time
  imageElementsByRow.forEach((elements, row) => {
    elements.sort((a, b) => a.timeFrame.start - b.timeFrame.start);
  });

  let totalGaps = 0;
  let appliedGaps = 0;

  // Check all consecutive image pairs in all rows
  imageElementsByRow.forEach((elements, row) => {
    for (let i = 0; i < elements.length - 1; i++) {
      const fromElement = elements[i];
      const toElement = elements[i + 1];

      // Check if there's a gap between images (not overlapping)
      if (fromElement.timeFrame.end <= toElement.timeFrame.start) {
        totalGaps++;

        // Check if transition exists for this gap
        const hasTransition = store.animations.some(
          anim =>
            anim.type === 'glTransition' &&
            anim.transitionType === animation.transitionType &&
            anim.fromElementId === fromElement.id &&
            anim.toElementId === toElement.id
        );

        if (hasTransition) {
          appliedGaps++;
        }
      }
    }
  });

  // For proper toggle state, require all gaps to have the transition
  return totalGaps > 0 && appliedGaps === totalGaps;
};

// Function to check if animation is applied to all matching scenes
const isAnimationAppliedToAllScenes = (animation, store, selectedElement) => {
  if (!selectedElement || !animation) return false;

  // Special handling for GL transitions
  if (animation.type === 'glTransition') {
    return isGLTransitionAppliedToAllGaps(animation, store, selectedElement);
  }

  const elementsToCheck = store.editorElements.filter(
    element =>
      element.id !== selectedElement.id &&
      element.type === selectedElement.type &&
      element.type !== 'audio'
  );

  if (elementsToCheck.length === 0) return false;

  return elementsToCheck.every(element => {
    return store.animations.some(
      anim =>
        anim.targetId === element.id && isSameEffectVariant(anim, animation)
    );
  });
};

// Function to remove GL transitions from all gaps except the original one
const removeGLTransitionFromAllOtherGaps = (
  animation,
  store,
  selectedElement
) => {
  if (!selectedElement || !animation || animation.type !== 'glTransition')
    return false;

  // Get all GL transitions of the same type, except the one involving the selected element
  const transitionsToRemove = store.animations.filter(
    anim =>
      anim.type === 'glTransition' &&
      anim.transitionType === animation.transitionType &&
      !(
        anim.fromElementId === selectedElement.id ||
        anim.toElementId === selectedElement.id
      )
  );

  let allSuccess = true;

  transitionsToRemove.forEach(transition => {
    if (!store.removeGLTransition(transition.id)) {
      allSuccess = false;
    }
  });
  return allSuccess;
};

// Function to remove animation from all other matching scenes
const removeAnimationFromAllOtherScenes = (
  animation,
  store,
  selectedElement
) => {
  if (!selectedElement || !animation) return false;

  // Special handling for GL transitions
  if (animation.type === 'glTransition') {
    return removeGLTransitionFromAllOtherGaps(
      animation,
      store,
      selectedElement
    );
  }

  const elementsToUpdate = store.editorElements.filter(
    element =>
      element.id !== selectedElement.id &&
      element.type === selectedElement.type &&
      element.type !== 'audio'
  );

  if (elementsToUpdate.length === 0) return false;

  let allSuccess = true;

  elementsToUpdate.forEach(element => {
    const animationsToRemove = store.animations.filter(
      anim =>
        anim.targetId === element.id && isSameEffectVariant(anim, animation)
    );

    animationsToRemove.forEach(animToRemove => {
      if (!store.removeAnimation(animToRemove.id)) {
        allSuccess = false;
      }
    });
  });

  return allSuccess;
};

// Function to remove GL transitions from all gaps (including current)
const removeGLTransitionFromAllGaps = (animation, store, selectedElement) => {
  if (!selectedElement || !animation || animation.type !== 'glTransition')
    return false;

  // Get all GL transitions of the same type
  const transitionsToRemove = store.animations.filter(
    anim =>
      anim.type === 'glTransition' &&
      anim.transitionType === animation.transitionType
  );

  let allSuccess = true;

  transitionsToRemove.forEach(transition => {
    if (!store.removeGLTransition(transition.id)) {
      allSuccess = false;
    }
  });
  return allSuccess;
};

// Function to remove animation from all scenes (including current)
const removeAnimationFromAllScenes = (animation, store, selectedElement) => {
  if (!selectedElement || !animation) return false;

  // Special handling for GL transitions
  if (animation.type === 'glTransition') {
    return removeGLTransitionFromAllGaps(animation, store, selectedElement);
  }

  const allElements = store.editorElements.filter(
    element => element.type === selectedElement.type && element.type !== 'audio'
  );

  let allSuccess = true;

  allElements.forEach(element => {
    const animationsToRemove = store.animations.filter(
      anim =>
        anim.targetId === element.id && isSameEffectVariant(anim, animation)
    );

    animationsToRemove.forEach(animToRemove => {
      if (!store.removeAnimation(animToRemove.id)) {
        allSuccess = false;
      }
    });
  });

  return allSuccess;
};

// Function to update animation with automatic sync to all scenes if applied
const updateAnimationWithAutoSync = (
  animation,
  animationUpdate,
  store,
  selectedElement
) => {
  if (!animation || !animationUpdate || !store) return;

  // First update the current animation directly (for timeline/drag operations)
  const animationIndex = store.animations.findIndex(a => a.id === animation.id);
  if (animationIndex !== -1) {
    const currentAnimation = store.animations[animationIndex];

    // Apply the update to current animation
    if (animationUpdate.duration !== undefined) {
      currentAnimation.duration = animationUpdate.duration;
    }
    if (animationUpdate.properties) {
      currentAnimation.properties = {
        ...currentAnimation.properties,
        ...animationUpdate.properties,
      };
    }

    // Update corresponding timeline element
    store.updateTimelineElementForAnimation(currentAnimation);

    // Trigger Redux sync after direct animation modification
    if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(store);
    }
  }

  // Check if this animation is applied to all scenes and sync is enabled
  if (
    selectedElement &&
    animation.syncToAllScenes !== false &&
    isAnimationAppliedToAllScenes(animation, store, selectedElement)
  ) {
    const originalSceneDuration =
      selectedElement.timeFrame.end - selectedElement.timeFrame.start;

    // Find all matching animations on other scenes
    const elementsToSync = store.editorElements.filter(
      element =>
        element.id !== selectedElement.id &&
        element.type === selectedElement.type &&
        element.type !== 'audio'
    );

    elementsToSync.forEach(element => {
      const matchingAnimations = store.animations.filter(
        anim =>
          anim.targetId === element.id &&
          anim.id !== animation.id &&
          isSameEffectVariant(anim, animation)
      );

      matchingAnimations.forEach(matchingAnim => {
        const targetSceneDuration =
          element.timeFrame.end - element.timeFrame.start;

        // Update all properties from the original animation
        if (animationUpdate.properties) {
          // Copy all properties except timing-related ones
          const propertiesToSync = { ...animationUpdate.properties };

          // Handle timing properties with proportional scaling
          if (
            animationUpdate.properties.startTime !== undefined ||
            animationUpdate.properties.endTime !== undefined
          ) {
            if (
              animation.type === 'zoomEffect' ||
              animation.type === 'fadeEffect'
            ) {
              // For unified effects, calculate proportional timing
              const originalStartTime =
                animationUpdate.properties.startTime ??
                animation.properties?.startTime ??
                0;
              const originalEndTime =
                animationUpdate.properties.endTime ??
                animation.properties?.endTime ??
                animation.duration;

              const startProportion = originalStartTime / originalSceneDuration;
              const endProportion = originalEndTime / originalSceneDuration;

              propertiesToSync.startTime = Math.max(
                0,
                startProportion * targetSceneDuration
              );
              propertiesToSync.endTime = Math.min(
                targetSceneDuration,
                endProportion * targetSceneDuration
              );
            }
          }

          matchingAnim.properties = {
            ...matchingAnim.properties,
            ...propertiesToSync,
          };
        }

        // Update duration proportionally if it was changed
        if (animationUpdate.duration !== undefined) {
          const newDuration = calculateProportionalDuration(
            animationUpdate.duration,
            originalSceneDuration,
            targetSceneDuration
          );
          matchingAnim.duration = newDuration;

          // For unified effects, also update endTime if startTime is set
          if (
            (animation.type === 'zoomEffect' ||
              animation.type === 'fadeEffect') &&
            matchingAnim.properties?.startTime !== undefined
          ) {
            matchingAnim.properties.endTime =
              matchingAnim.properties.startTime + newDuration;
          }
        }
      });
    });

    // Trigger Redux sync after syncing animations to all scenes
    if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(store);
    }
  }
};

// Utility function for preview handling
const handlePreviewClick = (store, animation) => {
  if (store.selectedElement && store.selectedElement.timeFrame) {
    const { start, end } = store.selectedElement.timeFrame;
    const duration = end - start;

    // Close FrameEditingPanel
    window.dispatchEvent(new CustomEvent('closeFrameEditingPanel'));

    // Set current time to the start of the animation
    store.updateTimeTo(start);
    // Start playing
    store.setPlaying(true);

    // Stop playing after animation duration
    setTimeout(() => {
      store.setPlaying(false);
      // Set time back to start
      store.updateTimeTo(start);
    }, duration);
  }
};

// Add default values object
const DEFAULT_ANIMATION_VALUES = {
  slideIn: {
    duration: 600,
    properties: {
      direction: 'right',
      opacity: 1,
      scaleFactor: 1,
      startTime: 0,
      endTime: 600,
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },
  slideOut: {
    duration: 600,
    properties: {
      direction: 'right',
      opacity: 1,
      scaleFactor: 1,
      startTime: 0,
      endTime: 600,
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },

  dropIn: {
    duration: 600,
    properties: {
      opacity: 1,
      scaleFactor: 1.5,
      origin: 'center',
      startTime: 0,
      endTime: 600,
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },
  dropOut: {
    duration: 600,
    properties: {
      opacity: 1,
      scaleFactor: 1.5,
      origin: 'center',
      startTime: 0,
      endTime: 600,
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },

  slideEffect: {
    duration: 600,
    properties: {
      scaleFactor: 1.3,
      speed: 0.1,
      isAutoSpeed: true,
      direction: 'left',
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },
  zoomEffect: {
    duration: 600,
    properties: {
      scaleFactor: 1.0,
      targetScale: 2.0,
      speed: 1.0,
      isAutoSpeed: true,
      startTime: 0,
      endTime: 1000,
      animationType: 'zoomIn',
      smoothReturn: false,
      origin: 'center',
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },
  fadeEffect: {
    duration: 600,
    properties: {
      opacity: 1.0,
      targetOpacity: 0.3, // Цільове значення прозорості для ефекту
      speed: 1.0,
      isAutoSpeed: true,
      startTime: 0,
      endTime: 1000,
      animationType: 'fadeIn',
      smoothReturn: false, // За замовчуванням різке обривання
      curveData: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 1, y: 1 },
      ],
    },
  },
};

// Add reset function
const resetAnimation = (animation, store) => {
  const defaultValues = DEFAULT_ANIMATION_VALUES[animation.type];
  if (defaultValues) {
    const resetAnimationUpdate = {
      ...animation,
      ...defaultValues,
      id: animation.id,
      targetId: animation.targetId,
      type: animation.type,
    };
    const selectedElement = getAnimationTargetElement(animation, store);
    updateAnimationWithAutoSyncForResource(
      animation,
      resetAnimationUpdate,
      store,
      selectedElement
    );
  }
};

export const AnimationResource = observer(
  forwardRef((props, ref) => {
    const store = useContext(StoreContext);
    const animation = props.animation;
    const animationName = props.animationName;

    // Cleanup origin selection when component is unmounted or closed
    const handleClose = () => {
      if (store.isSelectingOrigin) {
        store.cleanupOriginSelection();
      }
      if (props.onClose) {
        props.onClose();
      }
    };

    const renderAnimation = () => {
      switch (animation?.type) {
        case 'fadeIn':
        case 'fadeOut':
          return (
            <FadeAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'slideIn':
        case 'slideOut':
          return (
            <SlideAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'zoomIn':
        case 'zoomOut':
          return (
            <ZoomAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'dropIn':
        case 'dropOut':
          return (
            <DropAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'zoomInEffect':
          return (
            <ZoomEffectAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'zoomOutEffect':
          return (
            <ZoomOutEffectAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'slideEffect':
          return (
            <SlideEffectAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'zoomEffect':
          return (
            <ZoomEffectNewAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'fadeEffect':
          return (
            <FadeEffectAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        case 'glTransition':
          return (
            <GLTransitionAnimation
              animation={animation}
              animationName={animationName}
              isSidebar={props.isSidebar}
              onClose={handleClose}
            />
          );
        default:
          return null;
      }
    };

    // React.useEffect(() => {
    //   return () => {
    //     if (store.isSelectingOrigin) {
    //       store.cleanupOriginSelection();
    //     }
    //   };
    // }, [store]);

    return (
      <div
        className={
          props.isSidebar
            ? styles.sidebarAnimationResource
            : styles.animationResource
        }
        ref={ref}
        data-interactive={true}
      >
        {renderAnimation()}
      </div>
    );
  })
);

export const BreatheAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Always get timeFrame from the target element of the animation, not from selectedElement
  const targetElement = getAnimationTargetElement(props.animation, store);
  const [inputValues, setInputValues] = React.useState({
    duration: props.animation.duration ? props.animation.duration / 1000 : 1,
    scaleFactor: properties.scaleFactor ?? 1.05,
  });

  const handleDurationChange = createHandleDurationChange(
    setInputValues,
    props,
    store,
    targetElement
  );

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor) && newScaleFactor > 0) {
      store.updateAnimation(props.animation.id, {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      });
    }
  };

  const handleLoopChange = e => {
    store.updateAnimation(props.animation.id, {
      ...props.animation,
      properties: {
        ...properties,
        loop: e.target.checked,
      },
    });
  };

  return (
    <div className={styles.breatheAnimation}>
      <div className={styles.animationInputRow}>
        <div className={styles.inputLabel}>Duration (seconds)</div>
        <input
          className={styles.inputField}
          type="number"
          value={inputValues.duration}
          min="0.1"
          step="0.1"
          onChange={handleDurationChange}
        />
      </div>

      <div className={styles.animationInputRow}>
        <div className={styles.inputLabel}>Scale Factor</div>
        <input
          className={styles.inputField}
          type="number"
          value={inputValues.scaleFactor}
          min="0.1"
          step="0.01"
          onChange={handleScaleFactorChange}
        />
      </div>
      <div className={styles.animationInputRow}>
        <div className={styles.inputLabel}>Loop</div>
        <input
          className={styles.inputCheckbox}
          type="checkbox"
          checked={properties.loop ?? true}
          onChange={handleLoopChange}
        />
      </div>
    </div>
  );
});

// Add this helper function at the top level
const createHandleCurveChange = (
  setInputValues,
  props,
  properties,
  store,
  targetElement
) => {
  return React.useCallback(
    newCurveData => {
      setInputValues(prev => ({ ...prev, curveData: newCurveData }));

      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          curveData: newCurveData,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    },
    [props.animation, properties, store, targetElement]
  );
};

// Add this helper function at the top level
const createHandleDurationChange = (
  setInputValues,
  props,
  store,
  targetElement
) => {
  return React.useCallback(
    e => {
      const value = typeof e === 'object' ? e.target.value : e;
      setInputValues(prev => ({ ...prev, duration: value }));

      const duration = parseFloat(value) * 1000;
      if (!isNaN(duration) && duration > 0) {
        const animationUpdate = {
          duration,
        };
        updateAnimationWithAutoSync(
          props.animation,
          animationUpdate,
          store,
          targetElement
        );
      }
    },
    [props.animation, store, targetElement]
  );
};

export const FadeAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  const [inputValues, setInputValues] = React.useState({
    duration: props.animation.duration ? props.animation.duration / 1000 : 0.6,
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store,
    targetElement
  );
  const handleDurationChange = createHandleDurationChange(
    setInputValues,
    props,
    store,
    targetElement
  );

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        duration: defaultValues.duration / 1000,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  return (
    <div
      className={
        props.isSidebar ? styles.sidebarFadeAnimation : styles.fadeAnimation
      }
      data-interactive={true}
    >
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls} data-interactive={true}>
        <div className={styles.inputGroup}>
          <RangeInput
            label="Duration"
            min="0.1"
            max="100"
            step="0.1"
            measure={'s'}
            value={inputValues.duration}
            onChange={handleDurationChange}
          />
        </div>
        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.duration * 1000}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const SlideAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Resolve active target element (prefer explicit targetId; otherwise from targetIds prefer selected element if included)
  const targetElement = React.useMemo(() => {
    if (props.animation.targetId) {
      return (
        store.editorElements.find(el => el.id === props.animation.targetId) ||
        null
      );
    }
    const ids = props.animation.targetIds || [];
    if (ids.length > 0) {
      if (store.selectedElement && ids.includes(store.selectedElement.id)) {
        return (
          store.editorElements.find(el => el.id === store.selectedElement.id) ||
          null
        );
      }
      return store.editorElements.find(el => el.id === ids[0]) || null;
    }
    return null;
  }, [
    store.editorElements,
    store.selectedElement,
    props.animation.targetId,
    props.animation.targetIds,
  ]);

  const elementTimeFrame = targetElement?.timeFrame || { start: 0, end: 1000 };
  const totalDuration = elementTimeFrame.end - elementTimeFrame.start;

  // Calculate initial duration from startTime and endTime
  const initialStartTime = properties.startTime ?? 0;
  const initialEndTime = properties.endTime ?? Math.min(600, totalDuration);
  const initialDuration = initialEndTime - initialStartTime;

  const [inputValues, setInputValues] = React.useState({
    duration: props.animation.duration ? props.animation.duration / 1000 : 0.6,
    direction: properties.direction ?? 'right',
    startTime: initialStartTime,
    endTime: initialEndTime,
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Create debounced update function
  const debouncedUpdateAnimation = useRef(null);
  const isUpdatingFromProp = useRef(false);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }
    };
  }, []);

  // Watch for animation prop changes and update internal state
  React.useEffect(() => {
    if (isUpdatingFromProp.current) return; // Skip if we're updating from our own changes

    const newProperties = props.animation.properties || {};
    const newInitialStartTime = newProperties.startTime ?? 0;
    const newInitialEndTime =
      newProperties.endTime ?? Math.min(600, totalDuration);

    // Update input values when animation prop changes (different animation selected)
    setInputValues(prevValues => {
      // Only update if the animation ID changed or if properties are significantly different
      const shouldUpdate =
        prevValues.direction !== (newProperties.direction ?? 'right') ||
        Math.abs(prevValues.startTime - newInitialStartTime) > 10 ||
        Math.abs(prevValues.endTime - newInitialEndTime) > 10;

      if (shouldUpdate) {
        isUpdatingFromProp.current = true;
        setTimeout(() => {
          isUpdatingFromProp.current = false;
        }, 100);

        return {
          ...prevValues,
          direction: newProperties.direction ?? 'right',
          startTime: newInitialStartTime,
          endTime: newInitialEndTime,
          curveData: newProperties.curveData ?? [
            { x: 0, y: 0 },
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.7 },
            { x: 1, y: 1 },
          ],
        };
      }
      return prevValues;
    });
  }, [props.animation.id, props.animation.properties, totalDuration]);

  // Update animation duration on initialization if needed
  React.useEffect(() => {
    // Only update if there's a significant difference to avoid unnecessary updates that cause audio glitches
    const durationDiff = Math.abs(props.animation.duration - initialDuration);
    if (durationDiff > 1) {
      // Only update if difference is more than 1ms
      const animationUpdate = {
        ...props.animation,
        duration: initialDuration,
        properties: {
          ...properties,
          startTime: initialStartTime,
          endTime: initialEndTime,
          curveData: inputValues.curveData,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  }, []);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        duration: defaultValues.duration / 1000,
        direction: defaultValues.properties.direction,
        startTime: defaultValues.properties.startTime,
        endTime: defaultValues.properties.endTime,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  // Improved handleTimeChange with feedback loop prevention
  const handleTimeChange = useCallback(
    (newStartTime, newEndTime) => {
      if (isUpdatingFromProp.current) return; // Prevent feedback loops

      // Validate inputs and constrain within bounds
      const constrainedStartTime = Math.max(
        0,
        Math.min(totalDuration, newStartTime)
      );
      const constrainedEndTime = Math.max(
        constrainedStartTime + 100,
        Math.min(totalDuration, newEndTime)
      );

      // Prevent unnecessary updates if values haven't changed significantly
      const startDiff = Math.abs(constrainedStartTime - inputValues.startTime);
      const endDiff = Math.abs(constrainedEndTime - inputValues.endTime);

      if (startDiff <= 5 && endDiff <= 5) {
        return; // Skip update if difference is too small
      }

      setInputValues(prev => ({
        ...prev,
        startTime: constrainedStartTime,
        endTime: constrainedEndTime,
      }));

      // Clear any existing debounced call
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }

      // Debounce the actual animation update
      debouncedUpdateAnimation.current = setTimeout(() => {
        const newDuration = constrainedEndTime - constrainedStartTime;
        const animationUpdate = {
          ...props.animation,
          duration: newDuration,
          properties: {
            ...properties,
            startTime: constrainedStartTime,
            endTime: constrainedEndTime,
          },
        };

        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          targetElement
        );
      }, 500); // Increased debounce delay
    },
    [
      totalDuration,
      inputValues.startTime,
      inputValues.endTime,
      properties,
      props.animation,
      store,
    ]
  );

  const handleDualRangeChange = useCallback(
    (start, end) => {
      const newStart = Math.round(Math.max(0, Math.min(totalDuration, start)));
      const newEnd = Math.round(Math.max(0, Math.min(totalDuration, end)));
      handleTimeChange(newStart, newEnd);
    },
    [handleTimeChange, totalDuration]
  );

  const handleDurationChange = e => {
    const duration = parseFloat(e.target.value) * 1000;
    if (!isNaN(duration) && duration > 0) {
      const animationUpdate = {
        duration,
      };
      const selectedElement = getAnimationTargetElement(props.animation, store);
      updateAnimationWithAutoSync(
        props.animation,
        animationUpdate,
        store,
        selectedElement
      );
    }
  };

  const handleDirectionChange = value => {
    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        direction: value,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  return (
    <div
      className={
        props.isSidebar ? styles.sidebarSlideAnimation : styles.slideAnimation
      }
      data-interactive={true}
    >
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls} data-interactive={true}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            {!props.isSidebar && 'Duration (seconds)'}
          </div>
          {props.isSidebar ? (
            <RangeInput
              label="Duration"
              currentValue={inputValues.duration}
              onValueChange={handleDurationChange}
              step={0.1}
              min={0}
              max={6.0}
              measure={'s'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                value={inputValues.duration}
                onChange={handleDurationChange}
              />
              {props.isSidebar && <span className={styles.symbol}>sec</span>}
            </div>
          )}
        </div>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Direction
          </div>
          {props.isSidebar ? (
            <ButtonWithDropdown
              list={['right', 'left', 'bottom', 'top']}
              currentItem={props.animation.properties.direction}
              onSelect={value => {
                handleDirectionChange(value.toLowerCase());
              }}
              classNameButton={styles.listBtn}
              classNameDropdownItem={styles.list_item}
              classNameDropDownList={styles.listContainer}
              hasArrow={true}
            />
          ) : (
            <select
              className={
                props.isSidebar ? styles.sidebarSelectField : styles.selectField
              }
              value={props.animation.properties.direction}
              onChange={e => {
                handleDirectionChange(e.target.value);
              }}
            >
              <option value="right" className={styles.selectOption}>
                Left
              </option>
              <option value="left" className={styles.selectOption}>
                Right
              </option>
              <option value="bottom" className={styles.selectOption}>
                Top
              </option>
              <option value="top" className={styles.selectOption}>
                Bottom
              </option>
            </select>
          )}
        </div>

        {/* Time Range Selector */}
        <TimeRangeInput
          min={0}
          max={totalDuration}
          valueStart={Math.max(
            0,
            Math.min(totalDuration, inputValues.startTime)
          )}
          valueEnd={Math.max(0, Math.min(totalDuration, inputValues.endTime))}
          onChange={handleDualRangeChange}
          step={100}
          displayAsPercent={true}
        />

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.duration * 1000}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const ZoomAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Always get timeFrame from the target element of the animation, not from selectedElement
  const targetElement = getAnimationTargetElement(props.animation, store);
  const [inputValues, setInputValues] = React.useState({
    duration: props.animation.duration ? props.animation.duration / 1000 : 0.6,
    scaleFactor: properties.scaleFactor ?? 1.2,
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        duration: defaultValues.duration / 1000,
        scaleFactor: defaultValues.properties.scaleFactor,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  // Restore origin marker on component mount if has custom origin
  React.useEffect(() => {
    if (properties.origin?.type === 'custom') {
      const element = getAnimationTargetElement(props.animation, store);
      if (element) {
        store.restoreOriginMarker(element, properties.origin);
      }
    }

    // Clean up on unmount
    return () => {
      if (store.originMarker) {
        store.canvas.remove(store.originMarker);
        store.canvas.renderAll();
        store.originMarker = null;
      }
    };
  }, [store, properties.origin, props.animation.targetId]);

  const handleDurationChange = createHandleDurationChange(
    setInputValues,
    props,
    store,
    targetElement
  );

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor) && newScaleFactor > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  return (
    <div
      className={
        props.isSidebar ? styles.sidebarZoomAnimation : styles.zoomAnimation
      }
      data-interactive={true}
    >
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls} data-interactive={true}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={props.isSidebar ? 'Duration' : 'Duration (seconds)'}
              currentValue={inputValues.duration}
              onValueChange={handleDurationChange}
              step={0.1}
              min={0}
              max={6.0}
              measure={'s'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="0.1"
                value={inputValues.duration}
                onChange={handleDurationChange}
              />
              {props.isSidebar && <span className={styles.symbol}>sec</span>}
            </div>
          )}
        </div>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Scale Factor'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={0.1}
              max={2.5}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="0.1"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
              {props.isSidebar && <span className={styles.symbol}>%</span>}
            </div>
          )}
        </div>

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.duration * 1000}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const DropAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Resolve active target element (prefer explicit targetId; otherwise from targetIds prefer selected element if included)
  const targetElement = React.useMemo(() => {
    if (props.animation.targetId) {
      return (
        store.editorElements.find(el => el.id === props.animation.targetId) ||
        null
      );
    }
    const ids = props.animation.targetIds || [];
    if (ids.length > 0) {
      if (store.selectedElement && ids.includes(store.selectedElement.id)) {
        return (
          store.editorElements.find(el => el.id === store.selectedElement.id) ||
          null
        );
      }
      return store.editorElements.find(el => el.id === ids[0]) || null;
    }
    return null;
  }, [
    store.editorElements,
    store.selectedElement,
    props.animation.targetId,
    props.animation.targetIds,
  ]);

  const elementTimeFrame = targetElement?.timeFrame || { start: 0, end: 1000 };
  const totalDuration = elementTimeFrame.end - elementTimeFrame.start;

  // Calculate initial duration from startTime and endTime
  const initialStartTime = properties.startTime ?? 0;
  const initialEndTime = properties.endTime ?? Math.min(600, totalDuration);
  const initialDuration = initialEndTime - initialStartTime;

  const [inputValues, setInputValues] = React.useState({
    duration: props.animation.duration ? props.animation.duration / 1000 : 0.6,
    scaleFactor: properties.scaleFactor ?? 1.5,
    origin: properties.origin ?? 'center',
    startTime: initialStartTime,
    endTime: initialEndTime,
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Create debounced update function
  const debouncedUpdateAnimation = useRef(null);
  const isUpdatingFromProp = useRef(false);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }
    };
  }, []);

  // Watch for animation prop changes and update internal state
  React.useEffect(() => {
    if (isUpdatingFromProp.current) return; // Skip if we're updating from our own changes

    const newProperties = props.animation.properties || {};
    const newInitialStartTime = newProperties.startTime ?? 0;
    const newInitialEndTime =
      newProperties.endTime ?? Math.min(600, totalDuration);

    // Update input values when animation prop changes (different animation selected)
    setInputValues(prevValues => {
      // Only update if the animation ID changed or if properties are significantly different
      const shouldUpdate =
        prevValues.scaleFactor !== (newProperties.scaleFactor ?? 1.5) ||
        prevValues.origin !== (newProperties.origin ?? 'center') ||
        Math.abs(prevValues.startTime - newInitialStartTime) > 10 ||
        Math.abs(prevValues.endTime - newInitialEndTime) > 10;

      if (shouldUpdate) {
        isUpdatingFromProp.current = true;
        setTimeout(() => {
          isUpdatingFromProp.current = false;
        }, 100);

        return {
          ...prevValues,
          scaleFactor: newProperties.scaleFactor ?? 1.5,
          origin: newProperties.origin ?? 'center',
          startTime: newInitialStartTime,
          endTime: newInitialEndTime,
          curveData: newProperties.curveData ?? [
            { x: 0, y: 0 },
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.7 },
            { x: 1, y: 1 },
          ],
        };
      }
      return prevValues;
    });
  }, [props.animation.id, props.animation.properties, totalDuration]);

  // Update animation duration on initialization if needed
  React.useEffect(() => {
    // Only update if there's a significant difference to avoid unnecessary updates that cause audio glitches
    const durationDiff = Math.abs(props.animation.duration - initialDuration);
    if (durationDiff > 1) {
      // Only update if difference is more than 1ms
      const animationUpdate = {
        ...props.animation,
        duration: initialDuration,
        properties: {
          ...properties,
          startTime: initialStartTime,
          endTime: initialEndTime,
          curveData: inputValues.curveData,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  }, []);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        duration: defaultValues.duration / 1000,
        scaleFactor: defaultValues.properties.scaleFactor,
        origin: defaultValues.properties.origin,
        startTime: defaultValues.properties.startTime,
        endTime: defaultValues.properties.endTime,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  const handleDurationChange = createHandleDurationChange(
    setInputValues,
    props,
    store,
    targetElement
  );

  const handleScaleFactorChange = e => {
    const newScaleFactor = parseFloat(e.target.value);
    if (!isNaN(newScaleFactor)) {
      const animationUpdate = {
        ...props.animation,
        properties: { ...properties, scaleFactor: newScaleFactor },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleOriginChange = value => {
    const animationUpdate = {
      ...props.animation,
      properties: { ...properties, origin: value },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  // Improved handleTimeChange with feedback loop prevention
  const handleTimeChange = useCallback(
    (newStartTime, newEndTime) => {
      if (isUpdatingFromProp.current) return; // Prevent feedback loops

      // Validate inputs and constrain within bounds
      const constrainedStartTime = Math.max(
        0,
        Math.min(totalDuration, newStartTime)
      );
      const constrainedEndTime = Math.max(
        constrainedStartTime + 100,
        Math.min(totalDuration, newEndTime)
      );

      // Prevent unnecessary updates if values haven't changed significantly
      const startDiff = Math.abs(constrainedStartTime - inputValues.startTime);
      const endDiff = Math.abs(constrainedEndTime - inputValues.endTime);

      if (startDiff <= 5 && endDiff <= 5) {
        return; // Skip update if difference is too small
      }

      setInputValues(prev => ({
        ...prev,
        startTime: constrainedStartTime,
        endTime: constrainedEndTime,
      }));

      // Clear any existing debounced call
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }

      // Debounce the actual animation update
      debouncedUpdateAnimation.current = setTimeout(() => {
        const newDuration = constrainedEndTime - constrainedStartTime;
        const animationUpdate = {
          ...props.animation,
          duration: newDuration,
          properties: {
            ...properties,
            startTime: constrainedStartTime,
            endTime: constrainedEndTime,
          },
        };

        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          targetElement
        );
      }, 500); // Increased debounce delay
    },
    [
      totalDuration,
      inputValues.startTime,
      inputValues.endTime,
      properties,
      props.animation,
      store,
    ]
  );

  const handleDualRangeChange = useCallback(
    (start, end) => {
      const newStart = Math.round(start);
      const newEnd = Math.round(end);
      handleTimeChange(newStart, newEnd);
    },
    [handleTimeChange]
  );

  const handleCustomOriginClick = () => {
    store.startOriginSelection(targetElement, customOrigin => {
      const animationUpdate = {
        ...props.animation,
        properties: { ...properties, origin: customOrigin },
      };
      const selectedElement = getAnimationTargetElement(props.animation, store);
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        selectedElement
      );
    });
  };

  return (
    <div
      className={
        props.isSidebar ? styles.sidebarDropAnimation : styles.dropAnimation
      }
      data-interactive={true}
    >
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls} data-interactive={true}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={props.isSidebar ? 'Duration' : 'Duration (seconds)'}
              currentValue={inputValues.duration}
              onValueChange={handleDurationChange}
              step={0.1}
              min={0}
              max={6.0}
              measure={'s'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                value={inputValues.duration}
                onChange={handleDurationChange}
              />
              {props.isSidebar && <span className={styles.symbol}>sec</span>}
            </div>
          )}
        </div>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Scale Factor'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={0.1}
              max={2.5}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="0.1"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
              {props.isSidebar && <span className={styles.symbol}>x</span>}
            </div>
          )}
        </div>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Origin Point
          </div>
          {props.isSidebar ? (
            <div className={styles.originControls}>
              <ButtonWithDropdown
                hasArrow={true}
                list={['center', 'top', 'bottom', 'left', 'right', 'custom']}
                currentItem={
                  properties.origin?.type === 'custom'
                    ? 'custom'
                    : properties.origin
                    ? properties.origin
                    : 'center'
                }
                onSelect={value => {
                  const normalizedValue = value.toLowerCase();
                  if (normalizedValue === 'custom') {
                    handleCustomOriginClick();
                  } else {
                    handleOriginChange(normalizedValue);
                  }
                }}
                classNameButton={styles.listBtn}
                classNameDropdownItem={styles.list_item}
                classNameDropDownList={styles.listContainer}
              />
            </div>
          ) : (
            <div className={styles.originControls}>
              <select
                className={styles.selectField}
                value={
                  properties.origin?.type === 'custom'
                    ? 'custom'
                    : properties.origin || 'center'
                }
                onChange={e => {
                  if (e.target.value === 'custom') {
                    handleCustomOriginClick();
                  } else {
                    handleOriginChange(e.target.value);
                  }
                }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <TimeRangeInput
          min={0}
          max={totalDuration}
          valueStart={inputValues.startTime}
          valueEnd={inputValues.endTime}
          onChange={handleDualRangeChange}
          step={100}
          displayAsPercent={true}
        />

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.endTime - inputValues.startTime}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const ZoomEffectAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  const [inputValues, setInputValues] = React.useState({
    scaleFactor: properties.scaleFactor ?? 1.5,
    speed: properties.speed ?? 1.0,
    isAutoSpeed: properties.isAutoSpeed ?? true,
    originType:
      properties.origin?.type === 'custom'
        ? 'custom'
        : properties.origin || 'center',
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        scaleFactor: defaultValues.properties.scaleFactor,
        speed: defaultValues.properties.speed,
        isAutoSpeed: defaultValues.properties.isAutoSpeed,
        originType: defaultValues.properties.origin,
      });
      resetAnimation(props.animation, store);
    }
  };

  // Restore origin marker on component mount if has custom origin
  React.useEffect(() => {
    if (properties.origin?.type === 'custom') {
      const element = getAnimationTargetElement(props.animation, store);
      if (element) {
        store.restoreOriginMarker(element, properties.origin);
        // Activate origin selection mode if panel is open
        if (props.isSidebar) {
          store.startOriginSelection(element, customOrigin => {
            const animationUpdate = {
              ...props.animation,
              properties: {
                ...properties,
                origin: customOrigin,
              },
            };
            setInputValues(prev => ({
              ...prev,
              originType: 'custom',
            }));
            const selectedElement = store.editorElements.find(
              el => el.id === props.animation.targetId
            );
            updateAnimationWithAutoSyncForResource(
              props.animation,
              animationUpdate,
              store,
              selectedElement
            );
          });
        }
      }
    }

    // Clean up on unmount
    return () => {
      if (store.originMarker) {
        store.canvas.remove(store.originMarker);
        store.canvas.renderAll();
        store.originMarker = null;
      }
      if (store.isSelectingOrigin) {
        store.cleanupOriginSelection();
      }
    };
  }, [store, properties.origin, props.animation.targetId, props.isSidebar]);

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor) && newScaleFactor > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleSpeedChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, speed: value }));

    const newSpeed = parseFloat(value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          speed: newSpeed,
          isAutoSpeed: false,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleAutoSpeedChange = e => {
    const isAuto = e.target.checked;
    setInputValues(prev => ({ ...prev, isAutoSpeed: isAuto }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        isAutoSpeed: isAuto,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleOriginChange = value => {
    if (value === 'custom' && !props.isSidebar) {
      return;
    }

    // Оновлюємо локальний стан
    setInputValues(prev => ({
      ...prev,
      originType: value,
    }));

    if (value === 'custom') {
      handleCustomOriginClick();
    } else {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          origin: value,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleCustomOriginClick = () => {
    if (store.isSelectingOrigin) {
      store.cleanupOriginSelection();
    }

    store.startOriginSelection(
      getAnimationTargetElement(props.animation, store),
      customOrigin => {
        // Оновлюємо локальний стан
        setInputValues(prev => ({
          ...prev,
          originType: 'custom',
        }));

        const animationUpdate = {
          ...props.animation,
          properties: {
            ...properties,
            origin: customOrigin,
          },
        };
        const selectedElement = getAnimationTargetElement(
          props.animation,
          store
        );
        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          selectedElement
        );
      }
    );
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  return (
    <div className={styles.zoomAnimation}>
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Scale Factor'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={1.0}
              max={2.5}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="1.0"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
              {props.isSidebar && <span className={styles.symbol}>x</span>}
            </div>
          )}
        </div>

        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Origin Point
          </div>
          {props.isSidebar ? (
            <div className={styles.originControls}>
              <ButtonWithDropdown
                list={['center', 'top', 'bottom', 'left', 'right', 'custom']}
                currentItem={inputValues.originType}
                onSelect={value => {
                  handleOriginChange(value.toLowerCase());
                }}
                classNameButton={styles.listBtn}
                classNameDropdownItem={styles.list_item}
                classNameDropDownList={styles.listContainer}
                hasArrow={true}
              />
            </div>
          ) : (
            <div className={styles.originControls}>
              <select
                className={styles.selectField}
                value={
                  properties.origin?.type === 'custom'
                    ? 'custom'
                    : properties.origin || 'center'
                }
                onChange={e => {
                  if (e.target.value === 'custom') {
                    handleCustomOriginClick();
                  } else {
                    handleOriginChange(e.target.value);
                  }
                }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
        </div>

        {/* <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Auto Speed
          </div>
          <div
            className={`${styles.customCheckbox} ${
              inputValues.isAutoSpeed ? styles.checked : ''
            }`}
            onClick={e => {
              e.stopPropagation();
              handleAutoSpeedChange({
                target: { checked: !inputValues.isAutoSpeed },
              });
            }}
          >
            <div className={styles.checkbox}>
              {inputValues.isAutoSpeed && (
                <svg
                  width="8"
                  height="7"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 1L3.5 6.5L1 4"
                    stroke="#192c36"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div> */}

        {/* {!inputValues.isAutoSpeed && (
          <div
            className={
              props.isSidebar
                ? styles.sidebarAnimationInputRow
                : styles.animationInputRow
            }
          >
            {props.isSidebar ? (
              <RangeInput
                label={'Speed'}
                currentValue={inputValues.speed}
                onValueChange={handleSpeedChange}
                step={0.1}
                min={0.1}
                max={5.0}
                measure={'x'}
              />
            ) : (
              <div>
                <input
                  className={
                    props.isSidebar
                      ? styles.sidebarInputField
                      : styles.inputField
                  }
                  type={props.isSidebar ? 'text' : 'number'}
                  step={props.isSidebar ? undefined : 0.1}
                  min="0.1"
                  value={inputValues.speed}
                  onChange={handleSpeedChange}
                />
                {props.isSidebar && <span className={styles.symbol}>x</span>}
              </div>
            )}
          </div>
        )} */}

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={600}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const ZoomOutEffectAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  const [inputValues, setInputValues] = React.useState({
    scaleFactor: properties.scaleFactor ?? 1.5,
    speed: properties.speed ?? 1.0,
    isAutoSpeed: properties.isAutoSpeed ?? true,
    originType:
      properties.origin?.type === 'custom'
        ? 'custom'
        : properties.origin || 'center',
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        scaleFactor: defaultValues.properties.scaleFactor,
        speed: defaultValues.properties.speed,
        isAutoSpeed: defaultValues.properties.isAutoSpeed,
        originType: defaultValues.properties.origin,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  // Restore origin marker on component mount if has custom origin
  React.useEffect(() => {
    if (properties.origin?.type === 'custom') {
      const element = getAnimationTargetElement(props.animation, store);
      if (element) {
        store.restoreOriginMarker(element, properties.origin);
        // Activate origin selection mode if panel is open
        if (props.isSidebar) {
          store.startOriginSelection(element, customOrigin => {
            const animationUpdate = {
              ...props.animation,
              properties: {
                ...properties,
                origin: customOrigin,
              },
            };
            setInputValues(prev => ({
              ...prev,
              originType: 'custom',
            }));
            const selectedElement = store.editorElements.find(
              el => el.id === props.animation.targetId
            );
            updateAnimationWithAutoSyncForResource(
              props.animation,
              animationUpdate,
              store,
              selectedElement
            );
          });
        }
      }
    }

    // Clean up on unmount
    return () => {
      if (store.originMarker) {
        store.canvas.remove(store.originMarker);
        store.canvas.renderAll();
        store.originMarker = null;
      }
      if (store.isSelectingOrigin) {
        store.cleanupOriginSelection();
      }
    };
  }, [store, properties.origin, props.animation.targetId, props.isSidebar]);

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor) && newScaleFactor > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleSpeedChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, speed: value }));

    const newSpeed = parseFloat(value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          speed: newSpeed,
          isAutoSpeed: false,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleAutoSpeedChange = e => {
    const isAuto = e.target.checked;
    setInputValues(prev => ({ ...prev, isAutoSpeed: isAuto }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        isAutoSpeed: isAuto,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleOriginChange = value => {
    if (value === 'custom' && !props.isSidebar) {
      return;
    }

    // Оновлюємо локальний стан
    setInputValues(prev => ({
      ...prev,
      originType: value,
    }));

    if (value === 'custom') {
      handleCustomOriginClick();
    } else {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          origin: value,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleCustomOriginClick = () => {
    if (store.isSelectingOrigin) {
      store.cleanupOriginSelection();
    }

    store.startOriginSelection(
      getAnimationTargetElement(props.animation, store),
      customOrigin => {
        // Оновлюємо локальний стан
        setInputValues(prev => ({
          ...prev,
          originType: 'custom',
        }));

        const animationUpdate = {
          ...props.animation,
          properties: {
            ...properties,
            origin: customOrigin,
          },
        };
        const selectedElement = getAnimationTargetElement(
          props.animation,
          store
        );
        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          selectedElement
        );
      }
    );
  };

  return (
    <div className={styles.zoomAnimation}>
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Scale Factor'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={1.0}
              max={2.5}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="1.0"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
              {props.isSidebar && <span className={styles.symbol}>%</span>}
            </div>
          )}
        </div>

        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Origin Point
          </div>
          {props.isSidebar ? (
            <div className={styles.originControls}>
              <ButtonWithDropdown
                list={['center', 'top', 'bottom', 'left', 'right', 'custom']}
                currentItem={inputValues.originType}
                onSelect={value => {
                  handleOriginChange(value.toLowerCase());
                }}
                classNameButton={styles.listBtn}
                classNameDropdownItem={styles.list_item}
                classNameDropDownList={styles.listContainer}
                hasArrow={true}
              />
            </div>
          ) : (
            <div className={styles.originControls}>
              <select
                className={styles.selectField}
                value={
                  properties.origin?.type === 'custom'
                    ? 'custom'
                    : properties.origin || 'center'
                }
                onChange={e => {
                  if (e.target.value === 'custom') {
                    handleCustomOriginClick();
                  } else {
                    handleOriginChange(e.target.value);
                  }
                }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
        </div>

        {/* <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Auto Speed
          </div>
          <div
            className={`${styles.customCheckbox} ${
              inputValues.isAutoSpeed ? styles.checked : ''
            }`}
            onClick={e => {
              e.stopPropagation();
              handleAutoSpeedChange({
                target: { checked: !inputValues.isAutoSpeed },
              });
            }}
          >
            <div className={styles.checkbox}>
              {inputValues.isAutoSpeed && (
                <svg
                  width="8"
                  height="7"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 1L3.5 6.5L1 4"
                    stroke="#192c36"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div> */}

        {!inputValues.isAutoSpeed && (
          <div
            className={
              props.isSidebar
                ? styles.sidebarAnimationInputRow
                : styles.animationInputRow
            }
          >
            {props.isSidebar ? (
              <RangeInput
                label={'Speed'}
                currentValue={inputValues.speed}
                onValueChange={handleSpeedChange}
                step={0.1}
                min={0.1}
                max={5.0}
                measure={'x'}
              />
            ) : (
              <div>
                <input
                  className={
                    props.isSidebar
                      ? styles.sidebarInputField
                      : styles.inputField
                  }
                  type={props.isSidebar ? 'text' : 'number'}
                  step={props.isSidebar ? undefined : 0.1}
                  min="0.1"
                  value={inputValues.speed}
                  onChange={handleSpeedChange}
                />
                {props.isSidebar && <span className={styles.symbol}>x</span>}
              </div>
            )}
          </div>
        )}

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={600}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const SlideEffectAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  const [inputValues, setInputValues] = React.useState({
    scaleFactor: properties.scaleFactor ?? 1.3,
    speed: properties.speed ?? 0.1,
    isAutoSpeed: properties.isAutoSpeed ?? true,
    direction: properties.direction ?? 'left',
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        scaleFactor: defaultValues.properties.scaleFactor,
        speed: defaultValues.properties.speed,
        isAutoSpeed: defaultValues.properties.isAutoSpeed,
        direction: defaultValues.properties.direction,
        curveData: defaultValues.properties.curveData,
      });
      resetAnimation(props.animation, store);
    }
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor) && newScaleFactor > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleSpeedChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, speed: value }));

    const newSpeed = parseFloat(value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          speed: newSpeed,
          isAutoSpeed: false,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleAutoSpeedChange = e => {
    const isAuto = e.target.checked;
    setInputValues(prev => ({ ...prev, isAutoSpeed: isAuto }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        isAutoSpeed: isAuto,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleDirectionChange = value => {
    setInputValues(prev => ({ ...prev, direction: value }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        direction: value,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  return (
    <div
      className={
        props.isSidebar ? styles.sidebarSlideAnimation : styles.slideAnimation
      }
    >
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Scale Factor'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={1.0}
              max={2.0}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type={props.isSidebar ? 'text' : 'number'}
                step={props.isSidebar ? undefined : 0.1}
                min="1.0"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
              {props.isSidebar && <span className={styles.symbol}>x</span>}
            </div>
          )}
        </div>

        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Direction
          </div>
          {props.isSidebar ? (
            <ButtonWithDropdown
              list={['left', 'right']}
              currentItem={inputValues.direction}
              onSelect={value => handleDirectionChange(value.toLowerCase())}
              classNameButton={styles.listBtn}
              classNameDropdownItem={styles.list_item}
              classNameDropDownList={styles.listContainer}
              hasArrow={true}
            />
          ) : (
            <select
              className={
                props.isSidebar ? styles.sidebarSelectField : styles.selectField
              }
              value={inputValues.direction}
              onChange={e => handleDirectionChange(e.target.value)}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          )}
        </div>

        {/* <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Auto Speed
          </div>
          <div
            className={`${styles.customCheckbox} ${
              inputValues.isAutoSpeed ? styles.checked : ''
            }`}
            onClick={e => {
              e.stopPropagation();
              handleAutoSpeedChange({
                target: { checked: !inputValues.isAutoSpeed },
              });
            }}
          >
            <div className={styles.checkbox}>
              {inputValues.isAutoSpeed && (
                <svg
                  width="8"
                  height="7"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 1L3.5 6.5L1 4"
                    stroke="#192c36"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div> */}

        {!inputValues.isAutoSpeed && (
          <div
            className={
              props.isSidebar
                ? styles.sidebarAnimationInputRow
                : styles.animationInputRow
            }
          >
            {props.isSidebar ? (
              <RangeInput
                label={'Speed'}
                currentValue={inputValues.speed}
                onValueChange={handleSpeedChange}
                step={0.1}
                min={0.1}
                max={2.0}
                measure={'x'}
              />
            ) : (
              <div>
                <input
                  className={
                    props.isSidebar
                      ? styles.sidebarInputField
                      : styles.inputField
                  }
                  type={props.isSidebar ? 'text' : 'number'}
                  step={props.isSidebar ? undefined : 0.1}
                  min="0.1"
                  value={inputValues.speed}
                  onChange={handleSpeedChange}
                />
                {props.isSidebar && <span className={styles.symbol}>x</span>}
              </div>
            )}
          </div>
        )}

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={600}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const ZoomEffectNewAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Resolve active target element (prefer explicit targetId; otherwise from targetIds prefer selected element if included)
  const targetElement = React.useMemo(() => {
    if (props.animation.targetId) {
      return (
        store.editorElements.find(el => el.id === props.animation.targetId) ||
        null
      );
    }
    const ids = props.animation.targetIds || [];
    if (ids.length > 0) {
      if (store.selectedElement && ids.includes(store.selectedElement.id)) {
        return (
          store.editorElements.find(el => el.id === store.selectedElement.id) ||
          null
        );
      }
      return store.editorElements.find(el => el.id === ids[0]) || null;
    }
    return null;
  }, [
    store.editorElements,
    store.selectedElement,
    props.animation.targetId,
    props.animation.targetIds,
  ]);

  const elementTimeFrame = targetElement?.timeFrame || { start: 0, end: 1000 };
  const totalDuration = elementTimeFrame.end - elementTimeFrame.start;

  // Calculate initial duration from startTime and endTime
  const initialStartTime = properties.startTime ?? 0;
  const initialEndTime = properties.endTime ?? Math.min(1000, totalDuration);
  const initialDuration = initialEndTime - initialStartTime;

  const [inputValues, setInputValues] = React.useState({
    scaleFactor: properties.scaleFactor ?? 1.0,
    targetScale: properties.targetScale ?? 2.0,
    speed: properties.speed ?? 1.0,
    isAutoSpeed: properties.isAutoSpeed ?? true,
    startTime: initialStartTime,
    endTime: initialEndTime,
    animationType: properties.animationType ?? 'zoomIn',
    smoothReturn: properties.smoothReturn ?? false,
    originType:
      properties.origin?.type === 'custom'
        ? 'custom'
        : properties.origin || 'center',
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });

  // Create debounced update function
  const debouncedUpdateAnimation = useRef(null);
  const isUpdatingFromProp = useRef(false);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }
    };
  }, []);

  // Watch for animation prop changes and update internal state
  React.useEffect(() => {
    if (isUpdatingFromProp.current) return; // Skip if we're updating from our own changes

    const newProperties = props.animation.properties || {};
    const newInitialStartTime = newProperties.startTime ?? 0;
    const newInitialEndTime =
      newProperties.endTime ?? Math.min(1000, totalDuration);

    // Update input values when animation prop changes (different animation selected)
    setInputValues(prevValues => {
      // Only update if the animation ID changed or if properties are significantly different
      const shouldUpdate =
        prevValues.scaleFactor !== (newProperties.scaleFactor ?? 1.0) ||
        prevValues.targetScale !== (newProperties.targetScale ?? 2.0) ||
        prevValues.animationType !==
          (newProperties.animationType ?? 'zoomIn') ||
        Math.abs(prevValues.startTime - newInitialStartTime) > 10 ||
        Math.abs(prevValues.endTime - newInitialEndTime) > 10;

      if (shouldUpdate) {
        isUpdatingFromProp.current = true;
        setTimeout(() => {
          isUpdatingFromProp.current = false;
        }, 100);

        return {
          scaleFactor: newProperties.scaleFactor ?? 1.0,
          targetScale: newProperties.targetScale ?? 2.0,
          speed: newProperties.speed ?? 1.0,
          isAutoSpeed: newProperties.isAutoSpeed ?? true,
          startTime: newInitialStartTime,
          endTime: newInitialEndTime,
          animationType: newProperties.animationType ?? 'zoomIn',
          smoothReturn: newProperties.smoothReturn ?? false,
          originType:
            newProperties.origin?.type === 'custom'
              ? 'custom'
              : newProperties.origin || 'center',
          curveData: newProperties.curveData ?? [
            { x: 0, y: 0 },
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.7 },
            { x: 1, y: 1 },
          ],
        };
      }
      return prevValues;
    });
  }, [props.animation.id, props.animation.properties, totalDuration]);

  // Update animation duration on initialization if needed
  React.useEffect(() => {
    // Only update if there's a significant difference to avoid unnecessary updates that cause audio glitches
    const durationDiff = Math.abs(props.animation.duration - initialDuration);
    if (durationDiff > 1) {
      // Only update if difference is more than 1ms
      const animationUpdate = {
        ...props.animation,
        duration: initialDuration,
        properties: {
          ...properties,
          startTime: initialStartTime,
          endTime: initialEndTime,
          curveData: inputValues.curveData,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  }, []);

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        scaleFactor: defaultValues.properties.scaleFactor,
        targetScale: defaultValues.properties.targetScale,
        speed: defaultValues.properties.speed,
        isAutoSpeed: defaultValues.properties.isAutoSpeed,
        startTime: defaultValues.properties.startTime,
        endTime: defaultValues.properties.endTime,
        animationType: defaultValues.properties.animationType,
        smoothReturn: defaultValues.properties.smoothReturn,
        originType: defaultValues.properties.origin,
        curveData: [
          { x: 0, y: 0 },
          { x: 0.3, y: 0.3 },
          { x: 0.7, y: 0.7 },
          { x: 1, y: 1 },
        ],
      });
      resetAnimation(props.animation, store);
    }
  };
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Restore origin marker on component mount if has custom origin
  React.useEffect(() => {
    if (properties.origin?.type === 'custom') {
      const element = getAnimationTargetElement(props.animation, store);
      if (element) {
        store.restoreOriginMarker(element, properties.origin);
      }
    }

    // Clean up on unmount
    return () => {
      if (store.originMarker) {
        store.canvas.remove(store.originMarker);
        store.canvas.renderAll();
        store.originMarker = null;
      }
      if (store.isSelectingOrigin) {
        store.cleanupOriginSelection();
      }
    };
  }, [store, properties.origin, props.animation.targetId]);

  // Improved handleTimeChange with feedback loop prevention
  const handleTimeChange = useCallback(
    (newStartTime, newEndTime) => {
      if (isUpdatingFromProp.current) return; // Prevent feedback loops

      // Validate inputs and constrain within bounds
      const constrainedStartTime = Math.max(
        0,
        Math.min(totalDuration, newStartTime)
      );
      const constrainedEndTime = Math.max(
        constrainedStartTime + 100,
        Math.min(totalDuration, newEndTime)
      );

      // Prevent unnecessary updates if values haven't changed significantly
      const startDiff = Math.abs(constrainedStartTime - inputValues.startTime);
      const endDiff = Math.abs(constrainedEndTime - inputValues.endTime);

      if (startDiff <= 5 && endDiff <= 5) {
        return; // Skip update if difference is too small
      }

      setInputValues(prev => ({
        ...prev,
        startTime: constrainedStartTime,
        endTime: constrainedEndTime,
      }));

      // Clear any existing debounced call
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }

      // Debounce the actual animation update
      debouncedUpdateAnimation.current = setTimeout(() => {
        const newDuration = constrainedEndTime - constrainedStartTime;
        const animationUpdate = {
          ...props.animation,
          duration: newDuration,
          properties: {
            ...properties,
            startTime: constrainedStartTime,
            endTime: constrainedEndTime,
          },
        };

        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          targetElement
        );
      }, 500); // Increased debounce delay
    },
    [
      totalDuration,
      inputValues.startTime,
      inputValues.endTime,
      properties,
      props.animation,
      store,
    ]
  );

  const handleDualRangeChange = useCallback(
    (start, end) => {
      const newStart = Math.round(Math.max(0, Math.min(totalDuration, start)));
      const newEnd = Math.round(Math.max(0, Math.min(totalDuration, end)));
      handleTimeChange(newStart, newEnd);
    },
    [handleTimeChange, totalDuration]
  );

  const handleScaleFactorChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, scaleFactor: value }));

    const newScaleFactor = parseFloat(value);
    if (!isNaN(newScaleFactor)) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          scaleFactor: newScaleFactor,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleTargetScaleChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, targetScale: value }));

    const newTargetScale = parseFloat(value);
    if (!isNaN(newTargetScale)) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          targetScale: newTargetScale,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleSpeedChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, speed: value }));

    const newSpeed = parseFloat(value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          speed: newSpeed,
          isAutoSpeed: false,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleAutoSpeedChange = e => {
    const isAuto = e.target.checked;
    const newSpeed = isAuto ? 1.0 : inputValues.speed; // Reset to 1.0 when auto is enabled
    setInputValues(prev => ({ ...prev, isAutoSpeed: isAuto, speed: newSpeed }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        isAutoSpeed: isAuto,
        speed: newSpeed,
      },
    };
    const selectedElement = store.editorElements.find(
      el => el.id === props.animation.targetId
    );
    updateAnimationWithAutoSyncForResource(
      props.animation,
      animationUpdate,
      store,
      selectedElement
    );
  };

  const handleSmoothReturnChange = e => {
    const isSmooth = e.target.checked;
    setInputValues(prev => ({ ...prev, smoothReturn: isSmooth }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        smoothReturn: isSmooth,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const formatTime = timeMs => {
    const seconds = Math.floor(timeMs / 1000);
    const ms = timeMs % 1000;
    return `${seconds}.${ms.toString().padStart(3, '0')}s`;
  };

  const getPreviewImage = () => {
    if (targetElement?.properties?.src) {
      return targetElement.properties.src;
    }
    return null;
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  const handleOriginChange = value => {
    if (value === 'custom' && !props.isSidebar) {
      return;
    }

    // Оновлюємо локальний стан
    setInputValues(prev => ({
      ...prev,
      originType: value,
    }));

    if (value === 'custom') {
      handleCustomOriginClick();
    } else {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          origin: value,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleCustomOriginClick = () => {
    if (store.isSelectingOrigin) {
      store.cleanupOriginSelection();
    }

    store.startOriginSelection(
      getAnimationTargetElement(props.animation, store),
      customOrigin => {
        // Оновлюємо локальний стан
        setInputValues(prev => ({
          ...prev,
          originType: 'custom',
        }));

        const animationUpdate = {
          ...props.animation,
          properties: {
            ...properties,
            origin: customOrigin,
          },
        };
        const selectedElement = getAnimationTargetElement(
          props.animation,
          store
        );
        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          selectedElement
        );
      }
    );
  };

  return (
    <div className={styles.zoomAnimation}>
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName || 'Zoom Effect'}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        {/* Initial Scale */}
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Initial Scale'}
              currentValue={inputValues.scaleFactor}
              onValueChange={handleScaleFactorChange}
              step={0.1}
              min={0}
              max={3.0}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type="number"
                step={0.1}
                min="0"
                max="3.0"
                value={inputValues.scaleFactor}
                onChange={handleScaleFactorChange}
              />
            </div>
          )}
        </div>

        {/* Target Scale */}
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label={'Target Scale'}
              currentValue={inputValues.targetScale}
              onValueChange={handleTargetScaleChange}
              step={0.1}
              min={0}
              max={3.0}
              measure={'x'}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type="number"
                step={0.1}
                min="0"
                max="3.0"
                value={inputValues.targetScale}
                onChange={handleTargetScaleChange}
              />
            </div>
          )}
        </div>

        {/* Origin Point */}
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Origin Point
          </div>
          {props.isSidebar ? (
            <div className={styles.originControls}>
              <ButtonWithDropdown
                list={['center', 'top', 'bottom', 'left', 'right', 'custom']}
                currentItem={inputValues.originType}
                onSelect={value => {
                  handleOriginChange(value.toLowerCase());
                }}
                classNameButton={styles.listBtn}
                classNameDropdownItem={styles.list_item}
                classNameDropDownList={styles.listContainer}
                hasArrow={true}
              />
            </div>
          ) : (
            <div className={styles.originControls}>
              <select
                className={styles.selectField}
                value={
                  properties.origin?.type === 'custom'
                    ? 'custom'
                    : properties.origin || 'center'
                }
                onChange={e => {
                  if (e.target.value === 'custom') {
                    handleCustomOriginClick();
                  } else {
                    handleOriginChange(e.target.value);
                  }
                }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}
        </div>

        {/* Auto Speed */}
        <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Auto Speed
          </div>
          <CustomCheckbox
            checked={inputValues.isAutoSpeed}
            onChange={() =>
              handleAutoSpeedChange({
                target: { checked: !inputValues.isAutoSpeed },
              })
            }
          />
        </div>

        {/* Speed */}
        {!inputValues.isAutoSpeed && (
          <div
            className={
              props.isSidebar
                ? styles.sidebarAnimationInputRow
                : styles.animationInputRow
            }
          >
            {props.isSidebar ? (
              <RangeInput
                label={'Speed'}
                currentValue={inputValues.speed}
                onValueChange={handleSpeedChange}
                step={0.1}
                min={0.1}
                max={5.0}
                measure={'x'}
              />
            ) : (
              <div>
                <input
                  className={
                    props.isSidebar
                      ? styles.sidebarInputField
                      : styles.inputField
                  }
                  type={props.isSidebar ? 'text' : 'number'}
                  step={props.isSidebar ? undefined : 0.1}
                  min="0.1"
                  value={inputValues.speed}
                  onChange={handleSpeedChange}
                />
                {props.isSidebar && <span className={styles.symbol}>x</span>}
              </div>
            )}
          </div>
        )}

        {/* Smooth Return */}
        <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Smooth Return
          </div>
          <CustomCheckbox
            checked={inputValues.smoothReturn}
            onChange={() =>
              handleSmoothReturnChange({
                target: { checked: !inputValues.smoothReturn },
              })
            }
          />
        </div>
        {/* Time Range Selector */}
        <TimeRangeInput
          min={0}
          max={totalDuration}
          valueStart={Math.max(
            0,
            Math.min(totalDuration, inputValues.startTime)
          )}
          valueEnd={Math.max(0, Math.min(totalDuration, inputValues.endTime))}
          onChange={handleDualRangeChange}
          step={100}
          displayAsPercent={true}
        />

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.endTime - inputValues.startTime}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

// Curve Editor Component
const CurveEditor = ({
  curveData,
  onChange,
  width = 280,
  height = 200,
  duration = 1000,
}) => {
  const [points, setPoints] = React.useState(
    curveData || [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ]
  );

  const [dragIndex, setDragIndex] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [easingFormat, setEasingFormat] = React.useState('anime'); // anime, css, css-linear
  const [showEasingCode, setShowEasingCode] = React.useState(false);
  const svgRef = React.useRef(null);
  const dragPointRef = React.useRef(null);
  const animationFrameRef = React.useRef(null);

  // Update local points when curveData changes
  React.useEffect(() => {
    if (
      !isDragging &&
      curveData &&
      JSON.stringify(curveData) !== JSON.stringify(points)
    ) {
      setPoints(curveData);
    }
  }, [curveData, isDragging]);

  // Convert normalized coordinates to SVG coordinates
  const toSVG = point => ({
    x: point.x * width,
    y: height - point.y * height,
  });

  // Convert SVG coordinates to normalized coordinates
  const toNormalized = svgPoint => ({
    x: Math.max(0, Math.min(1, svgPoint.x / width)),
    y: Math.max(0, Math.min(1, 1 - svgPoint.y / height)),
  });

  // Create smooth curve path
  const createCurvePath = points => {
    if (points.length < 2) return '';

    const svgPoints = points.map(toSVG);
    let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;

    for (let i = 1; i < svgPoints.length; i++) {
      const prev = svgPoints[i - 1];
      const curr = svgPoints[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Optimized update function with animation frame
  const updatePointPosition = React.useCallback(
    (index, newPoint) => {
      setPoints(prevPoints => {
        const newPoints = [...prevPoints];
        newPoints[index] = newPoint;
        return newPoints;
      });

      // Throttle onChange calls
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (onChange) {
          setPoints(currentPoints => {
            onChange(currentPoints);
            return currentPoints;
          });
        }
      });
    },
    [onChange]
  );

  // Add point on curve click
  const handleCurveClick = e => {
    if (isDragging || dragIndex !== null) return;

    const rect = svgRef.current.getBoundingClientRect();
    const eventPos = getEventPosition(e);
    const svgPoint = {
      x: eventPos.clientX - rect.left,
      y: eventPos.clientY - rect.top,
    };

    const normalizedPoint = toNormalized(svgPoint);

    // Find the right position to insert the new point
    let insertIndex = points.length;
    for (let i = 0; i < points.length - 1; i++) {
      if (
        normalizedPoint.x > points[i].x &&
        normalizedPoint.x < points[i + 1].x
      ) {
        insertIndex = i + 1;
        break;
      }
    }

    const newPoints = [...points];
    newPoints.splice(insertIndex, 0, normalizedPoint);
    setPoints(newPoints);
    setSelectedIndex(insertIndex);

    if (onChange) {
      onChange(newPoints);
    }
  };

  // Delete selected point
  const handleDeletePoint = () => {
    if (
      selectedIndex === null ||
      selectedIndex === 0 ||
      selectedIndex === points.length - 1
    ) {
      return; // Don't delete first or last point
    }

    const newPoints = points.filter((_, index) => index !== selectedIndex);
    setPoints(newPoints);
    setSelectedIndex(null);

    if (onChange) {
      onChange(newPoints);
    }
  };

  // // Handle keyboard events te,porary disabled task 86b6bakhu
  // React.useEffect(() => {
  //   const handleKeyDown = e => {
  //     if (e.key === 'Delete' || e.key === 'Backspace') {
  //       handleDeletePoint();
  //     }
  //   };

  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, [selectedIndex, points]);

  const handleMouseDown = index => e => {
    if (index === 0 || index === points.length - 1) return; // Don't allow dragging first and last points
    setDragIndex(index);
    setSelectedIndex(index);
    setIsDragging(true);
    dragPointRef.current = points[index];
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = index => e => {
    if (index === 0 || index === points.length - 1) return; // Don't allow dragging first and last points
    setDragIndex(index);
    setSelectedIndex(index);
    setIsDragging(true);
    dragPointRef.current = points[index];
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointClick = index => e => {
    if (!isDragging) {
      setSelectedIndex(index);
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const getEventPosition = e => {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const handleMouseMove = React.useCallback(
    e => {
      if (dragIndex === null || !svgRef.current || !isDragging) return;

      const rect = svgRef.current.getBoundingClientRect();
      const eventPos = getEventPosition(e);
      const svgPoint = {
        x: eventPos.clientX - rect.left,
        y: eventPos.clientY - rect.top,
      };

      const normalizedPoint = toNormalized(svgPoint);

      // Constrain x to be between adjacent points
      const prevX = dragIndex > 0 ? points[dragIndex - 1].x : 0;
      const nextX = dragIndex < points.length - 1 ? points[dragIndex + 1].x : 1;
      normalizedPoint.x = Math.max(
        prevX + 0.01,
        Math.min(nextX - 0.01, normalizedPoint.x)
      );

      // Update point position immediately for smooth dragging
      updatePointPosition(dragIndex, normalizedPoint);
    },
    [dragIndex, points, isDragging, updatePointPosition]
  );

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      // Final update when dragging ends
      setTimeout(() => {
        setIsDragging(false);
        setDragIndex(null);
      }, 50);
    }
  }, [isDragging]);

  React.useEffect(() => {
    if (dragIndex !== null && isDragging) {
      const handleMove = e => {
        e.preventDefault();
        handleMouseMove(e);
      };
      const handleTouchMove = e => {
        e.preventDefault();
        handleMouseMove(e);
      };

      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragIndex, isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup animation frame on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Create timeline points for display
  const timelinePoints = points.map(point => ({
    x: point.x * duration,
    position: point.x * width,
  }));

  // Generate easing code for current format
  const generatedEasing = React.useMemo(() => {
    return convertCurveToEasing(points, easingFormat);
  }, [points, easingFormat]);

  // Copy easing code to clipboard
  const copyEasingCode = () => {
    if (typeof generatedEasing === 'string') {
      navigator.clipboard
        .writeText(generatedEasing)
        .then(() => {})
        .catch(err => {
          console.error('Failed to copy easing code:', err);
        });
    }
  };

  return (
    <div className={styles.curveEditor}>
      {/* Main curve editing area */}
      <div className={styles.curveArea}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className={styles.curveSvg}
          // onClick={handleCurveClick} temporary disabled task 86b6bakhu
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="23"
              height="23"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Curve line */}
          <defs>
            <linearGradient
              id="curveGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1F878A" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3AFCEA" stopOpacity="1" />
              <stop offset="100%" stopColor="#207F82" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d={createCurvePath(points)}
            fill="none"
            stroke="url(#curveGradient)"
            strokeWidth="2"
            className={styles.curvePath}
          />

          {/* Control points */}
          {points.map((point, index) => {
            const svgPoint = toSVG(point);
            const isEndPoint = index === 0 || index === points.length - 1;
            const isSelected = index === selectedIndex;
            const isBeingDragged = index === dragIndex && isDragging;

            return (
              <circle
                key={index}
                cx={svgPoint.x}
                cy={svgPoint.y}
                r={isEndPoint ? 4 : 3}
                fill={
                  isEndPoint
                    ? '#4ade80'
                    : isBeingDragged
                    ? '#fbbf24'
                    : isSelected
                    ? 'var(--accent-color)'
                    : 'white'
                }
                stroke={
                  isEndPoint
                    ? '#22c55e'
                    : isBeingDragged
                    ? '#f59e0b'
                    : isSelected
                    ? 'var(--accent-color)'
                    : 'rgba(255,255,255,0.8)'
                }
                strokeWidth="2"
                className={
                  isEndPoint
                    ? styles.endPoint
                    : isBeingDragged
                    ? styles.draggingPoint
                    : isSelected
                    ? styles.selectedPoint
                    : styles.controlPoint
                }
                onMouseDown={handleMouseDown(index)}
                onTouchStart={handleTouchStart(index)}
                onClick={handlePointClick(index)}
                style={{
                  cursor: isEndPoint
                    ? 'default'
                    : isBeingDragged
                    ? 'grabbing'
                    : 'grab',
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Timeline */}
      <div className={styles.timelineTrack}>
        {(() => {
          // First pass: determine which points need to be moved
          const movedPoints = new Set();

          // First and last points are always moved
          movedPoints.add(0);
          movedPoints.add(timelinePoints.length - 1);

          // Check middle points for proximity
          for (let i = 1; i < timelinePoints.length - 1; i++) {
            const prevPoint = timelinePoints[i - 1];
            const currentPoint = timelinePoints[i];
            const distanceToPrev = Math.abs(
              currentPoint.position - prevPoint.position
            );
            const gridWidth = 23;

            // If close to previous point and previous point doesn't have a different position
            if (distanceToPrev < gridWidth && !movedPoints.has(i - 1)) {
              movedPoints.add(i);
            }
          }

          // Second pass: render with appropriate classes
          return timelinePoints.map((point, index) => {
            const isFirst = index === 0;
            const isLast = index === timelinePoints.length - 1;
            const isMoved = movedPoints.has(index);

            return (
              <div
                key={index}
                className={styles.timelinePoint}
                style={{ left: `${point.position}px` }}
              >
                <div className={styles.timelineVerticalLine}></div>
                <div
                  className={`${styles.timeLabel} ${
                    isFirst
                      ? styles.timeLabelFirst
                      : isLast
                      ? styles.timeLabelLast
                      : isMoved
                      ? styles.timeLabelFirst
                      : ''
                  }`}
                >
                  {isFirst
                    ? (point.x / 1000).toFixed(0) + 's'
                    : (point.x / 1000).toFixed(2) + 's'}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

// FadeEffectAnimation component based on ZoomEffectNewAnimation
// GL Transition Animation component
export const GLTransitionAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  const selectedElement = store.selectedElement;
  const elementTimeFrame = selectedElement?.timeFrame || {
    start: 0,
    end: 1000,
  };

  // Get transition information from availableTransitions
  const transitionInfo = React.useMemo(() => {
    // Import the full transition definitions
    let fallbackTransitions = [];
    try {
      const {
        glTransitionDefinitions,
      } = require('../../../utils/gl-transitions/transition-definitions.js');
      fallbackTransitions = glTransitionDefinitions;
    } catch (error) {
      console.warn('Could not load GL transition definitions:', error);
      // Fallback to basic transitions
      fallbackTransitions = [
        {
          name: 'Bounce',
          displayName: 'Bounce',
          author: 'Adrian Purser',
          defaultParams: {
            shadow_colour: [0, 0, 0, 0.6],
            shadow_height: 0.075,
            bounces: 3,
          },
          paramsTypes: {
            shadow_colour: 'vec4',
            shadow_height: 'float',
            bounces: 'float',
          },
        },
        {
          name: 'BowTieHorizontal',
          displayName: 'Bow Tie Horizontal',
          author: 'huynx',
          defaultParams: {},
          paramsTypes: {},
        },
        {
          name: 'BowTieVertical',
          displayName: 'Bow Tie Vertical',
          author: 'huynx',
          defaultParams: {},
          paramsTypes: {},
        },
        {
          name: 'ButterflyWaveScrawler',
          displayName: 'Butterfly Wave Scrawler',
          author: 'mandubian',
          defaultParams: {
            amplitude: 1,
            waves: 30,
            colorSeparation: 0.3,
          },
          paramsTypes: {
            amplitude: 'float',
            waves: 'float',
            colorSeparation: 'float',
          },
        },
        {
          name: 'CircleCrop',
          displayName: 'Circle Crop',
          author: 'fkuteken',
          defaultParams: {
            bgcolor: [0, 0, 0, 1],
          },
          paramsTypes: {
            bgcolor: 'vec4',
          },
        },
        {
          name: 'ColourDistance',
          displayName: 'Colour Distance',
          author: 'P-Seebauer',
          defaultParams: {
            power: 5,
          },
          paramsTypes: {
            power: 'float',
          },
        },
        {
          name: 'CrazyParametricFun',
          displayName: 'Crazy Parametric Fun',
          author: 'mandubian',
          defaultParams: {
            a: 4,
            b: 1,
            amplitude: 120,
            smoothness: 0.1,
          },
          paramsTypes: {
            a: 'float',
            b: 'float',
            amplitude: 'float',
            smoothness: 'float',
          },
        },
        {
          name: 'CrossZoom',
          displayName: 'Cross Zoom',
          author: 'rectalogic',
          defaultParams: {
            strength: 0.4,
          },
          paramsTypes: {
            strength: 'float',
          },
        },
        {
          name: 'Directional',
          displayName: 'Directional',
          author: 'Gaëtan Renaudeau',
          defaultParams: {
            direction: [0, 1],
          },
          paramsTypes: {
            direction: 'vec2',
          },
        },
        {
          name: 'DoomScreenTransition',
          displayName: 'Doom Screen Transition',
          author: 'Zeh Fernando',
          defaultParams: {
            bars: 30,
            amplitude: 2,
            noise: 0.1,
            frequency: 0.5,
            dripScale: 0.5,
          },
          paramsTypes: {
            bars: 'int',
            amplitude: 'float',
            noise: 'float',
            frequency: 'float',
            dripScale: 'float',
          },
        },
        {
          name: 'Dreamy',
          displayName: 'Dreamy',
          author: 'mikolalysenko',
          defaultParams: {},
          paramsTypes: {},
        },
        {
          name: 'DreamyZoom',
          displayName: 'Dreamy Zoom',
          author: 'Zeh Fernando',
          defaultParams: {
            rotation: 6,
            scale: 1.2,
          },
          paramsTypes: {
            rotation: 'float',
            scale: 'float',
          },
        },
        {
          name: 'crosshatch',
          displayName: 'Crosshatch',
          author: 'pthrasher',
          defaultParams: {
            center: [0.5, 0.5],
            threshold: 3,
            fadeEdge: 0.1,
          },
          paramsTypes: {
            center: 'vec2',
            threshold: 'float',
            fadeEdge: 'float',
          },
        },
        {
          name: 'cube',
          displayName: 'Cube',
          author: 'gre',
          defaultParams: {
            persp: 0.7,
            unzoom: 0.3,
            reflection: 0.4,
            floating: 3,
          },
          paramsTypes: {
            persp: 'float',
            unzoom: 'float',
            reflection: 'float',
            floating: 'float',
          },
        },
        {
          name: 'directionalwarp',
          displayName: 'Directionalwarp',
          author: 'pschroen',
          defaultParams: {
            direction: [-1, 1],
          },
          paramsTypes: {
            direction: 'vec2',
          },
        },
        {
          name: 'ripple',
          displayName: 'Ripple',
          author: 'gre',
          defaultParams: {
            amplitude: 100,
            speed: 50,
          },
          paramsTypes: {
            amplitude: 'float',
            speed: 'float',
          },
        },
        {
          name: 'WaterDrop',
          displayName: 'Water Drop',
          author: 'Paweł Płóciennik',
          defaultParams: {
            amplitude: 30,
            speed: 30,
          },
          paramsTypes: {
            amplitude: 'float',
            speed: 'float',
          },
        },
      ];
    }

    // Get transition type from animation object or properties
    const transitionType =
      props.animation.transitionType ||
      props.animation.properties?.transitionType ||
      props.animation.type;

    return (
      fallbackTransitions.find(t => t.name === transitionType) || {
        name: transitionType,
        displayName: transitionType || 'GL Transition',
        defaultParams: {},
        paramsTypes: {},
      }
    );
  }, [
    props.animation.transitionType,
    props.animation.properties?.transitionType,
    props.animation.type,
  ]);

  const [inputValues, setInputValues] = React.useState(() => {
    const startTime = props.animation.startTime || 0;
    const endTime =
      props.animation.endTime || startTime + (props.animation.duration || 1200);

    return {
      startTime: startTime,
      endTime: endTime,
      // Initialize with transition-specific parameters
      ...transitionInfo.defaultParams,
      // Override with any existing custom parameters
      ...(properties.customParams || {}),
    };
  });

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleReset = () => {
    const defaultStartTime = props.animation.startTime || 0;
    const defaultDuration = 1200;
    const defaultEndTime = defaultStartTime + defaultDuration;

    setInputValues({
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      ...transitionInfo.defaultParams,
    });

    // Update GL transition timing like in TransitionVisualizer
    store.updateGLTransitionTiming(props.animation.id, {
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      duration: defaultDuration,
    });

    // Reset custom parameters
    store.updateGLTransitionProperties(props.animation.id, {
      customParams: { ...transitionInfo.defaultParams },
    });
  };

  // Update inputValues when transition changes from Timeline like in TransitionVisualizer
  React.useEffect(() => {
    const glTransition = store.animations.find(
      a => a.id === props.animation.id
    );
    if (glTransition) {
      const currentStartTime = glTransition.startTime || 0;
      const currentEndTime =
        glTransition.endTime ||
        currentStartTime + (glTransition.duration || 300);

      setInputValues(prev => ({
        ...prev,
        startTime: currentStartTime,
        endTime: currentEndTime,
      }));
    }
  }, [
    props.animation.id,
    store.animations,
    props.animation.startTime,
    props.animation.endTime,
    props.animation.duration,
  ]);

  const handleTimeRangeChange = (newStartTime, newEndTime) => {
    const newDuration = newEndTime - newStartTime;

    // Get from and to elements for boundary constraints like in TransitionVisualizer
    const glTransition = store.animations.find(
      a => a.id === props.animation.id
    );
    if (!glTransition) return;

    const fromElement = store.editorElements.find(
      el => el.id === glTransition.fromElementId
    );
    const toElement = store.editorElements.find(
      el => el.id === glTransition.toElementId
    );

    // Apply element boundary constraints like in TransitionVisualizer
    let constrainedStartTime = newStartTime;
    let constrainedEndTime = newEndTime;

    if (fromElement) {
      constrainedStartTime = Math.max(
        constrainedStartTime,
        fromElement.timeFrame.start
      );
      constrainedStartTime = Math.min(
        constrainedStartTime,
        fromElement.timeFrame.end
      );
    }

    if (toElement) {
      constrainedEndTime = Math.max(
        constrainedEndTime,
        toElement.timeFrame.start
      );
      constrainedEndTime = Math.min(
        constrainedEndTime,
        toElement.timeFrame.end
      );
    }

    // Ensure minimum duration
    const minDuration = 100;
    if (constrainedEndTime - constrainedStartTime < minDuration) {
      if (constrainedEndTime === newEndTime) {
        // End time was constrained, adjust start time
        constrainedStartTime = constrainedEndTime - minDuration;
      } else {
        // Start time was constrained, adjust end time
        constrainedEndTime = constrainedStartTime + minDuration;
      }
    }

    const finalDuration = constrainedEndTime - constrainedStartTime;

    setInputValues(prev => ({
      ...prev,
      startTime: constrainedStartTime,
      endTime: constrainedEndTime,
    }));

    // Update GL transition timing like in TransitionVisualizer
    store.updateGLTransitionTiming(props.animation.id, {
      startTime: constrainedStartTime,
      endTime: constrainedEndTime,
      duration: finalDuration,
    });

    // Also update the animation object properties for consistency
    if (glTransition.properties) {
      glTransition.properties.startTime = constrainedStartTime;
      glTransition.properties.endTime = constrainedEndTime;
      glTransition.properties.duration = finalDuration;
    }

    // Update the main animation fields
    glTransition.startTime = constrainedStartTime;
    glTransition.endTime = constrainedEndTime;
    glTransition.duration = finalDuration;

    // Resolve GL targets after time change to update target elements
    const animationTimeFrame = {
      start: constrainedStartTime,
      end: constrainedEndTime,
    };
    const animationElement = store.editorElements.find(
      el => el.type === 'animation' && el.animationId === glTransition.id
    );
    if (animationElement) {
      const newTargetIds = store.resolveGLTargets(
        animationElement.row,
        animationTimeFrame
      );
      if (newTargetIds && newTargetIds.length > 0) {
        glTransition.fromElementId = newTargetIds[0];
        glTransition.toElementId =
          newTargetIds.length > 1 ? newTargetIds[1] : newTargetIds[0];
        glTransition.targetIds = newTargetIds;

        // Update timeline element as well
        animationElement.fromElementId = newTargetIds[0];
        animationElement.toElementId =
          newTargetIds.length > 1 ? newTargetIds[1] : newTargetIds[0];
        animationElement.targetIds = newTargetIds;
      }
    }

    // Force MobX to trigger observers like in TransitionVisualizer
    store.refreshAnimations();

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent('transitionUpdated', {
        detail: {
          transitionId: props.animation.id,
          action: 'timeRangeChange',
        },
      })
    );
  };

  const handleParameterChange = (paramName, value, paramType) => {
    let processedValue = value;

    // Process value based on parameter type
    switch (paramType) {
      case 'float':
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) return;
        break;
      case 'int':
        processedValue = parseInt(value);
        if (isNaN(processedValue)) return;
        break;
      case 'bool':
        processedValue = Boolean(value);
        break;
      case 'vec2':
        // Handle vec2 as array [x, y]
        if (Array.isArray(value)) {
          processedValue = value.map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (processedValue.length !== 2) return;
        }
        break;
      case 'vec3':
        // Handle vec3 as array [x, y, z]
        if (Array.isArray(value)) {
          processedValue = value.map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (processedValue.length !== 3) return;
        }
        break;
      case 'vec4':
        // Handle vec4 as array [x, y, z, w]
        if (Array.isArray(value)) {
          processedValue = value.map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (processedValue.length !== 4) return;
        }
        break;
      default:
        // Default to float
        if (typeof value === 'string') {
          processedValue = parseFloat(value);
          if (isNaN(processedValue)) return;
        }
    }

    setInputValues(prev => ({ ...prev, [paramName]: processedValue }));

    // For GL transitions, use the dedicated update method
    const updatedCustomParams = {
      ...(properties.customParams || {}),
      [paramName]: processedValue,
    };

    store.updateGLTransitionProperties(props.animation.id, {
      customParams: updatedCustomParams,
    });
  };

  const renderParameterInput = (paramName, paramType, defaultValue) => {
    const currentValue =
      inputValues[paramName] !== undefined
        ? inputValues[paramName]
        : defaultValue;

    switch (paramType) {
      case 'float':
        return (
          <RangeInput
            label={paramName
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())}
            currentValue={currentValue}
            onValueChange={e =>
              handleParameterChange(paramName, e.target.value, paramType)
            }
            step={0.1}
            min={
              paramName.includes('opacity') || paramName.includes('alpha')
                ? 0
                : -10
            }
            max={
              paramName.includes('opacity') || paramName.includes('alpha')
                ? 1
                : 10
            }
            measure={''}
          />
        );

      case 'int':
        return (
          <RangeInput
            label={paramName
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())}
            currentValue={currentValue}
            onValueChange={e =>
              handleParameterChange(paramName, e.target.value, paramType)
            }
            step={1}
            min={0}
            max={100}
            measure={''}
          />
        );

      case 'bool':
        return (
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              {paramName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())}
            </div>
            <CustomCheckbox
              checked={currentValue}
              onChange={() =>
                handleParameterChange(paramName, !currentValue, paramType)
              }
            />
          </div>
        );

      case 'vec2':
        return (
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              {paramName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className={styles.sidebarInputField}
                type="number"
                step={0.1}
                style={{ flex: 1, fontSize: '12px' }}
                value={
                  Array.isArray(currentValue)
                    ? currentValue[0]
                    : currentValue?.x || 0
                }
                onChange={e => {
                  const newValue = Array.isArray(currentValue)
                    ? [...currentValue]
                    : [0, 0];
                  newValue[0] = parseFloat(e.target.value);
                  handleParameterChange(paramName, newValue, paramType);
                }}
                placeholder="X"
              />
              <input
                className={styles.sidebarInputField}
                type="number"
                step={0.1}
                style={{ flex: 1, fontSize: '12px' }}
                value={
                  Array.isArray(currentValue)
                    ? currentValue[1]
                    : currentValue?.y || 0
                }
                onChange={e => {
                  const newValue = Array.isArray(currentValue)
                    ? [...currentValue]
                    : [0, 0];
                  newValue[1] = parseFloat(e.target.value);
                  handleParameterChange(paramName, newValue, paramType);
                }}
                placeholder="Y"
              />
            </div>
          </div>
        );

      case 'vec3':
        return (
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              {paramName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['X', 'Y', 'Z'].map((label, index) => (
                <input
                  key={index}
                  className={styles.sidebarInputField}
                  type="number"
                  step={paramName.includes('color') ? 0.01 : 0.1}
                  min={paramName.includes('color') ? 0 : undefined}
                  max={paramName.includes('color') ? 1 : undefined}
                  style={{ flex: 1, fontSize: '11px' }}
                  value={Array.isArray(currentValue) ? currentValue[index] : 0}
                  onChange={e => {
                    const newValue = Array.isArray(currentValue)
                      ? [...currentValue]
                      : [0, 0, 0];
                    newValue[index] = parseFloat(e.target.value);
                    handleParameterChange(paramName, newValue, paramType);
                  }}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
        );

      case 'vec4':
        return (
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              {paramName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())}
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['X', 'Y', 'Z', 'W'].map((label, index) => (
                <input
                  key={index}
                  className={styles.sidebarInputField}
                  type="number"
                  step={paramName.includes('color') ? 0.01 : 0.1}
                  min={paramName.includes('color') ? 0 : undefined}
                  max={paramName.includes('color') ? 1 : undefined}
                  style={{ flex: 1, fontSize: '10px' }}
                  value={Array.isArray(currentValue) ? currentValue[index] : 0}
                  onChange={e => {
                    const newValue = Array.isArray(currentValue)
                      ? [...currentValue]
                      : [0, 0, 0, 0];
                    newValue[index] = parseFloat(e.target.value);
                    handleParameterChange(paramName, newValue, paramType);
                  }}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <RangeInput
            label={paramName
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())}
            currentValue={currentValue}
            onValueChange={e =>
              handleParameterChange(paramName, e.target.value, 'float')
            }
            step={0.1}
            min={0}
            max={10}
            measure={''}
          />
        );
    }
  };

  return (
    <div className={styles.fadeAnimation}>
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName || transitionInfo.displayName}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        {/* Animation Time Range */}
        <TimeRangeInput
          min={(() => {
            // Calculate min time based on target elements
            const glTransition = store.animations.find(
              a => a.id === props.animation.id
            );
            if (!glTransition) return 0;

            const fromElement = store.editorElements.find(
              el => el.id === glTransition.fromElementId
            );
            const toElement = store.editorElements.find(
              el => el.id === glTransition.toElementId
            );

            if (fromElement && toElement) {
              return Math.min(
                fromElement.timeFrame.start,
                toElement.timeFrame.start
              );
            } else if (fromElement) {
              return fromElement.timeFrame.start;
            } else if (toElement) {
              return toElement.timeFrame.start;
            }
            return 0;
          })()}
          max={(() => {
            // Calculate max time based on target elements
            const glTransition = store.animations.find(
              a => a.id === props.animation.id
            );
            if (!glTransition) return store.maxTime || 10000;

            const fromElement = store.editorElements.find(
              el => el.id === glTransition.fromElementId
            );
            const toElement = store.editorElements.find(
              el => el.id === glTransition.toElementId
            );

            if (fromElement && toElement) {
              return Math.max(
                fromElement.timeFrame.end,
                toElement.timeFrame.end
              );
            } else if (fromElement) {
              return fromElement.timeFrame.end;
            } else if (toElement) {
              return toElement.timeFrame.end;
            }
            return store.maxTime || 10000;
          })()}
          valueStart={inputValues.startTime}
          valueEnd={inputValues.endTime}
          onChange={handleTimeRangeChange}
          step={1}
          displayAsPercent={false}
          disableRangeMove={true}
        />

        {/* Transition-specific parameters */}
        {Object.entries(transitionInfo.paramsTypes).map(
          ([paramName, paramType]) => {
            if (paramName === 'displacementMap' || paramName === 'luma') {
              // Skip texture parameters for now
              return null;
            }

            return (
              <div key={paramName}>
                {renderParameterInput(
                  paramName,
                  paramType,
                  transitionInfo.defaultParams[paramName]
                )}
              </div>
            );
          }
        )}
      </div>

      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the transition"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});

export const FadeEffectAnimation = observer(props => {
  const store = React.useContext(StoreContext);
  const properties = props.animation.properties || {};
  // Resolve active target element (prefer explicit targetId; otherwise from targetIds prefer selected element if included)
  const targetElement = React.useMemo(() => {
    if (props.animation.targetId) {
      return (
        store.editorElements.find(el => el.id === props.animation.targetId) ||
        null
      );
    }
    const ids = props.animation.targetIds || [];
    if (ids.length > 0) {
      if (store.selectedElement && ids.includes(store.selectedElement.id)) {
        return (
          store.editorElements.find(el => el.id === store.selectedElement.id) ||
          null
        );
      }
      return store.editorElements.find(el => el.id === ids[0]) || null;
    }
    return null;
  }, [
    store.editorElements,
    store.selectedElement,
    props.animation.targetId,
    props.animation.targetIds,
  ]);

  const elementTimeFrame = targetElement?.timeFrame || { start: 0, end: 1000 };
  const totalDuration = elementTimeFrame.end - elementTimeFrame.start;

  // Calculate initial duration from startTime and endTime
  const initialStartTime = properties.startTime ?? 0;
  const initialEndTime = properties.endTime ?? Math.min(1000, totalDuration);
  const initialDuration = initialEndTime - initialStartTime;

  const [inputValues, setInputValues] = React.useState({
    opacity: properties.opacity ?? 1.0,
    targetOpacity: properties.targetOpacity ?? 0.3,
    speed: properties.speed ?? 1.0,
    isAutoSpeed: properties.isAutoSpeed ?? true,
    startTime: initialStartTime,
    endTime: initialEndTime,
    animationType: properties.animationType ?? 'fadeIn',
    smoothReturn: properties.smoothReturn ?? false,
    curveData: properties.curveData ?? [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1 },
    ],
  });

  // Create debounced update function
  const debouncedUpdateAnimation = useRef(null);
  const isUpdatingFromProp = useRef(false);

  // Cleanup debounced function on unmount
  React.useEffect(() => {
    return () => {
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }
    };
  }, []);

  // Watch for animation prop changes and update internal state
  React.useEffect(() => {
    if (isUpdatingFromProp.current) return; // Skip if we're updating from our own changes

    const newProperties = props.animation.properties || {};
    const newInitialStartTime = newProperties.startTime ?? 0;
    const newInitialEndTime =
      newProperties.endTime ?? Math.min(1000, totalDuration);

    // Update input values when animation prop changes (different animation selected)
    setInputValues(prevValues => {
      // Only update if the animation ID changed or if properties are significantly different
      const shouldUpdate =
        prevValues.opacity !== (newProperties.opacity ?? 1.0) ||
        prevValues.targetOpacity !== (newProperties.targetOpacity ?? 0.3) ||
        prevValues.animationType !==
          (newProperties.animationType ?? 'fadeIn') ||
        Math.abs(prevValues.startTime - newInitialStartTime) > 10 ||
        Math.abs(prevValues.endTime - newInitialEndTime) > 10;

      if (shouldUpdate) {
        isUpdatingFromProp.current = true;
        setTimeout(() => {
          isUpdatingFromProp.current = false;
        }, 100);

        return {
          opacity: newProperties.opacity ?? 1.0,
          targetOpacity: newProperties.targetOpacity ?? 0.3,
          speed: newProperties.speed ?? 1.0,
          isAutoSpeed: newProperties.isAutoSpeed ?? true,
          startTime: newInitialStartTime,
          endTime: newInitialEndTime,
          animationType: newProperties.animationType ?? 'fadeIn',
          smoothReturn: newProperties.smoothReturn ?? false,
          curveData: newProperties.curveData ?? [
            { x: 0, y: 0 },
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.7 },
            { x: 1, y: 1 },
          ],
        };
      }
      return prevValues;
    });
  }, [props.animation.id, props.animation.properties, totalDuration]);

  // Update animation duration on initialization if needed
  React.useEffect(() => {
    // Only update if there's a significant difference to avoid unnecessary updates that cause audio glitches
    const durationDiff = Math.abs(props.animation.duration - initialDuration);
    if (durationDiff > 1) {
      // Only update if difference is more than 1ms
      const animationUpdate = {
        ...props.animation,
        duration: initialDuration,
        properties: {
          ...properties,
          startTime: initialStartTime,
          endTime: initialEndTime,
          curveData: inputValues.curveData,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  }, []);

  // Improved handleTimeChange with feedback loop prevention
  const handleTimeChange = useCallback(
    (newStartTime, newEndTime) => {
      if (isUpdatingFromProp.current) return; // Prevent feedback loops

      // Validate inputs and constrain within bounds
      const constrainedStartTime = Math.max(
        0,
        Math.min(totalDuration, newStartTime)
      );
      const constrainedEndTime = Math.max(
        constrainedStartTime + 100,
        Math.min(totalDuration, newEndTime)
      );

      // Prevent unnecessary updates if values haven't changed significantly
      const startDiff = Math.abs(constrainedStartTime - inputValues.startTime);
      const endDiff = Math.abs(constrainedEndTime - inputValues.endTime);

      if (startDiff <= 5 && endDiff <= 5) {
        return; // Skip update if difference is too small
      }

      setInputValues(prev => ({
        ...prev,
        startTime: constrainedStartTime,
        endTime: constrainedEndTime,
      }));

      // Clear any existing debounced call
      if (debouncedUpdateAnimation.current) {
        clearTimeout(debouncedUpdateAnimation.current);
      }

      // Debounce the actual animation update
      debouncedUpdateAnimation.current = setTimeout(() => {
        const newDuration = constrainedEndTime - constrainedStartTime;
        const animationUpdate = {
          ...props.animation,
          duration: newDuration,
          properties: {
            ...properties,
            startTime: constrainedStartTime,
            endTime: constrainedEndTime,
          },
        };

        updateAnimationWithAutoSyncForResource(
          props.animation,
          animationUpdate,
          store,
          targetElement
        );
      }, 500); // Increased debounce delay
    },
    [
      totalDuration,
      inputValues.startTime,
      inputValues.endTime,
      properties,
      props.animation,
      store,
    ]
  );

  const handleDualRangeChange = useCallback(
    (start, end) => {
      const newStart = Math.round(start);
      const newEnd = Math.round(end);
      handleTimeChange(newStart, newEnd);
    },
    [handleTimeChange]
  );

  const handleReset = () => {
    const defaultValues = DEFAULT_ANIMATION_VALUES[props.animation.type];
    if (defaultValues) {
      setInputValues({
        opacity: defaultValues.properties.opacity,
        targetOpacity: defaultValues.properties.targetOpacity,
        speed: defaultValues.properties.speed,
        isAutoSpeed: defaultValues.properties.isAutoSpeed,
        startTime: defaultValues.properties.startTime,
        endTime: defaultValues.properties.endTime,
        animationType: defaultValues.properties.animationType,
        smoothReturn: defaultValues.properties.smoothReturn,
        curveData: [
          { x: 0, y: 0 },
          { x: 0.3, y: 0.3 },
          { x: 0.7, y: 0.7 },
          { x: 1, y: 1 },
        ],
      });
      resetAnimation(props.animation, store);
    }
  };

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleOpacityChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, opacity: value }));

    const newOpacity = parseFloat(value);
    if (!isNaN(newOpacity) && newOpacity >= 0 && newOpacity <= 1) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          opacity: newOpacity,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleTargetOpacityChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, targetOpacity: value }));

    const newTargetOpacity = parseFloat(value);
    if (
      !isNaN(newTargetOpacity) &&
      newTargetOpacity >= 0 &&
      newTargetOpacity <= 1
    ) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          targetOpacity: newTargetOpacity,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleSpeedChange = e => {
    const value = e.target.value;
    setInputValues(prev => ({ ...prev, speed: value }));

    const newSpeed = parseFloat(value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      const animationUpdate = {
        ...props.animation,
        properties: {
          ...properties,
          speed: newSpeed,
          isAutoSpeed: false,
        },
      };
      updateAnimationWithAutoSyncForResource(
        props.animation,
        animationUpdate,
        store,
        targetElement
      );
    }
  };

  const handleAutoSpeedChange = e => {
    const isAuto = e.target.checked;
    const newSpeed = isAuto ? 1.0 : inputValues.speed; // Reset to 1.0 when auto is enabled
    setInputValues(prev => ({ ...prev, isAutoSpeed: isAuto, speed: newSpeed }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        isAutoSpeed: isAuto,
        speed: newSpeed,
      },
    };
    const selectedElement = store.editorElements.find(
      el => el.id === props.animation.targetId
    );
    updateAnimationWithAutoSyncForResource(
      props.animation,
      animationUpdate,
      store,
      selectedElement
    );
  };

  const handleAnimationTypeChange = value => {
    setInputValues(prev => ({ ...prev, animationType: value }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        animationType: value,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const handleSmoothReturnChange = e => {
    const isSmooth = e.target.checked;
    setInputValues(prev => ({ ...prev, smoothReturn: isSmooth }));

    const animationUpdate = {
      ...props.animation,
      properties: {
        ...properties,
        smoothReturn: isSmooth,
      },
    };
    updateAnimationWithAutoSync(
      props.animation,
      animationUpdate,
      store,
      targetElement
    );
  };

  const formatTime = timeMs => {
    const seconds = Math.floor(timeMs / 1000);
    const ms = timeMs % 1000;
    return `${seconds}.${ms.toString().padStart(3, '0')}s`;
  };

  const getPreviewImage = () => {
    if (targetElement?.properties?.src) {
      return targetElement.properties.src;
    }
    return null;
  };

  const handlePreview = () => {
    if (targetElement && targetElement.timeFrame) {
      const { start, end } = targetElement.timeFrame;
      const animationStart = start + inputValues.startTime;
      const animationEnd = start + inputValues.endTime;
      const duration = animationEnd - animationStart;
      // Close any open panels
      window.dispatchEvent(new CustomEvent('closeFrameEditingPanel'));

      // Set current time to the start of the animation
      store.updateTimeTo(animationStart);
      // Start playing
      store.setPlaying(true);
      // Stop playing after animation duration
      setTimeout(() => {
        store.setPlaying(false);
        // Set time back to start
        store.updateTimeTo(animationStart);
      }, duration);
    } else {
      console.error('No selected element or timeFrame available');
    }
  };

  const handleCurveChange = createHandleCurveChange(
    setInputValues,
    props,
    properties,
    store
  );

  return (
    <div className={styles.fadeAnimation}>
      <AnimationPreviewFrames
        animation={props.animation}
        animationName={props.animationName || 'Fade Effect'}
        isInDetailPanel={props.isSidebar}
      />
      <div className={styles.animationControls}>
        {/* Time Range Selector */}

        {/* Opacity */}
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label="Opacity"
              currentValue={inputValues.opacity}
              onValueChange={handleOpacityChange}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type="number"
                step={0.1}
                min="0.0"
                max="1.0"
                value={inputValues.opacity}
                onChange={handleOpacityChange}
              />
            </div>
          )}
        </div>

        {/* Target Opacity */}
        <div
          className={
            props.isSidebar
              ? styles.sidebarAnimationInputRow
              : styles.animationInputRow
          }
        >
          {props.isSidebar ? (
            <RangeInput
              label="Target Opacity"
              currentValue={inputValues.targetOpacity}
              onValueChange={handleTargetOpacityChange}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
          ) : (
            <div>
              <input
                className={
                  props.isSidebar ? styles.sidebarInputField : styles.inputField
                }
                type="number"
                step={0.1}
                min="0.0"
                max="1.0"
                value={inputValues.targetOpacity}
                onChange={handleTargetOpacityChange}
              />
            </div>
          )}
        </div>

        <TimeRangeInput
          min={0}
          max={totalDuration}
          valueStart={inputValues.startTime}
          valueEnd={inputValues.endTime}
          onChange={handleDualRangeChange}
          step={100}
          displayAsPercent={true}
        />

        {/* Auto Speed */}
        <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Auto Speed
          </div>
          <CustomCheckbox
            checked={inputValues.isAutoSpeed}
            onChange={() =>
              handleAutoSpeedChange({
                target: { checked: !inputValues.isAutoSpeed },
              })
            }
          />
        </div>

        {/* Speed */}
        {!inputValues.isAutoSpeed && (
          <div
            className={
              props.isSidebar
                ? styles.sidebarAnimationInputRow
                : styles.animationInputRow
            }
          >
            {props.isSidebar ? (
              <RangeInput
                label={'Speed'}
                currentValue={inputValues.speed}
                onValueChange={handleSpeedChange}
                step={0.1}
                min={0.1}
                max={5.0}
                measure={'x'}
              />
            ) : (
              <div>
                <input
                  className={
                    props.isSidebar
                      ? styles.sidebarInputField
                      : styles.inputField
                  }
                  type="number"
                  step={0.1}
                  min="0.1"
                  max="5.0"
                  value={inputValues.speed}
                  onChange={handleSpeedChange}
                />
                {props.isSidebar && <span className={styles.symbol}>x</span>}
              </div>
            )}
          </div>
        )}

        {/* Smooth Return */}
        <div
          className={
            props.isSidebar
              ? `${styles.sidebarAnimationInputRow} ${styles.autoSpeedWrapper}`
              : `${styles.animationInputRow} ${styles.autoSpeedWrapper}`
          }
        >
          <div
            className={
              props.isSidebar ? styles.sidebarInputLabel : styles.inputLabel
            }
          >
            Smooth Return
          </div>
          <CustomCheckbox
            checked={inputValues.smoothReturn}
            onChange={() =>
              handleSmoothReturnChange({
                target: { checked: !inputValues.smoothReturn },
              })
            }
          />
        </div>

        {/* Curve Editor */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <CurveEditor
            curveData={inputValues.curveData}
            onChange={handleCurveChange}
            width={280}
            height={180}
            duration={inputValues.endTime - inputValues.startTime}
          />
        </div>
      </div>
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={() => handlePreviewClick(store, props.animation)}
          tooltipText="Preview the animation"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});
