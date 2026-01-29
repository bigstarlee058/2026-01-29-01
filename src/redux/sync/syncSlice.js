import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'synced', // 'synced', 'pending', 'syncing', 'error'
  lastSyncTime: null,
  hasUnsavedChanges: false,
  pendingChanges: 0,
  errorMessage: null,
  resyncNeeded: false, // Flag to indicate changes occurred during sync
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    // Mark that changes are pending sync
    markChangesPending: (state, action) => {
      state.hasUnsavedChanges = true;
      state.pendingChanges += 1; // Always increment to track all changes
      
      if (state.status === 'synced' || state.status === 'error') {
        state.status = 'pending';
      } else if (state.status === 'syncing') {
        // Changes occurred during sync - mark for resync
        state.resyncNeeded = true;
      }
      // If already pending, just increment counter
    },

    // Start syncing process
    startSync: (state) => {
      state.status = 'syncing';
      state.errorMessage = null;
    },

    // Sync completed successfully
    syncSuccess: (state) => {
      if (state.resyncNeeded) {
        // New changes occurred during sync - immediately go back to pending
        state.status = 'pending';
      } else {
        state.status = 'synced';
        state.hasUnsavedChanges = false;
        state.pendingChanges = 0;
      }
      state.lastSyncTime = Date.now();
      state.errorMessage = null;
      state.resyncNeeded = false;
    },

    // Sync failed
    syncError: (state, action) => {
      state.status = 'error';
      state.errorMessage = action.payload || 'Sync failed';
    },

    // Reset sync state
    resetSyncState: (state) => {
      return {
        ...initialState,
        lastSyncTime: state.lastSyncTime, // Keep last sync time
      };
    },

    // Clear error state
    clearError: (state) => {
      if (state.status === 'error') {
        state.status = state.hasUnsavedChanges ? 'pending' : 'synced';
        state.errorMessage = null;
      }
    },
  },
});

export const {
  markChangesPending,
  startSync,
  syncSuccess,
  syncError,
  resetSyncState,
  clearError,
} = syncSlice.actions;

// Selectors
export const selectSyncStatus = (state) => state.sync.status;
export const selectHasUnsavedChanges = (state) => state.sync.hasUnsavedChanges;
export const selectLastSyncTime = (state) => state.sync.lastSyncTime;
export const selectSyncError = (state) => state.sync.errorMessage;
export const selectPendingChanges = (state) => state.sync.pendingChanges;
export const selectResyncNeeded = (state) => state.sync.resyncNeeded;

export default syncSlice.reducer;