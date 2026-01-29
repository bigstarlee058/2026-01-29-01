import { useState, useEffect, useRef, useCallback } from 'react';

export const useSimpleAudioPlayer = () => {
  const [currentVolume, setCurrentVolume] = useState(50);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioErrors, setAudioErrors] = useState(new Set());
  const [wavesurfer, setWavesurfer] = useState(null);

  const timeUpdateInterval = useRef(null);
  const isMountedRef = useRef(true);
  const stateChangeTimeoutRef = useRef(null);
  const lastStateChangeRef = useRef(0);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopAudio();
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }
    };
  }, []);

  // Debounced state change function to prevent rapid icon switching
  const debouncedSetIsPlaying = useCallback((newState) => {
    const now = Date.now();
    const timeSinceLastChange = now - lastStateChangeRef.current;
    
    // If less than 300ms since last change, delay the state change
    if (timeSinceLastChange < 300) {
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }
      
      stateChangeTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsPlaying(newState);
          lastStateChangeRef.current = Date.now();
        }
      }, 300 - timeSinceLastChange);
    } else {
      // If enough time has passed, change immediately
      setIsPlaying(newState);
      lastStateChangeRef.current = now;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (wavesurfer) {
      try {
        wavesurfer.pause();
        // Clean up event listeners if cleanup function exists
        if (wavesurfer.cleanup) {
          wavesurfer.cleanup();
        }
      } catch (error) {
        console.warn('Error pausing wavesurfer:', error);
      }
    }
    if (isMountedRef.current) {
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setCurrentAudioTime(0);
      setIsAudioLoading(false);
    }
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, [wavesurfer]);

  const handleVolumeChange = useCallback((value) => {
    // Handle different input formats like VolumeControl component does
    let newVolume;
    if (typeof value === 'object' && value.target) {
      // Handle event object from input
      newVolume = parseFloat(value.target.value) || 0;
    } else if (typeof value === 'string') {
      // Handle string value from range input
      newVolume = parseFloat(value) || 0;
    } else if (typeof value === 'number') {
      // Handle direct number value
      newVolume = value;
    } else {
      // Fallback to 0 if invalid input
      newVolume = 0;
    }

    // Validate and clamp the volume value
    newVolume = Math.max(0, Math.min(100, newVolume));

    // Only update if the value is finite and different
    if (Number.isFinite(newVolume) && newVolume !== currentVolume) {
      setCurrentVolume(newVolume);

      // Convert to 0-1 range for wavesurfer
      const normalizedVolume = newVolume / 100;

      if (wavesurfer && Number.isFinite(normalizedVolume)) {
        try {
          wavesurfer.setVolume(normalizedVolume);
        } catch (error) {
          console.warn('Error setting wavesurfer volume:', error);
        }
      }
    }
  }, [wavesurfer, currentVolume]);

  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }

    timeUpdateInterval.current = setInterval(() => {
      if (wavesurfer && isPlaying && isMountedRef.current) {
        try {
          const currentTime = wavesurfer.getCurrentTime();
          if (Number.isFinite(currentTime)) {
            setCurrentAudioTime(currentTime);
          }
        } catch (error) {
          console.warn('Error getting wavesurfer current time:', error);
        }
      }
    }, 100);
  }, [wavesurfer, isPlaying]);

  const handleWaveformClick = useCallback((clickTime, index) => {
    if (currentlyPlaying === index) {
      if (wavesurfer) {
        try {
          const duration = wavesurfer.getDuration();
          const progress = clickTime / duration;
          wavesurfer.seekTo(progress);

          // If audio was paused and we seek, start playing
          if (!isPlaying) {
            debouncedSetIsPlaying(true);
            startTimeUpdate();
          }
        } catch (error) {
          console.warn('Error seeking in wavesurfer:', error);
        }
      }
    }
  }, [currentlyPlaying, wavesurfer, isPlaying, startTimeUpdate, debouncedSetIsPlaying]);

  const handlePlayClick = useCallback(async (item, index) => {
    if (!item.url) {
      setAudioErrors(prev => new Set([...prev, item.id]));
      return;
    }

    // If clicking the same item that's currently playing, toggle play/pause
    if (currentlyPlaying === index) {
      if (isPlaying) {
        // Pause current audio - let the WaveSurferWaveform component handle the actual pause
        debouncedSetIsPlaying(false);
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
          timeUpdateInterval.current = null;
        }
      } else {
        // Resume current audio - let the WaveSurferWaveform component handle the actual play
        debouncedSetIsPlaying(true);
        startTimeUpdate();
      }
      return;
    }

    // Stop any currently playing audio and clean up
    stopAudio();

    // Start playing new audio
    setCurrentlyPlaying(index);
    setIsAudioLoading(true);
    setCurrentAudioTime(0);
    setAudioDuration(0);
    setAudioErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });

    // Check if wavesurfer is already ready for this item
    if (wavesurfer && wavesurfer.isReady) {
      setIsAudioLoading(false);
      setAudioDuration(wavesurfer.getDuration() || 0);
      
      // Let the WaveSurferWaveform component handle the actual play call
      debouncedSetIsPlaying(true);
    } else {
      // The wavesurfer will start playing when it becomes ready
      // and the ready event will set isAudioLoading to false
      debouncedSetIsPlaying(true);
    }

    // Set up time update interval for wavesurfer
    startTimeUpdate();

  }, [currentlyPlaying, isPlaying, wavesurfer, stopAudio, startTimeUpdate, debouncedSetIsPlaying]);



  const setWavesurferInstance = useCallback((instance) => {
    if (instance) {
      // Add event listeners to wavesurfer
      const handleReady = () => {
        if (isMountedRef.current) {
          setIsAudioLoading(false);
          setAudioDuration(instance.getDuration() || 0);
          
          // The WaveSurferWaveform component will handle play/pause based on isPlaying state
          // No need to manually call play here
        }
      };

      const handlePlay = () => {
        if (isMountedRef.current) {
          setIsAudioLoading(false);
          // Use debounced state change to prevent rapid icon switching
          debouncedSetIsPlaying(true);
        }
      };

      const handlePause = () => {
        if (isMountedRef.current) {
          // Use debounced state change to prevent rapid icon switching
          debouncedSetIsPlaying(false);
        }
      };

      const handleError = (error) => {
        console.error('WaveSurfer error:', error);
        if (isMountedRef.current) {
          setIsAudioLoading(false);
          debouncedSetIsPlaying(false);
          setCurrentlyPlaying(null);
          setAudioErrors(prev => new Set([...prev, 'wavesurfer-error']));
        }
      };

      const handleFinish = () => {
        if (isMountedRef.current) {
          debouncedSetIsPlaying(false);
          setCurrentlyPlaying(null);
          setCurrentAudioTime(0);
          setIsAudioLoading(false);
        }
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
          timeUpdateInterval.current = null;
        }
      };

      // Add event listeners
      instance.on('ready', handleReady);
      instance.on('play', handlePlay);
      instance.on('pause', handlePause);
      instance.on('error', handleError);
      instance.on('finish', handleFinish);

      // Store cleanup function
      instance.cleanup = () => {
        instance.un('ready', handleReady);
        instance.un('play', handlePlay);
        instance.un('pause', handlePause);
        instance.un('error', handleError);
        instance.un('finish', handleFinish);
      };
    }

    setWavesurfer(instance);
  }, [debouncedSetIsPlaying]);

  // Function to check if audio is actually playing (for UI purposes)
  const isActuallyPlaying = useCallback(() => {
    if (!wavesurfer) return false;
    
    try {
      // Check if wavesurfer is actually playing
      return wavesurfer.isPlaying();
    } catch (error) {
      console.warn('Error checking wavesurfer playing state:', error);
      return isPlaying; // Fallback to state
    }
  }, [wavesurfer, isPlaying]);

  return {
    currentVolume,
    currentlyPlaying,
    isPlaying,
    isAudioLoading,
    currentAudioTime,
    audioDuration,
    audioErrors,
    wavesurfer,
    handleVolumeChange,
    handleWaveformClick,
    handlePlayClick,
    setWavesurferInstance,
    stopAudio,
    isActuallyPlaying,
  };
}; 