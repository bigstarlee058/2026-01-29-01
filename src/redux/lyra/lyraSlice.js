import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  isConnected: false,
  isAuthenticated: false,
  error: null,
  searchText: '',
  currentScreen: '',
  selectedProvider: '',
  frameSize: '',
  downloadUrl: '',
  isTransitionPanelOpen: false,
  activeTransitionPosition: 'in', // Default transition position
  activeTransitionEffect: null, // Specific effect type (zoomIn, fadeOut, etc.)
  pendingEffectSelection: null, // Store specific effect to be selected
  // Async operations tracking
  asyncOperations: {}, // { operationId: { type, progress, status, lyraInitiated, startTime } }
};

const lyraSlice = createSlice({
  name: 'lyra',
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setAuthenticationStatus: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSearchText: (state, action) => {
      state.searchText = action.payload;
    },
    clearSearchText: state => {
      state.searchText = '';
    },
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload;
    },
    setSelectedProvider: (state, action) => {
      state.selectedProvider = action.payload;
    },
    setFrameSize: (state, action) => {
      state.frameSize = action.payload;
    },
    setDownloadUrl: (state, action) => {
      state.downloadUrl = action.payload;
    },
    clearDownloadUrl: state => {
      state.downloadUrl = '';
    },
    handleLyraAction: (state, action) => {
      const { logical_action, content } = action.payload;
switch (logical_action) {
        case 'open_gallery':
          state.currentScreen = 'search';
          state.isTransitionPanelOpen = false;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'search' } })
            );
          }
          break;
        case 'open_story_details':
          state.currentScreen = 'settings';
          state.isTransitionPanelOpen = false;
          break;
        case 'open_player':
          state.currentScreen = 'playback';
          state.isTransitionPanelOpen = false;
          break;
        case 'hide_player':
          state.currentScreen = '';
          state.isTransitionPanelOpen = false;
          break;
        case 'open_transitions':
          state.currentScreen = 'playback';
          state.isTransitionPanelOpen = true;
          state.activeTransitionPosition = 'in';
          break;
        case 'open_in_transitions':
          state.currentScreen = 'playback';
          state.isTransitionPanelOpen = true;
          state.activeTransitionPosition = 'in';
          break;
        case 'open_out_transitions':
          state.currentScreen = 'playback';
          state.isTransitionPanelOpen = true;
          state.activeTransitionPosition = 'out';
          break;
        case 'open_effect':
          state.currentScreen = 'playback';
          state.isTransitionPanelOpen = true;
          state.activeTransitionPosition = 'effect';
          break;
        case 'set_specific_transition_effect':
          if (content) {
            state.pendingEffectSelection = {
              position: state.activeTransitionPosition,
              effectType: content,
            };
          }
          break;
        case 'change_frame_size_from_storyboard':
          if (content) {
            // Extract the aspect ratio from content
            let frameSize = '';

            // Try to parse different formats of content
            if (
              content.includes('9:16') ||
              content.toLowerCase().includes('portrait')
            ) {
              frameSize = '9:16';
            } else if (content.includes('4:3')) {
              frameSize = '4:3';
            } else if (
              content.includes('1:1') ||
              content.toLowerCase().includes('square')
            ) {
              frameSize = '1:1';
            } else if (
              content.includes('16:9') ||
              content.toLowerCase().includes('landscape')
            ) {
              frameSize = '16:9';
            } else {
              // Try to extract from string like "Change frame size to 9:16"
              const matches = content.match(/to\s+(\d+:\d+)/i);
              if (matches && matches[1]) {
                frameSize = matches[1];
              } else {
                // Default if we can't determine
                frameSize = '9:16';
              }
            }

            state.frameSize = frameSize;

            // Try to directly update the canvas if window and store are available
            if (typeof window !== 'undefined') {
              // Method 1: Try MobX store
              if (
                window.__MOBX_STORE__ &&
                window.__MOBX_STORE__.updateAspectRatio
              ) {
                try {
                  window.__MOBX_STORE__.updateAspectRatio(frameSize);
                } catch (e) {
                  console.error('Error calling store.updateAspectRatio:', e);
                }
              }
              // Method 2: Try global function
              else if (window.updateCanvasAspectRatio) {
                try {
                  window.updateCanvasAspectRatio(frameSize);
                } catch (e) {
                  console.error(
                    'Error calling window.updateCanvasAspectRatio:',
                    e
                  );
                }
              }
              // Method 3: Dispatch event
              else {
                try {
                  window.dispatchEvent(
                    new CustomEvent('frame_size_changed', {
                      detail: { orientation: frameSize },
                    })
                  );
                } catch (e) {
                  console.error(
                    'Error dispatching frame_size_changed event:',
                    e
                  );
                }
              }
            }
          }
          break;
        case 'download_a_picture':
          if (content) {
            try {
              const url = content;
              state.downloadUrl = url;
            } catch (error) {
              console.error(
                'Invalid URL in download_a_picture action:',
                content,
                error
              );
              console.warn('Download a picture called with invalid URL');
            }
          } else {
            console.warn('Download a picture called with empty content');
          }
          break;
        case 'filter_images_by_provider':
          state.selectedProvider = 'leonardo';
          break;
        case 'find_a_picture':
          state.searchText = '';
          state.currentScreen = 'gallery';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('putSearchText', { detail: '' })
            );
          }
          break;
        case 'put_search_text':
          if (content) {
            state.searchText = content;
            state.currentScreen = 'gallery';
            // Dispatch event for UI update
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('putSearchText', { detail: content })
              );
            }
          }
          break;
        case 'open_filters':
          state.currentScreen = 'gallery';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'search' } })
            );
            window.dispatchEvent(new CustomEvent('openGalleryFilters'));
          }
          break;
        case 'download_selected_images_from_gallery':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('downloadSelectedImages'));
          }
          break;

        // Main screen navigation
        case 'open_storyboard':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'storyboard' } })
            );
          }
          break;
        case 'close_storyboard':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'storyboard' } })
            );
          }
          break;
        case 'close_gallery':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'search' } })
            );
          }
          break;
        case 'open_generate_ai':
          state.currentScreen = 'generateAI';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'generateAI' } })
            );
          }
          break;
        case 'close_generate_ai':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'generateAI' } })
            );
          }
          break;
        case 'open_my_items':
          state.currentScreen = 'myItems';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'myItems' } })
            );
          }
          break;
        case 'close_my_items':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'myItems' } })
            );
          }
          break;
        case 'open_settings':
          state.currentScreen = 'settings';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'settings' } })
            );
          }
          break;
        case 'close_settings':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'settings' } })
            );
          }
          break;

        // Lyra chat
        case 'open_lyra_chat':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openPanel', { detail: { panel: 'lyra' } })
            );
          }
          break;
        case 'close_lyra_chat':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closePanel', { detail: { panel: 'lyra' } })
            );
          }
          break;

        // Editing panels
        case 'open_image_editing':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openEditingPanel', {
                detail: { panel: 'imageEditing' },
              })
            );
          }
          break;
        case 'close_image_editing':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closeEditingPanel', {
                detail: { panel: 'imageEditing' },
              })
            );
          }
          break;
        case 'open_typography':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openEditingPanel', {
                detail: { panel: 'typography' },
              })
            );
          }
          break;
        case 'close_typography':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closeEditingPanel', {
                detail: { panel: 'typography' },
              })
            );
          }
          break;
        case 'open_subtitles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openEditingPanel', {
                detail: { panel: 'subtitles' },
              })
            );
          }
          break;
        case 'close_subtitles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closeEditingPanel', {
                detail: { panel: 'subtitles' },
              })
            );
          }
          break;
        case 'open_animation':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('openEditingPanel', {
                detail: { panel: 'animation' },
              })
            );
          }
          break;
        case 'close_animation':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('closeEditingPanel', {
                detail: { panel: 'animation' },
              })
            );
          }
          break;

        // SubtitlesStylesPanel actions
        case 'open_subtitles_styles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openSubtitlesStylesPanel'));
          }
          break;
        case 'close_subtitles_styles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('closeSubtitlesStylesPanel'));
          }
          break;

        // Subtitle generation
        case 'generate_subtitles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('generateSubtitles'));
          }
          break;
        case 'regenerate_subtitles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('regenerateSubtitles'));
          }
          break;

        // Subtitle editing
        case 'delete_all_subtitles':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deleteAllSubtitles'));
          }
          break;
        case 'hide_subtitle_timings':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hideAllSubtitleTimings'));
          }
          break;
        case 'show_subtitle_timings':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('showAllSubtitleTimings'));
          }
          break;
        case 'open_subtitle_design':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openSubtitleDesign'));
          }
          break;
        case 'close_subtitle_design':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('closeSubtitleDesign'));
          }
          break;

        // Special combined actions
        case 'close_all_panels':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('closeAllPanels'));
          }
          break;
        case 'close_all_editing_panels':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('closeAllEditingPanels'));
          }
          break;
        case 'switch_to_playback':
          state.currentScreen = 'playback';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('switchToPlayback'));
          }
          break;

        default:
          console.warn('Unknown Lyra action:', logical_action);
      }
    },
    setSpecificTransitionEffect: (state, action) => {
      state.pendingEffectSelection = action.payload;
    },
    // Async operations management
    startAsyncOperation: (state, action) => {
      const { operationId, type, lyraInitiated = false } = action.payload;
      state.asyncOperations[operationId] = {
        type,
        progress: 0,
        status: 'pending',
        lyraInitiated,
        startTime: Date.now(),
      };
    },
    updateAsyncOperationProgress: (state, action) => {
      const { operationId, progress } = action.payload;
      if (state.asyncOperations[operationId]) {
        state.asyncOperations[operationId].progress = progress;
        state.asyncOperations[operationId].status = 'in_progress';
      }
    },
    completeAsyncOperation: (state, action) => {
      const { operationId, result } = action.payload;
      if (state.asyncOperations[operationId]) {
        state.asyncOperations[operationId].status = 'completed';
        state.asyncOperations[operationId].progress = 100;
        state.asyncOperations[operationId].result = result;
        state.asyncOperations[operationId].completedAt = Date.now();
      }
    },
    failAsyncOperation: (state, action) => {
      const { operationId, error } = action.payload;
      if (state.asyncOperations[operationId]) {
        state.asyncOperations[operationId].status = 'failed';
        state.asyncOperations[operationId].error = error;
        state.asyncOperations[operationId].failedAt = Date.now();
      }
    },
    clearAsyncOperation: (state, action) => {
      const { operationId } = action.payload;
      delete state.asyncOperations[operationId];
    },
  },
});

