import setScenesSyncWithSubtitles from './setScenesSyncWithSubtitles';
import { validateAndCorrectWords } from './textProcessing';
import { saveTimelineState } from '../redux/timeline/timelineSlice';
import { runInAction } from 'mobx';

const initializeCanvasImages = async (data, store, dispatch) => {
  // Add protection against multiple concurrent initializations
  if (store.isInitializationInProgress) {
    return;
  }

  // Add protection against reinitializing already loaded content
  if (store.editorElements?.length > 0 && store.storyId === data._id) {
    return;
  }

  // Set initialization flag at the start
  store.setStoryId(data._id);
  store.setInitializationState(true);

  // Initialize aspect ratio from storyData.orientation before restoring elements
  if (data.orientation && store.updateAspectRatio) {
    store.updateAspectRatio(data.orientation);
  } else if (!store.currentAspectRatio && store.updateAspectRatio) {
    // Set default aspect ratio if none exists
    store.updateAspectRatio({ width: 9, height: 16 });
  }

  // Clear any existing timeline history when initializing new story
  dispatch({ type: 'timeline/resetState' });

  let defaultTime = 60000;

  if (data.editorParams?.editorElements?.length > 0) {
    try {
      console.log('data.editorParams.maxTime', data.editorParams.maxTime);
      // Use the saved maxTime from server, or calculate dynamically
      const savedMaxTime = data.editorParams.maxTime;
      if (savedMaxTime && savedMaxTime > 0) {
        store.setMaxTime(savedMaxTime);
      } else {
        // Calculate based on content
        const lastElement = data.editorParams.editorElements
          .slice()
          .sort((a, b) => b.timeFrame.end - a.timeFrame.end)[0];

        if (lastElement) {
          const buffer = Math.max(30000, lastElement.timeFrame.end * 0.2);
          store.setMaxTime(lastElement.timeFrame.end + buffer);
        } else {
          store.setMaxTime(defaultTime);
        }
      }
      store.setBackgroundColor(data.editorParams.backgroundColor || '#000000');

      // Skip complex scaling logic during restore - we'll fix positioning after
      await store.restoreElementsFromBackend({
        editorElements: data.editorParams.editorElements,
      });

      // After restoring elements, ensure they are properly scaled for current aspect ratio
      if (store.canvas) {
        setTimeout(() => {
          const canvasWidth = store.canvas.width;
          const canvasHeight = store.canvas.height;

          // Process all image/video elements
          store.canvas.getObjects().forEach(obj => {
            if (
              obj.type === 'image' ||
              obj.type === 'videoImage' ||
              obj.type === 'CoverVideo'
            ) {
              const editorElement = store.editorElements.find(
                el => el.fabricObject === obj
              );
              if (editorElement) {
                // Check if element has custom placement (user has positioned it)
                const hasCustomPlacement =
                  editorElement.placement &&
                  editorElement.placement.x !== undefined &&
                  editorElement.placement.y !== undefined &&
                  editorElement.subType !== 'placeholder';

                if (!hasCustomPlacement) {
                  // Only recalculate for new images or placeholders
                  const imgAspectRatio = obj.width / obj.height;
                  const canvasAspectRatio = canvasWidth / canvasHeight;

                  let newScale;
                  if (imgAspectRatio > canvasAspectRatio) {
                    // Image is wider than canvas - fit to width
                    newScale = canvasWidth / obj.width;
                  } else {
                    // Image is taller than canvas - fit to height
                    newScale = canvasHeight / obj.height;
                  }

                  // Center the image
                  const newLeft = (canvasWidth - obj.width * newScale) / 2;
                  const newTop = (canvasHeight - obj.height * newScale) / 2;

                  obj.set({
                    left: newLeft,
                    top: newTop,
                    scaleX: newScale,
                    scaleY: newScale,
                  });
                } else {
                  // Keep existing position but ensure it's within canvas bounds
                  const currentLeft = Math.max(
                    0,
                    Math.min(editorElement.placement.x, canvasWidth)
                  );
                  const currentTop = Math.max(
                    0,
                    Math.min(editorElement.placement.y, canvasHeight)
                  );
                  const currentScaleX = editorElement.placement.scaleX || 1;
                  const currentScaleY = editorElement.placement.scaleY || 1;

                  obj.set({
                    left: currentLeft,
                    top: currentTop,
                    scaleX: currentScaleX,
                    scaleY: currentScaleY,
                  });
                }

                // Update editor element placement based on final fabric object values
                editorElement.placement = {
                  ...editorElement.placement,
                  x: obj.left,
                  y: obj.top,
                  scaleX: obj.scaleX,
                  scaleY: obj.scaleY,
                  width: obj.width * obj.scaleX,
                  height: obj.height * obj.scaleY,
                };
              }
            }
          });

          store.canvas.renderAll();
        }, 300); // Increased delay to ensure all elements are loaded
      }

      const segments = data.editorParams?.subtitles?.segments;
      const subtitleParams = data.editorParams?.subtitles?.properties;

      if (segments && segments.length > 0) {
        await store.setSubtitlesOnCanvas({ subtitleParams, segments });
      }

      // First, restore animations directly from data.editorParams.animations if available
      if (
        data.editorParams.animations &&
        data.editorParams.animations.length > 0
      ) {
        runInAction(() => {
          // Restore animations with their custom parameters
          const restoredAnimations = data.editorParams.animations.map(anim => ({
            ...anim,
            // Ensure customParams are preserved from properties
            properties: {
              ...anim.properties,
              // If customParams exist in properties, preserve them
              ...(anim.properties?.customParams && {
                customParams: anim.properties.customParams,
              }),
            },
          }));

          store.animations = [...store.animations, ...restoredAnimations];
        });

        // Initialize GL transition renderers for restored transitions
        const glTransitions = data.editorParams.animations.filter(
          anim => anim.type === 'glTransition'
        );
        if (glTransitions.length > 0) {
          for (const gl of glTransitions) {
            const fromElement = store.editorElements.find(
              e => e.id === gl.fromElementId
            );
            const toElement = store.editorElements.find(
              e => e.id === gl.toElementId
            );
            if (fromElement && toElement) {
              try {
                // Lazy setup: only build renderer if the transition is near the current time
                const now = store.currentTimeInMs;
                const nearWindow = 1500; // ms
                const isNear =
                  now >= gl.startTime - nearWindow &&
                  now <= gl.endTime + nearWindow;
                if (!store.LAZY_GL_SETUP || isNear) {
                  // Setup renderer and fabric object
                  // eslint-disable-next-line no-await-in-loop
                  await store.setupGLTransitionRenderer(
                    gl.id,
                    fromElement,
                    toElement,
                    gl.transitionType
                  );
                }

                // Apply custom parameters if they exist
                if (gl.properties?.customParams) {
                  store.updateGLTransitionProperties(gl.id, {
                    customParams: gl.properties.customParams,
                  });
                }

                if (!store.LAZY_GL_SETUP || isNear) {
                  store.synchronizeGLTransitionState(gl.id);
                }
              } catch (e) {
                console.error('Error setting up GL transition:', e);
              }
            }
          }
        }
      }

      // Restore animation timeline items directly from editorElements to preserve rows and timing
      const editorAnimationItems = (
        data.editorParams.editorElements || []
      ).filter(el => el.type === 'animation');

      if (editorAnimationItems.length > 0) {
        // Add timeline animation elements as-is
        runInAction(() => {
          store.editorElements = [
            ...store.editorElements,
            ...editorAnimationItems,
          ];
        });

        // Rebuild store.animations from timeline items instead of reconstructing
        const regularAnimationItems = editorAnimationItems.filter(
          el =>
            el.properties?.animationType &&
            el.properties.animationType !== 'glTransition'
        );
        const glTransitionItems = editorAnimationItems.filter(
          el =>
            el.properties?.animationType === 'glTransition' ||
            el.properties?.effectDirection === 'transition'
        );

        const builtRegularAnimations = regularAnimationItems.map(el => {
          const original = el.properties?.originalAnimation || {};
          const type = el.properties?.animationType || original.type;
          const targetIds =
            Array.isArray(el.targetIds) && el.targetIds.length
              ? el.targetIds
              : el.targetId
              ? [el.targetId]
              : [];
          const primaryTarget = targetIds.length
            ? store.editorElements.find(
                e => e.id === targetIds[0] && e.type !== 'animation'
              )
            : null;
          const duration =
            (el.timeFrame?.end || 0) - (el.timeFrame?.start || 0);
          const relativeStart = primaryTarget
            ? Math.max(0, el.timeFrame.start - primaryTarget.timeFrame.start)
            : original.properties?.startTime ?? 0;
          const relativeEnd = relativeStart + duration;

          return {
            id: el.animationId,
            type,
            targetIds,
            targetId: targetIds[0] || null, // legacy compatibility
            row: el.row,
            properties: {
              ...(original.properties || {}),
              startTime: relativeStart,
              endTime: relativeEnd,
              absoluteStart: el.timeFrame.start,
              absoluteEnd: el.timeFrame.end,
              displayName: el.properties?.displayName || original.displayName,
            },
          };
        });

        const builtGLTransitions = glTransitionItems.map(el => {
          const original = el.properties?.originalAnimation || {};
          const start = el.timeFrame?.start || original.startTime || 0;
          const end = el.timeFrame?.end || original.endTime || start;
          const transitionType =
            el.properties?.transitionType ||
            original.transitionType ||
            original.properties?.transitionType;
          const fromElementId =
            el.fromElementId ||
            (Array.isArray(el.targetIds) ? el.targetIds[0] : el.targetId);
          const toElementId =
            el.toElementId ||
            (Array.isArray(el.targetIds) ? el.targetIds[1] : null);

          const tids =
            Array.isArray(el.targetIds) && el.targetIds.length
              ? el.targetIds
              : [fromElementId, toElementId].filter(Boolean);

          return {
            id: el.animationId,
            type: 'glTransition',
            fromElementId,
            toElementId,
            transitionType,
            startTime: start,
            endTime: end,
            duration: Math.max(0, end - start),
            row: el.row,
            manuallyAdjusted: true, // preserve saved timing exactly
            targetIds: tids,
            properties: {
              ...(original.properties || {}),
              transitionType,
              startTime: start,
              endTime: end,
              duration: Math.max(0, end - start),
              // Preserve customParams if they exist in the original
              ...(original.properties?.customParams && {
                customParams: original.properties.customParams,
              }),
              // Also check if customParams exist in element properties
              ...(el.properties?.customParams && {
                customParams: el.properties.customParams,
              }),
            },
          };
        });

        runInAction(() => {
          // Only add animations that weren't already restored from data.editorParams.animations
          const existingAnimationIds = new Set(store.animations.map(a => a.id));
          const newRegularAnimations = builtRegularAnimations.filter(
            a => !existingAnimationIds.has(a.id)
          );
          const newGLTransitions = builtGLTransitions.filter(
            a => !existingAnimationIds.has(a.id)
          );

          store.animations = [
            ...store.animations,
            ...newRegularAnimations,
            ...newGLTransitions,
          ];
        });

        // Initialize GL transition renderers for restored transitions
        const existingAnimationIds = new Set(store.animations.map(a => a.id));
        const newGLTransitionsToSetup = builtGLTransitions.filter(
          a => !existingAnimationIds.has(a.id)
        );
        if (newGLTransitionsToSetup.length > 0) {
          for (const gl of newGLTransitionsToSetup) {
            const fromElement = store.editorElements.find(
              e => e.id === gl.fromElementId
            );
            const toElement = store.editorElements.find(
              e => e.id === gl.toElementId
            );
            if (fromElement && toElement) {
              try {
                // Setup renderer and fabric object without recreating timeline items
                // eslint-disable-next-line no-await-in-loop
                await store.setupGLTransitionRenderer(
                  gl.id,
                  fromElement,
                  toElement,
                  gl.transitionType
                );

                // Apply custom parameters if they exist
                if (gl.properties?.customParams) {
                  store.updateGLTransitionProperties(gl.id, {
                    customParams: gl.properties.customParams,
                  });
                }

                store.synchronizeGLTransitionState(gl.id);
              } catch (e) {
                // Swallow errors during setup to avoid breaking initialization
                console.error(
                  'Error setting up GL transition from timeline:',
                  e
                );
              }
            }
          }
        }

        // Ensure animations are active with restored timing/rows
        store.refreshAnimations();
      }
    } finally {
      store.setInitializationState(false);
      store.optimizedCleanupEmptyRows();
      setTimeout(() => {}, 1000);
    }
  } else {
    try {
      // Handle blank projects (no editorParams and no subtitles)
      if (!data.subtitles || data.subtitles.length === 0) {
        // For blank projects, just set default maxTime and initialize basic state
        store.setMaxTime(data.maxTime || defaultTime);
        store.setBackgroundColor(data.backgroundColor || '#000000');

        // Save initial empty state for blank projects
        setTimeout(() => {
          dispatch(saveTimelineState(store));
        }, 100);

        // Execute finally block logic for blank projects
        store.setInitializationState(false);
        store.optimizedCleanupEmptyRows();
        store.setSelectedElement(null);

        return; // Exit early for blank projects
      }

      // Calculate total duration from all subtitles and handle audio
      if (data.subtitles?.length > 0) {
        let accumulatedTime = 0;
        data.subtitles.forEach((subtitle, index) => {
          if (subtitle.audioUrl && !subtitle.isCheap) {
            const row = 1;

            store.addExistingAudio({
              id: subtitle._id,
              base64Audio: subtitle.audioUrl,
              durationMs: subtitle.duration,
              name: `Voiceover`,
              row,
              startTime: accumulatedTime,
              audioType: 'voice',
              autoSubtitles: true,
              text: subtitle.text,
            });
          }

          if (subtitle.duration) {
            accumulatedTime += subtitle.duration;
          }
        });

        store.setMaxTime(Math.max(defaultTime, accumulatedTime));

        // Process subtitles directly
        const processedSegments = [];

        data.subtitles.forEach(subtitle => {
          if (subtitle.segments) {
            subtitle.segments.forEach(segment => {
              // Process each segment
              const processedSegment = {
                text: segment.text,
                start: segment.start,
                end: segment.end,
                words: segment.words.map(word => ({
                  word: word.word,
                  start: word.start,
                  end: word.end,
                  score: word.score,
                })),
              };

              // Validate and correct words if needed
              if (data.originScenes) {
                const correctedWords = validateAndCorrectWords(
                  processedSegment.words,
                  data.originScenes
                );

                // Update segment text based on corrected words
                const updatedText = correctedWords
                  .map(word => word.word)
                  .join(' ')
                  .replace(/ ([.,!?])/g, '$1')
                  .replace(/\s+/g, ' ')
                  .trim();

                processedSegment.words = correctedWords;
                processedSegment.text = updatedText;
              }

              processedSegments.push(processedSegment);
            });
          }
        });

        if (data.video && data.video.length > 0) {
          data.video.forEach(video => {
            store.handleVideoUploadFromUrl({
              url: video.s3Url,
              title: video.title,
              key: video.key,
              duration: video.length * 1000,
              row: 1,
            });
          });
        }

        // Handle subtitles if present
        // Sort segments by start time
        processedSegments.sort((a, b) => a.start - b.start);

        // Add the processed segments to the store
        if (processedSegments.length > 0) {
          // Create properly structured subtitles data for scene sync
          const subtitlesData = {
            ...data,
            subtitles: data.subtitles.map(subtitle => ({
              ...subtitle,
              duration: subtitle.duration, // Duration is already in ms
              segments: processedSegments,
            })),
          };

          // Synchronize scenes with subtitles
          await setScenesSyncWithSubtitles(subtitlesData, store);
        }
      }
    } finally {
      store.setInitializationState(false);
      store.optimizedCleanupEmptyRows();
      store.setSelectedElement(null);

      // Save initial state after initialization is complete
      setTimeout(() => {
        dispatch(saveTimelineState(store));
      }, 100);
    }
  }
};

export default initializeCanvasImages;
