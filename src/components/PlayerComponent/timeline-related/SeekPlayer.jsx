import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from '../../../mobx';
import { BsPlayFill, BsPauseFill } from 'react-icons/bs';
import styles from '../Player.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { PlayIcon, PauseIcon, MuteIcon, SoundIcon } from 'components/Icons';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';

const formatTime = ms => {
  const time = Math.max(0, Math.floor(ms));

  const totalSeconds = Math.floor(time / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const formatTimeWithPlaybackRate = (ms, playbackRate) => {
  const adjustedTime = ms / playbackRate;
  return formatTime(adjustedTime);
};

export const SeekPlayer = observer(
  ({
    isMuted,
    currentVolume,
    handleVolumeChange,
    handleMuteToggle,
    volumeContainerRef,
    isFullScreen,
    isFullscreenOpen,
    isSelectedElementsAudio = false,
    selectedAudioElements = [],
  }) => {
    const store = React.useContext(StoreContext);
    const Icon = store.playing ? BsPauseFill : BsPlayFill;
    const seekIntervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const isSeekingRef = useRef(false);
    const progressBarRef = useRef(100);
    const volumeRangeRef = useRef(currentVolume);
    const volumeNumberRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // State to preserve animation selection during preview
    const [preservedAnimationSelection, setPreservedAnimationSelection] =
      useState(null);
    const [isPlayingAnimationPreview, setIsPlayingAnimationPreview] =
      useState(false);

    useEffect(() => {
      if (volumeRangeRef.current) {
        volumeRangeRef.current.style.setProperty(
          '--range-progress',
          `${currentVolume}%`
        );
      }
    }, [currentVolume]);

    // Effect to sync preserved selection with store selection, but prevent clearing during preview
    useEffect(() => {
      // Only update preserved selection if we're not currently playing animation preview
      if (!isPlayingAnimationPreview) {
        if (store?.selectedElement?.type === 'animation') {
          setPreservedAnimationSelection(store.selectedElement);
        } else if (!store?.selectedElement) {
          // User manually cleared selection - clear preserved selection too

          setPreservedAnimationSelection(null);
        } else if (store?.selectedElement?.type !== 'animation') {
          // User selected something that's not an animation - clear preserved selection

          setPreservedAnimationSelection(null);
        }
      } else {
      }
    }, [store?.selectedElement, isPlayingAnimationPreview]);

    // Effect to temporarily override setSelectedElement during preview to prevent clearing
    useEffect(() => {
      if (isPlayingAnimationPreview && store && store.setSelectedElement) {
        // Store the original method
        const originalSetSelectedElement = store.setSelectedElement.bind(store);

        // Override the method during preview
        store.setSelectedElement = element => {
          // Only allow setting selection to null if we're explicitly restoring the preserved selection
          if (element === null && preservedAnimationSelection) {
            // Ignore attempts to clear selection during preview

            return;
          }
          // Allow other operations
          originalSetSelectedElement(element);
        };

        // Cleanup - restore original method when preview ends
        return () => {
          store.setSelectedElement = originalSetSelectedElement;
        };
      }
    }, [isPlayingAnimationPreview, store, preservedAnimationSelection]);

    // Create a function to handle animation preview - same logic as TimeLine
    const handleAnimationPreview = (selectedElement, store) => {
      if (!selectedElement || !selectedElement.timeFrame) {
        return false;
      }

      // Check if selected element is an animation
      if (selectedElement.type === 'animation' && selectedElement.animationId) {
        // Preserve the animation selection
        setPreservedAnimationSelection(selectedElement);
        setIsPlayingAnimationPreview(true);
        // Find the original animation in store
        const originalAnimation = store.animations.find(
          anim => anim.id === selectedElement.animationId
        );

        if (originalAnimation) {
          if (originalAnimation.type === 'glTransition') {
            // Handle GL Transition preview
            const animationStart =
              originalAnimation.startTime || selectedElement.timeFrame.start;
            const animationEnd =
              originalAnimation.endTime || selectedElement.timeFrame.end;

            // Set current time to the start of the transition
            store.updateTimeTo(animationStart);
            // Start playing
            store.setPlaying(true);

            // Stop playing after transition duration
            setTimeout(() => {
              store.setPlaying(false);
              // Set time back to start of transition
              store.updateTimeTo(animationStart);
              // End preview mode first, then restore selection
              setIsPlayingAnimationPreview(false);
              // Small delay to ensure the preview flag is updated before restoring selection
              setTimeout(() => {
                if (preservedAnimationSelection) {
                  store.setSelectedElement(preservedAnimationSelection);
                }
              }, 10);
            }, animationEnd - animationStart);

            return true; // Indicate that animation preview was handled
          } else {
            // Handle regular animation preview
            // Find the target element this animation is applied to
            const targetElement = store.editorElements.find(
              el =>
                el.id === originalAnimation.targetId && el.type !== 'animation'
            );

            if (targetElement) {
              // Use the target element's timeframe and animation timing
              const elementStart = targetElement.timeFrame.start;
              const animationProps = originalAnimation.properties || {};
              const animationStart =
                elementStart + (animationProps.startTime || 0);
              const animationEnd =
                elementStart +
                (animationProps.endTime || originalAnimation.duration || 1000);

              // Set current time to the start of the animation
              store.updateTimeTo(animationStart);
              // Start playing
              store.setPlaying(true);

              // Stop playing after animation duration
              setTimeout(() => {
                store.setPlaying(false);
                // Set time back to start of animation
                store.updateTimeTo(animationStart);
                // End preview mode first, then restore selection
                setIsPlayingAnimationPreview(false);
                // Small delay to ensure the preview flag is updated before restoring selection
                setTimeout(() => {
                  if (preservedAnimationSelection) {
                    store.setSelectedElement(preservedAnimationSelection);
                  }
                }, 10);
              }, animationEnd - animationStart);

              return true; // Indicate that animation preview was handled
            }
          }
        }
      }
      return false; // Indicate that regular playback should be used
    };

    useKeyboardShortcuts(
      {
        Space: (event, store) => {
          // Use preserved selection if we're currently playing animation preview
          const selectedElement =
            preservedAnimationSelection || store?.selectedElement;

          // Check if there's a selected animation element
          if (selectedElement && selectedElement.type === 'animation') {
            const wasAnimationHandled = handleAnimationPreview(
              selectedElement,
              store
            );
            if (!wasAnimationHandled) {
              // Fallback to regular play/pause

              store.setPlaying(!store.playing);
            }
          } else {
            // No animation selection, use regular play/pause

            store.setPlaying(!store.playing);
          }
        },
        ArrowLeft: (event, store) => {
          handleClick(-5);
          startSeeking(-0.5);
        },
        ArrowRight: (event, store) => {
          handleClick(5);
          startSeeking(0.5);
        },
      },
      {
        includeKeyUp: true,
        keyUpHandlers: {
          ArrowLeft: () => stopSeeking(),
          ArrowRight: () => stopSeeking(),
        },
        store: store,
      }
    );

    const handleSkip = seconds => {
      const newTime = store.currentTimeInMs + seconds * 1000;
      store.handleSeek(Math.max(0, Math.min(newTime, store.lastElementEnd)));
    };

    const startSeeking = seconds => {
      if (seekIntervalRef.current) return;

      // Start seeking only after holding for 500ms
      timeoutRef.current = setTimeout(() => {
        isSeekingRef.current = true;
        seekIntervalRef.current = setInterval(() => {
          handleSkip(seconds);
        }, 16);
      }, 500);
    };

    const stopSeeking = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (seekIntervalRef.current) {
        clearInterval(seekIntervalRef.current);
        seekIntervalRef.current = null;
      }
      // Reset the seeking flag after a short delay to allow click handling
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    };

    const handleClick = seconds => {
      if (!isSeekingRef.current) {
        handleSkip(seconds);
      }
    };

    const calculateProgress = () => {
      return (store.currentTimeInMs / store.lastElementEnd) * 100;
    };

    const handleProgressBarMouseDown = e => {
      if (!progressBarRef.current) return;
      setIsDragging(true);

      const handleDrag = dragEvent => {
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPosition = Math.max(
          0,
          Math.min(dragEvent.clientX - rect.left, rect.width)
        );
        const percentage = (clickPosition / rect.width) * 100;
        const newTime = (store.lastElementEnd * percentage) / 100;

        store.handleSeek(Math.max(0, Math.min(newTime, store.lastElementEnd)));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleMouseUp);

      // Initial position
      handleDrag(e);
    };

    const handleProgressBarClick = e => {
      if (isDragging) return;
      if (!progressBarRef.current) return;

      const rect = progressBarRef.current.getBoundingClientRect();
      const clickPosition = e.clientX - rect.left;
      const percentage = (clickPosition / rect.width) * 100;
      const newTime = (store.lastElementEnd * percentage) / 100;

      store.handleSeek(Math.max(0, Math.min(newTime, store.lastElementEnd)));
    };

    useKeyboardShortcuts({
      handleSkip,
      startSeeking,
      stopSeeking,
      handleClick,
    });

    return (
      <div
        className={`${styles.seekPlayer} ${
          store.playing || isFullScreen ? styles.playing : ''
        } ${isFullScreen ? styles.fullscreen : ''}`}
      >
        <div className={styles.seekPlayer_timeLine}>
          <ButtonWithIcon
            icon={store.playing ? 'PauseIcon' : 'PlayIcon'}
            size={isFullScreen ? '25' : '18'}
            accentColor="white"
            color={store.playing ? '#FFFFFF' : '#FFFFFF66'}
            onClick={() => store.setPlaying(!store.playing)}
            classNameButton={styles.play_button_Center}
            classNameIcon={`${styles.play_icon} ${
              store.playing ? '' : styles.active
            }`}
            tooltipText={store.playing ? 'Pause' : 'Play'}
          />
          <div
            className={
              isFullScreen
                ? styles.progressBarContainerFull
                : styles.progressBarContainer
            }
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            onMouseDown={handleProgressBarMouseDown}
          >
            <div
              className={styles.progressBar}
              style={{
                width: `${calculateProgress()}%`,
                backgroundColor: store.playing ? '#FFFFFF' : '#d9d9d952',
              }}
            />
          </div>
        </div>
        <div className={styles.controlRow}>
          <div className={`${styles.volumeControlNew} ${isSelectedElementsAudio ? styles.audioElementSelected : ''}`}>
            <button className={styles.scaleButton} onClick={handleMuteToggle}>
              {isMuted ? (
                <MuteIcon />
              ) : (
                <SoundIcon 
                  color={isSelectedElementsAudio ? "var(--accent-color)" : "#FFFFFF66"} 
                  className={styles.scaleButton} 
                />
              )}
            </button>
            <div className={styles.scaleRangeInputBox} ref={volumeContainerRef}>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={currentVolume}
                onChange={handleVolumeChange}
                className={`${styles.volumeRange} ${isSelectedElementsAudio ? styles.audioElementSelected : ''}`}
                ref={volumeRangeRef}
                style={{
                  '--range-progress': `${currentVolume}%`,
                }}
              />
              <input
                type="number"
                min="0"
                max="200"
                value={Math.round(currentVolume * 2)}
                ref={volumeNumberRef}
                onChange={e => {
                  const inputValue = parseInt(e.target.value) || 0;
                  const value = Math.min(100, Math.max(0, inputValue / 2));
                  handleVolumeChange({
                    target: { value },
                  });
                }}
                className={`${styles.scalePercentage} ${isSelectedElementsAudio ? styles.audioElementSelected : ''}`}
              />
            </div>
          </div>
          {isFullscreenOpen && (
            <div className={styles.timeContainer}>
              <span
                className={`${styles.timeText} ${
                  isFullScreen ? styles.fullscreen : ''
                }`}
              >
                {formatTimeWithPlaybackRate(
                  store.currentTimeInMs,
                  store.playbackRate
                )}
              </span>
              <span
                className={`${styles.timeText} ${
                  isFullScreen ? styles.fullscreen : ''
                }`}
              >
                /
              </span>
              <span
                className={`${styles.timeText} ${
                  isFullScreen ? styles.fullscreen : ''
                }`}
              >
                {formatTimeWithPlaybackRate(
                  store.lastElementEnd,
                  store.playbackRate
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);