export const {
  setMessages,
  addMessage,
  setConnectionStatus,
  setAuthenticationStatus,
  setError,
  setSearchText,
  clearSearchText,
  setCurrentScreen,
  setSelectedProvider,
  setFrameSize,
  setDownloadUrl,
  clearDownloadUrl,
  handleLyraAction,
  setSpecificTransitionEffect,
  // Async operations
  startAsyncOperation,
  updateAsyncOperationProgress,
  completeAsyncOperation,
  failAsyncOperation,
  clearAsyncOperation,
} = lyraSlice.actions;

// Selectors
export const selectLyraMessages = state => state.lyra.messages;
export const selectLyraConnectionStatus = state => state.lyra.isConnected;
export const selectLyraAuthenticationStatus = state =>
  state.lyra.isAuthenticated;
export const selectLyraError = state => state.lyra.error;
export const selectLyraSearchText = state => state.lyra.searchText || '';
export const selectLyraCurrentScreen = state => state.lyra.currentScreen;
export const selectLyraSelectedProvider = state => state.lyra.selectedProvider;
export const selectLyraFrameSize = state => state.lyra.frameSize;
export const selectLyraDownloadUrl = state => state.lyra.downloadUrl;
export const selectLyraTransitionPanelOpen = state =>
  state.lyra.isTransitionPanelOpen;
export const selectLyraActiveTransitionPosition = state =>
  state.lyra.activeTransitionPosition;
export const selectLyraActiveTransitionEffect = state =>
  state.lyra.activeTransitionEffect;
export const selectLyraPendingEffectSelection = state =>
  state.lyra.pendingEffectSelection;
export const selectLyraAsyncOperations = state =>
  state.lyra.asyncOperations;
export const selectLyraInitiatedAsyncOperations = state =>
  Object.entries(state.lyra.asyncOperations)
    .filter(([_, operation]) => operation.lyraInitiated)
    .reduce((acc, [id, operation]) => ({ ...acc, [id]: operation }), {});

export default lyraSlice.reducer;
