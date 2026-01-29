import { useEffect, useRef, useCallback } from 'react';
import {
  syncSceneImages,
  checkIfImageSyncNeeded,
  removeElementsForDeletedScenes,
} from '../utils/syncSceneImages';
import setScenesSyncWithSubtitles from '../utils/setScenesSyncWithSubtitles';

/**
 * Creates placeholder images for scenes when no subtitles are available
 * @param {Object} storyData - Story data containing scenes
 * @param {Object} store - MobX store instance
 */
const createPlaceholdersForScenes = async (storyData, store) => {
  // Skip placeholder creation for blank projects
  if (storyData?.isBlank) {
    return;
  }

  if (!storyData?.originScenes?.length || !store) {
    return;
  }

  const scenes = storyData.originScenes;
  const defaultDuration = 3000; // 3 seconds per scene
  let currentTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const startTime = currentTime;
    const endTime = currentTime + defaultDuration;

    try {
      // Try to add real image first, fallback to placeholder
      await store.addImageToCanvas({
        store,
        url:
          scene.selectedImage?.googleCloudUrl || scene.selectedImage?.url || '',
        minUrl:
          scene.selectedImage?.minGoogleCloudUrl ||
          (scene.selectedImage?.url && `${scene.selectedImage.url}?w=512`) ||
          '',
        startTime,
        endTime,
        imageId: `scene_${scene._id}`,
        pointId: scene._id,
        point: scene,
        storyId: storyData._id,
        row: 1,
      });
    } catch (error) {
      // Fallback to placeholder
      await store.addPlaceholderImage({
        imageId: `placeholder_${scene._id}`,
        startTime,
        endTime,
        pointId: scene._id,
        sentence: scene.text,
        row: 1,
      });
    }

    currentTime = endTime;
  }

  // Update max time
  store.setMaxTime(Math.max(store.maxTime, currentTime));
};

/**
 * Hook for automatic scene image synchronization with fallback initialization
 *
 * Features:
 * - Syncs existing timeline images with scene data
 * - Creates timeline placeholders when missing (if enabled)
 * - Detects and fixes old initialization bugs
 * - Provides delayed fallback checks
 *
 * @param {Object} storyData - Story data containing scenes
 * @param {Object} store - MobX store instance
 * @param {Array} scenes - Current scenes array from Redux
 * @param {boolean} isInitialized - Whether the timeline is initialized
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 1000)
 * @param {boolean} options.enabled - Whether sync is enabled (default: true)
 * @param {boolean} options.createPlaceholders - Create timeline with placeholders if no elements exist (default: false)
 * @param {boolean} options.runOnce - Whether to run sync only once (default: false)
 * @param {Function} options.onSyncStart - Callback when sync starts
 * @param {Function} options.onSyncComplete - Callback when sync completes
 * @param {Function} options.onSyncError - Callback when sync fails
 */
