import {
  markChangesPending,
  startSync,
  syncSuccess,
  syncError,
} from '../sync/syncSlice';

// Skip actions that don't need immediate sync
const SKIP_SYNC_ACTIONS = [
  'scene/setActiveScene',
  'scene/setActiveSentence',
  'scene/setSelectedElement',
  'scene/setGeneratingPromptType',
  'scene/resetActiveScene',
  'scene/saveToHistory',
  'scene/setScenes',
  'storyApi/executeQuery/addScenes',
  'storyApi/executeMutation/addScenes',
  'scene/updateSelectedImage', // Skip immediate sync for image assignments
  // Skip sync actions to prevent infinite loops
  'sync/markChangesPending',
  'sync/startSync',
  'sync/syncSuccess',
  'sync/syncError',
  'sync/resetSyncState',
  'sync/clearError',
  // Skip timestamp updates from sync responses - THIS WAS THE INFINITE LOOP!
  'scene/updateLastSyncTimestamp',
  'timeline/updateLastSyncTimestamp',
];

// Skip sync on these routes
const SKIP_SYNC_ROUTES = ['/createProject/create', '/createProject'];

// Actions that should trigger sync
const SYNC_TRIGGER_ACTIONS = [
  'timeline/saveTimelineStateAction', // This is the actual action dispatched by saveTimelineState thunk
  'timeline/undo',
  'timeline/redo',
  'timeline/setEditorElements', // mirror image selection when TL changes
];

const SYNC_DELAY_MS = 3000; // 3 seconds delay like Figma/Notion
const IMAGE_UPDATE_BATCH_MS = 500; // Batch image updates for 500ms

