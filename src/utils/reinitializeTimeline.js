import { runInAction } from 'mobx';
import setScenesSyncWithSubtitles from './setScenesSyncWithSubtitles';
import { saveTimelineState } from '../redux/timeline/timelineSlice';

/**
 * Reinitializes the timeline with new audio and scenes after audio regeneration
 * This function clears all existing timeline elements and rebuilds from subtitles
 *
 * @param {Object} storyData - Updated story data with new subtitles
 * @param {Array} currentScenes - Current scenes array (not originScenes)
 * @param {Object} store - MobX store instance
 * @param {Function} dispatch - Redux dispatch function
 */
const reinitializeTimeline = async (
  storyData,
  currentScenes,
  store,
  dispatch
) => {
  try {
    // Set initialization flag to prevent interference
    store.setInitializationState(true);

    // Step 1: Clear all existing timeline elements and animations
    runInAction(() => {
      store.editorElements = [];
      store.animations = [];
      store.glTransitionElements.clear();
      store.setSelectedElement(null);
      store.setMaxTime(60000); // Reset to default max time
    });

    // Step 2: Clear Redux timeline state
    dispatch({ type: 'timeline/resetState' });

    // Step 3: Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Calculate total audio duration and add audio elements
    if (storyData.subtitles?.length > 0) {
      let accumulatedTime = 0;

      for (const subtitle of storyData.subtitles) {
        if (subtitle.audioUrl && subtitle.duration) {
          await store.addExistingAudio({
            id: subtitle._id,
            base64Audio: subtitle.audioUrl,
            durationMs: subtitle.duration,
            name: 'Voiceover',
            row: 1, // Audio on row 1
            startTime: accumulatedTime,
            audioType: 'voice',
            autoSubtitles: true,
            text: subtitle.text,
          });

          accumulatedTime += subtitle.duration;
        }
      }

      // Set max time based on total audio duration
      const totalDuration = Math.max(60000, accumulatedTime);
      store.setMaxTime(totalDuration);
    }

    // Step 5: Prepare story data for scene synchronization
    const dataForSync = {
      ...storyData,
      originScenes: currentScenes, // Use current scenes instead of originScenes
      _id: storyData._id,
    };

    // Step 6: Synchronize scenes with subtitles (this will add images)
    await setScenesSyncWithSubtitles(dataForSync, store); // Use default sceneLine = 1 (same as initializeCanvasImages)

    // Step 7: Force canvas render and save state
    if (store.canvas) {
      store.canvas.requestRenderAll();

      // Make sure canvas is visible
      const canvasEl = store.canvas.getElement();
      if (canvasEl) {
        canvasEl.style.display = 'block';
      }
    }

    // Step 8: Save the new timeline state
    setTimeout(() => {
      dispatch(saveTimelineState(store));
    }, 500);
  } catch (error) {
    console.error('❌ Error during timeline reinitialization:', error);
    throw error;
  } finally {
    // Always clear initialization flag
    store.setInitializationState(false);
    store.optimizedCleanupEmptyRows();
  }
};

export default reinitializeTimeline;
