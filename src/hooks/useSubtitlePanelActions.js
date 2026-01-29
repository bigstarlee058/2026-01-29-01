import { useCallback } from 'react';

/**
 * Hook for handling trigger events in SubtitlesPanel component
 * @param {Object} params - Parameters object
 * @param {Function} params.getAutomaticSubtitles - Function to generate automatic subtitles
 * @param {Function} params.regenerateSubtitles - Function to regenerate subtitles
 * @param {Function} params.generateSubtitlesFromSelectedAudios - Function to generate from selected audios
 * @param {Function} params.handleHideAllTimings - Function to hide subtitle timings
 * @param {Function} params.handleSaveStyle - Function to save subtitle style
 * @param {Function} params.handleConfirmDelete - Function to delete all subtitles
 * @param {Function} params.setStyleMenuActive - Function to control style menu visibility
 * @param {Object} params.fileInputRef - Ref to file input element
 * @returns {Function} Handler function that returns event listeners
 */
const useSubtitlePanelActions = ({
  getAutomaticSubtitles,
  regenerateSubtitles,
  generateSubtitlesFromSelectedAudios,
  handleHideAllTimings,
  handleSaveStyle,
  handleConfirmDelete,
  setStyleMenuActive,
  fileInputRef
}) => {
  const getSubtitlePanelEventListeners = useCallback(() => {
    const handleTriggerSubtitleGeneration = () => {
      getAutomaticSubtitles();
    };

    const handleTriggerAutomaticSubtitleGeneration = () => {
      getAutomaticSubtitles();
    };

    const handleTriggerSubtitleRegeneration = () => {
      regenerateSubtitles();
    };

    const handleTriggerGenerateSubtitlesFromSelectedAudios = () => {
      generateSubtitlesFromSelectedAudios();
    };

    const handleTriggerHideAllTimings = () => {
      handleHideAllTimings();
    };

    const handleTriggerSaveSubtitleStyle = () => {
      handleSaveStyle();
    };

    const handleTriggerUploadSubtitleFile = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleTriggerDeleteAllSubtitles = () => {
      handleConfirmDelete();
    };

    const handleTriggerOpenSubtitleDesign = () => {
      setStyleMenuActive(true);
    };

    const handleTriggerCloseSubtitleDesign = () => {
      setStyleMenuActive(false);
    };

    // Event listeners registration for trigger events
    const eventListeners = [
      { event: 'triggerSubtitleGeneration', handler: handleTriggerSubtitleGeneration },
      { event: 'triggerSubtitleRegeneration', handler: handleTriggerSubtitleRegeneration },
      { event: 'triggerHideAllTimings', handler: handleTriggerHideAllTimings },
      { event: 'triggerSaveSubtitleStyle', handler: handleTriggerSaveSubtitleStyle },
      { event: 'triggerUploadSubtitleFile', handler: handleTriggerUploadSubtitleFile },
      { event: 'triggerDeleteAllSubtitles', handler: handleTriggerDeleteAllSubtitles },
      { event: 'triggerOpenSubtitleDesign', handler: handleTriggerOpenSubtitleDesign },
      { event: 'triggerCloseSubtitleDesign', handler: handleTriggerCloseSubtitleDesign },
    ];

    return eventListeners;
  }, [
    getAutomaticSubtitles,
    regenerateSubtitles,
    generateSubtitlesFromSelectedAudios,
    handleHideAllTimings,
    handleSaveStyle,
    handleConfirmDelete,
    setStyleMenuActive,
    fileInputRef
  ]);

  return getSubtitlePanelEventListeners;
};

export default useSubtitlePanelActions;