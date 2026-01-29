import React, { useRef, useEffect, useState } from 'react';
import styles from './FullSizeVideo.module.scss';
import { createPortal } from 'react-dom';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import ReactSlider from 'react-slider';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';

const formatTime = time => {
  if (isNaN(time)) return '00:00.0';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const tenths = Math.floor((time % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${tenths}`;
};

const formatTimeRemaining = time => {
  if (isNaN(time)) return '00:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

const FullSizeVideo = ({ video, onClose, initialEditMode = false }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(100); // Store last non-zero volume
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(!initialEditMode); // Play automatically only in normal mode
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0); // Initialize with video.duration as fallback
  const [isSeeking, setIsSeeking] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [volume, setVolume] = useState(100);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const volumeNumberRef = useRef(null);
  const volumeContainerRef = useRef(null);
  const volumeRangeRef = useRef(null);
  const [isUserInput, setIsUserInput] = useState(false);
  const trimChangeTimeoutRef = useRef(null);

  // Get the final duration to display (prioritize video.duration over metadata duration)
  const displayDuration = video.duration || duration || 0;
  // Calculate time remaining
  const timeRemaining = Math.max(0, displayDuration - currentTime);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, video, volume, isMuted]);

  // Initialize trim end when duration is available
  useEffect(() => {
    if (displayDuration && displayDuration > 0 && trim.end === 0) {
      const initialTrim = { start: 0, end: displayDuration };
      setTrim(initialTrim);

      // Initialize undo stack with the default entry point
      setUndoStack([{ start: 0, end: displayDuration }]);
    }
  }, [displayDuration]);

  // Keep last non-zero volume for unmute
  useEffect(() => {
    if (volume > 0 && !isMuted) {
      setLastVolume(volume);
    }
  }, [volume, isMuted]);

  useKeyboardShortcuts({
    Space: (event, store) => {
      if (!isLoading) {
        setIsPlaying(prev => !prev);
      }
    }
  });

  const handleOverlayClick = e => {
    if (e.target === e.currentTarget && !isEditing) {
      onClose();
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      const metadataDuration =
        videoDuration && !isNaN(videoDuration) && videoDuration > 0
          ? videoDuration
          : 0;

      // Prioritize video.duration over metadata duration
      const finalDuration = video.duration || metadataDuration;

      setDuration(finalDuration);

      // If we still don't have a valid duration, try metadata as fallback
      if (!finalDuration || finalDuration <= 0) {
        setTimeout(() => {
          if (videoRef.current) {
            const retryDuration = videoRef.current.duration;
            if (retryDuration && !isNaN(retryDuration) && retryDuration > 0) {
              setDuration(retryDuration);
            }
          }
        }, 100);
      }
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleTimeUpdate = () => {
    if (!isSeeking && videoRef.current) {
      const currentVideoTime = videoRef.current.currentTime;

      // In editing mode, handle trim range
      if (isEditing && trim.end > trim.start) {
        if (currentVideoTime >= trim.end) {
          // Pause video and reset to trim start
          setIsPlaying(false);
          videoRef.current.currentTime = trim.start;
          setCurrentTime(trim.start);
        } else if (currentVideoTime < trim.start) {
          videoRef.current.currentTime = trim.start;
          setCurrentTime(trim.start);
        }
      } else {
        // In normal mode, handle end of video
        if (currentVideoTime >= displayDuration) {
          setIsPlaying(false);
          videoRef.current.currentTime = 0;
          setCurrentTime(0);
        }
      }

      setCurrentTime(currentVideoTime);
    }
  };

  const togglePlayPause = () => {
    if (!isLoading) {
      setIsPlaying(prev => !prev);
    }
  };

  const handleVideoClick = () => {
    if (!isLoading) {
      togglePlayPause();
    }
  };

  const handleTimelineChange = e => {
    const value = parseFloat(e.target.value);

    // In editing mode, clamp the timeline to trim range
    let clampedValue = value;
    if (isEditing && trim.end > trim.start) {
      clampedValue = Math.max(trim.start, Math.min(trim.end, value));
    }

    setCurrentTime(clampedValue);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedValue;
    }
  };

  const handleTimelineMouseDown = () => setIsSeeking(true);
  const handleTimelineMouseUp = e => {
    setIsSeeking(false);
    handleTimelineChange(e);
  };

  // --- Editing mode logic ---
  const handleCutClick = () => {
    setIsEditing(true);
    // Reset video position to trim start when entering edit mode
    if (videoRef.current && trim.start >= 0) {
      videoRef.current.currentTime = trim.start;
      setCurrentTime(trim.start);
    }
  };

  const handleVolumeChange = e => {
    const value = Number(e.target.value);
    setVolume(value);
    if (isMuted && value > 0) setIsMuted(false);
  };

  const handleVolumeNumberChange = e => {
    const inputValue = parseInt(e.target.value) || 0;
    const value = Math.min(100, Math.max(0, inputValue / 2));
    setVolume(value);
    if (isMuted && value > 0) setIsMuted(false);
  };

  // Handle scroll on number input to change volume
  const handleVolumeNumberWheel = e => {
    e.preventDefault();
    let inputValue = Math.round(volume * 2);
    if (e.deltaY < 0) {
      inputValue = Math.min(200, inputValue + 2); // Scroll up: increase
    } else {
      inputValue = Math.max(0, inputValue - 2); // Scroll down: decrease
    }
    const value = Math.min(100, Math.max(0, inputValue / 2));
    setVolume(value);
    if (isMuted && value > 0) setIsMuted(false);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      const newVolume = lastVolume > 0 ? lastVolume : 50;
      setVolume(newVolume);
      if (volumeNumberRef.current) {
        volumeNumberRef.current.value = Math.round(newVolume * 2);
      }
    } else {
      if (volume > 0) setLastVolume(volume);
      setIsMuted(true);
      setVolume(0);
      if (volumeNumberRef.current) {
        volumeNumberRef.current.value = 0;
      }
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const previousState = undoStack[undoStack.length - 2];

      setRedoStack(prev => [...prev, { start: trim.start, end: trim.end }]);

      setTrim(previousState);

      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];

      setUndoStack(prev => [...prev, { start: trim.start, end: trim.end }]);

      setTrim(nextState);

      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const handleTimeInputChange = (type, inputValue) => {
    // Parse time input (format: MM:SS.S)
    const timeMatch = inputValue.match(/(\d+):(\d+)\.(\d)/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const tenths = parseInt(timeMatch[3]);
      const totalSeconds = minutes * 60 + seconds + tenths * 0.1;

      setUndoStack(prev => [...prev, { start: trim.start, end: trim.end }]);
      setRedoStack([]);

      setTrim(t => ({ ...t, [type]: totalSeconds }));
    }
  };

  // Handle slider changes (continuous updates)
  const handleSliderChange = ([start, end]) => {
    setTrim({ start, end });
    // Immediately update video position to start of new trim range
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      setCurrentTime(start);
      // If video is playing, pause it to prevent unwanted playback
      if (isPlaying) {
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (trimChangeTimeoutRef.current) {
        clearTimeout(trimChangeTimeoutRef.current);
      }
    };
  }, []);

  // Ensure trim values are within bounds
  const clampedTrim = {
    start: Math.max(0, Math.min(trim.start, displayDuration)),
    end: Math.max(trim.start + 0.01, Math.min(trim.end, displayDuration)),
  };

  // Calculate progress percentage for timeline
  const progressPercentage = (() => {
    if (isEditing && trim.end > trim.start) {
      // In editing mode, calculate progress within trim range
      const trimDuration = trim.end - trim.start;
      const currentProgress = currentTime - trim.start;
      return trimDuration > 0 ? (currentProgress / trimDuration) * 100 : 0;
    } else {
      // Normal mode - calculate progress for full video
      return displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;
    }
  })();

  const modal = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.fullSizeVideoContainer}>
        <div className={styles.videoContainer}>
          <div className={styles.modal}>
            {!isEditing && (
              <ButtonWithIcon
                icon="CutIcon"
                classNameButton={styles.editBtn}
                size={'14px'}
                tooltipText="Edit video"
                onClick={handleCutClick}
              />
            )}

            <ButtonWithIcon
              icon="CloseIcon"
              classNameButton={styles.closeBtn}
              size="8px"
              onClick={onClose}
              tooltipText="Close video"
            />

            {isEditing && (
              <div className={styles.saveBtns}>
                {/* <button className={styles.saveBtn}>Save</button> */}

                <button className={styles.saveAsCopyBtn}>
                  Save to My Items
                </button>

                {/* <button 
                  className={styles.saveAsCopyBtn}
                  onClick={() => {
                    setIsEditing(false);
                    // Reset video position to beginning when exiting edit mode
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                >
                  Exit Edit Mode
                </button> */}
              </div>
            )}

            <div style={{ position: 'relative', width: '100%' }}>
              <video
                ref={videoRef}
                className={styles.fullVideo}
                src={video.videoLarge || video.videoTiny}
                poster={video.previewURLTiny}
                autoPlay={!initialEditMode}
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={handleCanPlay}
                onLoadStart={handleLoadStart}
                onTimeUpdate={handleTimeUpdate}
                onClick={handleVideoClick}
                style={{ width: '100%' }}
              />
              <div className={styles.videoShadowOverlay} />
            </div>
            {/* Default controls bar (hide in editing mode) */}
            {!isEditing && (
              <div className={styles.controlsBar}>
                <ButtonWithIcon
                  icon={
                    isLoading
                      ? 'LoadingIcon'
                      : isPlaying
                      ? 'PauseIcon'
                      : 'PlayIcon'
                  }
                  classNameButton={styles.playPauseBtn}
                  size={'17.5px'}
                  onClick={togglePlayPause}
                  tooltipText={
                    isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'
                  }
                  color="white"
                  disabled={isLoading}
                />
                <input
                  type="range"
                  min={isEditing && trim.end > trim.start ? trim.start : 0}
                  max={
                    isEditing && trim.end > trim.start
                      ? trim.end
                      : displayDuration
                  }
                  step={0.01}
                  value={currentTime}
                  onChange={handleTimelineChange}
                  onMouseDown={handleTimelineMouseDown}
                  onMouseUp={handleTimelineMouseUp}
                  className={styles.timeline}
                  style={{
                    background: `linear-gradient(to right, rgba(217, 217, 217, 1) ${progressPercentage}%, rgba(217, 217, 217, 0.32) ${progressPercentage}%)`,
                  }}
                />

                <span className={styles.durationText}>
                  {isEditing && trim.end > trim.start
                    ? formatTimeRemaining(trim.end - currentTime)
                    : formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Editing panel (floating, pixel-perfect) */}
        {isEditing && (
          <div
            className={`${styles.editingPanel} ${
              video.videoWidth > video.videoHeight ? styles.large : styles.small
            }`}
          >
            <div className={styles.editingPanelContent}>
              <div className={styles.editingPanelDefault}>
                <ButtonWithIcon
                  icon={
                    isLoading
                      ? 'LoadingIcon'
                      : isPlaying
                      ? 'PauseIcon'
                      : 'PlayIcon'
                  }
                  classNameButton={styles.play_button}
                  size={'16px'}
                  onClick={togglePlayPause}
                  tooltipText={
                    isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'
                  }
                  color="rgba(255, 255, 255, 0.4)"
                  disabled={isLoading}
                />

                <div className={`${styles.volumeControlNew}`}>
                  <ButtonWithIcon
                    icon={isMuted ? 'MuteIcon' : 'SoundIcon'}
                    accentColor="var(--accent-color)"
                    classNameButton={styles.scaleButton}
                    tooltipText={isMuted ? 'Unmute' : 'Mute'}
                    onClick={handleMuteToggle}
                  />
                  <div
                    className={styles.scaleRangeInputBox}
                    ref={volumeContainerRef}
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className={`${styles.volumeRange}`}
                      ref={volumeRangeRef}
                      style={{
                        '--range-progress': `${volume}%`,
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={Math.round(volume * 2)}
                      ref={volumeNumberRef}
                      onChange={handleVolumeNumberChange}
                      onWheel={handleVolumeNumberWheel}
                      className={styles.scalePercentage}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.undoRedoBtns}>
                <ButtonWithIcon
                  icon="UndoIcon"
                  classNameButton={styles.undoRedoBtn}
                  size={'18px'}
                  onClick={handleUndo}
                  tooltipText="Undo"
                  color="rgba(255, 255, 255, 0.4)"
                  disabled={undoStack.length <= 1}
                />

                <ButtonWithIcon
                  icon="RedoIcon"
                  classNameButton={styles.redoRedoBtn}
                  size={'18px'}
                  onClick={handleRedo}
                  tooltipText="Redo"
                  color="rgba(255, 255, 255, 0.4)"
                  disabled={redoStack.length === 0}
                />
              </div>

              <div className={styles.fullSizeVideoTrimSliderPanel}>
                <span
                  className={styles.timeText}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => {
                    const inputValue = e.target.textContent;
                    handleTimeInputChange('start', inputValue);
                  }}
                  onBlur={e => {
                    // Format the display when user finishes editing
                    e.target.textContent = formatTime(trim.start);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                >
                  {formatTime(trim.start)}
                </span>
                <ReactSlider
                  className={styles.trimSlider}
                  thumbClassName={styles.trimThumb}
                  trackClassName="trimTrack"
                  min={0}
                  max={displayDuration}
                  step={0.01}
                  value={[clampedTrim.start, clampedTrim.end]}
                  onChange={handleSliderChange}
                  onAfterChange={value => {
                    // Store the state BEFORE the change was made
                    const stateBeforeChange = {
                      start: trim.start,
                      end: trim.end,
                    };
                    setUndoStack(prev => [...prev, stateBeforeChange]);
                    setRedoStack([]);
                  }}
                  minDistance={0.01}
                  pearling
                  renderThumb={(props, state) => {
                    const { key, ...otherProps } = props;
                    return <div key={key} {...otherProps} />;
                  }}
                  renderTrack={(props, state) => {
                    const { key, ...otherProps } = props;
                    return <div key={key} {...otherProps} />;
                  }}
                />
                <span
                  className={styles.timeText}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => {
                    const inputValue = e.target.textContent;
                    handleTimeInputChange('end', inputValue);
                  }}
                  onBlur={e => {
                    // Format the display when user finishes editing
                    e.target.textContent = formatTime(trim.end);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                >
                  {formatTime(trim.end)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default FullSizeVideo;