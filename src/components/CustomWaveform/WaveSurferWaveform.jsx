import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import CustomWaveform from './CustomWaveform';
import PropTypes from 'prop-types';

const WaveSurferWaveform = ({
  audioUrl,
  width = 134,
  height = 26,
  currentTime = 0,
  duration = 1,
  onClick,
  strokeColor = 'rgba(255, 255, 255, 0.7)',
  isPlaying = false,
  onReady,
  onTimeUpdate,
  onError,
  isFullWidthLoading = false,
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAudioUrl, setLastAudioUrl] = useState('');

  // Validate and prepare audio URL
  const prepareAudioUrl = url => {
    if (!url) return null;

    // Handle relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
      return window.location.origin + url;
    }

    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    return url;
  };

  // Test if URL is accessible
  const testUrlAccessibility = async url => {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'same-origin',
      });
      return response.ok;
    } catch (error) {
      console.warn('URL accessibility test failed:', error);
      return false;
    }
  };

  // Clear timeout
  const clearTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Force fallback after timeout
  const forceFallback = () => {
    clearTimeout();
    console.warn('WaveSurfer loading timeout - using fallback');
    setHasError(true);
    setIsLoading(false);
    setUseFallback(true);
  };

  // Cleanup function
  const cleanup = () => {
    clearTimeout();
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      } catch (error) {
        console.warn('Error destroying WaveSurfer:', error);
      }
    }
  };

  useEffect(() => {
    // Reset states when audio URL changes
    if (audioUrl !== lastAudioUrl) {
      setLastAudioUrl(audioUrl);
      setRetryCount(0);
      setHasError(false);
      setUseFallback(false);
      setIsReady(false);
      cleanup();
    }

    if (!waveformRef.current || !audioUrl) {
      setIsLoading(false);
      return;
    }

    const validatedUrl = prepareAudioUrl(audioUrl);
    if (!validatedUrl) {
      setIsLoading(false);
      setUseFallback(true);
      return;
    }

    // Reset states
    setHasError(false);
    setIsLoading(true);
    setUseFallback(false);
    setIsReady(false);

    // Clear any existing timeout
    clearTimeout();

    // Test URL accessibility first
    testUrlAccessibility(validatedUrl).then(isAccessible => {
      if (!isAccessible) {
        console.warn('Audio URL not accessible, using fallback');
        setIsLoading(false);
        setUseFallback(true);
        return;
      }

      // Destroy previous instance if it exists
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying previous WaveSurfer:', error);
        }
      }

      // Set timeout for loading (6 seconds)
      timeoutRef.current = window.setTimeout(forceFallback, 6000);

      // Create new WaveSurfer instance with v7 API
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: strokeColor,
        progressColor: '#d3f85a', // Green color for played progress
        cursorColor: 'transparent', // Hide cursor
        barWidth: 1,
        barGap: 2,
        barRadius: 1,
        height: height,
        width: 'width',
        normalize: true,
        responsive: true,
        fillParent: true,
        interact: true,
        hideScrollbar: true,
        autoCenter: false,
        partialRender: true,
        pixelRatio: 1,
        // Add fetch options to handle CORS
        fetchParams: {
          mode: 'cors',
          credentials: 'same-origin',
        },
      });

      wavesurferRef.current = wavesurfer;

      // Event listeners for v7
      wavesurfer.on('ready', () => {
        clearTimeout();
setIsReady(true);
        setHasError(false);
        setIsLoading(false);
        if (onReady) onReady(wavesurfer);
      });

      wavesurfer.on('timeupdate', currentTime => {
        if (onTimeUpdate) onTimeUpdate(currentTime);
      });

      wavesurfer.on('seek', progress => {
        const time = progress * wavesurfer.getDuration();
        if (onTimeUpdate) onTimeUpdate(time);
      });

      // Error handling
      wavesurfer.on('error', error => {
        clearTimeout();
        console.warn('WaveSurfer error:', error);
        setHasError(true);
        setIsReady(false);
        setIsLoading(false);

        // Call onError callback if provided
        if (onError) {
          onError(error);
        }

        // Retry logic (max 1 attempt)
        if (retryCount < 1) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            // The useEffect will re-run due to retryCount change
          }, 1000);
        } else {
          // Use fallback after max retries
          setUseFallback(true);
        }
      });

      // Load audio with error handling
      try {
wavesurfer.load(validatedUrl);
      } catch (error) {
        clearTimeout();
        console.warn('Error loading audio:', error);
        setHasError(true);
        setIsLoading(false);
        setUseFallback(true);
      }
    });

    // Cleanup function
    return cleanup;
  }, [
    audioUrl,
    width,
    height,
    strokeColor,
    onReady,
    onTimeUpdate,
    retryCount,
    lastAudioUrl,
  ]);

  // Handle play/pause
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || hasError || useFallback) return;

    try {
      if (isPlaying) {
        wavesurferRef.current.play();
      } else {
        wavesurferRef.current.pause();
      }
    } catch (error) {
      console.warn('Error controlling playback:', error);
    }
  }, [isPlaying, isReady, hasError, useFallback]);

  // Handle seeking
  useEffect(() => {
    if (
      !wavesurferRef.current ||
      !isReady ||
      !duration ||
      hasError ||
      useFallback
    )
      return;

    try {
      const progress = currentTime / duration;
      wavesurferRef.current.seekTo(progress);
    } catch (error) {
      console.warn('Error seeking:', error);
    }
  }, [currentTime, duration, isReady, hasError, useFallback]);

  // Handle click for seeking
  const handleClick = event => {
    if (!onClick || hasError) return;

    if (useFallback) {
      // For fallback, use the original click handling
      return;
    }

    if (!wavesurferRef.current || !isReady) return;

    try {
      const rect = waveformRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const progress = clickX / rect.width;
      const clickTime = progress * wavesurferRef.current.getDuration();

      onClick(clickTime);
    } catch (error) {
      console.warn('Error handling click:', error);
    }
  };

  // Show loading state
  if (isLoading && !useFallback) {
    return (
      <div
        style={{
          width: isFullWidthLoading ? '100%' : `${width}px`,
          height: `${height}px`,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '10px',
            textAlign: 'center',
          }}
        >
          Loading...
        </span>
      </div>
    );
  }

  // Use fallback CustomWaveform if WaveSurfer failed
  if (useFallback) {
return (
      <CustomWaveform
        audioUrl={audioUrl}
        width={width}
        height={height}
        currentTime={currentTime}
        duration={duration}
        onClick={onClick}
        strokeColor={strokeColor}
      />
    );
  }

  // Show fallback if there's an error
  if (hasError && retryCount >= 1 && !useFallback) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={handleClick}
      >
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '10px',
            textAlign: 'center',
          }}
        >
          Audio unavailable
        </span>
      </div>
    );
  }

  return (
    <div
      ref={waveformRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        cursor: 'pointer',
        borderRadius: '4px',
        overflow: 'hidden',
        background: hasError ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      }}
      onClick={handleClick}
    />
  );
};

WaveSurferWaveform.propTypes = {
  audioUrl: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  onClick: PropTypes.func,
  strokeColor: PropTypes.string,
  isPlaying: PropTypes.bool,
  onReady: PropTypes.func,
  onTimeUpdate: PropTypes.func,
  onError: PropTypes.func,
};

export default WaveSurferWaveform;
