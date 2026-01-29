import { useCallback } from 'react';

/**
 * Hook for handling Lyra chat actions in VideoCreationPage
 * @param {Object} params - Parameters object
 * @param {Function} params.setScreen - Function to change current screen
 * @param {Function} params.setGallerySearchText - Function to change search text in gallery
 * @param {Function} params.setActivePanels - Function to update active panels state
 * @param {Function} params.setIsStoryBoardOpen - Function to control storyboard open state
 * @param {Function} params.setIsChatOpen - Function to control chat open state
 * @param {Function} params.setActiveScreens - Function to control active screens
 * @returns {Function} Handler function that returns event listeners
 */
const useLyraActions = ({ 
  setScreen, 
  setGallerySearchText, 
  setActivePanels,
  setIsStoryBoardOpen,
  setIsChatOpen,
  setActiveScreens
}) => {
  const handleLyraActions = useCallback(() => {
    const handleOpenPanel = (event) => {
      const { panel } = event.detail;
      
      switch (panel) {
        case 'search':
          setScreen('search');
          break;
        case 'generateAI':
          setScreen('generateAI');
          break;
        case 'myItems':
          setScreen('myItems');
          break;
        case 'settings':
          setScreen('settings');
          break;
        case 'storyboard':
          setIsStoryBoardOpen(true);
          setActiveScreens(prev => [...new Set([...prev, 'storyboard'])]);
          break;
        case 'lyra':
          setIsChatOpen(true);
          break;
        default:
          console.warn('Unknown panel to open:', panel);
      }
    };

    const handleClosePanel = (event) => {
      const { panel } = event.detail;
      
      switch (panel) {
        case 'search':
          if (setScreen) setScreen('playback');
          break;
        case 'generateAI':
          if (setScreen) setScreen('playback');
          break;
        case 'myItems':
          if (setScreen) setScreen('playback');
          break;
        case 'settings':
          if (setScreen) setScreen('playback');
          break;
        case 'storyboard':
          setIsStoryBoardOpen(false);
          setActiveScreens(prev => prev.filter(screen => screen !== 'storyboard'));
          break;
        case 'lyra':
          setIsChatOpen(false);
          break;
        default:
          console.warn('Unknown panel to close:', panel);
      }
    };

    const handleOpenEditingPanel = (event) => {
      const { panel } = event.detail;
      setActivePanels(prev => ({ ...prev, [panel]: true }));
    };

    const handleCloseEditingPanel = (event) => {
      const { panel } = event.detail;
      setActivePanels(prev => ({ ...prev, [panel]: false }));
    };

    const handlePutSearchText = (event) => {
      if (event.detail) {
        setGallerySearchText(event.detail);
        setScreen('search');
      }
    };

    const handleCloseAllPanels = () => {
      setActivePanels({
        imageEditing: false,
        typography: false,
        subtitles: false,
        subtitlesStyles: false,
        subtitlesMenu: false,
        animation: false,
      });
      setIsStoryBoardOpen(false);
      setIsChatOpen(false);
      setScreen('playback');
    };

    const handleCloseAllEditingPanels = () => {
      setActivePanels(prev => ({
        ...prev,
        imageEditing: false,
        typography: false,
        subtitles: false,
        subtitlesStyles: false,
        animation: false,
      }));
    };

    const handleSwitchToPlayback = () => {
      setScreen('playback');
    };

    const handleOpenSubtitlesStylesPanel = () => {
      setActivePanels(prev => ({ ...prev, subtitlesStyles: true }));
    };

    const handleCloseSubtitlesStylesPanel = () => {
      setActivePanels(prev => ({ ...prev, subtitlesStyles: false }));
    };

    const handleOpenGalleryFilters = () => {
      setActivePanels(prev => ({ ...prev, filters: true }));
    };

    // Event listeners registration - these match the events dispatched by lyraSlice.js
    const eventListeners = [
      { event: 'openPanel', handler: handleOpenPanel },
      { event: 'closePanel', handler: handleClosePanel },
      { event: 'openEditingPanel', handler: handleOpenEditingPanel },
      { event: 'closeEditingPanel', handler: handleCloseEditingPanel },
      { event: 'putSearchText', handler: handlePutSearchText },
      { event: 'closeAllPanels', handler: handleCloseAllPanels },
      { event: 'closeAllEditingPanels', handler: handleCloseAllEditingPanels },
      { event: 'switchToPlayback', handler: handleSwitchToPlayback },
      { event: 'openSubtitlesStylesPanel', handler: handleOpenSubtitlesStylesPanel },
      { event: 'closeSubtitlesStylesPanel', handler: handleCloseSubtitlesStylesPanel },
      { event: 'openGalleryFilters', handler: handleOpenGalleryFilters }
    ];

    return eventListeners;
  }, [
    setScreen, 
    setGallerySearchText, 
    setActivePanels,
    setIsStoryBoardOpen,
    setIsChatOpen,
    setActiveScreens
  ]);

  return handleLyraActions;
};

export default useLyraActions;
