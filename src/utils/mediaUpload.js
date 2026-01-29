/**
 * Media Upload Utilities
 * Client-side only media processing for timeline integration
 */

import { detectCategory } from './fileValidation';
import toast from 'react-hot-toast';

/**
 * Extract metadata from video file
 * @param {File} file - Video file
 * @returns {Promise<Object>} Video metadata (duration, width, height, hasAudio)
 */
export async function getVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = async () => {
      try {
        // Check if video has audio track
        const hasAudio = await checkVideoHasAudio(video);

        const metadata = {
          duration: video.duration * 1000, // Convert to ms
          width: video.videoWidth,
          height: video.videoHeight,
          hasAudio,
        };

        URL.revokeObjectURL(objectUrl);
        resolve(metadata);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    video.onerror = error => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Check if video has audio track
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<boolean>}
 */
async function checkVideoHasAudio(videoElement) {
  return new Promise(resolve => {
    // Try to detect audio track
    if (videoElement.mozHasAudio !== undefined) {
      resolve(videoElement.mozHasAudio);
    } else if (videoElement.webkitAudioDecodedByteCount !== undefined) {
      resolve(videoElement.webkitAudioDecodedByteCount > 0);
    } else if (
      videoElement.audioTracks &&
      videoElement.audioTracks.length > 0
    ) {
      resolve(true);
    } else {
      // Fallback: play briefly and check volume
      const originalVolume = videoElement.volume;
      videoElement.volume = 1.0;
      videoElement.muted = false;

      const checkAudio = () => {
        // If we can set volume and it's not muted, likely has audio
        // This is not perfect but works for most cases
        const hasAudio = videoElement.volume > 0 && !videoElement.muted;
        videoElement.volume = originalVolume;
        resolve(hasAudio);
      };

      // Give it a moment to load
      setTimeout(checkAudio, 100);
    }
  });
}

/**
 * Extract metadata from audio file
 * @param {File} file - Audio file
 * @returns {Promise<Object>} Audio metadata (duration)
 */
export async function getAudioMetadata(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      const metadata = {
        duration: audio.duration * 1000, // Convert to ms
      };

      URL.revokeObjectURL(objectUrl);
      resolve(metadata);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio metadata'));
    };
  });
}

/**
 * Extract metadata from image file
 * @param {File} file - Image file
 * @returns {Promise<Object>} Image metadata (width, height)
 */
export async function getImageMetadata(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      const metadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(metadata);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image metadata'));
    };
  });
}

/**
 * Validate and prepare file for upload
 * @param {File} file - File to validate
 * @returns {Promise<Object>} Prepared file data with metadata
 */
export async function prepareMediaFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const category = detectCategory(file);

  if (!category) {
    throw new Error(`Unsupported file type: ${file.type || file.name}`);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    let metadata = {};

    switch (category) {
      case 'Video':
        metadata = await getVideoMetadata(file);
        break;
      case 'Audio':
        metadata = await getAudioMetadata(file);
        break;
      case 'Image':
      case 'Animation':
        metadata = await getImageMetadata(file);
        break;
      default:
        throw new Error(`Unsupported category: ${category}`);
    }

    return {
      file,
      objectUrl,
      category,
      metadata,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Process multiple files
 * @param {FileList|File[]} files - Files to process
 * @returns {Promise<Object[]>} Array of prepared file data
 */
export async function prepareMediaFiles(files) {
  const fileArray = Array.from(files);
  const results = [];
  const errors = [];

  for (const file of fileArray) {
    try {
      const prepared = await prepareMediaFile(file);
      results.push(prepared);
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error.message,
      });
    }
  }

  // Show errors if any
  if (errors.length > 0) {
    const errorMessages = errors
      .map(e => `${e.fileName}: ${e.error}`)
      .join('\n');
    toast.error(`Failed to process some files:\n${errorMessages}`, {
      duration: 5000,
    });
  }

  return results;
}

/**
 * Generate thumbnails for video
 * @param {HTMLVideoElement} videoElement - Video element
 * @param {number} count - Number of thumbnails to generate
 * @returns {Promise<string[]>} Array of thumbnail data URLs
 */
export async function generateVideoThumbnails(videoElement, count = 5) {
  const thumbnails = [];
  const duration = videoElement.duration;

  // Create canvas for thumbnail generation
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set thumbnail dimensions
  const thumbWidth = Math.max(80, Math.floor(videoElement.videoWidth / 10));
  const thumbHeight = Math.max(60, Math.floor(videoElement.videoHeight / 10));
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;

  for (let i = 0; i < count; i++) {
    const time = (duration * i) / Math.max(count - 1, 1);
    videoElement.currentTime = time;

    await new Promise(resolve => {
      videoElement.addEventListener('seeked', resolve, { once: true });
    });

    ctx.drawImage(videoElement, 0, 0, thumbWidth, thumbHeight);
    thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
  }

  return thumbnails;
}

/**
 * Validate file types for timeline
 * @param {File} file - File to validate
 * @returns {boolean} True if file type is supported
 */
export function isValidMediaFile(file) {
  const validExtensions = {
    video: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  };

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Check by MIME type
  if (
    fileType.startsWith('video/') ||
    fileType.startsWith('audio/') ||
    fileType.startsWith('image/')
  ) {
    return true;
  }

  // Check by extension
  const extension = fileName.split('.').pop();
  return Object.values(validExtensions).some(exts => exts.includes(extension));
}