// Factory function to create middleware with isolated state
export const createFullSyncMiddleware = () => {
  // Isolated state per middleware instance
  let syncInProgress = false;
  let syncTimeout = null;
  let imageUpdateQueue = [];
  let imageUpdateTimer = null;

  const middlewareFunction = store => next => action => {
    const result = next(action);
    const state = store.getState();
    const storyId = state.stories?.currentStory?._id;
    const scenesStoryId = state.scene?.currentStoryId;

    // Debug logging for sync actions
    if (action.type.startsWith('sync/')) {
    }

    // Check if we're on a route where sync should be skipped (SSR-safe)
    const currentPath =
      (typeof window !== 'undefined' && window.location?.pathname) || '';
    if (
      currentPath &&
      SKIP_SYNC_ROUTES.some(route => currentPath.includes(route))
    ) {
      return result;
    }

    // Handle updateSelectedImage batching separately
    if (action.type === 'scene/updateSelectedImage' && storyId) {
      imageUpdateQueue.push(action);

      // Mark changes as pending only if not already pending/syncing
      const syncState = state.sync;
      if (syncState.status === 'synced' || syncState.status === 'error') {
        store.dispatch(markChangesPending());
      }

      // Clear existing timer and set new one
      if (imageUpdateTimer) {
        clearTimeout(imageUpdateTimer);
      }

      imageUpdateTimer = setTimeout(() => {
        imageUpdateQueue = []; // Clear queue
        scheduleDelayedSync(store, storyId); // Schedule delayed sync
      }, IMAGE_UPDATE_BATCH_MS);

      return result;
    }

    // Mirror scene.selectedImage from timeline changes (single source of truth = timeline)
    if (
      (action.type === 'timeline/setEditorElements' ||
        action.type === 'timeline/undo' ||
        action.type === 'timeline/redo') &&
      storyId
    ) {
      try {
        const tlImages = (state.timeline.editorElements || []).filter(
          el => el.type === 'imageUrl'
        );

        // Get all scenes to check which ones need clearing
        const allScenes = state.scene.scenes || [];

        // Create a set of scene IDs that have images in timeline
        const scenesWithImages = new Set(tlImages.map(el => el.pointId));

        // For each image element, ensure scene.selectedImage matches timeline
        tlImages.forEach(el => {
          const sceneId = el.pointId;
          const img = {
            id: el.properties?.imageId || el.id,
            url: el.properties?.src || '',
            minUrl: el.properties?.minUrl || '',
          };

          // Only dispatch if the image is actually different from current scene state
          const currentScene = allScenes.find(scene => scene._id === sceneId);
          const currentImage = currentScene?.selectedImage;

          // Check if images are actually different to avoid unnecessary dispatches
          const isDifferent =
            !currentImage ||
            currentImage.id !== img.id ||
            currentImage.url !== img.url ||
            currentImage.minUrl !== img.minUrl;

          if (isDifferent) {
            store.dispatch({
              type: 'scene/applySelectedImageFromTimeline',
              payload: { sceneId, selectedImage: img },
            });
          }
        });

        // Clear selectedImage for scenes that don't have images in timeline
        allScenes.forEach(scene => {
          if (!scenesWithImages.has(scene._id) && scene.selectedImage) {
            // Create proper placeholder image object instead of null
            const placeholderImage = {
              id: '',
              url: '',
              minUrl: '',
              googleCloudUrl: '',
              minGoogleCloudUrl: '',
              prompt: '',
              negativePrompt: '',
              imageHeight: 0,
              imageWidth: 0,
            };
            store.dispatch({
              type: 'scene/applySelectedImageFromTimeline',
              payload: { sceneId: scene._id, selectedImage: placeholderImage },
            });
          }
        });
      } catch (e) {}
    }

    // Only proceed if we have a story ID and it's either a scene-related action or a sync trigger action
    if (
      !storyId ||
      (!action.type.startsWith('scene/') &&
        !SYNC_TRIGGER_ACTIONS.includes(action.type))
    ) {
      return result;
    }

    // If scenes belong to a different story (cross-story contamination), skip scheduling sync
    if (scenesStoryId && scenesStoryId !== storyId) {
      return result;
    }

    // Skip sync for certain actions
    if (SKIP_SYNC_ACTIONS.includes(action.type)) {
      return result;
    }

    // Mark changes as pending only if not already pending/syncing
    const syncState = state.sync;
    if (syncState.status === 'synced' || syncState.status === 'error') {
      store.dispatch(markChangesPending());
    }

    // Log timeline sync triggers
    if (SYNC_TRIGGER_ACTIONS.includes(action.type)) {
    }

    scheduleDelayedSync(store, storyId);

    return result;
  };

  // Schedule delayed sync (like Figma/Notion)
  const scheduleDelayedSync = (store, storyId) => {
    // Clear existing timeout and reset it (this extends the delay)
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Schedule new sync after delay
    syncTimeout = setTimeout(() => {
      syncTimeout = null; // Clear timeout reference

      // Check if sync is already in progress
      const state = store.getState();
      if (state.sync.status === 'syncing') {
        // Mark that resync is needed and return
        store.dispatch(markChangesPending());
        return;
      }

      performFullSync(store, storyId);
    }, SYNC_DELAY_MS);
  };

  // Force immediate sync (for critical actions or before page unload)
  const forceSync = (store, storyId) => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    return performFullSync(store, storyId);
  };

  // Extract performFullSync as a separate function
  const performFullSync = async (store, storyId) => {
    const state = store.getState();
    const scenesStoryId = state.scene?.currentStoryId;

    if (syncInProgress) {
      return;
    }

    try {
      syncInProgress = true;

      // Mark sync as started
      store.dispatch(startSync());

      const currentStory = state.stories.currentStory;
      const timelineState = state.timeline;

      // Prepare timeline data (editorParams)
      const filteredAnimations = (timelineState.animations || [])
        .filter(anim => {
          // Skip text word animations
          if (
            [
              'textWordAnimation',
              'textWordFalling',
              'textWordHighlight',
              'textWordMotion',
              'textWordStatic',
            ].includes(anim.type)
          ) {
            return false;
          }

          // Handle GL transitions (they have fromElementId/toElementId or targetIds)
          if (anim.type === 'glTransition') {
            // For dynamic GL transitions, check targetIds
            if (anim.targetIds && anim.targetIds.length > 0) {
              return anim.targetIds.some(targetId =>
                timelineState.editorElements.some(el => el.id === targetId)
              );
            }

            // For legacy GL transitions, check fromElementId/toElementId
            return (
              anim.fromElementId &&
              anim.toElementId &&
              timelineState.editorElements.some(
                el => el.id === anim.fromElementId
              ) &&
              timelineState.editorElements.some(
                el => el.id === anim.toElementId
              )
            );
          }

          // Handle regular animations (they have targetIds or legacy targetId)
          const targetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          return (
            targetIds.length > 0 &&
            targetIds.some(targetId =>
              timelineState.editorElements.some(el => el.id === targetId)
            )
          );
        })
        .map(anim => {
          // Base properties for all animations
          const baseProps = {
            duration: anim.duration,
            id: anim.id,
            properties: anim.properties,
            type: anim.type,
            effect: anim.effect,
          };

          // Add GL transition specific properties
          if (anim.type === 'glTransition') {
            const glTransitionProps = {
              ...baseProps,
              transitionType: anim.transitionType,
              startTime: anim.startTime,
              endTime: anim.endTime,
              manuallyAdjusted: anim.manuallyAdjusted,
              row: anim.row, // Include row for GL transitions
            };

            // Always include targetIds for GL transitions (even if empty)
            glTransitionProps.targetIds = anim.targetIds || [];

            // Always include fromElementId/toElementId for backward compatibility
            glTransitionProps.fromElementId = anim.fromElementId || null;
            glTransitionProps.toElementId = anim.toElementId || null;

            return glTransitionProps;
          }

          // Regular animations - send both targetIds and legacy targetId for backward compatibility
          const targetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          return {
            ...baseProps,
            targetIds: targetIds,
            targetId: targetIds[0] || anim.targetId, // Keep legacy field for backward compatibility
            row: anim.row, // Include row for regular animations
          };
        });

      const commonKeys = [
        'backgroundColor',
        'color',
        'opacity',
        'font',
        'fontSize',
        'fontWeight',
        'stroke',
        'strokeColor',
        'strokeOpacity',
        'textAlign',
        'verticalAlign',
        'synchronize',
        'shadow',
        'backgroundRadius',
        'shadowColor',
        'shadowBlur',
        'shadowOffsetX',
        'shadowOffsetY',
        'shadowOpacity',
        'styleId',
        'highlightColor',
        'motionColor',
      ];

      const { editorElements, segments } = (
        timelineState.editorElements || []
      ).reduce(
        (acc, el) => {
          const { fabricObject, ...rest } = el;
          if (el.subType === 'subtitles') {
            const { properties, ...segmentData } = rest;
            const uniqueProperties = Object.keys(properties || {}).reduce(
              (obj, key) => {
                if (!commonKeys.includes(key)) {
                  obj[key] = properties[key];
                }
                return obj;
              },
              {}
            );

            acc.segments.push({
              ...segmentData,
              properties: uniqueProperties,
            });
          } else if (el.subType !== 'subtitles') {
            if (el.type === 'text') {
              acc.editorElements.push({
                ...rest,
                timeFrame: el.timeFrame,
                placement: el.placement,
                row: el.row,
                properties: {
                  ...el.properties,
                  opacity: el.properties?.opacity || 1,
                  strokeOpacity: el.properties?.strokeOpacity || 1,
                },
              });
            } else {
              acc.editorElements.push(rest);
            }
          }
          return acc;
        },
        { editorElements: [], segments: [] }
      );

      const subtitlesElement = (timelineState.editorElements || []).find(
        el => el.subType === 'subtitles'
      );
      const commonProperties = commonKeys.reduce((acc, key) => {
        if (subtitlesElement?.properties?.[key] !== undefined) {
          acc[key] = subtitlesElement.properties[key];
        }
        return acc;
      }, {});

      const subtitles = {
        properties: commonProperties,
        segments,
      };

      // Calculate actual timeline duration from elements
      const calculateTimelineDuration = elements => {
        if (!elements || elements.length === 0) return 6000; // Default for empty timeline

        const lastElement = elements
          .slice()
          .sort((a, b) => (b.timeFrame?.end || 0) - (a.timeFrame?.end || 0))[0];

        const lastElementEnd = lastElement?.timeFrame?.end || 0;

        // Add buffer like in store.lastElementEnd usage
        if (lastElementEnd > 0) {
          const buffer = Math.max(30000, lastElementEnd * 0.2);
          return lastElementEnd + buffer;
        }

        return 6000; // Fallback for invalid data
      };

      const calculatedMaxTime = calculateTimelineDuration(editorElements);

      const editorParams = {
        backgroundColor: timelineState.backgroundColor || '',
        fps: timelineState.fps || 0,
        maxTime: calculatedMaxTime,
        editorElements: JSON.parse(JSON.stringify(editorElements)),
        subtitles: JSON.parse(JSON.stringify(subtitles)),
        animations: JSON.parse(JSON.stringify(filteredAnimations)),
        savedOrientation: currentStory.orientation || '',
      };

      // Get current story data

      // Prepare story data without editorElements and handle temporary scenes

      // Add stronger protection: don't sync empty scenes if currentStory has scenes
      // BUT allow sync for blank projects (when both local and server scenes are empty)
      if (!state.scene.scenes || state.scene.scenes.length === 0) {
        if (currentStory?.scenes?.length > 0) {
          // Don't sync if server has scenes but local is empty (data loss protection)
          return;
        }
        // For blank projects or when both are empty, continue with sync
        // This allows blank projects to sync their initial state
      }

      // Don't sync scenes that belong to another story
      if (scenesStoryId && scenesStoryId !== storyId) {
        // Don't mark as success - just skip sync
        return;
      }

      const storyData = {
        ...currentStory,
        ...(timelineState.editorElements.length > 0 ? { editorParams } : {}),
        scenes: state.scene.scenes.map(scene => {
          // Remove editorElements and any other unnecessary fields
          const { editorElements, ...sceneData } = scene;

          // Handle temporary scenes (those with temp_ prefix)
          if (sceneData._id && sceneData._id.startsWith('temp_')) {
            // Generate a new MongoDB-compatible ObjectId using full temp ID for uniqueness
            const tempIdParts = sceneData._id.split('_');
            const timestamp = parseInt(tempIdParts[1]) || Date.now();
            const randomPart =
              tempIdParts[2] || Math.random().toString(36).substr(2, 9);

            // Create a more unique ObjectId by combining timestamp and random part
            const timestampHex = Math.floor(timestamp / 1000)
              .toString(16)
              .padStart(8, '0');
            const randomHex = randomPart
              .split('')
              .map(c => c.charCodeAt(0).toString(16))
              .join('')
              .padStart(16, '0')
              .substr(0, 16);
            const objectId = timestampHex + randomHex;

            sceneData._id = objectId;
          }

          // Ensure all required fields have valid values
          return {
            ...sceneData,
            text: sceneData.text || '',
            title: sceneData.title || '',
            order: typeof sceneData.order === 'number' ? sceneData.order : 0,
            tags: Array.isArray(sceneData.tags) ? sceneData.tags : [],
            selectedImage: {
              id: sceneData.selectedImage?.id || '',
              url: sceneData.selectedImage?.url || '',
              minUrl: sceneData.selectedImage?.minUrl || '',
              googleCloudUrl: sceneData.selectedImage?.googleCloudUrl || '',
              minGoogleCloudUrl:
                sceneData.selectedImage?.minGoogleCloudUrl || '',
              prompt: sceneData.selectedImage?.prompt || '',
              negativePrompt: sceneData.selectedImage?.negativePrompt || '',
              imageHeight: sceneData.selectedImage?.imageHeight || 0,
              imageWidth: sceneData.selectedImage?.imageWidth || 0,
            },
            // Preserve exact prompt values including empty strings, null, and undefined
            prompt: sceneData.prompt !== undefined ? sceneData.prompt : '',
            negative_prompt:
              sceneData.negative_prompt !== undefined
                ? sceneData.negative_prompt
                : '',
            style: sceneData.style || '',
            // Add prompt versions from scene data
            promptVersions: sceneData.promptVersions || [],
            negativePromptVersions: sceneData.negativePromptVersions || [],
            currentPromptVersionIndex: sceneData.currentPromptVersionIndex || 0,
            currentNegativePromptVersionIndex:
              sceneData.currentNegativePromptVersionIndex || 0,
          };
        }),
        lastSyncedAt: state.scene.lastSyncTimestamp,
      };

      // Remove any undefined or null values that might cause issues
      Object.keys(storyData).forEach(key => {
        if (storyData[key] === undefined || storyData[key] === null) {
          delete storyData[key];
        }
      });

      // Mark sync as successful
      store.dispatch(syncSuccess());

      // Check if resync is needed after successful sync
      const newState = store.getState();
      if (newState.sync.status === 'pending') {
        // New changes occurred during sync - schedule another sync
        scheduleDelayedSync(store, storyId);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      store.dispatch(syncError(error.message || 'Sync failed'));
    } finally {
      syncInProgress = false;
    }
  };

  // Attach forceSync to middleware for external access
  middlewareFunction.forceSync = forceSync;
  return middlewareFunction;
};

// Default export for backward compatibility
export const fullSyncMiddleware = createFullSyncMiddleware();

// Export forceSync from default instance for backward compatibility
export const forceSync = fullSyncMiddleware.forceSync;
