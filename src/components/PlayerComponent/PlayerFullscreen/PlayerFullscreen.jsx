import styles from './PlayerFullscreen.module.scss';
import MainModal from 'components/overlays/MainModal';
import { SeekPlayer } from 'components/PlayerComponent/timeline-related/SeekPlayer';
import { useEffect } from 'react';

const PlayerFullscreen = ({
  handleFullscreenOpen,
  storyData,
  isMuted,
  currentVolume,
  handleVolumeChange,
  handleMuteToggle,
  volumeRangeRef,
  isCanvasSyncing,
  isSelectedElementsAudio = false,
  selectedAudioElements = [],
}) => {
  // Add keyboard event listener for fullscreen exit
  useEffect(() => {
    const handleKeyDown = e => {
      // Check if Escape is pressed to exit fullscreen
      if (e.key === 'Escape') {
        handleFullscreenOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFullscreenOpen]);

  return (
    <MainModal
      children={
        <div className={styles.fullscreen_container}>
          <div className={styles.playerContainer}>
            <div
              id="fullscreen-canvas-container"
              className={styles.canvasContainer}
            >
              <canvas id="fullscreen-canvas" className={styles.canvasElement} />
              {isCanvasSyncing && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loadingSpinner} />
                </div>
              )}
              <div className={styles.seekPlayerWrapper}>
                <SeekPlayer
                  isMuted={isMuted}
                  currentVolume={currentVolume}
                  handleVolumeChange={handleVolumeChange}
                  handleMuteToggle={handleMuteToggle}
                  volumeRangeRef={volumeRangeRef}
                  isFullScreen
                  isFullscreenOpen
                  isSelectedElementsAudio={isSelectedElementsAudio}
                  selectedAudioElements={selectedAudioElements}
                />
              </div>
            </div>
          </div>
        </div>
      }
      closeModal={handleFullscreenOpen}
      icon="CollapsFullscreenIcon"
      closeBtnSize="46.26px"
    />
  );
};

export { PlayerFullscreen };
