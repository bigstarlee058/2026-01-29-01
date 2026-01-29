import {
  validateAndCorrectWords,
  getWordsArray,
  createWordMapping,
  normalizeText,
  getNormalizedWords,
  findSequentialMatch,
} from './textProcessing';

const getSceneTimings = (scenes, subtitles) => {
  const sceneTimings = [];
  let accumulatedTime = 0;

  // Flatten all words from all segments into a single array with accumulated time
  let allWords = [];
  subtitles.forEach(subtitle => {
    if (subtitle.segments) {
      subtitle.segments.forEach(segment => {
        if (segment.words) {
          allWords.push(
            ...segment.words.map(word => ({
              ...word,
              normalizedWord: normalizeText(word.word), // Add normalized version of the word
              start: word.start * 1000 + accumulatedTime,
              end: word.end * 1000 + accumulatedTime,
            }))
          );
        }
      });
    }
    accumulatedTime += subtitle.duration;
  });

  // Track used words to prevent overlap
  const usedWordIndices = new Set();

  scenes.forEach((scene, sceneIndex) => {
    const sceneWords = getNormalizedWords(scene.text);

    // Filter out already used words for more accurate matching
    const availableWords = allWords.filter(
      (_, index) => !usedWordIndices.has(index)
    );

    // Find the best sequential match for this scene
    const match = findSequentialMatch(sceneWords, availableWords);

    if (match && match.score > 0.5) {
      // Find the corresponding indices in the original allWords array
      const originalIndices = match.matchedIndices
        .map(availableIndex => {
          let currentAvailableIndex = -1;
          for (let i = 0; i < allWords.length; i++) {
            if (!usedWordIndices.has(i)) {
              currentAvailableIndex++;
              if (currentAvailableIndex === availableIndex) {
                return i;
              }
            }
          }
          return -1;
        })
        .filter(index => index !== -1);

      // Mark these words as used
      originalIndices.forEach(index => usedWordIndices.add(index));

      // Get timing from matched words
      const matchedWords = originalIndices.map(index => allWords[index]);
      const startTime = Math.min(...matchedWords.map(word => word.start));
      const endTime = Math.max(...matchedWords.map(word => word.end));

      sceneTimings.push({
        scene,
        startTime,
        endTime,
        matchScore: match.score,
        matchedWords: matchedWords.length,
      });
    } else {
      // Fallback: smart distribution for unmatched scenes
      let startTime, endTime;

      // Calculate proportional timing based on text length and position
      const totalSceneTextLength = scenes.reduce(
        (sum, s) => sum + s.text.length,
        0
      );
      const currentSceneTextLength = scene.text.length;
      const textLengthRatio = currentSceneTextLength / totalSceneTextLength;

      // Get cumulative text length up to this scene
      const cumulativeTextLength = scenes
        .slice(0, sceneIndex)
        .reduce((sum, s) => sum + s.text.length, 0);
      const cumulativeRatio = cumulativeTextLength / totalSceneTextLength;

      // Calculate timing based on text proportion and available audio time
      startTime = cumulativeRatio * accumulatedTime;

      // For unmatched scenes, give them proportional time based on text length
      const proportionalDuration = Math.max(
        textLengthRatio * accumulatedTime,
        2000 // Minimum 2 seconds for any scene
      );

      endTime = startTime + proportionalDuration;

      // Ensure we don't exceed total duration
      if (endTime > accumulatedTime) {
        endTime = accumulatedTime;
        startTime = Math.max(0, endTime - proportionalDuration);
      }

      sceneTimings.push({
        scene,
        startTime,
        endTime,
        matchScore: 0,
        matchedWords: 0,
        fallbackMethod: 'textLength',
      });
    }
  });

  // Sort scenes by start time
  const sortedTimings = sceneTimings.sort((a, b) => a.startTime - b.startTime);

  // Calculate proper end times based on word coverage and scene boundaries
  for (let i = 0; i < sortedTimings.length; i++) {
    const currentScene = sortedTimings[i];
    const nextScene = sortedTimings[i + 1];

    if (currentScene.matchScore > 0) {
      // Scene has good word matches - extend to cover all its words properly
      const sceneWords = getNormalizedWords(currentScene.scene.text);
      const lastWordOfScene = sceneWords[sceneWords.length - 1];

      // Find the last word in subtitles that matches this scene
      const matchingWords = allWords.filter(word =>
        sceneWords.some(
          sceneWord =>
            sceneWord === word.normalizedWord ||
            (sceneWord.length > 3 && word.normalizedWord.includes(sceneWord))
        )
      );

      if (matchingWords.length > 0) {
        const lastMatchingWord = matchingWords[matchingWords.length - 1];
        // Extend scene to cover the last matching word plus a small buffer
        const naturalEndTime = lastMatchingWord.end + 200; // 200ms buffer

        if (nextScene) {
          // Don't overlap with next scene, but try to get as close as possible
          currentScene.endTime = Math.min(
            naturalEndTime,
            nextScene.startTime - 50
          );
        } else {
          // Last scene - extend to natural end or total duration
          currentScene.endTime = Math.max(naturalEndTime, accumulatedTime);
        }
      }
    }

    // Ensure minimum scene duration (at least 1000ms for better visual experience)
    const minDuration = 1000;
    const currentDuration = currentScene.endTime - currentScene.startTime;

    if (currentDuration < minDuration) {
      if (
        nextScene &&
        nextScene.startTime - currentScene.startTime >= minDuration
      ) {
        // We have space to extend without overlapping
        currentScene.endTime = currentScene.startTime + minDuration;
      } else if (!nextScene) {
        // Last scene - always ensure minimum duration
        currentScene.endTime = Math.max(
          currentScene.startTime + minDuration,
          accumulatedTime
        );
      }
    }
  }

  // Ensure first scene starts at 0
  if (sortedTimings.length > 0) {
    sortedTimings[0].startTime = 0;
  }

  // Create continuous timeline without gaps or overlaps
  for (let i = 0; i < sortedTimings.length - 1; i++) {
    const currentScene = sortedTimings[i];
    const nextScene = sortedTimings[i + 1];

    // Current scene should end exactly where next scene starts
    // But we need to determine the optimal boundary point

    if (currentScene.endTime > nextScene.startTime) {
      // Overlap case - find the best split point
      const overlap = currentScene.endTime - nextScene.startTime;
      const midPoint = nextScene.startTime + overlap / 2;

      currentScene.endTime = midPoint;
      nextScene.startTime = midPoint;
    } else if (currentScene.endTime < nextScene.startTime) {
      // Gap case - extend current scene to meet next scene
      currentScene.endTime = nextScene.startTime;
    }
    // If they already match perfectly, do nothing
  }

  // Ensure last scene covers total duration
  if (sortedTimings.length > 0) {
    const lastScene = sortedTimings[sortedTimings.length - 1];
    lastScene.endTime = Math.max(lastScene.endTime, accumulatedTime);
  }

  // Verify no gaps exist
  let hasGaps = false;
  for (let i = 0; i < sortedTimings.length - 1; i++) {
    const currentEnd = sortedTimings[i].endTime;
    const nextStart = sortedTimings[i + 1].startTime;
    if (Math.abs(currentEnd - nextStart) > 1) {
      // Allow 1ms tolerance for floating point precision
      hasGaps = true;
      console.warn(
        `⚠️ Gap detected between scene ${i + 1} and ${i + 2}: ${(
          (nextStart - currentEnd) /
          1000
        ).toFixed(3)}s`
      );
    }
  }

  if (!hasGaps) {
  }

  return sortedTimings;
};

