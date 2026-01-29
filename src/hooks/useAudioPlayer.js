import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [currentVolume, setCurrentVolume] = useState(20);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(1);
  const [pausedTimes, setPausedTimes] = useState({});
  const [audioErrors, setAudioErrors] = useState(new Set());
  const audioRef = useRef(null);

  // Track audio playback progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => setCurrentAudioTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration || 1);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentlyPlaying]);

  const handleVolumeChange = useCallback(value => {
    setCurrentVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  }, []);

  const handleWaveformClick = useCallback((clickTime, index) => {
    if (audioRef.current && currentlyPlaying === index) {
      audioRef.current.currentTime = clickTime;
      setCurrentAudioTime(clickTime);
    }
  }, [currentlyPlaying]);

  const handlePlayClick = useCallback(async (item, index) => {
    if (!item.url) {
      setAudioErrors(prev => new Set([...prev, item.id]));
      return;
    }

    if (currentlyPlaying === index && isPlaying) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    } else {
      // Play new audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setCurrentlyPlaying(index);
      setIsPlaying(true);
      setIsAudioLoading(true);

      audioRef.current = new Audio();
      audioRef.current.src = item.url;
      audioRef.current.volume = currentVolume / 100;

      audioRef.current.addEventListener('canplaythrough', () => {
        setIsAudioLoading(false);
        audioRef.current.play().catch(error => {
          console.warn('Audio autoplay failed:', error);
          setIsAudioLoading(false);
          setAudioErrors(prev => new Set([...prev, item.id]));
        });
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        setCurrentAudioTime(0);
      });

      audioRef.current.addEventListener('error', () => {
        console.error('Audio playback error:', error);
        setIsAudioLoading(false);
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        setAudioErrors(prev => new Set([...prev, item.id]));
      });
    }
  }, [currentVolume, currentlyPlaying, isPlaying]);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return {
    currentVolume,
    currentlyPlaying,
    isPlaying,
    isAudioLoading,
    currentAudioTime,
    audioDuration,
    pausedTimes,
    audioErrors,
    audioRef,
    handleVolumeChange,
    handleWaveformClick,
    handlePlayClick,
    setAudioErrors,
  };
}; 