export const useSceneImageSync = (
  storyData,
  store,
  scenes,
  isInitialized,
  options = {}
) => {
  const {
    debounceMs = 1000,
    enabled = true,
    createPlaceholders = false,
    runOnce = false,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const debounceTimerRef = useRef(null);
  const lastSyncRef = useRef(null);
  const hasRunOnceRef = useRef(false);

  // Create a stable reference for the sync function
  const syncImages = useCallback(
    async (reason = 'manual') => {
      // Skip synchronization for blank projects
      if (storyData?.isBlank) {
        return;
      }

      // Skip if runOnce is enabled and sync has already run
      if (runOnce && hasRunOnceRef.current) {
        return;
      }

      if (!enabled || store?.isInitializationInProgress || store?.isUndoRedoOperation) {
        return;
      }

      if (!storyData?.scenes?.length || !scenes?.length) {
        return;
      }

      try {
        // FALLBACK LOGIC: Check if timeline should exist but doesn't (fixes old initialization bug)
        const shouldHaveTimeline =
          isInitialized && // Main initialization was supposed to run
          store?.editorElements?.length === 0 && // But timeline is still empty
          (storyData.subtitles?.length > 0 ||
            storyData.originScenes?.length > 0) && // And we have content
          createPlaceholders; // And placeholders are enabled

        // Also handle case where main initialization never ran due to missing subtitles
        const missedInitialization =
          !isInitialized && // Main initialization never ran
          store?.editorElements?.length === 0 && // Timeline is empty
          !storyData.subtitles?.length && // No subtitles (why main init didn't run)
          storyData.originScenes?.length > 0 && // But we have scenes
          createPlaceholders; // And placeholders are enabled

        if (shouldHaveTimeline || missedInitialization) {
          if (onSyncStart) {
            onSyncStart(`${reason}-fallback`);
          }

          // Use setScenesSyncWithSubtitles approach if we have subtitles
          if (storyData.subtitles?.length > 0) {
            await setScenesSyncWithSubtitles(storyData, store);
          } else if (storyData.originScenes?.length > 0) {
            // Fallback: create placeholders for scenes without subtitles
            await createPlaceholdersForScenes(storyData, store);
          }

          if (onSyncComplete) {
            onSyncComplete(`${reason}-fallback`);
          }

          lastSyncRef.current = Date.now();
          
          // Mark as run if runOnce is enabled
          if (runOnce) {
            hasRunOnceRef.current = true;
          }
          
          return;
        }

        // Check if we need to create placeholders when no timeline elements exist (normal case)
        if (
          createPlaceholders &&
          store?.editorElements?.length === 0 &&
          isInitialized
        ) {
          if (onSyncStart) {
            onSyncStart(reason);
          }

          // Use setScenesSyncWithSubtitles approach to create timeline with placeholders
          if (storyData.subtitles?.length > 0) {
            await setScenesSyncWithSubtitles(storyData, store);
          } else if (storyData.originScenes?.length > 0) {
            // Fallback: create placeholders for scenes without subtitles
            await createPlaceholdersForScenes(storyData, store);
          }

          if (onSyncComplete) {
            onSyncComplete(reason);
          }

          lastSyncRef.current = Date.now();
          
          // Mark as run if runOnce is enabled
          if (runOnce) {
            hasRunOnceRef.current = true;
          }
          
          return;
        }

        // Regular sync logic for existing timeline elements
        if (!store?.editorElements?.length || !isInitialized) {
          return;
        }

        const syncNeeded = checkIfImageSyncNeeded(storyData, store, scenes);

        if (!syncNeeded) {
          return;
        }

        if (onSyncStart) {
          onSyncStart(reason);
        }

        await syncSceneImages(storyData, store, scenes);

        if (onSyncComplete) {
          onSyncComplete(reason);
        }

        lastSyncRef.current = Date.now();
        
        // Mark as run if runOnce is enabled
        if (runOnce) {
          hasRunOnceRef.current = true;
        }
      } catch (error) {
        if (onSyncError) {
          onSyncError(error, reason);
        }
      }
    },
    [
      enabled,
      isInitialized,
      store,
      storyData,
      scenes,
      createPlaceholders,
      runOnce,
      onSyncStart,
      onSyncComplete,
      onSyncError,
    ]
  );

  // Debounced sync function
  const debouncedSync = useCallback(
    (reason = 'debounced') => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        syncImages(reason);
      }, debounceMs);
    },
    [syncImages, debounceMs]
  );

  // Initial sync after store initialization is complete (when timeline loader is removed)
  useEffect(() => {
    if (enabled && !store?.isInitializationInProgress && store?.editorElements) {
      // Only sync if we have some content to work with
      syncImages('store-initialization-complete');
    }
  }, [enabled, store?.isInitializationInProgress, store?.editorElements, syncImages]);

  // Sync when story scenes change
  useEffect(() => {
    if (enabled && !store?.isInitializationInProgress && storyData?.scenes) {
      debouncedSync('scene-data-change');
    }
  }, [
    storyData?.scenes
      ?.map(scene => scene.selectedImage?.googleCloudUrl)
      .join(','),
    enabled,
    store?.isInitializationInProgress,
    debouncedSync,
  ]);

  // Sync when timeline elements change
  useEffect(() => {
    if (enabled && !store?.isInitializationInProgress && store?.editorElements) {
      debouncedSync('timeline-change');
    }
  }, [store?.editorElements?.length, enabled, store?.isInitializationInProgress, debouncedSync]);

  // Sync when scenes are deleted (scenes count changes)
  useEffect(() => {
    if (enabled && !store?.isInitializationInProgress && scenes) {
      debouncedSync('scenes-count-change');
    }
  }, [scenes?.length, enabled, store?.isInitializationInProgress, debouncedSync]);

  // Fallback check: Detect when timeline should exist but doesn't after some time
  useEffect(() => {
    if (!enabled || !createPlaceholders) return;

    // Wait a bit after initialization or data changes to check if timeline exists
    const checkTimer = setTimeout(() => {
      const shouldHaveContent =
        storyData?.scenes?.length > 0 &&
        scenes?.length > 0 &&
        (storyData.subtitles?.length > 0 || storyData.originScenes?.length > 0);

      const timelineIsMissing =
        shouldHaveContent &&
        store?.editorElements?.length === 0 &&
        !store?.isInitializationInProgress;

      if (timelineIsMissing) {
        syncImages('delayed-fallback');
      }
    }, 2000); // Check after 2 seconds

    return () => clearTimeout(checkTimer);
  }, [
    storyData?.scenes?.length,
    storyData?.subtitles?.length,
    storyData?.originScenes?.length,
    scenes?.length,
    isInitialized,
    enabled,
    createPlaceholders,
    syncImages,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Return manual sync function for external use
  return {
    syncImages: (reason = 'manual') => syncImages(reason),
    debouncedSync: (reason = 'manual') => debouncedSync(reason),
    removeDeletedSceneElements: () => removeElementsForDeletedScenes(store, scenes),
    lastSync: lastSyncRef.current,
  };
};
