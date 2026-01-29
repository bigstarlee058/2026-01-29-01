import { ContentSkeleton } from 'components/ContentSkeleton/ContentSkeleton';
import { TimeLine } from 'components/PlayerComponent/TimeLine';
import { VideoPanel } from 'components/PlayerComponent/VideoPanel';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { sizes } from 'data/sizes-NEW';
import { useActiveSceneInitialization } from 'hooks/useActiveSceneInitialization';
import { useCanvasInitialization } from 'hooks/useCanvasInitialization';
import useLyraActions from 'hooks/useLyraActions';
import { useStory } from 'hooks/useStory';
import useSubtitleActions from 'hooks/useSubtitleActions';
import Lottie from 'lottie-react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import { useTimelineZoom } from '../../hooks/useTimelineZoom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { Rnd } from 'react-rnd';
import { useParams } from 'react-router-dom';
import initializeCanvasImages from 'utils/initializeCanvasImages';
import { deletePointPrompts, deleteStoryPrompts } from 'utils/prompts';
import { useSceneImageSync } from '../../hooks/useSceneImageSync';
import { StoreContext } from '../../mobx';
import { user as selectUser } from '../../redux/auth/selectors';
import { forceSync } from '../../redux/middleware/syncMiddleware';
import { useLocalStorage } from 'hooks/useLocalStorage';
import ScenesSyncWarning from '../../components/ScenesSyncWarning/ScenesSyncWarning';
import SyncIndicator from '../../components/SyncIndicator/SyncIndicator';
import videfyAnime from '../../data/videfyAnime.json';
import { isLoggedIn } from '../../redux/auth';
import { setCurrentStory } from '../../redux/stories/storiesSlice';
import { selectHasUnsavedChanges } from '../../redux/sync/syncSlice';
import {
  createCleanStateCopy,
  redo as redoTimeline,
  saveTimelineState,
  saveToHistory,
  selectEditorElements,
  undo as undoTimeline,
} from '../../redux/timeline/timelineSlice';
import { uploadVideoToAWS } from '../../utils/awsUpload';
import reinitializeTimeline from '../../utils/reinitializeTimeline';
import { saveVideoData } from '../../utils/saveVideoMetadata';
import styles from './VideoCreationPage.module.scss';
import story from '../../data/story.json';

const headerNavigateBtns = [
  {
    item: 8,
    icon: 'ShareBackIcon',
    name: 'download',
    text: 'Share',
    tooltipText: 'Share or Download video',
  },
];

