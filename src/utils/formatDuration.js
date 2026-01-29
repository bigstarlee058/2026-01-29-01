const formatDuration = duration => {
  if (!duration) {
    return '00:00';
  }

  // Convert to seconds if duration is in milliseconds
  const durationInSeconds = duration > 1000 ? Math.floor(duration / 1000) : duration;
  
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default formatDuration;
