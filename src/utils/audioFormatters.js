import { formatDurationSimple } from './fileFormatters';

// Format duration from seconds to MM:SS.ms format
export const formatDurationFromSeconds = seconds => {
  if (!seconds) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${ms}`;
};

// Format file size from bytes
export const formatFileSizeFromBytes = bytes => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Format date from string
export const formatDateFromString = dateString => {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return 'Unknown date';
  }
};

// Transform Freesound API data to common format
export const transformFreesoundData = (audio) => {
  return {
    id: audio.id,
    thumbnail: null, // Audio files don't have thumbnails
    title: audio.name || 'Untitled audio',
    subtitle: audio.category || 'Audio file',
    size: formatFileSizeFromBytes(audio.filesize),
    duration: formatDurationFromSeconds(audio.duration),
    durationSimple: formatDurationSimple(audio.duration),
    rawDuration: audio.duration || 0,
    addedBy: audio.author || 'Freesound User',
    addedOn: formatDateFromString(audio.created),
    originalDate: audio.created || new Date().toISOString(),
    type: (audio.type || 'MP3').toUpperCase(),
    url: audio.preview || null,
    tags: audio.tags || [],
    category: audio.category,
    filesize: audio.filesize,
    download: audio.download,
    previewURL: audio.previewURL,
  };
};

// Filter items based on active filter
export const filterAudioItems = (itemsToFilter, filter) => {
  if (!filter || filter === 'All') {
    return itemsToFilter;
  }

  return itemsToFilter.filter(item => {
    const itemType = (item.type || '').toLowerCase();
    const itemName = (item.title || item.name || '').toLowerCase();
    const itemSubtitle = (item.subtitle || '').toLowerCase();
    const itemTags = (item.tags || []).join(' ').toLowerCase();

    switch (filter) {
      case 'Media file':
        // Show all media files (audio files)
        return true;
      case 'Sound effects':
        return (
          itemType.includes('sound') ||
          itemName.includes('effect') ||
          itemSubtitle.includes('sound effect') ||
          itemSubtitle.includes('sfx') ||
          itemTags.includes('sound effect') ||
          itemTags.includes('sfx')
        );
      case 'Music':
        return (
          itemType.includes('music') ||
          itemName.includes('music') ||
          itemSubtitle.includes('music') ||
          itemTags.includes('music')
        );
      case 'Instrumental samples':
        return (
          itemType.includes('instrumental') ||
          itemName.includes('instrumental') ||
          itemSubtitle.includes('instrumental') ||
          itemTags.includes('instrumental')
        );
      case 'Soundscapes':
        return (
          itemType.includes('soundscape') ||
          itemName.includes('soundscape') ||
          itemSubtitle.includes('soundscape') ||
          itemTags.includes('soundscape')
        );
      case 'Speech':
        return (
          itemType.includes('speech') ||
          itemName.includes('speech') ||
          itemSubtitle.includes('speech') ||
          itemSubtitle.includes('voice') ||
          itemTags.includes('speech') ||
          itemTags.includes('voice')
        );
      default:
        return true;
    }
  });
};

// Define filter options for audio file types
export const audioFilterOptions = [
  'All',
  'Media file',
  'Sound effects',
  'Music',
  'Instrumental samples',
  'Soundscapes',
  'Speech',
]; 