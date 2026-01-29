import { useCallback } from 'react';

/**
 * Hook for handling subtitle-related Lyra actions in VideoCreationPage
 * @param {Object} params - Parameters object
 * @param {Function} params.setActivePanels - Function to update active panels state
 * @returns {Function} Handler function that returns event listeners
 */
const useSubtitleActions = ({ setActivePanels }) => {
  const handleSubtitleActions = useCallback(() => {
    // Helper function to ensure subtitles panel is open
    const ensureSubtitlesPanelOpen = () => {
      setActivePanels(prev => ({ ...prev, subtitles: true }));
    };

    // Helper function to trigger subtitle actions
    const triggerSubtitleAction = (actionType, data = null) => {
      ensureSubtitlesPanelOpen();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`trigger${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, { 
          detail: data 
        }));
      }, 100);
    };

    const handleGenerateSubtitles = () => {
      triggerSubtitleAction('subtitleGeneration');
    };

    const handleGenerateAutomaticSubtitles = () => {
      triggerSubtitleAction('automaticSubtitleGeneration');
    };

    const handleRegenerateSubtitles = () => {
      triggerSubtitleAction('subtitleRegeneration');
    };

    const handleGenerateSubtitlesFromSelectedAudios = () => {
      triggerSubtitleAction('generateSubtitlesFromSelectedAudios');
    };

    const handleDeleteAllSubtitles = () => {
      triggerSubtitleAction('deleteAllSubtitles');
    };

    const handleHideSubtitleTimings = () => {
      triggerSubtitleAction('hideAllTimings');
    };

    const handleShowSubtitleTimings = () => {
      triggerSubtitleAction('showAllTimings');
    };

    const handleOpenSubtitleDesign = () => {
      triggerSubtitleAction('openSubtitleDesign');
    };

    const handleCloseSubtitleDesign = () => {
      triggerSubtitleAction('closeSubtitleDesign');
    };

    // Event listeners registration for subtitle actions - these match lyraSlice.js events
    const eventListeners = [
      { event: 'generateSubtitles', handler: handleGenerateSubtitles },
      { event: 'generateAutomaticSubtitles', handler: handleGenerateAutomaticSubtitles },
      { event: 'regenerateSubtitles', handler: handleRegenerateSubtitles },
      { event: 'generateSubtitlesFromSelectedAudios', handler: handleGenerateSubtitlesFromSelectedAudios },
      { event: 'deleteAllSubtitles', handler: handleDeleteAllSubtitles },
      { event: 'hideAllSubtitleTimings', handler: handleHideSubtitleTimings },
      { event: 'showAllSubtitleTimings', handler: handleShowSubtitleTimings },
      { event: 'openSubtitleDesign', handler: handleOpenSubtitleDesign },
      { event: 'closeSubtitleDesign', handler: handleCloseSubtitleDesign },
    ];

    return eventListeners;
  }, [setActivePanels]);

  return handleSubtitleActions;
};

export default useSubtitleActions;