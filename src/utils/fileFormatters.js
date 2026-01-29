// Common formatting functions used across MyItems components

export const getAcceptAttribute = (tab) => {
  switch (tab) {
    case 'Images':
    case 'Image':
      // Expanded to include HEIC/HEIF (iOS), BMP, TIFF and MIME groups
      return 'image/*,.jpg,.jpeg,.png,.webp,.svg,.avif,.bmp,.heic,.heif,.tiff,.tif';
    case 'Videos':
    case 'Video':
      // Expanded to include M4V, MPEG, WMV, FLV and MIME groups
      return 'video/*,.mp4,.mov,.webm,.avi,.mkv,.m4v,.mpeg,.mpg,.wmv,.flv';
    case 'Animation':
      // Keep GIF, APNG, animated WebP
      return '.gif,.apng,.webp';
    case 'Audio':
      // Expanded to include FLAC, AIFF and MIME groups
      return 'audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac,.aiff,.aif';
    case 'All':
      // Combined all formats with MIME groups first
      return [
        'image/*', 'video/*', 'audio/*',
        '.jpg', '.jpeg', '.png', '.webp', '.svg', '.avif', '.bmp', '.heic', '.heif', '.tiff', '.tif',
        '.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.mpeg', '.mpg', '.wmv', '.flv',
        '.gif', '.apng',
        '.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.aiff', '.aif'
      ].join(',');
    default:
      return '';
  }
};

/**
 * Format duration from seconds to MM:SS.ms format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = seconds => {
  if (!seconds || seconds === 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${ms}`;
};

/**
 * Format duration for display (simpler format)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDurationSimple = seconds => {
  if (!seconds || seconds === 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${ms}`;
};

/**
 * Format file size from bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = bytes => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format date string to DD.MM.YYYY, HH:MM:SS format
 * @param {string} dateString - Date string to format
 * @param {string} fallbackDate - Fallback date if parsing fails
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, fallbackDate = '21.06.2025, 10:03:11') => {
  if (!dateString) return fallbackDate;
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
    return fallbackDate;
  }
};

/**
 * Parse metadata from file object
 * @param {Object} file - File object that may contain metadata
 * @returns {Object} Parsed metadata object
 */
export const parseMetadata = file => {
  let metadata = {};
  if (file.metadata) {
    try {
      metadata = typeof file.metadata === 'string'
        ? JSON.parse(file.metadata)
        : file.metadata;
    } catch (e) {
      console.warn('Failed to parse metadata:', e);
    }
  }
  return metadata;
};

/**
 * Get file category based on file type and name
 * @param {string} fileType - File type string
 * @param {string} fileName - File name string
 * @returns {string} File category ('video', 'audio', 'image', or 'other')
 */
export const getFileCategory = (fileType, fileName) => {
  const type = (fileType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  // Expanded lists matching getAcceptAttribute
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', 'mpeg', 'mpg'];
  const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'aiff', 'aif', 'ogg', 'm4a'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'heic', 'heif', 'tiff', 'tif', 'apng'];

  const hasVideoType = videoExtensions.some(ext => type.includes(ext) || name.endsWith(`.${ext}`));
  const hasAudioType = audioExtensions.some(ext => type.includes(ext) || name.endsWith(`.${ext}`));
  const hasImageType = imageExtensions.some(ext => type.includes(ext) || name.endsWith(`.${ext}`));

  if (hasVideoType) return 'video';
  if (hasAudioType) return 'audio';
  if (hasImageType) return 'image';
  return 'other';
};

/**
 * Get default thumbnail for file category
 * @param {string} category - File category
 * @param {string} fallbackThumbnail - Fallback thumbnail URL
 * @returns {string|null} Thumbnail URL or null
 */
export const getDefaultThumbnail = (category, fallbackThumbnail) => {
  if (category === 'audio') return null;
  return fallbackThumbnail;
};

// Get appropriate placeholder icon based on file type
export const getPlaceholderIcon = (fileType, fileName = '') => {
  const type = (fileType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  // Check for video files - expanded list
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', 'mpeg', 'mpg'];
  const hasVideoExt = videoExtensions.some(ext => name.endsWith(`.${ext}`));
  const isVideoMime = type.startsWith('video/');

  // Check for audio files - expanded list
  const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'aiff', 'aif', 'ogg', 'm4a'];
  const hasAudioExt = audioExtensions.some(ext => name.endsWith(`.${ext}`));
  const isAudioMime = type.startsWith('audio/');

  // Check for image files - expanded list
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'heic', 'heif', 'tiff', 'tif', 'apng'];
  const hasImageExt = imageExtensions.some(ext => name.endsWith(`.${ext}`));
  const isImageMime = type.startsWith('image/');

  if (hasVideoExt || isVideoMime) {
    return 'MovieIcon';
  }

  if (hasAudioExt || isAudioMime) {
    return 'AudioItemIcon';
  }

  if (hasImageExt || isImageMime) {
    return 'ImagePlaceholderIcon';
  }

  // Default to generic file icon
  return 'UploadFileIcon';
};

