import { createSlice } from '@reduxjs/toolkit';

const MAX_HISTORY_LENGTH = 50;

const initialState = {
  editorElements: [],
  animations: [],
  subtitles: {
    backgroundColor: '',
    backgroundRadius: 0,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 1,
    color: '',
    font: '',
    fontSize: 0,
    fontWeight: '',
    stroke: 0,
    strokeColor: '',
    textAlign: '',
    verticalAlign: '',
    synchronize: false,
    autoSubtitles: false,
    segments: [], // For subtitle segments
    properties: {}, // For common subtitle properties
    styleId: '',
    highlightColor: '',
    motionColor: '',
  },
  maxTime: 0,
  backgroundColor: '',
  fps: 0,
  synchronise: false,
  // History management
  history: [],
  currentHistoryIndex: -1,
  isUndoRedoOperation: false,
  pendingChanges: [],
  lastSyncTimestamp: null,
};

// Helper function to safely serialize objects avoiding circular references and MobX issues
// Uses WeakMap to preserve repeated references without collapsing them to null
const safeSerialize = (obj, seen = new WeakMap()) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Return previously created clone if we've already seen this object
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  if (Array.isArray(obj)) {
    const clonedArray = [];
    // Store placeholder first to handle self-referential structures
    seen.set(obj, clonedArray);
    for (let i = 0; i < obj.length; i++) {
      clonedArray[i] = safeSerialize(obj[i], seen);
    }
    return clonedArray;
  }

  const result = {};
  // Store placeholder first to handle circular references
  seen.set(obj, result);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip MobX specific properties and functions
      if (
        key.startsWith('$') ||
        key.startsWith('_') ||
        typeof obj[key] === 'function'
      ) {
        continue;
      }

      // Skip known problematic properties and heavy/circular refs
      if (
        [
          'fabricObject',
          'initialState',
          'wordObjects',
          'imageObject',
          // Prevent cycles: timeline elements sometimes keep the full animation object
          'originalAnimation',
          // Extra safety for UI-only refs occasionally attached
          'actualAnimation',
          'targetElement',
          // Fabric/Canvas circular refs
          'canvas',
          'freeDrawingBrush',
          'ctx',
          'context',
          'renderer',
        ].includes(key)
      ) {
        continue;
      }

      try {
        result[key] = safeSerialize(obj[key], seen);
      } catch (error) {
        // Skip properties that can't be serialized
      }
    }
  }

  return result;
};