async function handleVideoUpload(
  file,
  user,
  storyId,
  updateProgress,
  duration,
  store,
  dispatch
) {
  try {
    // First handle the video locally for immediate preview
    await store.handleVideoUpload(file);

    // Then upload to AWS in the background
    const { url, key } = await uploadVideoToAWS(file, progress => {
      if (typeof updateProgress === 'function') {
        updateProgress(progress);
      }
    });

    const userId = user?.id || user?.username || user?.email;

    const videoData = {
      key: key,
      s3Url: url,
      title: file.name,
      length: duration,
    };
    const saved = await saveVideoData(videoData, storyId, user);

    store.handleVideoUploadFromUrl({
      url: url,
      title: file.name,
      key: key,
      duration: duration,
      row: 2,
    });

    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

function VideoCreationPage() {
  const {
    username,
    getImagesBySceneId,
    onCheckedImageToggle,
    onGetImageByPromptByBot,
    storyId,
  } = useStory();

  const { storyId: urlStoryId } = useParams();
  const user = useSelector(selectUser);

  const storyData = story;

  const isLoading = false;
  const refetch = () => {};

  const scenes = useSelector(state => state.scene.scenes);

  // Animation panels state
  const [activeSidebarPanel, setActiveSidebarPanel] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [screen, setScreen] = useLocalStorage('screen', 'playback');
  const [activeScreens, setActiveScreens] = useLocalStorage('activeScreens', [
    'storyboard',
    'playback',
  ]);
  const [isStoryBoardOpen, setIsStoryBoardOpen] = useLocalStorage(
    'isStoryBoardOpen',
    true
  );
  const [isChatOpen, setIsChatOpen] = useLocalStorage('isChatOpen', false);
  const [isSubtitlesMenuOpen, setIsSubtitlesMenuOpen] = useState(false);
  const [isSubtitlesStylesPanelOpen, setIsSubtitlesStylesPanelOpen] =
    useState(false);

  // Settings popup state
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);

  // Size dropdown state
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [isSizeDropdownVisible, setIsSizeDropdownVisible] = useState(false);
  const sizeDropdownRef = useRef(null);

  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useLocalStorage(
    'leftPanelWidth',
    400
  );

  // Centralized panel states
  const [activePanels, setActivePanels] = useLocalStorage('activePanels', {
    imageEditing: false,
    typography: false,
    subtitles: false,
    subtitlesStyles: false,
    subtitlesMenu: false,
    transitions: false,
    frameEditing: false,
    animation: false,
  });

  // Helper function to close all sidebar panels (storyboard, subtitles, animations, transitions)
  const closeAllSidebarPanels = () => {
    setIsStoryBoardOpen(false);
    setActivePanels(prev => ({
      ...prev,
      subtitles: false,
      animation: false,
      transitions: false,
    }));
    setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));
  };

  // Helper function to open storyboard by default when no other sidebar panels are open
  const openDefaultStoryboard = () => {
    setIsStoryBoardOpen(true);
    setActiveScreens(prev => {
      if (prev.includes('storyboard')) return prev;
      return [...prev, 'storyboard'];
    });
    try {
      window.localStorage.setItem('isStoryBoardOpen', JSON.stringify(true));
      window.localStorage.setItem(
        'activeScreens',
        JSON.stringify([
          ...activeScreens.filter(item => item !== 'storyboard'),
          'storyboard',
        ])
      );
    } catch (error) {}
  };

  // Derived states from activePanels
  const isImageEditingOpen = activePanels.imageEditing;
  const isTypographyPanelOpen = activePanels.typography;
  const isSubtitlesPanelOpen = activePanels.subtitles;
  const isTransitionsPanelOpen = activePanels.transitions;
  const isFrameEditingOpen = activePanels.frameEditing;
  const [currentEditingAnimation, setCurrentEditingAnimation] = useState(null);
  const [frameEditingActiveTab, setFrameEditingActiveTab] = useState('start');
  const isAnimationPanelOpen = activePanels.animation;

  // ColorPicker state
  const [colorPickerState, setColorPickerState] = useState({
    isOpen: false,
    color: '#000000',
    onChange: null,
    onClose: null,
    position: { left: '50%', top: '50%' },
    isFrameEditingPanel: false,
  });

  const videoPanelRef = useRef(null);
  const transitionPanelRef = useRef(null);
  const frameEditingPanelRef = useRef(null);
  const fileInputRef = useRef(null);
  const store = React.useContext(StoreContext);
  const [promptsStatuses, setPromptsStatuses] = useState([]);
  const [isImagesLoading, setIsImagesLoading] = useState(false);

  // New zoom integration (manager+hook)
  const initialScale = parseFloat(
    localStorage.getItem('timeline-scale') || '2'
  );
  const {
    zoomValue: currentScale,
    zoomIn,
    zoomOut,
    setZoom: setCurrentScale,
  } = useTimelineZoom({
    initialZoom: initialScale,
    onZoomChange: data => {
      document.documentElement.style.setProperty(
        '--scale-factor',
        data.newValue
      );
      localStorage.setItem('timeline-scale', String(data.newValue));

      const timelineContent = document.querySelector(
        '[class*="Player_timelineContent"]'
      );
      if (timelineContent && store) {
        const maxTime = Math.max(1, store.maxTime || 1);
        const thumbRatio = Math.max(
          0,
          Math.min(1, store.currentTimeInMs / maxTime)
        );

        requestAnimationFrame(() => {
          const totalWidthAfter = timelineContent.scrollWidth;
          const visibleWidthAfter = timelineContent.clientWidth;
          const thumbPosAfter = thumbRatio * totalWidthAfter;

          let newScrollLeft = thumbPosAfter - visibleWidthAfter / 2;
          const maxScroll = Math.max(0, totalWidthAfter - visibleWidthAfter);
          newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));

          // timelineContent.scrollLeft = newScrollLeft;
        });
      }
    },
  });
  const [isMuted, setIsMuted] = useLocalStorage('audio-muted', false);
  const [previousVolume, setPreviousVolume] = useLocalStorage(
    'audio-previous-volume',
    100
  );
  const [currentVolume, setCurrentVolume] = useLocalStorage(
    'audio-volume',
    100
  );

  const [subtitlesPanelLock, setSubtitlesPanelLock] = useState(false);

  const [defaultButton, setDefaultButton] = useState(0); // default: 0 (Left mouse button), 1 (Right mouse button)
  // Sync volume with store
  useEffect(() => {
    store.setVolume(currentVolume / 200); // Convert percentage to 0-1 range with 200% scaling
  }, [currentVolume, store]);

  // ColorPicker event handlers
  useEffect(() => {
    const handleShowColorPicker = event => {
      const { color, onChange, onClose, position, isFrameEditingPanel } =
        event.detail;
      setColorPickerState({
        isOpen: true,
        color,
        onChange,
        onClose,
        position: position || { left: '50%', top: '50%' },
        isFrameEditingPanel: isFrameEditingPanel || false,
      });
    };

    const handleCloseColorPicker = () => {
      setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    window.addEventListener('showColorPicker', handleShowColorPicker);
    window.addEventListener('closeColorPicker', handleCloseColorPicker);

    return () => {
      window.removeEventListener('showColorPicker', handleShowColorPicker);
      window.removeEventListener('closeColorPicker', handleCloseColorPicker);
    };
  }, []);

  // Close FrameEditingPanel on page reload and load
  useEffect(() => {
    // Close panel on page load
    setActivePanels(prev => ({
      ...prev,
      frameEditing: false,
    }));

    const handleBeforeUnload = () => {
      setActivePanels(prev => ({
        ...prev,
        frameEditing: false,
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [setActivePanels]);

  const [apiTokens, setApiTokens] = useState(0);
  const [isCutMode, setIsCutMode] = useState(false);
  const [currentSize, setCurrentSize] = useState(sizes.sizes[0]);
  const [size, setSize] = useState(
    `${storyData.width || '768'}, ${storyData.height || '1360'}`
  );

  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);

  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);

  const dispatch = useDispatch();

  const mainContentRef = useRef(null);
  const containerRef = useRef(null);
  const lyraChatRef = useRef(null);

  const [isVideoPanelClicked, setIsVideoPanelClicked] = useState(false);

  const [isTransitionPanelOpen, setIsTransitionPanelOpen] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videos, setVideos] = useState([]);

  const [animationActiveTab, setAnimationActiveTab] = useLocalStorage(
    'animation-active-tab',
    'GALLERY'
  );

  const [subtitleGenerationProgress, setSubtitleGenerationProgress] =
    useState(0);
  const [subtitleGenerationType, setSubtitleGenerationType] =
    useState('generation');
  const [isSubtitleGenerating, setIsSubtitleGenerating] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isHideNames, setIsHideNames] = useLocalStorage('hide-names', false);
  const [isScenesOutOfSync, setIsScenesOutOfSync] = useState(false);

  // Audio regeneration states
  const [isAudioRegenerationWarningOpen, setIsAudioRegenerationWarningOpen] =
    useState(false);
  const [isAudioRegenerationModalOpen, setIsAudioRegenerationModalOpen] =
    useState(false);
  const [audioRegenerationProgress, setAudioRegenerationProgress] = useState({
    progress: 0,
    stage: '',
    message: '',
    isComplete: false,
    isError: false,
    errorMessage: '',
  });

  // Timeline reinitialization states
  const [isTimelineReinitModalOpen, setIsTimelineReinitModalOpen] =
    useState(false);
  const [isTimelineReinitProcessing, setIsTimelineReinitProcessing] =
    useState(false);
  const [pendingStoryDataForReinit, setPendingStoryDataForReinit] =
    useState(null);

  // Render option modal state
  const [isRenderOptionModalOpen, setIsRenderOptionModalOpen] = useState(false);

  // Project name modal state (for blank projects)
  const [isProjectNameModalOpen, setIsProjectNameModalOpen] = useState(false);

  const moreMenuTimeoutRef = useRef(null);

  const images =
    storyData.images &&
    storyData.images.filter(
      (image, index, self) =>
        self.findIndex(img => img.id === image.id) === index
    );

  // Function to compare scenes with originScenes for synchronization
  const compareScenesWithOrigin = useCallback((currentScenes, originScenes) => {
    if (!currentScenes || !originScenes) {
      return false; // No comparison possible, assume in sync
    }

    if (currentScenes.length !== originScenes.length) {
      return true; // Out of sync if different lengths
    }

    // Compare each scene's text and order
    for (let i = 0; i < currentScenes.length; i++) {
      const currentScene = currentScenes[i];
      const originScene = originScenes[i];

      // Check if text content differs or order is different
      if (currentScene.text !== originScene.text) {
        return true; // Out of sync
      }

      if (currentScene.order !== originScene.order) {
        return true; // Out of sync
      }
    }

    return false; // In sync
  }, []);

  useEffect(() => {
    if (storyData?._id) {
      dispatch(setCurrentStory(storyData));
    }
  }, [storyData, dispatch, store]);

  // Handle blank project initialization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isBlankProject = urlParams.get('blank') === 'true';

    if (isBlankProject && storyData?._id) {
      // Show project name modal for blank projects
      setIsProjectNameModalOpen(true);

      // Set Playback as the main screen
      setScreen('playback');
      setActiveScreens(prev => {
        const filtered = prev.filter(
          item => !['storyboard', 'myItems'].includes(item)
        );
        return [...filtered, 'playback', 'myItems'];
      });

      // Close storyboard and open My Items panel in left sidebar
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        animation: true, // This opens the animation panel which contains My Items
      }));
      setAnimationActiveTab('MY ITEMS');

      // Set default maxTime for blank projects if not already set
      if (storyData.maxTime) {
        store.setMaxTime(storyData.maxTime || 6000);
      } else {
        const defaultMaxTime = 60000; // 60 seconds default
        store.setMaxTime(defaultMaxTime);
      }

      // Clear the blank flag from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [
    storyData?._id,
    setScreen,
    setActiveScreens,
    setIsStoryBoardOpen,
    setActivePanels,
    setAnimationActiveTab,
  ]);

  // Initialize currentSize from storyData
  useEffect(() => {
    if (storyData.orientation) {
      const currentSizeFromStory = sizes.sizes.find(
        size => size.name === storyData.orientation
      );
      if (currentSizeFromStory) {
        setCurrentSize(currentSizeFromStory);
      }
    } else if (storyData.width && storyData.height) {
      // Fallback: match by dimensions
      const sizeFromDimensions = sizes.sizes.find(
        s =>
          s.size.width === storyData.width && s.size.height === storyData.height
      );
      if (sizeFromDimensions) {
        setCurrentSize(sizeFromDimensions);
      }
    }
  }, [storyData.orientation, storyData.width, storyData.height]);

  useEffect(() => {
    if (storyData?._id) {
      // Initialize aspect ratio from storyData.orientation
      if (storyData.orientation && store.updateAspectRatio) {
        store.updateAspectRatio(storyData.orientation);
      } else if (!store.currentAspectRatio && store.updateAspectRatio) {
        // Set default aspect ratio if none exists
        store.updateAspectRatio({ width: 9, height: 16 });
      }
    }
  }, [storyData?._id, storyData?.orientation, dispatch]);

  useCanvasInitialization(videoPanelRef, store);

  // useGetBotGeneration({
  //   storyId: storyData?._id,
  //   owner: storyData?.author,
  //   setPromptsStatuses,
  //   setIsImagesLoading,
  //   addImage,
  //   changePromptsStatus,
  //   store,
  //   setIsImageEditingStarted,
  //   setIsImageGenerationStarted,
  //   setGenerationProgress,
  //   refetch,
  // });

  const [isInitialized, setIsInitialized] = useState(false);
  const isUpdatingFromRedux = useRef(false);
  const isTimelineHistoryEmpty = useSelector(
    s => (s.timeline?.history?.length || 0) === 0
  );
  const isStoryLoaded = !!storyData?._id;

  // Create global function for store to call saveTimelineState with debouncing
  useEffect(() => {
    let saveTimeout = null;

    // Check if function already exists and clean it up first
    if (window.dispatchSaveTimelineState) {
      delete window.dispatchSaveTimelineState;
    }

    window.dispatchSaveTimelineState = store => {
      // Skip if already saving to prevent recursion
      if (store._isSaving) {
        return;
      }

      if (!isUpdatingFromRedux.current && !store.isInitializationInProgress) {
        const isEmpty =
          !store.editorElements || store.editorElements.length === 0;
        // Allow empty save only once when timeline history is empty
        if (isEmpty && !isTimelineHistoryEmpty) {
          return;
        }

        // Clear existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        // Debounce save operations to prevent too frequent saves
        saveTimeout = setTimeout(() => {
          dispatch(saveTimelineState(store));
          // saveTimelineData removed - sync now happens via syncMiddleware
          saveTimeout = null;
        }, 100); // 100ms debounce
      }
    };

    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      // Always clean up the global function on unmount
      if (window.dispatchSaveTimelineState) {
        delete window.dispatchSaveTimelineState;
      }
    };
  }, [dispatch, isTimelineHistoryEmpty]);

  // Seed empty init snapshot once after story load if history is empty
  useEffect(() => {
    if (
      !store?.isInitializationInProgress &&
      isStoryLoaded &&
      isTimelineHistoryEmpty &&
      Array.isArray(store?.editorElements) &&
      store.editorElements.length > 0
    ) {
      dispatch(saveToHistory());
    }
  }, [
    dispatch,
    store?.isInitializationInProgress,
    isStoryLoaded,
    isTimelineHistoryEmpty,
  ]);

  useEffect(() => {
    // Don't save during canvas operations (move/drag) - let endMove/endDrag handle it
    if (store?.moveState?.isMoving || store?.dragState?.isDragging) {
      return;
    }

    if (
      store &&
      !isUpdatingFromRedux.current &&
      !store.isInitializationInProgress
    ) {
      const isEmpty =
        !store.editorElements || store.editorElements.length === 0;
      // Allow dispatch for empty only once when history is empty
      if (!isEmpty || isTimelineHistoryEmpty) {
        dispatch(saveTimelineState(store));
      }
    }
  }, [
    store.editorElements,
    store.animations,
    dispatch,
    isTimelineHistoryEmpty,
  ]);

  // Use scene image synchronization hook (disabled for blank projects, runs only once after store initialization)
  const { syncImages: manualSyncImages } = useSceneImageSync(
    storyData,
    store,
    scenes,
    isInitialized,
    {
      debounceMs: 100,
      enabled: !storyData?.isBlank, // Disable for blank projects
      createPlaceholders: !storyData?.isBlank, // Disable placeholder creation for blank projects
      runOnce: true, // Run sync only once
      onSyncStart: reason => {},
      onSyncComplete: reason => {},
    }
  );

  // Add ref to track initialization in progress to prevent multiple calls
  const isInitializing = useRef(false);
  const lastInitializedStoryId = useRef(null);
  const initWatchdogRef = useRef(null);
  const initializeStoryIdRef = useRef(null);

  // Robust, single-run initializer
  const tryInitializeCanvas = React.useCallback(() => {
    // Already initializing or initialized
    if (isInitializing.current || isInitialized) return;
    // Still loading or missing prerequisites
    if (isLoading) return;
    if (!storyData || !store || !store.canvas) return;

    // Require content to initialize (match previous logic)
    const hasSubtitles =
      Array.isArray(storyData?.subtitles) && storyData.subtitles.length > 0;
    const hasEditorElements =
      !!storyData?.editorParams &&
      Array.isArray(storyData.editorParams.editorElements) &&
      storyData.editorParams.editorElements.length > 0;

    if (!hasSubtitles && !hasEditorElements) return;

    // Guard against double starts and bind to current story id
    isInitializing.current = true;
    const currentStoryId = storyData._id;
    initializeStoryIdRef.current = currentStoryId;

    initializeCanvasImages(storyData, store, dispatch)
      .then(() => {
        if (initializeStoryIdRef.current === currentStoryId) {
          setIsInitialized(true);
        }
      })
      .catch(error => {
        console.error('❌ initializeCanvasImages failed:', error);
      })
      .finally(() => {
        if (initializeStoryIdRef.current === currentStoryId) {
          isInitializing.current = false;
        }
      });
  }, [storyData, store, dispatch, isLoading, isInitialized]);

  useEffect(() => {
    // Prevent multiple simultaneous initialization calls
    if (isInitializing.current) {
      return;
    }

    // Reset initialization flag when story changes
    if (storyData?._id && lastInitializedStoryId.current !== storyData._id) {
      setIsInitialized(false);
      lastInitializedStoryId.current = storyData._id;
    }

    // If editor already has elements or already initialized, skip
    if (store.editorElements.length > 0 || isInitialized) {
      return;
    }

    // Attempt initialization when dependencies look ready
    tryInitializeCanvas();
  }, [
    storyData,
    isLoading,
    store,
    store.canvas,
    isInitialized,
    tryInitializeCanvas,
  ]);

  // Watchdog: retry until prerequisites are ready; guarantees at most one successful run
  useEffect(() => {
    if (!storyData?._id || isInitialized) return;

    // Clear any previous watchdog
    if (initWatchdogRef.current) {
      clearInterval(initWatchdogRef.current);
      initWatchdogRef.current = null;
    }

    let attempts = 0;
    const maxAttempts = 160; // ~40s at 250ms
    initWatchdogRef.current = setInterval(() => {
      attempts += 1;
      tryInitializeCanvas();
      if (isInitialized || attempts >= maxAttempts) {
        clearInterval(initWatchdogRef.current);
        initWatchdogRef.current = null;
      }
    }, 250);

    return () => {
      if (initWatchdogRef.current) {
        clearInterval(initWatchdogRef.current);
        initWatchdogRef.current = null;
      }
    };
  }, [storyData?._id, tryInitializeCanvas, isInitialized]);

  // Fallback triggers: when tab becomes visible or window regains focus
  useEffect(() => {
    const onVisible = () => {
      tryInitializeCanvas();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [tryInitializeCanvas]);

  useEffect(() => {
    return () => {
      store.cleanup();
      setActiveSidebarPanel(null);
      if (moreMenuTimeoutRef.current) {
        clearTimeout(moreMenuTimeoutRef.current);
      }
      if (canvasResizeTimeoutRef.current) {
        clearTimeout(canvasResizeTimeoutRef.current);
      }
    };
  }, [dispatch, store]);

  useEffect(() => {
    if (store && storyData?._id) {
      store.setStoryId(storyData._id);
    }
  }, [store, storyData]);

  // Add effect to restore all panel states and ensure correct element selection
  useEffect(() => {
    if (
      activePanels.imageEditing ||
      activePanels.typography ||
      activePanels.subtitles ||
      activePanels.animation
    ) {
      setScreen('playback');
    }
    if (activePanels.subtitlesStyles) {
      setIsSubtitlesStylesPanelOpen(true);
    }
    if (activePanels.subtitlesMenu) {
      setIsSubtitlesMenuOpen(true);
    }
  }, [store.canvas]);

  const editorElements = useSelector(selectEditorElements);

  // Add new useEffect for Redux-MobX sync
  useEffect(() => {
    if (!store || !editorElements) return;

    // Skip sync if this is initialization
    if (store.isInitializationInProgress) return;

    // Skip sync if elements are the same - use safe comparison
    try {
      const currentCleanState = createCleanStateCopy(
        store.editorElements,
        store.animations,
        {}
      );
      const newCleanState = createCleanStateCopy(
        editorElements,
        store.animations,
        {}
      );

      if (
        JSON.stringify(currentCleanState.editorElements) ===
        JSON.stringify(newCleanState.editorElements)
      ) {
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to compare elements safely, proceeding with sync:',
        error
      );
      // If comparison fails, proceed with sync to be safe
    }

    runInAction(() => {
      isUpdatingFromRedux.current = true;
      store.isUndoRedoOperation = true;
      store.updateFromRedux({
        editorElements: editorElements,
        animations: store.animations,
        maxTime: store.maxTime,
        backgroundColor: store.backgroundColor,
        fps: store.fps,
        synchronise: store.synchronise,
      });
      store.isUndoRedoOperation = false;
      // Reset flag after a small delay to ensure all MobX reactions complete
      setTimeout(() => {
        isUpdatingFromRedux.current = false;
      }, 0);
    });
  }, [editorElements, store]);

  // Add state for undo/redo operations to prevent multiple calls
  const [isUndoRedoInProgress, setIsUndoRedoInProgress] = useState(false);

  // Add event listener for timelineStateChanged to handle undo/redo synchronization
  useEffect(() => {
    const handleTimelineStateChanged = event => {
      if (!event.detail || !store) {
        return;
      }

      const {
        editorElements,
        animations,
        maxTime,
        backgroundColor,
        fps,
        synchronise,
      } = event.detail;

      // Prevent recursive updates and ensure we don't interfere with ongoing operations
      if (store.isUndoRedoOperation || isUpdatingFromRedux.current) {
        return;
      }

      // Set flag to prevent interference with other update mechanisms
      isUpdatingFromRedux.current = true;

      try {
        runInAction(() => {
          store.isUndoRedoOperation = true;
          store.updateFromRedux({
            editorElements: editorElements || [],
            animations: animations || [],
            maxTime: maxTime !== undefined ? maxTime : store.maxTime,
            backgroundColor:
              backgroundColor !== undefined
                ? backgroundColor
                : store.backgroundColor,
            fps: fps !== undefined ? fps : store.fps,
            synchronise:
              synchronise !== undefined ? synchronise : store.synchronise,
          });
          store.isUndoRedoOperation = false;
        });
      } catch (error) {
        console.error(
          'Error updating MobX store from timelineStateChanged:',
          error
        );
      } finally {
        // Reset flag after a delay to ensure all reactions complete
        setTimeout(() => {
          isUpdatingFromRedux.current = false;
        }, 100);
      }
    };

    window.addEventListener('timelineStateChanged', handleTimelineStateChanged);

    return () => {
      window.removeEventListener(
        'timelineStateChanged',
        handleTimelineStateChanged
      );
    };
  }, [store]);

  // Add event listener for scene undo/redo (Storyboard)
  useEffect(() => {
    const handleSceneUndoRedo = () => {};
    window.addEventListener('sceneUndoRedo', handleSceneUndoRedo);
    return () =>
      window.removeEventListener('sceneUndoRedo', handleSceneUndoRedo);
  }, []);

  const onUndo = useCallback(() => {
    if (isUndoRedoInProgress || !store) {
      return;
    }

    setIsUndoRedoInProgress(true);

    try {
      // Only dispatch timeline undo - this will trigger the timelineStateChanged event
      dispatch(undoTimeline());

      // Schedule animation refresh after a short delay to ensure state is updated
      setTimeout(() => {
        if (store.scheduleAnimationRefresh) {
          store.scheduleAnimationRefresh();
        }
        setIsUndoRedoInProgress(false);
      }, 50);
    } catch (error) {
      console.error('Error during undo operation:', error);
      setIsUndoRedoInProgress(false);
    }
  }, [dispatch, store, isUndoRedoInProgress]);

  const onRedo = useCallback(() => {
    if (isUndoRedoInProgress || !store) {
      return;
    }

    setIsUndoRedoInProgress(true);

    try {
      // Only dispatch timeline redo - this will trigger the timelineStateChanged event
      dispatch(redoTimeline());

      // Schedule animation refresh after a short delay to ensure state is updated
      setTimeout(() => {
        if (store.scheduleAnimationRefresh) {
          store.scheduleAnimationRefresh();
        }
        setIsUndoRedoInProgress(false);
      }, 50);
    } catch (error) {
      console.error('Error during redo operation:', error);
      setIsUndoRedoInProgress(false);
    }
  }, [dispatch, store, isUndoRedoInProgress]);

  useEffect(() => {
    const handleKeyDown = e => {
      if (!storyId) return;

      // Handle Escape key for cut mode
      if (e.code === 'Escape' && isCutMode) {
        e.preventDefault();
        setIsCutMode(false);
        return;
      }

      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        // Prefer scene undo/redo when storyboard is open
        if (isStoryBoardOpen) {
          if (e.shiftKey) {
          } else {
          }
          return;
        }
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();

        onRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [storyId, isCutMode, setIsCutMode, dispatch, isStoryBoardOpen]);

  const handleClick = name => {
    // Skip closing panels for download button
    if (name === 'download') {
      handleDownloadClick();
      return;
    }

    if (name === 'size') {
      if (isSizeDropdownOpen) {
        setIsSizeDropdownVisible(false);
        setTimeout(() => {
          setIsSizeDropdownOpen(false);
        }, 200);
      } else {
        setIsSizeDropdownOpen(true);
        setTimeout(() => {
          setIsSizeDropdownVisible(true);
        }, 10);
      }
      return;
    }

    // Special handling for AnimationPanel when it's open
    if (isAnimationPanelOpen && (name === 'search' || name === 'myItems')) {
      // If AnimationPanel is open and user clicks on the same button that's currently active
      // Close AnimationPanel and deactivate the button
      if (
        (name === 'myItems' && animationActiveTab === 'MY ITEMS') ||
        (name === 'search' && animationActiveTab === 'GALLERY')
      ) {
        setActivePanels(prev => ({ ...prev, animation: false }));
        setActiveScreens(prev => prev.filter(item => item !== name));

        // Open storyboard by default when closing animation panel from navigation
        openDefaultStoryboard();
      } else {
        // If AnimationPanel is open and user clicks on the other button, switch tabs
        if (name === 'myItems') {
          setAnimationActiveTab('MY ITEMS');
          setActiveScreens(prev => {
            const filtered = prev.filter(item => item !== 'search');
            return filtered.includes('myItems')
              ? filtered
              : [...filtered, 'myItems'];
          });
        } else if (name === 'search') {
          setAnimationActiveTab('GALLERY');
          setActiveScreens(prev => {
            const filtered = prev.filter(item => item !== 'myItems');
            return filtered.includes('search')
              ? filtered
              : [...filtered, 'search'];
          });
        }
      }

      return;
    }

    // Close animation panel when switching screens
    if (activeSidebarPanel) {
      setActiveSidebarPanel(null);

      window.dispatchEvent(new CustomEvent('closeSidebarPanel'));
    }

    // Close panels when switching screens (except for sidebar panels which are handled individually)
    const wasAnyPanelOpen =
      isImageEditingOpen || isTypographyPanelOpen || isFrameEditingOpen;

    setActivePanels(prev => ({
      ...prev,
      imageEditing: false,
      typography: false,
      frameEditing: false,
    }));

    // If any panel was closed and we're not opening a sidebar panel, open storyboard by default
    if (
      wasAnyPanelOpen &&
      !['storyboard', 'generateAI', 'search', 'myItems', 'lyra'].includes(name)
    ) {
      openDefaultStoryboard();
    }

    // Deactivate My Items when any other panel is clicked (but not for standalone screens)
    if (
      name !== 'myItems' &&
      name !== 'search' &&
      name !== 'storyboard' &&
      name !== 'generateAI'
    ) {
      setActiveScreens(prev => prev.filter(item => item !== 'myItems'));
    }

    if (name === 'storyboard') {
      const newState = !isStoryBoardOpen;

      if (newState) {
        // Close all other sidebar panels before opening storyboard
        setActivePanels(prev => ({
          ...prev,
          subtitles: false,
          animation: false,
          transitions: false,
        }));

        setIsStoryBoardOpen(true);
        setActiveScreens(prev => {
          const filtered = prev.filter(item => item !== 'storyboard');
          return [...filtered, 'storyboard'];
        });
      } else {
        setIsStoryBoardOpen(false);
        setActiveScreens(prev => prev.filter(item => item !== 'storyboard'));
      }

      try {
        window.localStorage.setItem(
          'isStoryBoardOpen',
          JSON.stringify(newState)
        );
        window.localStorage.setItem(
          'activeScreens',
          JSON.stringify(
            newState
              ? [
                  ...activeScreens.filter(item => item !== 'storyboard'),
                  'storyboard',
                ]
              : activeScreens.filter(item => item !== 'storyboard')
          )
        );
      } catch (error) {}
    } else if (name === 'chat') {
      // Special handling for chat
      setIsChatOpen(prevState => {
        const newState = !prevState;
        setActiveScreens(prev => {
          // Filter out 'chat' if closing, add it if opening
          const filtered = prev.filter(item => item !== 'chat');
          return newState ? [...filtered, 'chat'] : filtered;
        });
        return newState;
      });
    } else if (name === 'playbackOpen') {
      setActiveScreens(prev => {
        const updated = ['playback'];

        if (isStoryBoardOpen && !updated.includes('storyboard')) {
          updated.push('storyboard');
        }
        if (isChatOpen && !updated.includes('chat')) {
          updated.push('chat');
        }

        return updated;
      });
      setScreen('playback');
    } else if (name === 'settings') {
      // Open settings popup instead of switching to settings screen
      setIsSettingsPopupOpen(true);
    } else {
      const isAlreadyActive = activeScreens.includes(name);

      if (isAlreadyActive) {
        setActiveScreens(prev => prev.filter(item => item !== name));
        setScreen('');
      } else {
        setScreen(name);
        setActiveScreens(prev => {
          const filtered = prev.filter(item => item !== screen);

          const updated = [...filtered, name];

          if (isStoryBoardOpen && !updated.includes('storyboard')) {
            updated.push('storyboard');
          }
          if (isChatOpen && !updated.includes('chat')) {
            updated.push('chat');
          }

          return updated;
        });
      }
    }
  };

  const deleteAllGenerations = async () => {
    try {
      await deleteStoryPrompts(storyData._id);

      setPromptsStatuses([]);
      setIsImagesLoading(false);
    } catch (error) {}
  };
  const deleteGeneration = async sceneId => {
    try {
      await deletePointPrompts(sceneId);

      setPromptsStatuses(
        promptsStatuses.filter(prompt => prompt.pointId !== sceneId)
      );
      setIsImagesLoading(false);
    } catch (error) {}
  };

  const [gallerySearchText, setGallerySearchText] = useState('');
  const handleTabClick = tab => {
    setAnimationActiveTab(tab);
  };

  const handleImageClick = () => {
    setScreen('generateAI');
    setActiveScreens(prev => {
      const filtered = prev.filter(item => item !== screen);
      const updated = [...filtered, 'generateAI'];

      if (isStoryBoardOpen && !updated.includes('storyboard')) {
        updated.push('storyboard');
      }
      if (isChatOpen && !updated.includes('chat')) {
        updated.push('chat');
      }

      return updated;
    });
  };

  // State for current displayed volume value
  const [displayedVolume, setDisplayedVolume] = useState(currentVolume);

  // State to track selectedElements changes more explicitly
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [selectedAudioElements, setSelectedAudioElements] = useState([]);
  const [isSelectedElementsAudio, setIsSelectedElementsAudio] = useState(false);

  // Update displayed volume when selectedElements or currentVolume changes
  useEffect(() => {
    const selectedElements = store.selectedElements;

    if (selectedElements && Object.keys(selectedElements).length > 0) {
      // Get all audio elements from selectedElements
      const audioElements = Object.values(selectedElements).filter(
        element => element?.type === 'audio'
      );

      setSelectedElementIds(Object.keys(selectedElements));
      setSelectedAudioElements(audioElements);
      setIsSelectedElementsAudio(audioElements.length > 0);

      if (audioElements.length > 0) {
        // Calculate average volume for multiple audio elements
        const totalVolume = audioElements.reduce((sum, element) => {
          const elementVolume = element.properties?.volume ?? 1; // 0-2 scale (for 0-200% display)
          return sum + elementVolume;
        }, 0);
        const averageVolume = totalVolume / audioElements.length;
        const newDisplayVolume = averageVolume * 100; // Convert to 0-200 scale for UI
        setDisplayedVolume(newDisplayVolume);
      } else {
        // No audio elements selected, show global volume
        setDisplayedVolume(currentVolume);
      }
    } else {
      // No elements selected, show global volume
      setSelectedElementIds([]);
      setSelectedAudioElements([]);
      setIsSelectedElementsAudio(false);
      setDisplayedVolume(currentVolume);
    }
  }, [store.selectedElements, currentVolume, isMuted]);

  // Add event listener for element selection changes to force updates
  useEffect(() => {
    const handleElementSelection = () => {
      const selectedElements = store.selectedElements;

      if (selectedElements && Object.keys(selectedElements).length > 0) {
        const audioElements = Object.values(selectedElements).filter(
          element => element?.type === 'audio'
        );

        if (audioElements.length > 0) {
          // Calculate average volume for multiple audio elements
          const totalVolume = audioElements.reduce((sum, element) => {
            const elementVolume = element.properties?.volume ?? 1; // 0-2 scale
            return sum + elementVolume;
          }, 0);
          const averageVolume = totalVolume / audioElements.length;
          const newDisplayVolume = averageVolume * 100; // Convert to 0-200 scale
          setDisplayedVolume(newDisplayVolume);
        } else {
          setDisplayedVolume(currentVolume);
        }
      } else {
        setDisplayedVolume(currentVolume);
      }
    };

    const handleGlobalVolumeChanged = event => {
      const newVolume = event.detail.volume;
      // Force update displayedVolume for selected audio elements
      const selectedElements = store.selectedElements;

      if (selectedElements && Object.keys(selectedElements).length > 0) {
        const audioElements = Object.values(selectedElements).filter(
          element => element?.type === 'audio'
        );

        if (audioElements.length > 0) {
          // After global volume change, all audio elements should have the same volume
          // newVolume is 0-0.5, convert to 0-200 display range for audio elements
          const newDisplayVolume = newVolume * 400; // Convert to 0-200 scale
          setDisplayedVolume(newDisplayVolume);
        }
      }
    };

    // Listen for element selection/deselection events
    window.addEventListener('elementSelected', handleElementSelection);
    window.addEventListener('elementDeselected', handleElementSelection);
    window.addEventListener('globalVolumeChanged', handleGlobalVolumeChanged);

    return () => {
      window.removeEventListener('elementSelected', handleElementSelection);
      window.removeEventListener('elementDeselected', handleElementSelection);
      window.removeEventListener(
        'globalVolumeChanged',
        handleGlobalVolumeChanged
      );
    };
  }, [currentVolume, store]);

  // Add MobX reaction for selectedElements changes
  useEffect(() => {
    if (!store) return;

    const { reaction } = require('mobx');

    const dispose = reaction(
      () => ({
        selectedElements: store.selectedElements,
        selectedElementsKeys: store.selectedElements
          ? Object.keys(store.selectedElements)
          : [],
        selectedElementsValues: store.selectedElements
          ? Object.values(store.selectedElements)
          : [],
        // Also track volume changes in audio elements
        audioElementsVolumes: store.selectedElements
          ? Object.values(store.selectedElements)
              .filter(element => element?.type === 'audio')
              .map(element => element.properties?.volume ?? 1)
          : [],
      }),
      ({ selectedElements, selectedElementsValues }) => {
        if (selectedElements && Object.keys(selectedElements).length > 0) {
          const audioElements = selectedElementsValues.filter(
            element => element?.type === 'audio'
          );

          if (audioElements.length > 0) {
            // Calculate average volume for multiple audio elements
            const totalVolume = audioElements.reduce((sum, element) => {
              const elementVolume = element.properties?.volume ?? 1; // 0-2 scale
              return sum + elementVolume;
            }, 0);
            const averageVolume = totalVolume / audioElements.length;
            const newDisplayVolume = averageVolume * 100; // Convert to 0-200 scale
            setDisplayedVolume(newDisplayVolume);
          } else {
            setDisplayedVolume(currentVolume);
          }
        } else {
          setDisplayedVolume(currentVolume);
        }
      },
      { fireImmediately: true }
    );

    return dispose;
  }, [store, currentVolume]);

  // Helper function to get current volume (individual audio or global)
  const getCurrentVolumeValue = useCallback(() => {
    return displayedVolume;
  }, [displayedVolume]);

  // Helper function to check if selected elements contain audio
  useEffect(() => {
    const selectedElements = store?.selectedElements;
    if (selectedElements && Object.keys(selectedElements).length > 0) {
      const audioElements = Object.values(selectedElements).filter(
        element => element?.type === 'audio'
      );
      setIsSelectedElementsAudio(audioElements.length > 0);
    } else {
      setIsSelectedElementsAudio(false);
    }
  }, [store?.selectedElements]);

  // Add debugging function for manual store inspection
  useEffect(() => {
    const debugVolumeStore = () => {
      // Also check if element exists in editorElements
      if (store?.editorElements) {
        const audioElements = store.editorElements.filter(
          el => el.type === 'audio'
        );
      }
    };

    // Expose debug function globally
    window.debugVolumeStore = debugVolumeStore;

    return () => {
      delete window.debugVolumeStore;
    };
  }, [store, displayedVolume, currentVolume]);

  const handleVolumeChange = useCallback(
    e => {
      const value = parseFloat(e.target.value);
      const selectedElements = store.selectedElements;

      // Check if we're adjusting individual audio elements volume
      if (selectedElements && Object.keys(selectedElements).length > 0) {
        const audioElements = Object.values(selectedElements).filter(
          element => element?.type === 'audio'
        );

        if (audioElements.length > 0) {
          // Audio elements: allow 0-200 range
          if (value > 200) {
            return;
          }

          // Update displayed volume immediately for smooth UI response
          setDisplayedVolume(value);

          // Set volume for all selected audio elements
          const volumeInDecimal = value / 100; // Convert from 0-200 display to 0-2 storage range
          const audioElementIds = audioElements.map(element => element.id);
          store.setElementsVolume(audioElementIds, volumeInDecimal);

          // Don't update global volume state for individual audio adjustments
          setIsMuted(false);

          // Set the visual percentage for the range input (convert 0-200 to 0-100% for CSS)
          e.target.style.setProperty('--range-progress', `${value / 2}%`);
        } else {
          // No audio elements selected, set global volume (0-100 range)
          if (value > 100) {
            return;
          }

          // Update displayed volume immediately for smooth UI response
          setDisplayedVolume(value);

          setCurrentVolume(value);
          setPreviousVolume(value);
          setIsMuted(false);

          // Divide by 200 for the actual volume value sent to the store (global volume uses different scale)
          store.setVolume(value / 200);

          // Set the visual percentage for the range input
          e.target.style.setProperty('--range-progress', `${value}%`);
        }
      } else {
        // No elements selected, set global volume (0-100 range)
        if (value > 100) {
          return;
        }

        // Update displayed volume immediately for smooth UI response
        setDisplayedVolume(value);

        setCurrentVolume(value);
        setPreviousVolume(value);
        setIsMuted(false);

        // Divide by 200 for the actual volume value sent to the store (global volume uses different scale)
        store.setVolume(value / 200);

        // Set the visual percentage for the range input
        e.target.style.setProperty('--range-progress', `${value}%`);
      }
    },
    [store, setCurrentVolume, setPreviousVolume, setIsMuted, setDisplayedVolume]
  );

  const handleMuteToggle = useCallback(() => {
    const selectedElement = store.selectedElement;

    // Mute always affects global volume, regardless of selected element
    if (isMuted) {
      // Unmute - restore previous volume
      setIsMuted(false);
      setCurrentVolume(previousVolume);
      store.setVolume(previousVolume / 200);

      // Update displayed volume if no audio element is selected
      if (!selectedElement || selectedElement.type !== 'audio') {
        setDisplayedVolume(previousVolume);
      }

      if (volumeRangeRef.current) {
        volumeRangeRef.current.style.setProperty(
          '--range-progress',
          `${
            selectedElement?.type === 'audio'
              ? displayedVolume / 2
              : previousVolume
          }%`
        );
      }
    } else {
      // Mute - save current volume and set to 0
      setPreviousVolume(currentVolume);
      setIsMuted(true);
      setCurrentVolume(0);
      store.setVolume(0);

      // Always show 0% when muted, regardless of selected element
      setDisplayedVolume(0);

      if (volumeRangeRef.current) {
        volumeRangeRef.current.style.setProperty('--range-progress', '0%');
      }
    }
  }, [
    isMuted,
    currentVolume,
    previousVolume,
    setIsMuted,
    setCurrentVolume,
    setPreviousVolume,
    setDisplayedVolume,
    displayedVolume,
    store,
  ]);

  useEffect(() => {
    const handleGlobalClick = event => {
      if (colorPickerState.isOpen) {
        const isOnColorPicker =
          event.target.closest('.react-colorful') ||
          event.target.closest('[class*="ColorPicker"]') ||
          event.target.closest('#colorPickerPortal') ||
          event.target.closest('[class*="colorPicker"]') ||
          event.target.closest('[class*="ChromePicker"]');

        if (!isOnColorPicker) {
          window.dispatchEvent(new CustomEvent('closeColorPicker'));
          return;
        }
      }

      if (
        subtitlesPanelLock ||
        isSubtitlesMenuOpen ||
        isSubtitlesStylesPanelOpen ||
        isImageEditingOpen ||
        isTypographyPanelOpen ||
        isTransitionsPanelOpen ||
        isFrameEditingOpen ||
        isStoryBoardOpen ||
        isAnimationPanelOpen
      ) {
        return;
      }

      if (
        activeScreens.includes('search') ||
        activeScreens.includes('generateAI')
      ) {
        return;
      }

      const emptySpaceClick = isClickOnEmptySpace(event.target);

      if (activeSidebarPanel && emptySpaceClick) {
        setActiveSidebarPanel(null);

        window.dispatchEvent(new CustomEvent('closeSidebarPanel'));
        store.setSelectedElement(null);
      }

      const isAnyPanelOpen =
        isImageEditingOpen ||
        isTypographyPanelOpen ||
        isSubtitlesPanelOpen ||
        isTransitionsPanelOpen ||
        isAnimationPanelOpen;

      if (isAnyPanelOpen && emptySpaceClick) {
        const wasAnyNonSidebarPanelOpen =
          isImageEditingOpen || isTypographyPanelOpen;

        setActivePanels(prev => ({
          ...prev,
          imageEditing: false,
          typography: false,
          subtitles: false,
          transitions: false,
          animation: false,
        }));
        store.setSelectedElement(null);

        // Open storyboard by default if any non-sidebar panel was closed
        if (wasAnyNonSidebarPanelOpen) {
          openDefaultStoryboard();
        }
      }

      // Add this new condition to handle empty space clicks when no panels are open
      if (emptySpaceClick && !isAnyPanelOpen && !activeSidebarPanel) {
        store.setSelectedElement(null);
      }
    };

    function isClickOnEmptySpace(target) {
      // Check if clicked element or its parents have the interactive marker
      const isOnInteractiveElement = target.closest(
        '[data-interactive="true"]'
      );

      // Check for color picker elements (they might be rendered in portals)
      const isOnColorPicker =
        target.closest('.chrome-picker') ||
        target.closest('.react-color-picker') ||
        target.closest('#colorPickerPortal') ||
        target.closest('[class*="colorPicker"]') ||
        target.closest('[class*="ChromePicker"]') ||
        target.closest('.react-colorful') ||
        target.closest('[class*="ColorPicker"]');

      // Check for animation/style panels (they might be rendered in portals)
      const isOnStyleMenu =
        target.closest('[class*="styleMenu"]') ||
        target.closest('[class*="animationPanel"]') ||
        target.closest('[class*="subtitlesStylesPanel"]') ||
        target.closest('[class*="styleOptionsPanel"]');

      // Check for dropdowns and other portal elements
      const isOnPortalElement =
        target.closest('[data-portal="true"]') ||
        target.closest('.react-select') ||
        target.closest('[class*="dropdown"]');

      return (
        !isOnInteractiveElement &&
        !isOnColorPicker &&
        !isOnStyleMenu &&
        !isOnPortalElement
      );
    }

    document.addEventListener('mousedown', handleGlobalClick, true);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, true);
    };
  }, [
    activeSidebarPanel,
    store,
    isImageEditingOpen,
    isTypographyPanelOpen,
    isSubtitlesPanelOpen,
    isTransitionsPanelOpen,
    isAnimationPanelOpen,
    isFrameEditingOpen,
    isStoryBoardOpen,
    dispatch,
    subtitlesPanelLock,
    isSubtitlesMenuOpen,
    activeScreens,
    setActivePanels,
    colorPickerState.isOpen,
  ]);

  const scaleRangeRef = useRef(null);
  const volumeRangeRef = useRef(null);
  const scaleNumberRef = useRef(null);
  const volumeNumberRef = useRef(null);
  const scaleContainerRef = useRef(null);
  const volumeContainerRef = useRef(null);

  const handleScaleWheel = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.deltaY > 0 ? -1 : 1;

      if (delta > 0) {
        zoomIn(1);
      } else {
        zoomOut(1);
      }
    },
    [zoomIn, zoomOut]
  );

  const handleVolumeWheel = useCallback(
    event => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -5 : 5; // Increased step size for better control
      const selectedElements = store.selectedElements;

      // Check if we're adjusting individual audio elements volume
      if (selectedElements && Object.keys(selectedElements).length > 0) {
        const audioElements = Object.values(selectedElements).filter(
          element => element?.type === 'audio'
        );

        if (audioElements.length > 0) {
          // Audio elements: allow 0-200 range
          const newVolume = Math.min(Math.max(displayedVolume + delta, 0), 200);

          // Update displayed volume immediately
          setDisplayedVolume(newVolume);

          if (volumeRangeRef.current) {
            volumeRangeRef.current.style.setProperty(
              '--range-progress',
              `${newVolume / 2}%` // Convert 0-200 to 0-100% for CSS
            );
            volumeRangeRef.current.value = newVolume;
          }
          if (volumeNumberRef.current) {
            volumeNumberRef.current.value = newVolume; // Display as 0-200%
          }

          // Set volume for all selected audio elements
          const volumeInDecimal = newVolume / 100; // Convert from 0-200% display to 0-2 storage range
          const audioElementIds = audioElements.map(element => element.id);
          store.setElementsVolume(audioElementIds, volumeInDecimal);
          setIsMuted(false);
        } else {
          // No audio elements selected, set global volume (0-100 range)
          const newVolume = Math.min(Math.max(displayedVolume + delta, 0), 100);

          // Update displayed volume immediately
          setDisplayedVolume(newVolume);

          if (volumeRangeRef.current) {
            volumeRangeRef.current.style.setProperty(
              '--range-progress',
              `${newVolume}%`
            );
            volumeRangeRef.current.value = newVolume;
          }
          if (volumeNumberRef.current) {
            volumeNumberRef.current.value = newVolume * 2; // Display as 200%
          }

          setCurrentVolume(newVolume);
          setPreviousVolume(newVolume);
          setIsMuted(false);

          // Update the store volume
          store.setVolume(newVolume / 200);
        }
      } else {
        // No elements selected, set global volume (0-100 range)
        const newVolume = Math.min(Math.max(displayedVolume + delta, 0), 100);

        // Update displayed volume immediately
        setDisplayedVolume(newVolume);

        if (volumeRangeRef.current) {
          volumeRangeRef.current.style.setProperty(
            '--range-progress',
            `${newVolume}%`
          );
          volumeRangeRef.current.value = newVolume;
        }
        if (volumeNumberRef.current) {
          volumeNumberRef.current.value = newVolume * 2; // Display as 200%
        }

        setCurrentVolume(newVolume);
        setPreviousVolume(newVolume);
        setIsMuted(false);

        // Update the store volume
        store.setVolume(newVolume / 200);
      }
    },
    [
      store,
      setPreviousVolume,
      setCurrentVolume,
      setIsMuted,
      displayedVolume,
      setDisplayedVolume,
    ]
  );

  useEffect(() => {
    const scaleContainer = scaleContainerRef.current;
    const volumeContainer = volumeContainerRef.current;

    if (scaleContainer) {
      scaleContainer.addEventListener('wheel', handleScaleWheel, {
        passive: false,
      });
    }
    if (volumeContainer) {
      volumeContainer.addEventListener('wheel', handleVolumeWheel, {
        passive: false,
      });
    }

    return () => {
      if (scaleContainer) {
        scaleContainer.removeEventListener('wheel', handleScaleWheel);
      }
      if (volumeContainer) {
        volumeContainer.removeEventListener('wheel', handleVolumeWheel);
      }
    };
  }, [handleScaleWheel, handleVolumeWheel]);

  // Add effect to initialize range styles on mount
  useEffect(() => {
    // Initialize scale range
    if (scaleRangeRef.current) {
      const scalePercentage = Math.round(((currentScale - 1) / (30 - 1)) * 100);
      scaleRangeRef.current.style.setProperty(
        '--range-progress',
        `${scalePercentage}%`
      );
    }
  }, [currentScale]);

  // Separate effect for volume range updates
  useEffect(() => {
    if (volumeRangeRef.current) {
      volumeRangeRef.current.value = displayedVolume;

      // Check if we have selected audio elements to determine progress bar scale
      const selectedElements = store.selectedElements;
      const hasSelectedAudio =
        selectedElements &&
        Object.values(selectedElements).some(
          element => element?.type === 'audio'
        );

      volumeRangeRef.current.style.setProperty(
        '--range-progress',
        `${hasSelectedAudio ? displayedVolume / 2 : displayedVolume}%`
      );
    }
    if (volumeNumberRef.current) {
      volumeNumberRef.current.value = Math.round(displayedVolume * 2);
    }
  }, [displayedVolume, store.selectedElements]);

  const [timelineHeight, setTimelineHeight] = useLocalStorage(
    'timeline-height',
    183
  ); // Default height

  // Add debounce ref for canvas resize
  const canvasResizeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!videoPanelRef.current || !mainContentRef.current || !store.canvas) {
      return;
    }

    const updateCanvasSize = () => {
      // Clear any existing timeout
      if (canvasResizeTimeoutRef.current) {
        clearTimeout(canvasResizeTimeoutRef.current);
      }

      // Debounce canvas updates to reduce flickering
      canvasResizeTimeoutRef.current = setTimeout(() => {
        // Calculate available height by subtracting timeline height from viewport height
        const availableHeight = window.innerHeight - timelineHeight - 100;

        // Set the video panel height
        if (videoPanelRef.current.style.height !== `${availableHeight}px`) {
          videoPanelRef.current.style.height = `${availableHeight}px`;
          videoPanelRef.current.style.maxHeight = `${availableHeight}px`;
        }

        // Set the transition panel height to match
        if (
          transitionPanelRef.current &&
          transitionPanelRef.current.style.height !== `${availableHeight}px`
        ) {
          transitionPanelRef.current.style.height = `${availableHeight}px`;
          transitionPanelRef.current.style.maxHeight = `${availableHeight}px`;
        }

        // Set the frame editing panel height to match
        if (
          frameEditingPanelRef.current &&
          frameEditingPanelRef.current.style.height !== `${availableHeight}px`
        ) {
          frameEditingPanelRef.current.style.height = `${availableHeight}px`;
          frameEditingPanelRef.current.style.maxHeight = `${availableHeight}px`;
        }

        const containerWidth = videoPanelRef.current.clientWidth;
        const containerHeight = availableHeight;
        const aspectRatio = store.getAspectRatioValue();

        // Reserve space for AnimationSidebar only for 16:9 orientation
        const is16to9 =
          store.currentAspectRatio &&
          store.currentAspectRatio.width === 16 &&
          store.currentAspectRatio.height === 9;

        // Calculate available space considering left panel width with more aggressive reduction
        const panelOverflow = Math.max(0, leftPanelWidth - 400);
        const availableContainerWidth = containerWidth - panelOverflow * 0.8; // Increased from 0.5 to 0.8
        const sidebarSpace = is16to9 ? 80 : 0; // 80px space for sidebar

        let newWidth = availableContainerWidth - sidebarSpace;
        let newCanvasHeight = newWidth / aspectRatio;

        if (newCanvasHeight > containerHeight) {
          newCanvasHeight = containerHeight;
          newWidth = containerHeight * aspectRatio;
          // Ensure we still have sidebar space after height constraint
          if (is16to9 && newWidth + sidebarSpace > availableContainerWidth) {
            newWidth = availableContainerWidth - sidebarSpace;
            newCanvasHeight = newWidth / aspectRatio;
          }
        }

        // Only update dimensions if they've actually changed (with threshold)
        const currentWidth = parseInt(store.canvas.width);
        const currentHeight = parseInt(store.canvas.height);
        const widthDiff = Math.abs(currentWidth - newWidth);
        const heightDiff = Math.abs(currentHeight - newCanvasHeight);

        if (widthDiff > 10 || heightDiff > 10) {
          // Increased threshold to 10px to reduce frequent updates
          store.canvas.setDimensions(
            {
              width: `${newWidth}px`,
              height: `${newCanvasHeight}px`,
            },
            {
              cssOnly: true,
            }
          );

          // Batch render updates
          requestAnimationFrame(() => {
            store.canvas.requestRenderAll();
          });
        }
      }, 50); // 50ms debounce
    };

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(updateCanvasSize);

    // Expose updateCanvasSize globally for store access
    window.updateCanvasSize = updateCanvasSize;
  }, [store.canvas, timelineHeight, store.currentAspectRatio, leftPanelWidth]);

  // Effect for leftPanelWidth changes - removed as it's now handled in main useEffect with debounce

  const handleVideoPanelClick = () => {
    setIsVideoPanelClicked(true);
  };

  const toggleImageEditing = forceOpen => {
    const newState = forceOpen === undefined ? !isImageEditingOpen : forceOpen;

    if (newState) {
      // Close all sidebar panels when opening image editing
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        imageEditing: true,
        typography: false,
        subtitles: false,
        subtitlesStyles: false,
        transitions: false,
        frameEditing: false,
        animation: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      setScreen('playback');
      if (isTransitionPanelOpen) setIsTransitionPanelOpen(false);
    } else {
      setActivePanels(prev => ({
        ...prev,
        imageEditing: false,
      }));
      store.setSelectedElement(null);
      // Open storyboard by default when closing image editing panel
      openDefaultStoryboard();
    }
  };

  const toggleTypographyPanel = (forceOpen, position) => {
    const newState =
      forceOpen === undefined ? !isTypographyPanelOpen : forceOpen;

    if (newState) {
      // Close all sidebar panels when opening typography panel
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        typography: true,
        imageEditing: false,
        subtitles: false,
        subtitlesStyles: false,
        transitions: false,
        frameEditing: false,
        animation: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      setScreen('playback');
      if (isTransitionPanelOpen) setIsTransitionPanelOpen(false);

      if (position && ['in', 'out', 'effect'].includes(position)) {
        // We don't need to dispatch an action here as the TransitionPanel
        // component now directly subscribes to the Redux state
      }
    } else {
      setActivePanels(prev => ({
        ...prev,
        typography: false,
      }));
      // Open storyboard by default when closing typography panel
      openDefaultStoryboard();
    }
  };

  const toggleSubtitlesPanel = (forceOpen, position) => {
    const newState =
      forceOpen === undefined ? !isSubtitlesPanelOpen : forceOpen;

    if (!newState && subtitlesPanelLock) {
      return;
    }

    if (newState) {
      // Close all other sidebar panels before opening subtitles panel
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        subtitles: true,
        imageEditing: false,
        typography: false,
        subtitlesStyles: false,
        transitions: false,
        frameEditing: false,
        animation: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      setScreen('playback');
      if (isTransitionPanelOpen) setIsTransitionPanelOpen(false);

      if (position && ['in', 'out', 'effect'].includes(position)) {
        // We don't need to dispatch an action here as the TransitionPanel
        // component now directly subscribes to the Redux state
      }

      setSubtitlesPanelLock(true);
      setTimeout(() => {
        setSubtitlesPanelLock(false);
      }, 500);
    } else {
      setActivePanels(prev => ({
        ...prev,
        subtitles: false,
        subtitlesStyles: false,
      }));
      store.setSelectedElement(null);
      // Open storyboard by default when closing subtitles panel
      openDefaultStoryboard();
    }
  };

  const toggleTransitionsPanel = forceOpen => {
    const newState =
      forceOpen === undefined ? !isTransitionsPanelOpen : forceOpen;

    if (newState) {
      // If no element is selected, find and select the image at current keyframe
      if (!store.selectedElement || store.selectedElement.type !== 'imageUrl') {
        const currentTime = store.currentTimeInMs;
        const imageAtCurrentTime = store.editorElements.find(
          element =>
            (element.type === 'imageUrl' || element.type === 'image') &&
            element.timeFrame.start <= currentTime &&
            currentTime <= element.timeFrame.end
        );

        if (imageAtCurrentTime) {
          store.setSelectedElement(imageAtCurrentTime);
        }
      }

      // Close all other sidebar panels before opening transitions panel
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        transitions: true,
        imageEditing: false,
        typography: false,
        subtitles: false,
        subtitlesStyles: false,
        subtitlesMenu: false,
        frameEditing: false,
        animation: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      setScreen('playback');
    } else {
      setActivePanels(prev => ({
        ...prev,
        transitions: false,
      }));
      store.setSelectedElement(null);
      // Open storyboard by default when closing transitions panel
      openDefaultStoryboard();
    }
  };

  // Handle opening transition panel from + button
  const handleOpenTransitionPanel = data => {
    // Store the transition data for the panel to use
    if (data.type === 'create') {
      // Store the fromElement and toElement in store for TransitionPanel to access
      store.pendingTransitionData = {
        fromElement: data.fromElement,
        toElement: data.toElement,
        gap: data.gap,
        activeTab: data.activeTab, // Pass through the activeTab setting
        currentTransitionType: data.currentTransitionType, // Pass through current transition type if any
        panelMode: data.panelMode, // Pass through the panel mode setting
      };
    }

    // Open the transitions panel
    toggleTransitionsPanel(true);
  };

  const handleOpenEffectPanel = data => {
    if (data.type === 'create') {
      // For creating new effects, we need to add the effect to the element

      if (data.element) {
        // Set the element as selected
        store.setSelectedElement(data.element);

        // Open frame editing panel where effects can be added
        setActivePanels(prev => ({
          ...prev,
          subtitles: false,
          imageEditing: false,
          transitions: false,
        }));
        toggleFrameEditingPanel(true);
      }
    } else if (data.type === 'edit') {
      // For editing existing effects, open the animation resource panel

      // Find the element and set it as selected
      if (data.element) {
        store.setSelectedElement(data.element);

        // Set the current editing animation
        setCurrentEditingAnimation(data.effect);

        // Close other panels and open frame editing panel
        setActivePanels(prev => ({
          ...prev,
          subtitles: false,
          imageEditing: false,
          transitions: false,
        }));
        toggleFrameEditingPanel(true);
      }
    }
  };

  const toggleFrameEditingPanel = forceOpen => {
    const newState = forceOpen === undefined ? !isFrameEditingOpen : forceOpen;

    setActivePanels(prev => ({
      ...prev,
      frameEditing: newState,
      imageEditing: newState ? false : prev.imageEditing,
      typography: newState ? false : prev.typography,
      subtitles: newState ? false : prev.subtitles,
      subtitlesStyles: newState ? false : prev.subtitlesStyles,
      // DON'T close transitions panel - keep it open
      transitions: prev.transitions,
      subtitlesMenu: false,
    }));

    if (newState) {
      setScreen('playback');

      if (isAnimationPanelOpen)
        setActivePanels(prev => ({ ...prev, animation: false }));
    }
  };

  const toggleAnimationPanel = forceOpen => {
    const newState =
      forceOpen === undefined ? !isAnimationPanelOpen : forceOpen;

    if (newState) {
      // Close all other sidebar panels before opening animation panel
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        animation: true,
        subtitles: false,
        transitions: false,
        imageEditing: false,
        typography: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      setScreen('playback');
      if (isTransitionPanelOpen) setIsTransitionPanelOpen(false);
    } else {
      setActivePanels(prev => ({ ...prev, animation: false }));
      // Open storyboard by default when closing animation panel
      openDefaultStoryboard();
    }
  };

  // Handle opening animation sidebar from timeline visualizers
  useEffect(() => {
    const handleOpenAnimationSidebar = event => {
      if (event.detail && event.detail.type === 'transition') {
        toggleTransitionsPanel(true);

        // Set active tab if provided
        if (event.detail.activeTab) {
          // Store the active tab for TransitionPanel
          store.transitionPanelActiveTab = event.detail.activeTab;
        }

        // Check if panel mode should be set from store (set by VideoCreationPage)
        if (store.transitionPanelPanelMode) {
          // Panel mode will be handled by TransitionPanel itself
          // Clear it after using
          store.transitionPanelPanelMode = null;
        }
      }
    };

    const handleEnsureTransitionPanelOpen = event => {
      // Only open panel if both transitions and frame editing panels are closed
      if (!isTransitionsPanelOpen && !isFrameEditingOpen) {
        // Set panel mode in store for TransitionPanel to use
        if (event.detail?.panelMode) {
          store.transitionPanelPanelMode = event.detail.panelMode;
        }

        // Add small delay to ensure store updates are processed
        setTimeout(() => {
          toggleTransitionsPanel(true);
        }, 50);
      }
    };

    window.addEventListener('openAnimationSidebar', handleOpenAnimationSidebar);
    window.addEventListener(
      'ensureTransitionPanelOpen',
      handleEnsureTransitionPanelOpen
    );

    return () => {
      window.removeEventListener(
        'openAnimationSidebar',
        handleOpenAnimationSidebar
      );
      window.removeEventListener(
        'ensureTransitionPanelOpen',
        handleEnsureTransitionPanelOpen
      );
    };
  }, [isTransitionsPanelOpen, isFrameEditingOpen, toggleTransitionsPanel]);

  // Handle opening transition panel with specific effect from timeline visualizers
  useEffect(() => {
    const handleOpenTransitionPanelWithEffect = event => {
      // If panel is already open, let it handle the event directly
      if (isTransitionsPanelOpen) {
        return;
      }

      // Panel is closed, so we need to open it first

      // Clear any pending transition data since we're opening for effect editing
      store.pendingTransitionData = null;

      toggleTransitionsPanel(true);

      // Store the event details to pass to TransitionPanel when it mounts
      // We need a small delay to ensure the panel is fully mounted
      setTimeout(() => {
        // Re-dispatch the event so TransitionPanel can handle it
        window.dispatchEvent(
          new CustomEvent('openTransitionPanelWithEffect', {
            detail: event.detail,
          })
        );
      }, 150); // Slightly longer delay to ensure panel is fully rendered
    };

    window.addEventListener(
      'openTransitionPanelWithEffect',
      handleOpenTransitionPanelWithEffect
    );

    return () => {
      window.removeEventListener(
        'openTransitionPanelWithEffect',
        handleOpenTransitionPanelWithEffect
      );
    };
  }, [isTransitionsPanelOpen, toggleTransitionsPanel]);

  // Set header button active states based on animation panel tabs
  useEffect(() => {
    // Early return if animation panel is closed
    if (!isAnimationPanelOpen) {
      // Only remove animation-related screens if they were added specifically for the AnimationPanel
      // Don't remove them if they are standalone screens (when screen is set to 'search' or 'myItems')
      if (screen !== 'search' && screen !== 'myItems') {
        setActiveScreens(prev => {
          const hasAnimationTabs =
            prev.includes('myItems') || prev.includes('search');
          return hasAnimationTabs
            ? prev.filter(item => item !== 'myItems' && item !== 'search')
            : prev;
        });
      }
      return;
    }

    // Handle active tab selection
    if (animationActiveTab === 'MY ITEMS') {
      setActiveScreens(prev => {
        const hasMyItems = prev.includes('myItems');
        const hasSearch = prev.includes('search');

        // If already in correct state, no update needed
        if (hasMyItems && !hasSearch) return prev;

        // Remove search and add myItems
        return prev
          .filter(item => item !== 'search')
          .concat(hasMyItems ? [] : ['myItems']);
      });
    } else if (animationActiveTab === 'GALLERY') {
      setActiveScreens(prev => {
        const hasMyItems = prev.includes('myItems');
        const hasSearch = prev.includes('search');

        // If already in correct state, no update needed
        if (hasSearch && !hasMyItems) return prev;

        // Remove myItems and add search
        return prev
          .filter(item => item !== 'myItems')
          .concat(hasSearch ? [] : ['search']);
      });
    }
  }, [animationActiveTab, isAnimationPanelOpen, setActiveScreens, screen]);

  // Open SubtitlesPanel when subtitles element is selected
  useEffect(() => {
    if (
      store.selectedElement?.type === 'text' &&
      store.selectedElement?.subType === 'subtitles' &&
      !isSubtitlesPanelOpen &&
      !subtitlesPanelLock
    ) {
      setSubtitlesPanelLock(true);

      // Close all other sidebar panels before opening subtitles panel
      setIsStoryBoardOpen(false);
      setActivePanels(prev => ({
        ...prev,
        subtitles: true,
        animation: false,
        transitions: false,
      }));
      setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));

      const unlockTimer = setTimeout(() => {
        setSubtitlesPanelLock(false);
      }, 500);

      return () => clearTimeout(unlockTimer);
    }
  }, [
    store.selectedElement,
    isSubtitlesPanelOpen,
    subtitlesPanelLock,
    setActiveScreens,
  ]);

  // Close SubtitlesStylesPanel when any conflicting state changes
  useEffect(() => {
    if (
      isSubtitlesStylesPanelOpen &&
      (screen !== 'playback' ||
        store.selectedElement === null ||
        store.selectedElement?.type !== 'text' ||
        store.selectedElement?.subType !== 'subtitles')
    ) {
      setIsSubtitlesStylesPanelOpen(false);
    }
  }, [isSubtitlesStylesPanelOpen, screen, store.selectedElement]);

  useEffect(() => {
    const handleCanvasClick = event => {
      setDefaultButton(event.button);
      const storyBoardComponent = document.querySelector(
        '[data-is-modal-open]'
      );
      if (!storyBoardComponent) return;

      const isModalOpen = storyBoardComponent.dataset.isModalOpen === 'true';
      if (isModalOpen) return;

      if (subtitlesPanelLock) {
        return;
      }

      if (
        store.selectedElement?.type === 'text' &&
        store.selectedElement?.subType === 'subtitles'
      ) {
        const fabricObject = store.selectedElement.fabricObject;
        if (
          fabricObject &&
          fabricObject.containsPoint(fabricObject.canvas.getPointer(event))
        ) {
          setSubtitlesPanelLock(true);
          setTimeout(() => {
            setSubtitlesPanelLock(false);
          }, 500);
          return;
        }
      }

      const canvasElement = store.canvas?.wrapperEl;
      const isCanvasClick = canvasElement?.contains(event.target);
      if (!isCanvasClick) {
        setIsVideoPanelClicked(false);
      }

      const isTimelineClick =
        event.target.closest('[data-timeline-item]') ||
        event.target.closest('.timeline') ||
        event.target.closest('[class*="Player_timelineContent"]');

      if (isCutMode && !isTimelineClick) {
        setIsCutMode(false);
      }
    };

    document.addEventListener('click', handleCanvasClick);
    return () => document.removeEventListener('click', handleCanvasClick);
  }, [
    isCutMode,
    setIsCutMode,
    setIsVideoPanelClicked,
    store.canvas,
    store.selectedElement,
    subtitlesPanelLock,
  ]);

  // Add event listeners for frame editing panel
  useEffect(() => {
    const handleFrameEditingPanelOpen = event => {
      if (event.detail && event.detail.animation) {
        setCurrentEditingAnimation(event.detail.animation);
        toggleFrameEditingPanel(true);

        // Pass activeTab to FrameEditingPanel if provided
        if (event.detail.activeTab) {
          setFrameEditingActiveTab(event.detail.activeTab);
        }
      }
    };

    const handleFrameEditingPanelFromDetail = event => {
      if (event.detail && event.detail.animation) {
        setCurrentEditingAnimation(event.detail.animation);
        toggleFrameEditingPanel(true);

        // Pass activeTab to FrameEditingPanel if provided
        if (event.detail.activeTab) {
          setFrameEditingActiveTab(event.detail.activeTab);
        }
      }
    };

    const handleFrameEditingPanelClose = () => {
      toggleFrameEditingPanel(false);
      setCurrentEditingAnimation(null);
    };

    // Close panel when clicking outside
    const handleClickOutside = event => {
      if (isFrameEditingOpen) {
        const frameEditingPanel = document.querySelector(
          '[key="frame-editing-panel"]'
        );
        if (frameEditingPanel && !frameEditingPanel.contains(event.target)) {
          // Check if click is not on pencil icon or canvas
          const isPencilIcon =
            event.target.closest('.pencilIcon') ||
            event.target.closest('[class*="pencilIcon"]');
          const isCanvas =
            event.target.closest('canvas') ||
            event.target.closest('[class*="previewCanvas"]');

          if (!isPencilIcon && !isCanvas) {
            toggleFrameEditingPanel(false);
            setCurrentEditingAnimation(null);
          }
        }
      }
    };

    window.addEventListener(
      'openFrameEditingPanel',
      handleFrameEditingPanelOpen
    );
    window.addEventListener(
      'openFrameEditingPanelFromDetail',
      handleFrameEditingPanelFromDetail
    );
    window.addEventListener(
      'closeFrameEditingPanel',
      handleFrameEditingPanelClose
    );
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener(
        'openFrameEditingPanel',
        handleFrameEditingPanelOpen
      );
      window.removeEventListener(
        'openFrameEditingPanelFromDetail',
        handleFrameEditingPanelFromDetail
      );
      window.removeEventListener(
        'closeFrameEditingPanel',
        handleFrameEditingPanelClose
      );
      document.removeEventListener('click', handleClickOutside);
    };
  }, [toggleFrameEditingPanel, isFrameEditingOpen]);

  // Handle click outside size dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        isSizeDropdownOpen &&
        sizeDropdownRef.current &&
        !sizeDropdownRef.current.contains(event.target)
      ) {
        setIsSizeDropdownVisible(false);
        setTimeout(() => {
          setIsSizeDropdownOpen(false);
        }, 200);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSizeDropdownOpen]);

  // Position FrameEditingPanel relative to TransitionPanel
  useEffect(() => {
    if (isFrameEditingOpen && isTransitionsPanelOpen) {
      const positionFrameEditingPanel = () => {
        const transitionPanel = document.querySelector(
          '[key="transitions-panel"]'
        );
        const frameEditingPanel = document.querySelector(
          '[key="frame-editing-panel"]'
        );

        if (transitionPanel && frameEditingPanel) {
          const transitionRect = transitionPanel.getBoundingClientRect();
          const mainContent = mainContentRef.current;

          if (mainContent) {
            const mainContentRect = mainContent.getBoundingClientRect();

            // Position to the right of transition panel with 20px gap
            const left = transitionRect.right - mainContentRect.left + 20;
            const top = transitionRect.top - mainContentRect.top;

            frameEditingPanel.style.left = `${left}px`;
            frameEditingPanel.style.top = `${top}px`;

            // Set the same height as transition panel
            const availableHeight = window.innerHeight - timelineHeight - 100;
            frameEditingPanel.style.height = `${availableHeight}px`;
            frameEditingPanel.style.maxHeight = `${availableHeight}px`;

            // Update editImageSection height after setting panel height
            if (frameEditingPanelRef.current?.updateEditImageSectionHeight) {
              setTimeout(() => {
                frameEditingPanelRef.current.updateEditImageSectionHeight();
              }, 100);
            }
          }
        }
      };

      // Position immediately
      requestAnimationFrame(positionFrameEditingPanel);

      // Also position on resize
      window.addEventListener('resize', positionFrameEditingPanel);

      return () => {
        window.removeEventListener('resize', positionFrameEditingPanel);
      };
    }
  }, [isFrameEditingOpen, isTransitionsPanelOpen]);

  // Update the store.setInitializationState call to dispatch an event
  const handleInitializationStateChange = state => {
    store.setInitializationState(state);
    // Dispatch event for rendering state change
    window.dispatchEvent(
      new CustomEvent('renderingStateChange', {
        detail: state,
      })
    );
  };
  // Default height

  // Add this effect after other useEffect hooks
  useEffect(() => {
    const handleResize = () => {
      const timelineRnd = document.querySelector('.timeline-rnd');
      if (timelineRnd) {
        timelineRnd.style.position = 'fixed';
        timelineRnd.style.bottom = `${timelineHeight}px`;
        timelineRnd.style.transform = `translate(0px, ${
          window.innerHeight - timelineHeight
        }px)`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [timelineHeight]);

  // Also update the container style to use a class instead of inline style
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.paddingBottom = `${timelineHeight}px`;
    }
  }, [timelineHeight]);

  // Update Lyra chat positioning based on timeline height
  useEffect(() => {
    if (lyraChatRef.current) {
      lyraChatRef.current.style.bottom = `${timelineHeight + 20}px`;
    }
  }, [timelineHeight]);

  const [isLyraVisible, setIsLyraVisible] = useState(false);

  const handleLyraClick = () => {
    setIsLyraVisible(!isLyraVisible);
  };

  const isLogged = useSelector(isLoggedIn);

  const getUserInitial = () => {
    return username ? username.charAt(0).toUpperCase() : '';
  };

  const handleRegenerateAudio = () => {
    // Show warning modal first
    setIsAudioRegenerationWarningOpen(true);
  };

  const handleConfirmAudioRegeneration = () => {
    // Close warning modal
    setIsAudioRegenerationWarningOpen(false);

    if (!storyData?._id || !scenes || scenes.length === 0) {
      alert('Story data is not available. Please try again.');
      return;
    }

    // Open the modal
    setIsAudioRegenerationModalOpen(true);

    // Reset progress state
    setAudioRegenerationProgress({
      progress: 0,
      stage: 'starting',
      message: 'Initializing audio regeneration...',
      isComplete: false,
      isError: false,
      errorMessage: '',
    });
  };

  const handleCancelAudioRegeneration = () => {
    setIsAudioRegenerationWarningOpen(false);
  };

  const handleDismissSyncWarning = () => {
    // User dismissed the warning - they can continue working but sync is still broken
    // The warning will be dismissed via component's internal state
    // but isScenesOutOfSync remains true until scenes are actually synced
  };

  const handleCloseAudioRegenerationModal = () => {
    setIsAudioRegenerationModalOpen(false);
    // Reset progress state after a delay to allow for smooth closing animation
    setTimeout(() => {
      setAudioRegenerationProgress({
        progress: 0,
        stage: '',
        message: '',
        isComplete: false,
        isError: false,
        errorMessage: '',
      });
    }, 300);
  };

  const handleConfirmTimelineReinitialization = async () => {
    if (!pendingStoryDataForReinit) {
      console.error('No pending story data for reinitialization');
      return;
    }

    setIsTimelineReinitProcessing(true);

    try {
      // Use the reinitializeTimeline utility function
      await reinitializeTimeline(
        pendingStoryDataForReinit,
        scenes, // Use current scenes, not originScenes
        store,
        dispatch
      );
    } catch (error) {
      console.error('❌ Error during timeline reinitialization:', error);
      alert('Failed to reinitialize timeline. Please refresh the page.');
    } finally {
      setIsTimelineReinitProcessing(false);
      setIsTimelineReinitModalOpen(false);
      setPendingStoryDataForReinit(null);
    }
  };

  const handleCancelTimelineReinitialization = () => {
    setIsTimelineReinitModalOpen(false);
    setPendingStoryDataForReinit(null);
    // User chose to keep current timeline, so we don't reinitialize
  };

  // const handleDownloadClick = () => {
  //   store.handleSeek(0);
  //   store.setSelectedElement(null);
  //   handleInitializationStateChange({
  //     state: 'rendering',
  //     progress: 0,
  //   });
  //   store.setPlaying(true);
  //   store.saveCanvasToVideoWithAudio();
  // };

  const handleDownloadClick = () => {
    setIsRenderOptionModalOpen(true);
  };

  const handleServerRender = async (quality = 'high') => {
    setIsRenderOptionModalOpen(false);

    try {
      store.handleSeek(0);
      store.setSelectedElement(null);

      // Set initial rendering state
      handleInitializationStateChange({
        state: 'rendering',
        progress: 0,
        message: 'Starting server render process...',
      });

      // Store rendering status in the store for access in other components
      store.renderingStatus = {
        state: 'rendering',
        progress: 0,
        message: 'Starting server render process...',
      };
    } catch (error) {
      console.error('Error initiating server render:', error);
      const errorStatus = {
        state: 'error',
        progress: 0,
        message: 'Error initiating server render',
      };

      // Update both local state and store
      handleInitializationStateChange(errorStatus);
      store.renderingStatus = errorStatus;
    }
  };

  const handleFFmpegRender = async (quality = 'high') => {
    setIsRenderOptionModalOpen(false);

    try {
      store.handleSeek(0);
      store.setSelectedElement(null);

      // Set initial rendering state
      handleInitializationStateChange({
        state: 'rendering',
        progress: 0,
        message: 'Starting sandbox render process...',
      });

      // Store rendering status in the store for access in other components
      store.renderingStatus = {
        state: 'rendering',
        progress: 0,
        message: 'Starting sandbox render process...',
      };
    } catch (error) {
      console.error('Error initiating sandbox render:', error);
      const errorStatus = {
        state: 'error',
        progress: 0,
        message: 'Error initiating sandbox render',
      };

      // Update both local state and store
      handleInitializationStateChange(errorStatus);
      store.renderingStatus = errorStatus;
    }
  };

  const headerBtns = [{ item: 1, icon: 'AddUserIcon', name: 'adduser' }];

  const handleFileChange = event => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
    }
    event.target.value = '';
  };

  // Initialize custom hooks for handling Lyra actions
  const getLyraEventListeners = useLyraActions({
    setScreen: screen => setScreen(screen),
    setGallerySearchText: setGallerySearchText,
    setActivePanels: setActivePanels,
    setIsStoryBoardOpen: setIsStoryBoardOpen,
    setIsChatOpen: setIsLyraVisible,
    setActiveScreens: setActiveScreens,
  });

  const getSubtitleEventListeners = useSubtitleActions({
    setActivePanels: setActivePanels,
  });

  // Add event listeners for Lyra panel and subtitle actions
  useEffect(() => {
    // Get event listeners from hooks
    const lyraEventListeners = getLyraEventListeners();
    const subtitleEventListeners = getSubtitleEventListeners();
    const allEventListeners = [
      ...lyraEventListeners,
      ...subtitleEventListeners,
    ];

    // Register all event listeners
    allEventListeners.forEach(({ event, handler }) => {
      window.addEventListener(event, handler);
    });

    return () => {
      // Cleanup all event listeners
      allEventListeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [getLyraEventListeners, getSubtitleEventListeners]);

  // Add beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = event => {
      if (hasUnsavedChanges) {
        // Try to force sync before page unload
        const storyId = storyData?._id;
        if (storyId && store) {
          // Force immediate sync (non-blocking)
          forceSync(
            {
              dispatch,
              getState: () => ({
                stories: { currentStory: storyData },
                scene: { scenes },
                timeline: store.getTimelineState?.() || {},
              }),
            },
            storyId
          );
        }

        // Show browser warning
        const message =
          'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, storyData, scenes, store, dispatch]);

  return (
    <DndProvider backend={HTML5Backend}>
      <section className={styles.wrapper}>
        {/* Hidden file input for upload functionality */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
          multiple
          style={{ display: 'none' }}
        />
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Lottie
              animationData={videfyAnime}
              className={styles.lottieAnimation}
              data-testid="loading-animation"
            />
          </div>
        )}
        <div
          className={`${styles.header_navigate_btnset} ${
            isHideNames ? styles.hideNames : ''
          }`}
          data-interactive={true}
        >
          {headerNavigateBtns.map(i => (
            <div
              key={i.name}
              name={i.name}
              className={styles.header_btn_container}
              ref={i.name === 'size' ? sizeDropdownRef : null}
            >
              {i.name === 'size' ? (
                <button
                  className={`${styles.header_navigate_btn} ${
                    isSizeDropdownOpen ? styles.active : ''
                  }`}
                  onClick={() => handleClick(i.name)}
                  style={{
                    color: isSizeDropdownOpen
                      ? 'var(--accent-color)'
                      : '#FFFFFF66',
                  }}
                  title={i.tooltipText}
                >
                  <div className={styles.size_button_content}>
                    <div className={styles.size_text}>
                      <div className={styles.size_name}>
                        {currentSize?.name}
                      </div>
                      {!isHideNames && (
                        <div className={styles.size_label}>Size</div>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <ButtonWithIcon
                  icon={i.icon}
                  size={isHideNames ? 16 : 15}
                  text={isHideNames ? '' : i.text}
                  accentColor="#FFFFFFB2"
                  activeColor="var(--accent-color)"
                  marginLeft="0px"
                  onClick={
                    i.name === 'lyra'
                      ? handleLyraClick
                      : i.name === 'download'
                        ? handleDownloadClick
                        : () => handleClick(i.name)
                  }
                  classNameButton={`${styles.header_navigate_btn} ${
                    i.name !== 'download' && activeScreens.includes(i.name)
                      ? styles.active
                      : ''
                  } ${
                    i.name === 'myItems' && !isHideNames
                      ? styles.myItemsBtn
                      : ''
                  } ${
                    i.name === 'storyboard' && !isHideNames
                      ? styles.storyboardBtn
                      : ''
                  } ${i.name === 'settings' ? styles.settingsBtn : ''} ${
                    i.name === 'lyra' ? styles.lyraBtn : ''
                  }`}
                  color={
                    i.name !== 'download' && activeScreens.includes(i.name)
                      ? 'var(--accent-color)'
                      : '#FFFFFF66'
                  }
                  tooltipText={i.tooltipText}
                  tooltipPlace="bottom"
                />
              )}
            </div>
          ))}
          <div
            className={styles.moreMenuContainer}
            onMouseEnter={() => {
              if (moreMenuTimeoutRef.current) {
                clearTimeout(moreMenuTimeoutRef.current);
                moreMenuTimeoutRef.current = null;
              }
              setIsMoreMenuOpen(true);
            }}
            onMouseLeave={() => {
              moreMenuTimeoutRef.current = setTimeout(() => {
                setIsMoreMenuOpen(false);
              }, 150);
            }}
          >
            <ButtonWithIcon
              icon="ThreeDotsIcon"
              size={12}
              color="#FFFFFF66"
              accentColor="#FFFFFFB2"
              activeColor="white"
              classNameButton={styles.threeDotsBtn}
            />
            {isMoreMenuOpen && (
              <div className={styles.moreMenu}>
                <div
                  className={styles.moreMenu__item}
                  onClick={() => setIsHideNames(!isHideNames)}
                >
                  <span className={styles.moreMenu__item__text}>
                    {isHideNames ? 'Show names' : 'Hide names'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.header_right}>
          {/* Aspect Ratio Toggle */}
          {/* <AspectRatioToggle
            currentRatio={store.currentAspectRatio}
            onChange={handleAspectRatioChange}
          /> */}

          <ScenesSyncWarning
            isVisible={isScenesOutOfSync}
            onRegenerateAudio={handleRegenerateAudio}
            onDismiss={handleDismissSyncWarning}
          />
          <SyncIndicator />
          {isLogged && (
            <button className="MinimalHeader_header_avatar" disabled>
              {getUserInitial()}
            </button>
          )}
        </div>
        <div className={styles.container} ref={containerRef}>
          <div className={styles.main_content} ref={mainContentRef}>
            <div className={styles.content} data-interactive={true}>
              <div
                className={`${styles.content_box} ${
                  !isStoryBoardOpen && screen === 'playback'
                    ? styles.centered
                    : ''
                }`}
              >
                {isLoading ? (
                  <div className={styles.skeleton_container}>
                    <ContentSkeleton />
                  </div>
                ) : (
                  screen !== 'playback' && (
                    <div className={styles.upload_container}></div>
                  )
                )}

                <div
                  className={styles.video_panel_container}
                  ref={videoPanelRef}
                  onClick={handleVideoPanelClick}
                  style={{ '--left-panel-width': `${leftPanelWidth}px` }}
                >
                  <div
                    style={{
                      position: screen === 'playback' ? 'fixed' : 'relative',
                      top: screen === 'playback' ? '80px' : '-5000px',
                      left: screen === 'playback' ? '62%' : '-5000px',
                      transform:
                        screen === 'playback' ? 'translateX(-50%)' : 'none',
                    }}
                  >
                    <VideoPanel
                      storyData={storyData}
                      isMuted={isMuted}
                      currentVolume={currentVolume}
                      handleVolumeChange={handleVolumeChange}
                      handleMuteToggle={handleMuteToggle}
                      volumeRangeRef={volumeRangeRef}
                      isVideoPanelClicked={isVideoPanelClicked}
                      isImageEditingOpen={isImageEditingOpen}
                      toggleImageEditing={toggleImageEditing}
                      isTypographyPanelOpen={isTypographyPanelOpen}
                      toggleTypographyPanel={toggleTypographyPanel}
                      isSubtitlesPanelOpen={isSubtitlesPanelOpen}
                      toggleSubtitlesPanel={toggleSubtitlesPanel}
                      isTransitionPanelOpen={isTransitionsPanelOpen}
                      toggleTransitionPanel={toggleTransitionsPanel}
                      isAnimationPanelOpen={isAnimationPanelOpen}
                      toggleAnimationPanel={toggleAnimationPanel}
                      screen={screen}
                      isSelectedElementsAudio={isSelectedElementsAudio}
                      selectedAudioElements={selectedAudioElements}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {store.canvas && (
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              width: '100%',
            }}
          >
            <Rnd
              className="timeline-rnd"
              default={{
                x: 0,
                y: window.innerHeight - timelineHeight,
                width: '100%',
                height: timelineHeight,
              }}
              minHeight={74}
              maxHeight={320}
              enableResizing={{ top: true }}
              disableDragging={true}
              bounds="window"
              onResize={(e, direction, ref, delta, position) => {
                const newHeight = ref.offsetHeight;
                setTimelineHeight(newHeight);

                // Adjust container padding
                if (containerRef.current) {
                  containerRef.current.style.paddingBottom = `${newHeight}px`;
                }
              }}
              position={{ x: 0, y: window.innerHeight - timelineHeight }}
              resizeHandleClasses={{
                top: styles.resizeHandle,
              }}
            >
              <TimeLine
                overlays={store.editorElements}
                currentScale={currentScale}
                setCurrentScale={setCurrentScale}
                currentVolume={getCurrentVolumeValue()}
                storyData={storyData}
                isCutMode={isCutMode}
                defaultButton={defaultButton}
                setIsCutMode={setIsCutMode}
                handleMuteToggle={handleMuteToggle}
                handleVolumeChange={handleVolumeChange}
                isMuted={isMuted}
                volumeRangeRef={volumeRangeRef}
                onUndo={onUndo}
                onRedo={onRedo}
                isUndoRedoLoading={isUndoRedoInProgress}
                handlePlaybackClick={() => handleClick('playbackOpen')}
                isActiveScreen={activeScreens.includes('playback')}
                onOpenTransitionPanel={handleOpenTransitionPanel}
                onOpenEffectPanel={handleOpenEffectPanel}
                isSelectedElementsAudio={isSelectedElementsAudio}
                selectedAudioElements={selectedAudioElements}
                isInitializing={
                  !isInitialized || store?.isInitializationInProgress
                }
                initializingMessage={
                  store?.isInitializationInProgress
                    ? 'Loading timeline....'
                    : isInitializing.current && !isInitialized
                      ? 'Loading story data....'
                      : 'Loading timeline....'
                }
              />
            </Rnd>
          </div>
        )}
        {/* <VideoUploadPanel user={user} storyId={storyId} store={store} /> */}
      </section>
    </DndProvider>
  );
}

const VideoCreationPageWithObserver = observer(VideoCreationPage);
export { VideoCreationPageWithObserver as VideoCreationPage };