/**
 * Extract raw file size from various file object formats
 * @param {Object} file - File object with potential size properties
 * @returns {number} Raw file size in bytes, or 0 if not found
 */
export const extractRawSize = (file) => {
  // Check direct size property
  if (typeof file.size === 'number' && file.size > 0) {
    return file.size;
  }
  
  // Check filesize property (some APIs use this)
  if (typeof file.filesize === 'number' && file.filesize > 0) {
    return file.filesize;
  }
  
  // Check metadata for size
  if (file.metadata) {
    const metadata = typeof file.metadata === 'string' ? JSON.parse(file.metadata) : file.metadata;
    if (typeof metadata.size === 'number' && metadata.size > 0) {
      return metadata.size;
    }
  }
  
  // For uploading files, check the file object
  if (file.file && typeof file.file.size === 'number' && file.file.size > 0) {
    return file.file.size;
  }
  
  return 0;
};

/**
 * Check if two files are duplicates using robust comparison logic
 * @param {Object} uploadingItem - File being uploaded
 * @param {Object} galleryItem - Existing gallery file
 * @param {Object} options - Comparison options
 * @param {number} options.sizeTolerance - Byte tolerance for size comparison (default: 1024)
 * @returns {boolean} True if files are considered duplicates
 */
export const isDuplicateFile = (uploadingItem, galleryItem, options = {}) => {
  const { sizeTolerance = 1024 } = options;
  
  // Primary check: title must match
  const titleMatch = uploadingItem.title === galleryItem.title;
  if (!titleMatch) {
    return false;
  }
  
  // Enhanced size comparison using raw bytes with tolerance
  const uploadingSize = extractRawSize(uploadingItem);
  const gallerySize = extractRawSize(galleryItem);
  
  // If both have valid sizes, use byte comparison with tolerance
  if (uploadingSize > 0 && gallerySize > 0) {
    const sizeDiff = Math.abs(uploadingSize - gallerySize);
    const sizeMatch = sizeDiff <= sizeTolerance;
    
    if (!sizeMatch) {
      return false;
    }
  } else {
    // Fallback to formatted size comparison if raw sizes not available
    const sizeMatch = uploadingItem.size === galleryItem.size;
    if (!sizeMatch) {
      return false;
    }
  }
  
  // Enhanced timestamp comparison with tolerance
  if (uploadingItem.lastModifiedMs && galleryItem.lastModifiedMs) {
    const timeDiff = Math.abs(uploadingItem.lastModifiedMs - galleryItem.lastModifiedMs);
    // Files modified within 5 seconds are likely the same
    if (timeDiff < 5000) {
      return true;
    }
  }
  
  // Enhanced check: use file URL or key if available for exact matching
  if (uploadingItem.url && galleryItem.url) {
    return uploadingItem.url === galleryItem.url;
  }
  
  // Enhanced check: use upload time as tie-breaker
  if (uploadingItem.uploadStartTime && galleryItem.createdAt) {
    const uploadTime = new Date(uploadingItem.uploadStartTime).getTime();
    const createdTime = new Date(galleryItem.createdAt).getTime();
    // If created within 30 seconds of upload start, likely the same file
    if (Math.abs(uploadTime - createdTime) < 30000) {
      return true;
    }
  }
  
  // If title and size match but no additional criteria, consider it a duplicate (safer approach)
  return true;
};

/**
 * Remove duplicate files from a list using unified deduplication logic
 * @param {Array} galleryItems - Array of gallery files
 * @param {Array} uploadingItems - Array of uploading files  
 * @param {Object} options - Deduplication options
 * @returns {Array} Final merged list without duplicates
 */
export const deduplicateFiles = (galleryItems = [], uploadingItems = [], options = {}) => {
  const finalItems = [...uploadingItems];
  
  galleryItems.forEach(galleryItem => {
    const isDuplicate = uploadingItems.some(uploadingItem => 
      isDuplicateFile(uploadingItem, galleryItem, options)
    );
    
    if (!isDuplicate) {
      finalItems.push(galleryItem);
    }
  });
  
  return finalItems;
};