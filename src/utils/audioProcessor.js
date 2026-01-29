// Simple audio processor for maintaining pitch while changing playback speed
class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.audioSources = new Map();
    this.isInitialized = false;
  }

  // Initialize Web Audio API context
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (required by modern browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioProcessor:', error);
      throw error;
    }
  }

  // Update playback rate for an audio element with pitch preservation
  async updateAudioPlaybackRate(audioElement, newRate) {
    if (!audioElement || !audioElement.src) return;

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      const elementId = audioElement.id || audioElement.src;
      
      // Check if we already have a source for this element
      let audioData = this.audioSources.get(elementId);
      
      if (!audioData) {
        // Create new audio source only if it doesn't exist
        const source = this.audioContext.createMediaElementSource(audioElement);
        const gainNode = this.audioContext.createGain();
        
        // Connect the nodes
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Store reference
        audioData = { source, gainNode, audioElement };
        this.audioSources.set(elementId, audioData);
      }
      
      // Update playback rate (this preserves pitch better than HTML5 audio)
      audioData.source.playbackRate.value = newRate;
      
    } catch (error) {
      console.error('Error updating audio playback rate:', error);
      // Fallback to standard HTML5 audio
      audioElement.playbackRate = newRate;
    }
  }

  // Stop audio playback
  stopAudio(elementId) {
    const audioData = this.audioSources.get(elementId);
    if (audioData) {
      try {
        audioData.source.disconnect();
        audioData.gainNode.disconnect();
      } catch (error) {
        console.warn('Error stopping audio source:', error);
      }
      this.audioSources.delete(elementId);
    }
  }

  // Update volume for existing audio
  updateVolume(elementId, newVolume) {
    const audioData = this.audioSources.get(elementId);
    if (audioData && audioData.gainNode) {
      audioData.gainNode.gain.value = newVolume;
    }
  }

  // Check if Web Audio API is supported
  static isSupported() {
    try {
      return !!(window.AudioContext || window.webkitAudioContext);
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      return false;
    }
  }

  // Clean up resources
  cleanup() {
    this.audioSources.forEach((audioData, elementId) => {
      this.stopAudio(elementId);
    });
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const audioProcessor = new AudioProcessor();

export default audioProcessor; 