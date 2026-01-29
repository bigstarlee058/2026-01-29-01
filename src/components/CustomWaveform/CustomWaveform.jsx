import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

// Audio buffer cache for better performance
const AUDIO_BUFFER_CACHE = new Map();

// Custom audio waveform drawing function (adapted from timeline component)
const drawCustomWaveform = async (
  canvas,
  audioUrl,
  width = 134,
  height = 62,
  currentTime = 0,
  duration = 1,
  strokeColor
) => {
  if (!canvas || !audioUrl) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  try {
    let audioBuffer;
    if (AUDIO_BUFFER_CACHE.has(audioUrl)) {
      audioBuffer = AUDIO_BUFFER_CACHE.get(audioUrl);
    } else {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      AUDIO_BUFFER_CACHE.set(audioUrl, audioBuffer);
    }

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;

    // Barwave parameters
    const barWidth = 1;
    const barGap = 2;
    const totalBars = Math.floor(width / (barWidth + barGap));
    const samplesPerBar = Math.floor(totalSamples / totalBars);
    const centerY = height / 2;

    // Find the global peak for normalization
    let globalPeak = 0;
    for (let i = 0; i < totalSamples; i++) {
      globalPeak = Math.max(globalPeak, Math.abs(channelData[i]));
    }
    globalPeak = globalPeak || 1;

    for (let i = 0; i < totalBars; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, totalSamples);

      // Calculate peak amplitude for this bar
      let peak = 0;
      for (let j = start; j < end; j++) {
        peak = Math.max(peak, Math.abs(channelData[j]));
      }

      // Normalize and scale
      const normalized = peak / globalPeak;
      const barHeight = Math.max(2, normalized * height);

      // Calculate the time this bar represents
      const barTime = (i / totalBars) * duration;
      ctx.fillStyle =
        barTime < currentTime
          ? '#d3f85a' // red for played
          : strokeColor; // default for unplayed

      ctx.fillRect(
        i * (barWidth + barGap),
        centerY - barHeight / 2,
        barWidth,
        barHeight
      );
    }
  } catch (err) {
    console.error('Error in drawCustomWaveform:', err);
    // Optionally draw a fallback waveform here
  }
};

// Fallback waveform function
const drawFallbackWaveform = (
  ctx,
  width,
  height,
  strokeColor = 'rgba(255, 255, 255, 0.4)'
) => {
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;

  const centerY = height / 2;
  const maxAmplitude = height / 4;

  for (let x = 0; x < width; x += 0.5) {
    const amplitude = maxAmplitude * (0.9 + Math.random() * 0.2);
    const y = centerY + Math.sin(x / 3) * amplitude;

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
};

// Custom Waveform Component
const CustomWaveform = ({
  audioUrl,
  width = 89.33,
  height = 62,
  currentTime = 0,
  duration = 1,
  onClick,
  strokeColor = 'rgba(255, 255, 255, 0.7)',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    if (audioUrl) {
      drawCustomWaveform(
        canvas,
        audioUrl,
        width,
        height,
        currentTime,
        duration,
        strokeColor
      );
    } else {
      drawFallbackWaveform(canvas.getContext('2d'), width, height);
    }
  }, [audioUrl, width, height, currentTime, duration]);

  const handleClick = event => {
    if (!onClick || !duration) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check if click is within the canvas bounds
    if (
      clickX < 0 ||
      clickX > rect.width ||
      clickY < 0 ||
      clickY > rect.height
    ) {
      return;
    }

    // Calculate the time based on the click position using the display width
    const clickTime = (clickX / rect.width) * duration;

    // Call the onClick callback with the calculated time
    onClick(clickTime);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
};

CustomWaveform.propTypes = {
  audioUrl: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  onClick: PropTypes.func,
};

export default CustomWaveform;
