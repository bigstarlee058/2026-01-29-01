import { createSlice } from '@reduxjs/toolkit';
import { setCurrentStory, clearCurrentStory } from '../stories/storiesSlice';

const MAX_HISTORY_LENGTH = 50;

// Helper function to check if a scene has placeholder state (no assigned image)
const isPlaceholderState = selectedImage => {
  return (
    !selectedImage ||
    selectedImage === null ||
    selectedImage === false || // Explicitly handle false values
    !selectedImage.url ||
    selectedImage.url === '' ||
    selectedImage.url === null ||
    selectedImage.url === undefined
  );
};

// Helper function to create placeholder selectedImage object
const createPlaceholderImage = () => ({
  id: '',
  url: '',
  minUrl: '',
  googleCloudUrl: '',
  minGoogleCloudUrl: '',
  prompt: '',
  negativePrompt: '',
  imageHeight: 0,
  imageWidth: 0,
});

const initialState = {
  currentStoryId: null,
  scenes: [],
  activeSceneId: null,
  activeScene: null,
  activeSentence: null,
  selectedElement: null,
  generatingPromptType: null,
  pendingChanges: [],
  history: [],
  currentHistoryIndex: -1,
  isUndoRedoOperation: false,
  lastSyncTimestamp: null,
};

const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    resetState: state => {
      return initialState;
    },
    setScenes: (state, action) => {
      // Add protection against empty or invalid scenes
      const newScenes = action.payload;

      if (!Array.isArray(newScenes)) {
        return;
      }

      // If activeScene exists and its ID was temporary, try to find the updated scene
      if (
        state.activeScene &&
        state.activeScene._id &&
        state.activeScene._id.startsWith('temp_')
      ) {
        const updatedScene = newScenes.find(
          scene =>
            scene.text === state.activeScene.text &&
            scene.order === state.activeScene.order
        );
        if (updatedScene) {
          state.activeScene = { ...updatedScene };
        }
      }

      // Check if this is initial scene loading and any scenes have assigned images
      const hasAssignedImages = newScenes.some(
        scene => !isPlaceholderState(scene.selectedImage)
      );
      const isInitialLoad =
        state.scenes.length === 0 && state.history.length === 0;

      // If this is initial load and some scenes have images, create a baseline placeholder state first
      if (isInitialLoad && hasAssignedImages) {
        // Create baseline state with all scenes having placeholder images
        const placeholderScenes = newScenes.map(scene => ({
          ...scene,
          selectedImage: createPlaceholderImage(),
        }));

        // Temporarily set placeholder state and save to history
        const tempScenes = state.scenes;
        state.scenes = placeholderScenes;
        sceneSlice.caseReducers.saveToHistory(state);

        // Restore and set actual scenes
        state.scenes = tempScenes;
      }

      state.scenes = newScenes;
      // Record an initial snapshot once so that the first undo after a user
      // action (e.g. delete) can restore to the pre-change state. Avoid
      // pushing subsequent server-driven updates into history.
      if (!state.isUndoRedoOperation && state.history.length === 0) {
        sceneSlice.caseReducers.saveToHistory(state);
      }
    },

    updateScene: (state, action) => {
      const { sceneId, updates } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        state.scenes[sceneIndex] = {
          ...state.scenes[sceneIndex],
          ...updates,
        };

        // Also update activeScene if it matches
        if (state.activeScene && state.activeScene._id === sceneId) {
          state.activeScene = {
            ...state.activeScene,
            ...updates,
          };
        }

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    reorderScene: (state, action) => {
      const { sceneId, targetSceneId } = action.payload;
      const scenes = [...state.scenes];
      const sourceIndex = scenes.findIndex(scene => scene._id === sceneId);
      const targetIndex = scenes.findIndex(
        scene => scene._id === targetSceneId
      );

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const [movedScene] = scenes.splice(sourceIndex, 1);
        scenes.splice(targetIndex, 0, movedScene);

        scenes.forEach((scene, index) => {
          scene.order = index;
        });

        state.scenes = scenes;

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    removeAllAssignedImages: (state, action) => {
      state.scenes = state.scenes.map(scene => {
        // Use consistent placeholder object instead of null fields
        scene.selectedImage = createPlaceholderImage();
        return scene;
      });
      state.pendingChanges.push({
        type: 'removeAllAssignedImages',
        timestamp: new Date().toISOString(),
      });
    },

    removeAllprompts: (state, action) => {
      state.scenes = state.scenes.map(scene => {
        scene.prompt = null;
        return scene;
      });
      state.pendingChanges.push({
        type: 'removeAllprompts',
        timestamp: new Date().toISOString(),
      });
    },

    removeAllNegativePrompts: (state, action) => {
      state.scenes = state.scenes.map(scene => {
        scene.negative_prompt = null;
        return scene;
      });
      state.pendingChanges.push({
        type: 'removeAllNegativePrompts',
        timestamp: new Date().toISOString(),
      });
    },

    deleteScene: (state, action) => {
      const sceneId = action.payload;

      state.scenes = state.scenes.filter(scene => scene._id !== sceneId);
      state.scenes.forEach((scene, index) => {
        scene.order = index;
      });

      // If we deleted the last scene and now have no scenes, reset activeScene
      if (state.scenes.length === 0) {
        state.activeScene = null;
        state.activeSentence = null;
        state.selectedElement = null;
      } else if (state.activeScene && state.activeScene._id === sceneId) {
        // If we deleted the active scene, set the first remaining scene as active
        state.activeScene = { ...state.scenes[0] };
      }

      // Save state to history
      if (!state.isUndoRedoOperation) {
        sceneSlice.caseReducers.saveToHistory(state);
      }
    },

    addScene: (state, action) => {
      const { newScene, position } = action.payload;
      const scenes = [...state.scenes];

      if (position.place === 'after') {
        const targetIndex = scenes.findIndex(
          scene => scene._id === position.id
        );
        scenes.splice(targetIndex + 1, 0, newScene);
      } else {
        const targetIndex = scenes.findIndex(
          scene => scene._id === position.id
        );
        scenes.splice(targetIndex, 0, newScene);
      }

      scenes.forEach((scene, index) => {
        scene.order = index;
      });

      state.scenes = scenes;

      // Save state to history
      if (!state.isUndoRedoOperation) {
        sceneSlice.caseReducers.saveToHistory(state);
      }
    },

    updateSceneTitle: (state, action) => {
      const { sceneId, newTitle } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        state.scenes[sceneIndex].title = newTitle;

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    setActiveScene: (state, action) => {
      if (!action.payload) {
        state.activeScene = null;
        return;
      }

      // Create a complete copy of the scene with all its properties
      state.activeScene = {
        ...action.payload,
        // Ensure these properties are always present
        _id: action.payload._id,
        text: action.payload.text,
        selectedImage: action.payload.selectedImage,
        prompt: action.payload.prompt,
        negative_prompt: action.payload.negative_prompt,
        width: action.payload.width,
        height: action.payload.height,
        title: action.payload.title,
        order: action.payload.order,
        tags: action.payload.tags || [],
        tagHistory: action.payload.tagHistory || [],
        style: action.payload.style,
      };
    },
    setActiveScenePrompt: (state, action) => {
      state.activeScene.prompt = action.payload;
    },
    setActiveSceneNegativePrompt: (state, action) => {
      state.activeScene.negative_prompt = action.payload;
    },
    setActiveSentence: (state, action) => {
      state.activeSentence = action.payload;
    },
    setSelectedElement: (state, action) => {
      state.selectedElement = action.payload;
    },
    resetActiveScene: state => {
      state.activeScene = null;
      state.activeSentence = null;
      state.selectedElement = null;
    },
    setGeneratingPromptType: (state, action) => {
      state.generatingPromptType = action.payload;
    },
    addSceneTag: (state, action) => {
      const { sceneId, tag } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        if (!state.scenes[sceneIndex].tags) {
          state.scenes[sceneIndex].tags = [];
        }
        state.scenes[sceneIndex].tags.push(tag);

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },
    updateSceneTag: (state, action) => {
      const { sceneId, tagId, name } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        const tagIndex = state.scenes[sceneIndex].tags.findIndex(
          tag => tag._id === tagId
        );
        if (tagIndex !== -1) {
          state.scenes[sceneIndex].tags[tagIndex].name = name;

          // Save state to history
          if (!state.isUndoRedoOperation) {
            sceneSlice.caseReducers.saveToHistory(state);
          }
        }
      }
    },
    deleteSceneTag: (state, action) => {
      const { sceneId, tagId } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        state.scenes[sceneIndex].tags = state.scenes[sceneIndex].tags.filter(
          tag => tag._id !== tagId
        );
      }
    },
    updateSceneStyle: (state, action) => {
      const { sceneId, style } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        state.scenes[sceneIndex].style = style;
      }
    },
    updateSelectedImage: (state, action) => {
      const { sceneId, selectedImage } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        const scene = state.scenes[sceneIndex];
        const currentPrompt = scene.prompt || '';
        const currentNegativePrompt = scene.negative_prompt || '';

        // Check for placeholder transition: scene currently has placeholder and is getting first real image
        const isCurrentPlaceholder = isPlaceholderState(scene.selectedImage);
        const isNewImageAssigned =
          selectedImage && !isPlaceholderState(selectedImage);
        const isTransitionFromPlaceholder =
          isCurrentPlaceholder && isNewImageAssigned;

        // If transitioning from placeholder to assigned image, save current state first
        if (isTransitionFromPlaceholder && !state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }

        // Always use placeholder object instead of null for consistency
        state.scenes[sceneIndex].selectedImage =
          selectedImage || createPlaceholderImage();

        // Only update prompts if selectedImage is not null and has prompts
        // This preserves existing scene prompts when unassigning images
        if (
          selectedImage &&
          (selectedImage.prompt || selectedImage.negativePrompt)
        ) {
          // Check if prompts are different and create versions if needed
          if (selectedImage.prompt && selectedImage.prompt !== currentPrompt) {
            // Create version of current prompt before updating
            if (currentPrompt) {
              sceneSlice.caseReducers.addPromptVersion(state, {
                payload: {
                  sceneId,
                  prompt: currentPrompt,
                  isNegative: false,
                  isGenerated: false,
                },
              });
            }
            // Add new prompt as a version
            sceneSlice.caseReducers.addPromptVersion(state, {
              payload: {
                sceneId,
                prompt: selectedImage.prompt,
                isNegative: false,
                isGenerated: true,
              },
            });
          }

          if (
            selectedImage.negativePrompt &&
            selectedImage.negativePrompt !== currentNegativePrompt
          ) {
            // Create version of current negative prompt before updating
            if (currentNegativePrompt) {
              sceneSlice.caseReducers.addPromptVersion(state, {
                payload: {
                  sceneId,
                  prompt: currentNegativePrompt,
                  isNegative: true,
                  isGenerated: false,
                },
              });
            }
            // Add new negative prompt as a version
            sceneSlice.caseReducers.addPromptVersion(state, {
              payload: {
                sceneId,
                prompt: selectedImage.negativePrompt,
                isNegative: true,
                isGenerated: true,
              },
            });
          }
        }

        // Also update activeScene if it matches
        if (state.activeScene && state.activeScene._id === sceneId) {
          state.activeScene.selectedImage =
            selectedImage || createPlaceholderImage();

          // Update activeScene prompts to match the scene
          if (selectedImage && selectedImage.prompt) {
            state.activeScene.prompt = selectedImage.prompt;
            // Copy prompt versions to activeScene
            state.activeScene.promptVersions = [
              ...(scene.promptVersions || []),
            ];
            state.activeScene.currentPromptVersionIndex =
              scene.currentPromptVersionIndex;
          }
          if (selectedImage && selectedImage.negativePrompt) {
            state.activeScene.negative_prompt = selectedImage.negativePrompt;
            // Copy negative prompt versions to activeScene
            state.activeScene.negativePromptVersions = [
              ...(scene.negativePromptVersions || []),
            ];
            state.activeScene.currentNegativePromptVersionIndex =
              scene.currentNegativePromptVersionIndex;
          }
        }

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    applySelectedImageFromTimeline: (state, action) => {
      const { sceneId, selectedImage } = action.payload || {};
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        const scene = state.scenes[sceneIndex];

        // Check for placeholder transition: scene currently has placeholder and is getting first real image
        const isCurrentPlaceholder = isPlaceholderState(scene.selectedImage);
        const isNewImageAssigned =
          selectedImage && !isPlaceholderState(selectedImage);
        const isTransitionFromPlaceholder =
          isCurrentPlaceholder && isNewImageAssigned;

        // If transitioning from placeholder to assigned image, save current state first
        if (isTransitionFromPlaceholder && !state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }

        state.scenes[sceneIndex].selectedImage =
          selectedImage || createPlaceholderImage();

        if (state.activeScene && state.activeScene._id === sceneId) {
          state.activeScene.selectedImage =
            selectedImage || createPlaceholderImage();
        }

        // Save state to history to preserve placeholder/image transitions
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },
    splitScene: (state, action) => {
      const { sceneId, newText, remainingText, newSceneId } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        // Update current scene with text before cursor
        state.scenes[sceneIndex].text = newText;

        // Generate unique temporary ID if not provided
        const tempId =
          newSceneId ||
          `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create new scene with text after cursor
        const newScene = {
          _id: tempId, // Temporary ID that will be replaced by backend
          text: remainingText,
          title: '',
          order: sceneIndex + 1,
          tags: [],
          selectedImage:
            state.scenes[sceneIndex].selectedImage || createPlaceholderImage(),
          prompt: state.scenes[sceneIndex].prompt || '',
          negative_prompt: state.scenes[sceneIndex].negative_prompt || '',
          promptReady: true,
          style: state.scenes[sceneIndex].style || '', // Copy style from original scene
        };

        // Insert new scene after current one
        state.scenes.splice(sceneIndex + 1, 0, newScene);

        // Update order for all scenes after the split
        for (let i = sceneIndex + 1; i < state.scenes.length; i++) {
          state.scenes[i].order = i;
        }

        // If this was the active scene, update activeScene state
        if (state.activeScene && state.activeScene._id === sceneId) {
          state.activeScene.text = newText;
        }

        // Save state to history if not in undo/redo operation
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    mergeSceneUp: (state, action) => {
      const { sceneId } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex > 0) {
        const currentScene = state.scenes[sceneIndex];
        const previousScene = state.scenes[sceneIndex - 1];

        // Merge text
        previousScene.text = previousScene.text + ' ' + currentScene.text;

        // Keep the image from the previous scene (first scene takes priority)
        // If previous scene has no image but current scene does, use current scene's image
        if (
          !previousScene.selectedImage?.id &&
          currentScene.selectedImage?.id
        ) {
          previousScene.selectedImage = currentScene.selectedImage;
          previousScene.prompt = currentScene.prompt;
          previousScene.negative_prompt = currentScene.negative_prompt;
        }

        // Remove current scene
        state.scenes.splice(sceneIndex, 1);

        // Update order for remaining scenes
        for (let i = sceneIndex; i < state.scenes.length; i++) {
          state.scenes[i].order = i;
        }

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    mergeSceneDown: (state, action) => {
      const { sceneId } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1 && sceneIndex < state.scenes.length - 1) {
        const currentScene = state.scenes[sceneIndex];
        const nextScene = state.scenes[sceneIndex + 1];

        // Merge text
        currentScene.text = currentScene.text + ' ' + nextScene.text;

        // Keep the image from the current scene (first scene takes priority)
        // If current scene has no image but next scene does, use next scene's image
        if (!currentScene.selectedImage?.id && nextScene.selectedImage?.id) {
          currentScene.selectedImage = nextScene.selectedImage;
          currentScene.prompt = nextScene.prompt;
          currentScene.negative_prompt = nextScene.negative_prompt;
        }

        // Remove next scene
        state.scenes.splice(sceneIndex + 1, 1);

        // Update order for remaining scenes
        for (let i = sceneIndex + 1; i < state.scenes.length; i++) {
          state.scenes[i].order = i;
        }

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    duplicateScene: (state, action) => {
      const { sceneId } = action.payload;
      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex !== -1) {
        const originalScene = state.scenes[sceneIndex];

        // Create a duplicate scene with a temporary ID
        const duplicatedScene = {
          ...originalScene,
          _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: originalScene.title || '',
          order: sceneIndex + 1,
          // Deep copy arrays and objects
          tags: originalScene.tags ? [...originalScene.tags] : [],
          selectedImage: originalScene.selectedImage
            ? { ...originalScene.selectedImage }
            : {
                id: '',
                url: '',
                minUrl: '',
                googleCloudUrl: '',
                minGoogleCloudUrl: '',
                prompt: '',
                negativePrompt: '',
                imageHeight: '',
                imageWidth: '',
              },
        };

        // Insert the duplicated scene after the original
        state.scenes.splice(sceneIndex + 1, 0, duplicatedScene);

        // Update order for all scenes after the insertion
        for (let i = sceneIndex + 1; i < state.scenes.length; i++) {
          state.scenes[i].order = i;
        }

        // Track change
        state.pendingChanges.push({
          type: 'duplicate',
          sceneId: originalScene._id,
          duplicatedSceneId: duplicatedScene._id,
          timestamp: new Date().toISOString(),
        });

        // Save state to history
        if (!state.isUndoRedoOperation) {
          sceneSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    clearScenePrompts: (state, action) => {
      const { type } = action.payload;
      state.scenes = state.scenes.map(scene => ({
        ...scene,
        prompt: type === 'positive' || type === 'all' ? '' : scene.prompt,
        negative_prompt:
          type === 'negative' || type === 'all' ? '' : scene.negative_prompt,
        promptReady: true,
        selectedImage: {
          ...scene.selectedImage,
          prompt:
            type === 'positive' || type === 'all'
              ? ''
              : scene.selectedImage?.prompt,
          negativePrompt:
            type === 'negative' || type === 'all'
              ? ''
              : scene.selectedImage?.negativePrompt,
        },
      }));

      // Save state to history
      if (!state.isUndoRedoOperation) {
        sceneSlice.caseReducers.saveToHistory(state);
      }
    },

    clearPendingChanges: state => {
      state.pendingChanges = [];
    },

    updateLastSyncTimestamp: (state, action) => {
      state.lastSyncTimestamp = action.payload;
    },

    saveToHistory: state => {
      if (state.isUndoRedoOperation) {
        return;
      }

      // Create a deep copy of the current state
      const snapshot = {
        scenes: state.scenes.map(scene => ({
          ...scene,
          tags: scene.tags ? [...scene.tags] : [],
          selectedImage:
            scene.selectedImage &&
            scene.selectedImage !== false &&
            typeof scene.selectedImage === 'object'
              ? { ...scene.selectedImage }
              : createPlaceholderImage(),
        })),
        activeScene: state.activeScene ? { ...state.activeScene } : null,
        activeSentence: state.activeSentence
          ? { ...state.activeSentence }
          : null,
        selectedElement: state.selectedElement
          ? { ...state.selectedElement }
          : null,
      };

      // Remove future states if we're in the middle of history
      if (state.currentHistoryIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.currentHistoryIndex + 1);
      }

      // Add new state
      state.history.push(snapshot);
      state.currentHistoryIndex++;

      // Limit history size
      if (state.history.length > MAX_HISTORY_LENGTH) {
        const overflow = state.history.length - MAX_HISTORY_LENGTH;
        state.history = state.history.slice(overflow);
        state.currentHistoryIndex = Math.max(
          0,
          state.currentHistoryIndex - overflow
        );
      }
    },

    undo: state => {
      if (state.currentHistoryIndex > 0) {
        state.isUndoRedoOperation = true;
        state.currentHistoryIndex--;
        const previousState = state.history[state.currentHistoryIndex];

        // Ensure deep copy of all state properties with false value normalization
        state.scenes = previousState.scenes.map(scene => ({
          ...scene,
          tags: scene.tags ? [...scene.tags] : [],
          selectedImage:
            scene.selectedImage &&
            scene.selectedImage !== false &&
            typeof scene.selectedImage === 'object'
              ? { ...scene.selectedImage }
              : createPlaceholderImage(), // Normalize false/null/undefined to placeholder
        }));
        state.activeScene = previousState.activeScene
          ? { ...previousState.activeScene }
          : null;
        state.activeSentence = previousState.activeSentence
          ? { ...previousState.activeSentence }
          : null;
        state.selectedElement = previousState.selectedElement
          ? { ...previousState.selectedElement }
          : null;

        state.isUndoRedoOperation = false;

        // Trigger canvas sync by dispatching window event for components to listen
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sceneUndoRedo', {
              detail: {
                type: 'undo',
                activeScene: state.activeScene,
                scenes: state.scenes,
              },
            })
          );
        }
      }
    },

    redo: state => {
      if (state.currentHistoryIndex < state.history.length - 1) {
        state.isUndoRedoOperation = true;
        state.currentHistoryIndex++;
        const nextState = state.history[state.currentHistoryIndex];

        // Ensure deep copy of all state properties with false value normalization
        state.scenes = nextState.scenes.map(scene => ({
          ...scene,
          tags: scene.tags ? [...scene.tags] : [],
          selectedImage:
            scene.selectedImage &&
            scene.selectedImage !== false &&
            typeof scene.selectedImage === 'object'
              ? { ...scene.selectedImage }
              : createPlaceholderImage(), // Normalize false/null/undefined to placeholder
        }));
        state.activeScene = nextState.activeScene
          ? { ...nextState.activeScene }
          : null;
        state.activeSentence = nextState.activeSentence
          ? { ...nextState.activeSentence }
          : null;
        state.selectedElement = nextState.selectedElement
          ? { ...nextState.selectedElement }
          : null;

        state.isUndoRedoOperation = false;
      }
    },

    // Add new reducers for prompt versioning
    addPromptVersion: (state, action) => {
      const {
        sceneId,
        prompt,
        isNegative,
        isGenerated = false,
      } = action.payload;

      const sceneIndex = state.scenes.findIndex(scene => scene._id === sceneId);

      if (sceneIndex === -1) return;

      const scene = state.scenes[sceneIndex];

      // Initialize arrays if they don't exist
      if (!scene.promptVersions) scene.promptVersions = [];
      if (!scene.negativePromptVersions) scene.negativePromptVersions = [];

      const versions = isNegative
        ? scene.negativePromptVersions
        : scene.promptVersions;

      // Only add if it's different from the last version
      const lastVersion = versions[versions.length - 1];
      const lastVersionText = lastVersion ? lastVersion.content : '';

      if (prompt !== lastVersionText) {
        // Add new version
        versions.push({
          content: prompt,
          timestamp: new Date().toISOString(),
          source: isGenerated ? 'generated' : 'manual',
        });

        // Update current version index
        if (isNegative) {
          scene.currentNegativePromptVersionIndex = versions.length - 1;
          scene.negative_prompt = prompt;
        } else {
          scene.currentPromptVersionIndex = versions.length - 1;
          scene.prompt = prompt;
        }

        // Update activeScene if it matches
        if (state.activeScene && state.activeScene._id === sceneId) {
          if (isNegative) {
            state.activeScene.negative_prompt = prompt;
            state.activeScene.negativePromptVersions = [...versions];
            state.activeScene.currentNegativePromptVersionIndex =
              versions.length - 1;
          } else {
            state.activeScene.prompt = prompt;
            state.activeScene.promptVersions = [...versions];
            state.activeScene.currentPromptVersionIndex = versions.length - 1;
          }
        }
      } else {
        // Even if version is not added, update current scene prompt
        if (isNegative) {
          scene.negative_prompt = prompt;
        } else {
          scene.prompt = prompt;
        }

        // Also update activeScene if it matches
        if (state.activeScene && state.activeScene._id === sceneId) {
          if (isNegative) {
            state.activeScene.negative_prompt = prompt;
          } else {
            state.activeScene.prompt = prompt;
          }
        }
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(setCurrentStory, (state, { payload }) => {
        const newStoryId = payload?._id || null;
        if (!newStoryId) return;

        // If story changed, clear scene-specific state to avoid cross-story leakage
        if (state.currentStoryId && state.currentStoryId !== newStoryId) {
          state.scenes = [];
          state.activeScene = null;
          state.activeSentence = null;
          state.selectedElement = null;
          state.history = [];
          state.currentHistoryIndex = -1;
        }
        state.currentStoryId = newStoryId;
      })
      .addCase(clearCurrentStory, state => {
        state.currentStoryId = null;
        state.scenes = [];
        state.activeScene = null;
        state.activeSentence = null;
        state.selectedElement = null;
        state.history = [];
        state.currentHistoryIndex = -1;
      });
    // Do not reset scene history on every story refetch; history is
    // already reset on actual story switches via setCurrentStory
  },
});

export const {
  setScenes,
  updateScene,
  reorderScene,
  deleteScene,
  addScene,
  clearScenePrompts,
  updateSceneTitle,
  setActiveScene,
  setActiveSentence,
  setSelectedElement,
  resetActiveScene,
  setActiveScenePrompt,
  setActiveSceneNegativePrompt,
  setGeneratingPromptType,
  addSceneTag,
  updateSceneTag,
  deleteSceneTag,
  updateSceneStyle,
  updateSelectedImage,
  applySelectedImageFromTimeline,
  splitScene,
  mergeSceneUp,
  mergeSceneDown,
  duplicateScene,
  clearPendingChanges,
  updateLastSyncTimestamp,
  saveToHistory,
  undo,
  redo,
  resetState,
  removeAllAssignedImages,
  removeAllprompts,
  removeAllNegativePrompts,
  addPromptVersion,
} = sceneSlice.actions;

export const selectScenes = state => state.scene.scenes;
export const selectActiveScene = state => state.scene.activeScene;
export const selectActiveSentence = state => state.scene.activeSentence;
export const selectSelectedElement = state => state.scene.selectedElement;
export const selectGeneratingPromptType = state =>
  state.scene.generatingPromptType;
export const selectCanUndo = state => state.scene.currentHistoryIndex > 0;
export const selectCanRedo = state =>
  state.scene.currentHistoryIndex < state.scene.history.length - 1;

export default sceneSlice.reducer;
