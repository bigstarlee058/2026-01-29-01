/**
 * Utility functions for handling media uploads and validation
 */

// Supported file extensions by category
const SUPPORTED_FORMATS = {
  video: [
    'mp4',
    'mov',
    'webm',
    'avi',
    'mkv',
    'm4v',
    'mpeg',
    'mpg',
    'wmv',
    'flv',
  ],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'aiff', 'aif'],
  image: [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'bmp',
    'svg',
    'avif',
    'heic',
    'heif',
    'tiff',
    'tif',
    'apng',
  ],
};

/**
 * Validate if file type is supported
 * @param {File} file - File object to validate
 * @returns {Object} { isValid: boolean, category: string, error?: string }
 */
export const validateMediaFile = file => {
  if (!file) {
    return { isValid: false, category: null, error: 'No file provided' };
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Check file extension
  const ext = fileName.split('.').pop();

  for (const [category, extensions] of Object.entries(SUPPORTED_FORMATS)) {
    if (extensions.includes(ext) || fileType.startsWith(category + '/')) {
      return { isValid: true, category };
    }
  }

  return {
    isValid: false,
    category: null,
    error: `Unsupported file type: ${ext}. Supported formats: ${Object.values(SUPPORTED_FORMATS).flat().join(', ')}`,
  };
};

/**
 * Get video duration from file
 * @param {File|string} source - File object or blob URL
 * @returns {Promise<number>} Duration in milliseconds
 */
export const getMediaDuration = source => {
  return new Promise((resolve, reject) => {
    try {
      let url;
      if (source instanceof File) {
        url = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        url = source;
      } else {
        reject(new Error('Invalid source type'));
        return;
      }

      // For video/audio
      const video = document.createElement('video');
      video.src = url;

      const handleLoadedMetadata = () => {
        const duration = Math.round(video.duration * 1000); // Convert to ms
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        if (source instanceof File) {
          URL.revokeObjectURL(url);
        }
        resolve(duration);
      };

      const handleError = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        if (source instanceof File) {
          URL.revokeObjectURL(url);
        }
        reject(new Error('Failed to load media duration'));
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if video has audio track
 * @param {File|string} source - File object or blob URL
 * @returns {Promise<boolean>} True if video has audio
 */
export const hasAudioTrack = source => {
  return new Promise(resolve => {
    try {
      let url;
      if (source instanceof File) {
        url = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        url = source;
      } else {
        resolve(false);
        return;
      }

      const video = document.createElement('video');
      video.src = url;

      const checkAudio = () => {
        const audioTracks = video.audioTracks;
        const hasAudio = audioTracks && audioTracks.length > 0;
        video.removeEventListener('loadedmetadata', checkAudio);
        video.removeEventListener('error', () => {});
        if (source instanceof File) {
          URL.revokeObjectURL(url);
        }
        resolve(hasAudio);
      };

      video.addEventListener('loadedmetadata', checkAudio);
      video.addEventListener('error', () => {
        if (source instanceof File) {
          URL.revokeObjectURL(url);
        }
        resolve(false);
      });
    } catch (error) {
      resolve(false);
    }
  });
};

/**
 * Create blob URL from file
 * @param {File} file - File object
 * @returns {string} Blob URL
 */
export const createBlobUrl = file => {
  return URL.createObjectURL(file);
};

/**
 * Process media file for timeline
 * @param {File} file - File to process
 * @param {number} startTime - Start time in timeline (ms)
 * @returns {Promise<Object>} Processed media data
 */
export const processMediaFile = async (file, startTime = 0) => {
  const validation = validateMediaFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const blobUrl = createBlobUrl(file);
  let duration = 0;
  let linkedAudioClipId = null;

  try {
    if (validation.category === 'video') {
      duration = await getMediaDuration(blobUrl);
      const hasAudio = await hasAudioTrack(blobUrl);

      if (hasAudio) {
        // Generate linked audio clip ID
        linkedAudioClipId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    } else if (validation.category === 'audio') {
      duration = await getMediaDuration(blobUrl);
    } else if (validation.category === 'image') {
      // Default duration for images: 3 seconds
      duration = 3000;
    }
  } catch (error) {
    console.warn('Error getting media duration:', error);
    // Fallback durations if detection fails
    if (validation.category === 'image') {
      duration = 3000;
    } else {
      duration = 5000; // 5 seconds fallback
    }
  }

  return {
    type: validation.category,
    source: blobUrl,
    fileName: file.name,
    startTime,
    duration,
    linkedAudioClipId,
    fileSize: file.size,
  };
};
