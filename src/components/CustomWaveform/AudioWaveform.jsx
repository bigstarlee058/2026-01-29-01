import React, { useState, useEffect } from 'react';
import WaveSurferWaveform from './WaveSurferWaveform';
import CustomWaveform from './CustomWaveform';
import PropTypes from 'prop-types';

const AudioWaveform = ({
  audioUrl,
  width = 98,
  height = 26,
  currentTime = 0,
  duration = 1,
  onClick,
  strokeColor = 'rgba(255, 255, 255, 0.7)',
  isPlaying = false,
  onReady,
  onTimeUpdate,
  forceFallback = false, // Force using CustomWaveform
  isFullWidthLoading
}) => {
  const [useWaveSurfer, setUseWaveSurfer] = useState(!forceFallback);
  const [hasWaveSurferError, setHasWaveSurferError] = useState(false);

  // Reset WaveSurfer preference when audio URL changes
  useEffect(() => {
    setUseWaveSurfer(!forceFallback);
    setHasWaveSurferError(false);
  }, [audioUrl, forceFallback]);

  // Handle WaveSurfer errors by falling back to CustomWaveform
  const handleWaveSurferError = () => {
setHasWaveSurferError(true);
    setUseWaveSurfer(false);
  };

  // If forced to use fallback or WaveSurfer had an error, use CustomWaveform
  if (!useWaveSurfer || hasWaveSurferError) {
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

  // Use WaveSurfer with error handling
  return (
    <WaveSurferWaveform
      audioUrl={audioUrl}
      width={width}
      height={height}
      currentTime={currentTime}
      duration={duration}
      onClick={onClick}
      strokeColor={strokeColor}
      isPlaying={isPlaying}
      onReady={onReady}
      onTimeUpdate={onTimeUpdate}
      onError={handleWaveSurferError}
      isFullWidthLoading={isFullWidthLoading}
    />
  );
};

AudioWaveform.propTypes = {
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
  forceFallback: PropTypes.bool,
};

export default AudioWaveform;