// Helper function to create clean state copies without MobX mutations and fabric objects
export const createCleanStateCopy = (editorElements, animations, subtitles) => {
  try {
    // Process editor elements to use initialState for positioning when available
    const processedElements = (editorElements || []).map(element => {
      if (element.initialState && animations) {
        // Check if element has active animations
        const hasActiveAnimations = animations.some(animation => {
          // Support both new targetIds and legacy targetId
          if (animation.targetIds && Array.isArray(animation.targetIds)) {
            return animation.targetIds.includes(element.id);
          }
          return animation.targetId === element.id;
        });

        if (hasActiveAnimations && element.initialState) {
          // Use initialState for placement to prevent saving animated positions
          return {
            ...element,
            placement: {
              ...element.placement,
              x: element.initialState.left,
              y: element.initialState.top,
              scaleX: element.initialState.scaleX,
              scaleY: element.initialState.scaleY,
            },
          };
        }
      }
      return element;
    });

    // Use safe serialization instead of JSON.parse(JSON.stringify())
    const cleanEditorElements = safeSerialize(processedElements);
    const cleanAnimations = safeSerialize(animations || []);
    const cleanSubtitles = safeSerialize(subtitles || {});

    return {
      editorElements: cleanEditorElements,
      animations: cleanAnimations,
      subtitles: cleanSubtitles,
    };
  } catch (error) {
    console.error('Error in createCleanStateCopy:', error);
    // Return safe fallback
    return {
      editorElements: [],
      animations: [],
      subtitles: {},
    };
  }
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    resetState: state => {
      return initialState;
    },
    // Add history management helper
    saveToHistory: state => {
      if (state.isUndoRedoOperation) {
        return;
      }

      // Create a clean copy of the current state without MobX mutations
      const cleanState = createCleanStateCopy(
        state.editorElements,
        state.animations || [],
        state.subtitles
      );

      const replacer = (k, v) => {
        // Drop known circular/heavy refs if they slipped through
        if (
          k === 'fabricObject' ||
          k === 'canvas' ||
          k === 'freeDrawingBrush' ||
          k === 'ctx' ||
          k === 'context' ||
          k === 'renderer' ||
          k === 'originalAnimation' ||
          k === 'actualAnimation' ||
          k === 'targetElement'
        ) {
          return undefined;
        }
        return v;
      };

      const snapshot = {
        editorElements: JSON.parse(
          JSON.stringify(cleanState.editorElements || [], replacer)
        ),
        animations: JSON.parse(
          JSON.stringify(cleanState.animations || [], replacer)
        ),
        subtitles: JSON.parse(
          JSON.stringify(cleanState.subtitles || {}, replacer)
        ),
        maxTime: state.maxTime,
        backgroundColor: state.backgroundColor,
        fps: state.fps,
        synchronise: state.synchronise,
      };

      // Don't save if this is the same as the last saved state
      if (state.history.length > 0) {
        const lastState = state.history[state.history.length - 1];
        try {
          // Use safe comparison for history states
          const lastElements = JSON.stringify(lastState.editorElements || []);
          const currentElements = JSON.stringify(snapshot.editorElements || []);
          if (lastElements === currentElements) {
            return;
          }
        } catch (error) {
          // If comparison fails, save anyway to be safe
        }
      }

      // Allow empty state only for the very first snapshot (init)
      if (!snapshot.editorElements || snapshot.editorElements.length === 0) {
        if (state.history.length > 0) {
          return;
        }
      }

      // Remove future states if we're in the middle of history
      if (state.currentHistoryIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.currentHistoryIndex + 1);
      }

      // Add new state
      state.history.push(snapshot);
      state.currentHistoryIndex++;

      // (debug logs removed)

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

    setEditorElements: (state, action) => {
      // Create clean copies without MobX mutations and fabric objects
      const cleanState = createCleanStateCopy(
        action.payload.editorElements,
        action.payload.animations,
        state.subtitles
      );

      // Check if there are actual changes by comparing only backend-relevant properties
      const hasLengthChanged =
        (cleanState.editorElements?.length || 0) !==
        (state.editorElements?.length || 0);

      const hasContentChanged = cleanState.editorElements.some(
        (newEl, index) => {
          const oldEl = state.editorElements[index];
          if (!oldEl) return true;

          // Compare only properties needed for backend sync
          return (
            newEl.id !== oldEl.id ||
            newEl.type !== oldEl.type ||
            newEl.timeFrame.start !== oldEl.timeFrame.start ||
            newEl.timeFrame.end !== oldEl.timeFrame.end ||
            JSON.stringify(newEl.properties) !==
              JSON.stringify(oldEl.properties)
          );
        }
      );

      const hasChanges = hasLengthChanged || hasContentChanged;

      if (hasChanges) {
        state.editorElements = cleanState.editorElements;
        state.animations = cleanState.animations;

        if (!state.isUndoRedoOperation) {
          timelineSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    syncWithSceneHistory: (state, action) => {
      const { sceneHistoryIndex, sceneHistoryLength } = action.payload;

      if (state.history.length < sceneHistoryLength) {
        // Create clean state copy
        const cleanState = createCleanStateCopy(
          state.editorElements,
          state.animations,
          state.subtitles
        );

        const currentState = {
          ...cleanState,
          maxTime: state.maxTime,
          backgroundColor: state.backgroundColor,
          fps: state.fps,
          synchronise: state.synchronise,
        };

        while (state.history.length < sceneHistoryLength) {
          state.history.push(JSON.parse(JSON.stringify(currentState)));
        }
      }

      state.currentHistoryIndex = sceneHistoryIndex;
    },

    undo: state => {
      // Check if we can undo
      if (state.currentHistoryIndex <= 0) {
        return;
      }

      // Get previous state
      const previousState = state.history[state.currentHistoryIndex - 1];
      if (!previousState) {
        return;
      }

      // Validate previous state
      if (
        !previousState.editorElements ||
        !Array.isArray(previousState.editorElements)
      ) {
        // Invalid previous state; skip undo
        return;
      }

      // (debug logs removed)

      // Restore all state properties with deep cloning
      state.isUndoRedoOperation = true;
      state.editorElements = JSON.parse(
        JSON.stringify(previousState.editorElements)
      );
      state.animations = JSON.parse(
        JSON.stringify(previousState.animations || [])
      );
      state.subtitles = JSON.parse(
        JSON.stringify(previousState.subtitles || {})
      );
      state.maxTime = previousState.maxTime || 0;
      state.backgroundColor = previousState.backgroundColor || '';
      state.fps = previousState.fps || 0;
      state.synchronise = previousState.synchronise || false;
      state.currentHistoryIndex--;
      state.isUndoRedoOperation = false;

      // Trigger canvas update through custom event
      window.dispatchEvent(
        new CustomEvent('timelineStateChanged', {
          detail: {
            editorElements: state.editorElements,
            animations: state.animations,
          },
        })
      );
    },

    redo: state => {
      if (state.currentHistoryIndex < state.history.length - 1) {
        state.currentHistoryIndex++;
        const nextState = state.history[state.currentHistoryIndex];

        // Validate next state
        if (
          !nextState ||
          !nextState.editorElements ||
          !Array.isArray(nextState.editorElements)
        ) {
          // Invalid next state; skip redo
          state.currentHistoryIndex--; // Revert index change
          return;
        }

        // (debug logs removed)

        state.isUndoRedoOperation = true;

        // Restore all state properties
        state.editorElements = JSON.parse(
          JSON.stringify(nextState.editorElements)
        );
        state.animations = JSON.parse(
          JSON.stringify(nextState.animations || [])
        );
        state.subtitles = JSON.parse(JSON.stringify(nextState.subtitles || {}));
        state.maxTime = nextState.maxTime || 0;
        state.backgroundColor = nextState.backgroundColor || '';
        state.fps = nextState.fps || 0;
        state.synchronise = nextState.synchronise || false;

        state.isUndoRedoOperation = false;

        // Trigger canvas update through custom event
        window.dispatchEvent(
          new CustomEvent('timelineStateChanged', {
            detail: {
              editorElements: state.editorElements,
              animations: state.animations,
            },
          })
        );
      }
    },

    updateFromStore: (state, action) => {
      const {
        editorElements,
        animations,
        subtitles,
        maxTime,
        backgroundColor,
        fps,
        synchronise,
      } = action.payload;

      // Create clean copies without MobX mutations and fabric objects
      const cleanState = createCleanStateCopy(
        editorElements,
        animations,
        subtitles
      );

      if (
        JSON.stringify(state.editorElements) !==
        JSON.stringify(cleanState.editorElements)
      ) {
        state.editorElements = cleanState.editorElements;
        state.animations = cleanState.animations;
        state.subtitles = cleanState.subtitles;
        state.maxTime = maxTime;
        state.backgroundColor = backgroundColor;
        state.fps = fps;
        state.synchronise = synchronise;

        if (!state.isUndoRedoOperation) {
          timelineSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    clearTimeline: state => {
      Object.assign(state, initialState);
    },

    updateLastSyncTimestamp: (state, action) => {
      state.lastSyncTimestamp = action.payload;
    },

    clearPendingChanges: state => {
      state.pendingChanges = [];
    },

    saveTimelineStateAction: (state, action) => {
      const { editorElements, animations, isInitialization } = action.payload;

      // Don't save during initialization phase
      if (isInitialization) {
        return;
      }

      // Don't save if elements are null/undefined
      if (!editorElements || !Array.isArray(editorElements)) {
        return;
      }

      // Create clean copies without MobX mutations and fabric objects
      const cleanState = createCleanStateCopy(
        editorElements,
        animations,
        state.subtitles
      );

      // If this is the very first snapshot, always save it (even if empty/no changes)
      if (state.history.length === 0) {
        state.editorElements = cleanState.editorElements;
        state.animations = cleanState.animations;
        state.subtitles = cleanState.subtitles;

        if (!state.isUndoRedoOperation) {
          timelineSlice.caseReducers.saveToHistory(state);
        }
        return;
      }

      // Check if this is actually a meaningful change using safe comparison
      let hasElementsChanged = true;
      let hasAnimationsChanged = true;

      try {
        hasElementsChanged =
          JSON.stringify(state.editorElements) !==
          JSON.stringify(cleanState.editorElements);
        hasAnimationsChanged =
          JSON.stringify(state.animations) !==
          JSON.stringify(cleanState.animations);

        if (!hasElementsChanged && !hasAnimationsChanged) {
          return;
        }
      } catch (error) {
        // If comparison fails, assume there are changes and proceed
      }

      state.editorElements = cleanState.editorElements;
      state.animations = cleanState.animations;

      if (!state.isUndoRedoOperation) {
        timelineSlice.caseReducers.saveToHistory(state);
      }
    },
    saveTimelineData: (state, action) => {
      // This is an empty trigger action that doesn't modify the state
      // It's only purpose is to be intercepted by the fullSyncMiddleware
      // to initiate the sync process with the backend
    },

    // Media Management Reducers for Task 1: Add Media to Timeline
    addMediaClip: (state, action) => {
      const {
        type, // 'video' | 'audio' | 'image'
        source, // File object or blob URL
        startTime = 0,
        duration = 0,
        linkedAudioClipId = null,
        fileName = 'media',
      } = action.payload;

      // Generate unique clip ID
      const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine element type and property key based on file type
      let elementType = type;
      let propertyKey = 'src';
      let targetRow = 0;

      if (type === 'image') {
        elementType = 'imageUrl';
        propertyKey = 'imageUrl';
        targetRow = state.editorElements.filter(
          el => el.type === 'imageUrl'
        ).length;
      } else if (type === 'video') {
        elementType = 'video';
        propertyKey = 'src';
        targetRow = state.editorElements.filter(
          el => el.type === 'video'
        ).length;
      } else if (type === 'audio') {
        elementType = 'audio';
        propertyKey = 'src';
        targetRow = state.editorElements.filter(
          el => el.type === 'audio'
        ).length;
      }

      // Create new media clip in timeline-compatible format
      const newClip = {
        id: clipId,
        type: elementType,
        row: targetRow,
        fileName,
        timeFrame: {
          start: startTime,
          end: startTime + duration,
        },
        from: startTime,
        to: startTime + duration,
        duration,
        properties: {
          [propertyKey]: source, // Store blob URL in the appropriate property
          volume: type === 'audio' ? 1.0 : undefined,
          opacity: type === 'image' ? 1.0 : undefined,
        },
        linkedAudioClipId, // For video clips with audio
        createdAt: new Date().toISOString(),
      };

      // Remove undefined properties
      Object.keys(newClip.properties).forEach(key => {
        if (newClip.properties[key] === undefined) {
          delete newClip.properties[key];
        }
      });

      state.editorElements.push(newClip);

      // Update maxTime if this clip extends the timeline
      const clipEnd = startTime + duration;
      if (clipEnd > state.maxTime) {
        state.maxTime = clipEnd;
      }

      // Save to history
      if (!state.isUndoRedoOperation) {
        timelineSlice.caseReducers.saveToHistory(state);
      }
    },

    removeMediaClip: (state, action) => {
      const { clipId } = action.payload;

      // Find and remove the clip
      const index = state.editorElements.findIndex(el => el.id === clipId);
      if (index !== -1) {
        const removedClip = state.editorElements[index];
        state.editorElements.splice(index, 1);

        // If this was a video with linked audio, remove audio too
        if (removedClip.linkedAudioClipId) {
          const audioIndex = state.editorElements.findIndex(
            el => el.id === removedClip.linkedAudioClipId
          );
          if (audioIndex !== -1) {
            state.editorElements.splice(audioIndex, 1);
          }
        }

        // Recalculate maxTime
        if (state.editorElements.length > 0) {
          state.maxTime = Math.max(
            ...state.editorElements.map(el => el.timeFrame.end || 0)
          );
        } else {
          state.maxTime = 0;
        }

        // Save to history
        if (!state.isUndoRedoOperation) {
          timelineSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    updateMediaClipTimeFrame: (state, action) => {
      const { clipId, start, end } = action.payload;

      const clip = state.editorElements.find(el => el.id === clipId);
      if (clip) {
        clip.timeFrame.start = start;
        clip.timeFrame.end = end;

        // Update maxTime if needed
        if (end > state.maxTime) {
          state.maxTime = end;
        }

        // Save to history
        if (!state.isUndoRedoOperation) {
          timelineSlice.caseReducers.saveToHistory(state);
        }
      }
    },

    setSelectedClip: (state, action) => {
      state.selectedClipId = action.payload;
    },
  },
});

export const {
  setEditorElements,
  syncWithSceneHistory,
  undo,
  redo,
  updateFromStore,
  clearTimeline,
  updateLastSyncTimestamp,
  clearPendingChanges,
  saveToHistory,
  resetState,
  saveTimelineStateAction,
  saveTimelineData,
  addMediaClip,
  removeMediaClip,
  updateMediaClipTimeFrame,
  setSelectedClip,
} = timelineSlice.actions;

// Add new action creator for safely copying and setting editor elements
export const saveTimelineState = store => dispatch => {
  try {
    // Add recursion protection - check if we're already saving
    if (store._isSaving) {
      return;
    }

    store._isSaving = true;

    try {
      // Use the same clean state copy function as used in reducers
      const cleanState = createCleanStateCopy(
        store.editorElements,
        store.animations,
        store.subtitles
      );

      // Ensure payload is fully plain and non-draftable to avoid Immer finalize recursion
      let plainEditorElements = cleanState.editorElements;
      let plainAnimations = cleanState.animations;
      try {
        plainEditorElements = JSON.parse(
          JSON.stringify(cleanState.editorElements || [])
        );
      } catch (_) {
        // Fallback to safeSerialize result
      }
      try {
        plainAnimations = JSON.parse(
          JSON.stringify(cleanState.animations || [])
        );
      } catch (_) {
        // Fallback to safeSerialize result
      }

      // Use the same replacer again when dispatching to ensure payload is plain
      const payload = {
        editorElements: JSON.parse(
          JSON.stringify(plainEditorElements || [], (k, v) => {
            if (
              k === 'fabricObject' ||
              k === 'canvas' ||
              k === 'freeDrawingBrush' ||
              k === 'ctx' ||
              k === 'context' ||
              k === 'renderer' ||
              k === 'originalAnimation' ||
              k === 'actualAnimation' ||
              k === 'targetElement'
            ) {
              return undefined;
            }
            return v;
          })
        ),
        animations: JSON.parse(
          JSON.stringify(plainAnimations || [], (k, v) => {
            if (
              k === 'fabricObject' ||
              k === 'canvas' ||
              k === 'freeDrawingBrush' ||
              k === 'ctx' ||
              k === 'context' ||
              k === 'renderer' ||
              k === 'originalAnimation' ||
              k === 'actualAnimation' ||
              k === 'targetElement'
            ) {
              return undefined;
            }
            return v;
          })
        ),
        isInitialization: store.isInitializationInProgress || false,
      };
      dispatch(saveTimelineStateAction(payload));
    } finally {
      // Always clear the saving flag
      store._isSaving = false;
    }
  } catch (error) {
    console.error('Error in saveTimelineState:', error);
    store._isSaving = false;
    // Don't dispatch if serialization fails
  }
};

export const selectEditorElements = state => state.timeline.editorElements;
export const selectCanUndo = state => state.timeline.currentHistoryIndex > 0;
export const selectCanRedo = state =>
  state.timeline.currentHistoryIndex < state.timeline.history.length - 1;

export default timelineSlice.reducer;
