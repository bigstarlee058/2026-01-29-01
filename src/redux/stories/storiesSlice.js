import { createSlice } from '@reduxjs/toolkit';

const MAX_HISTORY_LENGTH = 50;

const initialState = {
  currentStory: null,
  loading: false,
  error: null,
  history: [],
  currentHistoryIndex: -1,
  isUndoRedoOperation: false,
  autoGenerateImages: false,
};

const saveToHistory = state => {
  if (state.isUndoRedoOperation) return;

  if (state.currentHistoryIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.currentHistoryIndex + 1);
  }

  state.history.push({ ...state.currentStory });
  state.currentHistoryIndex++;

  if (state.history.length > MAX_HISTORY_LENGTH) {
    state.history = state.history.slice(-MAX_HISTORY_LENGTH);
    state.currentHistoryIndex = state.history.length - 1;
  }
};

const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    setCurrentStory: (state, action) => {
      if (state.isUndoRedoOperation) {
        state.currentStory = action.payload;
        return;
      }

      // Save current state to history before updating
      if (state.currentStory) {
        saveToHistory(state);
      }

      state.currentStory = action.payload;
    },
    clearCurrentStory: state => {
      state.currentStory = null;
      state.history = [];
      state.currentHistoryIndex = -1;
    },
    undo: state => {
      if (state.currentHistoryIndex > 0 && state.history.length > 0) {
        state.isUndoRedoOperation = true;
        state.currentHistoryIndex--;
        state.currentStory = { ...state.history[state.currentHistoryIndex] };
        state.isUndoRedoOperation = false;
      }
    },
    redo: state => {
      if (state.currentHistoryIndex < state.history.length - 1) {
        state.isUndoRedoOperation = true;
        state.currentHistoryIndex++;
        state.currentStory = { ...state.history[state.currentHistoryIndex] };
        state.isUndoRedoOperation = false;
      }
    },
    clearHistory: state => {
      state.history = [];
      state.currentHistoryIndex = -1;
    },
    updateStoryStyle: (state, action) => {
      if (state.currentStory) {
        state.currentStory.generationStyle = {
          preset: action.payload.preset,
          style: action.payload.style,
        };
      }

      if (!state.isUndoRedoOperation) {
        saveToHistory(state);
      }
    },
    deleteImage: (state, action) => {
      if (!state.currentStory || !state.currentStory.images) {
        console.warn('No current story or images found');
        return;
      }

      const { imageId, generationId } = action.payload;

      state.currentStory.images = state.currentStory.images.map(generation => {
        if (generation.id === generationId || generation._id === generationId) {
          return {
            ...generation,
            generated_images: generation.generated_images.filter(
              img => img.id !== imageId && img._id !== imageId
            ),
          };
        }
        return generation;
      });

      // Save to history after successful deletion
      if (!state.isUndoRedoOperation) {
        saveToHistory(state);
      }
    },
    toggleImageReaction: (state, action) => {
      if (state.isUndoRedoOperation) {
        state.currentStory = action.payload;
        return;
      }

      // Save current state to history before updating
      if (state.currentStory) {
        if (state.currentHistoryIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.currentHistoryIndex + 1);
        }
        state.history.push({ ...state.currentStory });
        state.currentHistoryIndex++;

        if (state.history.length > MAX_HISTORY_LENGTH) {
          state.history = state.history.slice(-MAX_HISTORY_LENGTH);
          state.currentHistoryIndex = state.history.length - 1;
        }
      }

      const { imageId, generationId, username, reactionType } = action.payload;

      if (state.currentStory?.images) {
        state.currentStory.images = state.currentStory.images.map(
          generation => {
            // Check if this is the generation we're looking for using id or _id
            if (
              generation.id === generationId ||
              generation._id === generationId
            ) {
              return {
                ...generation,
                generated_images: generation.generated_images.map(img => {
                  // Check if this is the image we're looking for using id or _id
                  if (img.id === imageId || img._id === imageId) {
                    const likes = Array.isArray(img.likes) ? img.likes : [];
                    const dislikes = Array.isArray(img.dislikes)
                      ? img.dislikes
                      : [];

                    // Remove from both arrays first
                    const newLikes = likes.filter(u => u !== username);
                    const newDislikes = dislikes.filter(u => u !== username);

                    // Add to appropriate array if it's a new reaction
                    if (reactionType === 'like' && !likes.includes(username)) {
                      newLikes.push(username);
                    } else if (
                      reactionType === 'dislike' &&
                      !dislikes.includes(username)
                    ) {
                      newDislikes.push(username);
                    }

                    return {
                      ...img,
                      likes: newLikes,
                      dislikes: newDislikes,
                    };
                  }
                  return img;
                }),
              };
            }
            return generation;
          }
        );

        if (!state.isUndoRedoOperation) {
          saveToHistory(state);
        }
      }
    },
    setAutoGenerateImages: (state, action) => {
      state.autoGenerateImages = action.payload;
    },
  },
});

export const {
  setCurrentStory,
  clearCurrentStory,
  undo,
  redo,
  clearHistory,
  deleteImage,
  toggleImageReaction,
  updateStoryStyle,
  setAutoGenerateImages,
} = storiesSlice.actions;

export const selectCurrentStory = state => state.stories.currentStory;
export const selectStoriesLoading = state => state.stories.loading;
export const selectStoriesError = state => state.stories.error;
export const selectCanUndo = state => state.stories.currentHistoryIndex > 0;
export const selectCanRedo = state =>
  state.stories.currentHistoryIndex < state.stories.history.length - 1;

export default storiesSlice.reducer;