const setScenesSyncWithSubtitles = async (data, store, sceneLine = 1) => {
  // Skip synchronization for blank projects
  if (data.isBlank) {
    return;
  }

  if (
    !data ||
    !store ||
    !store.canvas ||
    !data.originScenes ||
    !data.subtitles
  ) {
    return;
  }

  store.setInitializationState(true);

  // Calculate total audio duration
  const totalAudioDuration = data.subtitles.reduce(
    (acc, subtitle) => acc + subtitle.duration,
    0
  );

  const defaultTime = Math.max(store.lastElementEnd, totalAudioDuration);

  try {
    const sceneTimings = getSceneTimings(data.originScenes, data.subtitles);

    if (sceneTimings.length === 0) {
      return;
    }

    // Add images based on calculated timings
    for (let i = 0; i < sceneTimings.length; i++) {
      const timing = sceneTimings[i];
      const { scene, startTime, endTime } = timing;

      const sceneImage = data.images?.find(
        img => img.owner === scene._id && img.generated_images?.length > 0
      );

      const hasElementsInRow = store.editorElements.some(
        element => element.row === sceneLine && element.type !== 'imageUrl'
      );

      if (hasElementsInRow) {
        store.shiftRowsDown(sceneLine);
      }

      await store
        .addImageToCanvas({
          store,
          url:
            scene.selectedImage?.googleCloudUrl ||
            scene.selectedImage?.url ||
            '',
          minUrl:
            scene.selectedImage?.minGoogleCloudUrl ||
            (scene.selectedImage?.url && `${scene.selectedImage.url}?w=512`) ||
            '',
          startTime: i === 0 ? 0 : startTime,
          endTime: i === sceneTimings.length - 1 ? defaultTime : endTime,
          imageId: sceneImage?.id || `pending_${scene._id}`,
          pointId: scene._id,
          point: scene,
          storyId: data._id,
          row: sceneLine,
        })
        .catch(error => {
          console.error('Failed to add image to canvas:', error);
          return store.addPlaceholderImage({
            imageId: sceneImage?.id || `pending_${scene._id}`,
            startTime,
            endTime,
            pointId: scene._id,
            storyId: data._id,
            row: 1,
          });
        });
    }
  } catch (error) {
    console.error('Error in setScenesSyncWithSubtitles:', error);
  } finally {
    store.setInitializationState(false);
  }
};

export default setScenesSyncWithSubtitles;
