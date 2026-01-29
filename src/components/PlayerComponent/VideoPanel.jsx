import { AnimationSidebar } from 'components/PlayerComponent/AnimationSidebar/AnimationSidebar';
import { SeekPlayer } from 'components/PlayerComponent/timeline-related/SeekPlayer';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { StoreContext } from '../../mobx';
import { Store } from '../../mobx/store';
import '../../utils/fabric-utils';
import styles from './Player.module.scss';
import { TypographyPanel } from '../../components/PlayerComponent/TypographyPanel/TypographyPanel';
import { CanvasDropZone } from './CanvasDropZone';

import { PlayerFullscreen } from 'components/PlayerComponent/PlayerFullscreen/PlayerFullscreen';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectActiveScene,
  setActiveScene,
} from '../../redux/scene/sceneSlice';

export const EditorWithStore = ({ data }) => {
  const [store] = useState(new Store());

  return (
    <StoreContext.Provider value={store}>
      <VideoPanel data={data} store={store}></VideoPanel>
    </StoreContext.Provider>
  );
};

export const VideoPanel = observer(
  ({
    storyData,
    isMuted,
    currentVolume,
    handleVolumeChange,
    handleMuteToggle,
    volumeRangeRef,
    isVideoPanelClicked,
    isImageEditingOpen,
    toggleImageEditing,
    isTypographyPanelOpen,
    toggleTypographyPanel,
    isSubtitlesPanelOpen,
    toggleSubtitlesPanel,
    isTransitionPanelOpen,
    toggleTransitionPanel,
    videoPanelRef,
    screen,
    isAnimationPanelOpen,
    toggleAnimationPanel,
    isSelectedElementsAudio = false,
    selectedAudioElements = [],
  }) => {
    const store = React.useContext(StoreContext);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [isCanvasSyncing, setIsCanvasSyncing] = useState(false);
      const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState('');
  const dispatch = useDispatch();
  
  // Effect to update rendering state from store
  useEffect(() => {
    if (store.renderingStatus) {
      setIsRendering(store.renderingStatus.state === 'rendering' || store.renderingStatus.state === 'complete');
      if (store.renderingStatus.progress !== undefined) {
        setRenderProgress(store.renderingStatus.progress);
      }
      if (store.renderingStatus.message) {
        setRenderMessage(store.renderingStatus.message);
      }
    } else {
      setIsRendering(false);
      setRenderProgress(0);
      setRenderMessage('');
    }
  }, [store.renderingStatus]);

  // Add useEffect to handle canvas synchronization
  useEffect(() => {
      if (isFullscreenOpen) {
        const mainCanvas = document.getElementById('canvas');
        const fullscreenCanvas = document.getElementById('fullscreen-canvas');

        const syncCanvas = () => {
          try {
            setIsCanvasSyncing(true);
            if (!mainCanvas || !fullscreenCanvas) {
              throw new Error('Canvas elements not found');
            }

            const context = fullscreenCanvas.getContext('2d');
            if (!context) {
              throw new Error('Could not get canvas context');
            }

            // Set dimensions
            try {
              fullscreenCanvas.width = mainCanvas.width;
              fullscreenCanvas.height = mainCanvas.height;
            } catch (dimensionError) {
              console.error('Error setting canvas dimensions:', dimensionError);
              return;
            }

            // Draw image
            try {
              context.drawImage(mainCanvas, 0, 0);
            } catch (drawError) {
              console.error('Error drawing to canvas:', drawError);
              return;
            } finally {
              setIsCanvasSyncing(false);
            }
          } catch (error) {
            console.error('Canvas sync error:', error);
            setIsCanvasSyncing(false);
          }
        };

        // Initial sync
        syncCanvas();

        // Set up animation frame loop for continuous sync
        let animationFrameId;
        const animate = () => {
          syncCanvas();
          try {
            animationFrameId = requestAnimationFrame(animate);
          } catch (error) {
            console.error('Error in animation frame:', error);
            setIsCanvasSyncing(false);
          }
        };

        // Start animation loop
        animate();

        // Cleanup
        return () => {
          try {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }
          } catch (error) {
            console.error('Error cleaning up animation frame:', error);
          } finally {
            setIsCanvasSyncing(false);
          }
        };
      }
    }, [isFullscreenOpen, store.currentTimeInMs]);

    // Add effect to listen for rendering state changes
    useEffect(() => {
      const handleRenderingStateChange = event => {
        const { state, progress } = event.detail;
        setIsRendering(state === 'rendering');
        if (progress !== undefined) {
          setRenderProgress(Math.min(100, Math.max(0, progress)));
        }
      };

      window.addEventListener(
        'renderingStateChange',
        handleRenderingStateChange
      );
      return () => {
        window.removeEventListener(
          'renderingStateChange',
          handleRenderingStateChange
        );
      };
    }, []);

    const handleFullscreenOpen = () => {
      setIsFullscreenOpen(!isFullscreenOpen);
    };

    // Handle keyboard events for the expand button
    const handleExpandKeyDown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll on space
        handleFullscreenOpen();
      }
    };

    // Video is active if it's either playing or paused in the middle
    const isVideoActive = () => {
      return (
        store.playing ||
        (store.currentTimeInMs >= 0 && store.currentTimeInMs < store.maxTime)
      );
    };

    const handlePanelClick = () => {
      // Find the image element that's currently in the VideoPanel
      const imageElement = store.editorElements.find(
        el => el.type === 'imageUrl' && el.fabricObject?.canvas === store.canvas
      );

      if (imageElement && storyData?.scenes) {
        // First, set this element as selected in MobX store

        // Find the element that should be active at this time
        const activeElement = store.selectedElement;

        if (activeElement) {
          const scene = storyData.scenes.find(
            scene => scene._id === activeElement.pointId
          );

          if (scene) {
            dispatch(setActiveScene(scene));
          }
        }
      }
    };

    return (
      <div
        className={`${styles.container} canvas ${
          isVideoActive() ? styles.playing : ''
        }`}
        onClick={handlePanelClick}
        data-testid="video-panel"
        data-interactive={true}
      >
        <div className={styles.playerContainer}>
          <div
            id="grid-canvas-container"
            ref={videoPanelRef}
            className={styles.canvasContainer}
          >
            {isTypographyPanelOpen && (
              <div className={styles.editingContainer}>
                <TypographyPanel
                  key="typography-panel"
                  onClose={toggleTypographyPanel}
                  storyData={storyData}
                />
              </div>
            )}
            <CanvasDropZone className={styles.canvasWrapper}>
              <canvas id="canvas" className={styles.canvasElement} />
              <div id="selection-layer" className={styles.selectionLayer}></div>
            </CanvasDropZone>
            {isRendering && (
              <div className={styles.renderingOverlay}>
                <div className={styles.renderingProgress}>
                  <div className={styles.progressText}>
                    {renderMessage || "Rendering video..."}{'  '}
                    <span className={styles.progressNumber}>
                      {Math.round(renderProgress)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  
                  {store.renderingStatus?.state === 'complete' && store.renderingStatus?.downloadUrl && (
                    <button 
                      className={styles.downloadButton}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = store.renderingStatus.downloadUrl;
                        link.download = `video-${new Date().toISOString().split('T')[0]}.mp4`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      Download Video
                    </button>
                  )}
                </div>
              </div>
            )}
            {!store.canvas?.getActiveObject() && (
              <ButtonWithIcon
                icon="ExpandIcon"
                color="white"
                accentColor="white"
                size="15"
                classNameButton={styles.expandBtn}
                onClick={handleFullscreenOpen}
                onKeyDown={handleExpandKeyDown}
                tabIndex={0}
              />
            )}

            <AnimationSidebar
              toggleImageEditing={toggleImageEditing}
              toggleTypographyPanel={toggleTypographyPanel}
              toggleSubtitlesPanel={toggleSubtitlesPanel}
              isSubtitlesPanelOpen={isSubtitlesPanelOpen}
              toggleTransitionPanel={toggleTransitionPanel}
              isTransitionPanelOpen={isTransitionPanelOpen}
              storyData={storyData}
              screen={screen}
              isAnimationPanelOpen={isAnimationPanelOpen}
              toggleAnimationPanel={toggleAnimationPanel}
              isImageEditingOpen={isImageEditingOpen}
              isTypographyPanelOpen={isTypographyPanelOpen}
            />
          </div>
        </div>
        {!store.canvas?.getActiveObject() && !store.isResizing && (
          <div className={styles.seekPlayer} onClick={e => e.stopPropagation()}>
            <SeekPlayer
              isMuted={isMuted}
              currentVolume={currentVolume}
              handleVolumeChange={handleVolumeChange}
              handleMuteToggle={handleMuteToggle}
              volumeRangeRef={volumeRangeRef}
              isFullscreenOpen={false}
              isSelectedElementsAudio={isSelectedElementsAudio}
              selectedAudioElements={selectedAudioElements}
            />
          </div>
        )}
        {isFullscreenOpen && (
          <PlayerFullscreen
            handleFullscreenOpen={handleFullscreenOpen}
            storyData={storyData}
            isMuted={isMuted}
            currentVolume={currentVolume}
            handleVolumeChange={handleVolumeChange}
            handleMuteToggle={handleMuteToggle}
            volumeRangeRef={volumeRangeRef}
            isCanvasSyncing={isCanvasSyncing}
            isFullscreenOpen={isFullscreenOpen}
            isSelectedElementsAudio={isSelectedElementsAudio}
            selectedAudioElements={selectedAudioElements}
          />
        )}
      </div>
    );
  }
);
