import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { authReducer } from './auth';
import storiesReducer from './stories/storiesSlice';
import sceneReducer from './scene/sceneSlice';
import timelineReducer from './timeline/timelineSlice';
import syncReducer from './sync/syncSlice';
import { setupListeners } from '@reduxjs/toolkit/query';
import { fullSyncMiddleware } from './middleware/syncMiddleware';
import debouncedActionsMiddleware from './middleware/debouncedActionsMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    scene: sceneReducer,
    stories: storiesReducer,
    timeline: timelineReducer,
    sync: syncReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // redux-persist actions can carry functions (e.g., register/rehydrate)
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          'timeline/updateFromStore',
          /^storyApi\/.*\/pending$/,
          /^storyApi\/.*\/fulfilled$/,
          /^storyApi\/.*\/rejected$/,
          /^galleryApi\/.*\/pending$/,
          /^galleryApi\/.*\/fulfilled$/,
          /^galleryApi\/.*\/rejected$/,
        ],
        ignoredActionPaths: [
          'payload.fabricObject',
          'payload.properties.wordObjects',
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
        ],
        ignoredPaths: [
          'timeline.editorElements.fabricObject',
          'timeline.editorElements.properties.wordObjects',
        ],
      },
    }).concat(fullSyncMiddleware, debouncedActionsMiddleware()),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export default store;
