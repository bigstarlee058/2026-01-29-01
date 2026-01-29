// Audio editing utilities using Web Audio API and WaveSurfer.js
class AudioEditor {
  constructor() {
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 10;
  }

  // Create audio context
  createAudioContext() {
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  // Load audio buffer from URL
  async loadAudioBuffer(audioUrl) {
    const audioContext = this.createAudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  // Save current state to history
  saveToHistory(state) {
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new state
    this.history.push(state);
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  // Undo function
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return null;
  }

  // Redo function
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    return null;
  }

  // Cut audio at specific time
  async cutAudio(audioBuffer, cutTime) {
    const audioContext = this.createAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const cutSample = Math.floor(cutTime * sampleRate);
    
    // Create new buffer for the cut portion
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      cutSample,
      sampleRate
    );

    // Copy data from original buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);
      
      for (let i = 0; i < cutSample; i++) {
        newData[i] = originalData[i];
      }
    }

    return newBuffer;
  }

  // Remove silence from audio
  async removeSilence(audioBuffer, thresholdDb = -50, minSilenceMs = 100) {
    const audioContext = this.createAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const threshold = Math.pow(10, thresholdDb / 20);
    const minSilenceSamples = Math.floor((minSilenceMs / 1000) * sampleRate);
    
    const segments = [];
    let inSilence = false;
    let silenceStart = 0;
    let lastSoundEnd = 0;

    // Analyze audio for silence segments
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      const isSilent = amplitude < threshold;

      if (isSilent && !inSilence) {
        // Start of silence
        inSilence = true;
        silenceStart = i;
      } else if (!isSilent && inSilence) {
        // End of silence
        inSilence = false;
        const silenceDuration = i - silenceStart;
        
        if (silenceDuration >= minSilenceSamples) {
          // Add non-silent segment before this silence
          if (silenceStart > lastSoundEnd) {
            segments.push({
              start: lastSoundEnd,
              end: silenceStart
            });
          }
          lastSoundEnd = i;
        }
      }
    }

    // Add final segment if there's sound at the end
    if (lastSoundEnd < channelData.length) {
      segments.push({
        start: lastSoundEnd,
        end: channelData.length
      });
    }

    // If no segments found, return original buffer
    if (segments.length === 0) {
      return audioBuffer;
    }

    // Calculate total length of non-silent audio
    const totalSamples = segments.reduce((sum, segment) => {
      return sum + (segment.end - segment.start);
    }, 0);

    // Create new buffer with only non-silent parts
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      totalSamples,
      sampleRate
    );

    // Copy non-silent segments
    let newBufferIndex = 0;
    for (const segment of segments) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        
        for (let i = segment.start; i < segment.end; i++) {
          newData[newBufferIndex + (i - segment.start)] = originalData[i];
        }
      }
      newBufferIndex += segment.end - segment.start;
    }

    return newBuffer;
  }

  // Resize audio (change duration without changing pitch)
  async resizeAudio(audioBuffer, newDuration) {
    const audioContext = this.createAudioContext();
    const originalDuration = audioBuffer.duration;
    const ratio = newDuration / originalDuration;
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.floor(audioBuffer.length * ratio),
      audioBuffer.sampleRate
    );

    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create playback rate node
    const playbackRate = offlineContext.createGain();
    playbackRate.gain.value = ratio;
    
    // Connect nodes
    source.connect(playbackRate);
    playbackRate.connect(offlineContext.destination);
    
    // Start and render
    source.start(0);
    return await offlineContext.startRendering();
  }

  // Normalize audio (adjust volume to maximum without clipping)
  async normalizeAudio(audioBuffer, targetDb = -1) {
    const audioContext = this.createAudioContext();
    const targetAmplitude = Math.pow(10, targetDb / 20);
    
    // Find the peak amplitude
    let peakAmplitude = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        peakAmplitude = Math.max(peakAmplitude, Math.abs(channelData[i]));
      }
    }

    // Calculate normalization factor
    const normalizationFactor = targetAmplitude / peakAmplitude;
    
    // Create new buffer
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Apply normalization
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);
      
      for (let i = 0; i < originalData.length; i++) {
        newData[i] = originalData[i] * normalizationFactor;
      }
    }

    return newBuffer;
  }

  // Convert audio buffer to blob
  async bufferToBlob(audioBuffer, format = 'audio/wav') {
    const audioContext = this.createAudioContext();
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV format
    const wavBlob = this.bufferToWav(renderedBuffer);
    return wavBlob;
  }

  // Convert audio buffer to WAV format
  bufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Get audio duration
  getAudioDuration(audioBuffer) {
    return audioBuffer.duration;
  }

  // Get audio length in samples
  getAudioLength(audioBuffer) {
    return audioBuffer.length;
  }

  // Create a copy of audio buffer
  cloneAudioBuffer(audioBuffer) {
    const audioContext = this.createAudioContext();
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);
      newData.set(originalData);
    }

    return newBuffer;
  }

  // Apply fade in/out effects
  async applyFade(audioBuffer, fadeInMs = 0, fadeOutMs = 0) {
    const audioContext = this.createAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const fadeInSamples = Math.floor((fadeInMs / 1000) * sampleRate);
    const fadeOutSamples = Math.floor((fadeOutMs / 1000) * sampleRate);
    
    const newBuffer = this.cloneAudioBuffer(audioBuffer);

    for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
      const channelData = newBuffer.getChannelData(channel);
      
      // Apply fade in
      for (let i = 0; i < fadeInSamples && i < channelData.length; i++) {
        const fadeFactor = i / fadeInSamples;
        channelData[i] *= fadeFactor;
      }
      
      // Apply fade out
      const fadeOutStart = channelData.length - fadeOutSamples;
      for (let i = Math.max(0, fadeOutStart); i < channelData.length; i++) {
        const fadeFactor = (channelData.length - i) / fadeOutSamples;
        channelData[i] *= fadeFactor;
      }
    }

    return newBuffer;
  }

  // Reset audio to original state
  reset() {
    this.history = [];
    this.historyIndex = -1;
  }

  // Check if undo is available
  canUndo() {
    return this.historyIndex > 0;
  }

  // Check if redo is available
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }
}

// Create singleton instance
const audioEditor = new AudioEditor();

export default audioEditor; 