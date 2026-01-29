/**
 * Utility functions for creating drag payloads for different media types
 */

/**
 * Creates a video drag payload for react-dnd
 * @param {Object} videoItem - Video item data
 * @returns {Object} Drag payload for video items
 */
export const createVideoDragPayload = (videoItem) => ({
  type: 'gallery-video',
  video: {
    id: videoItem.id,
    url: videoItem.url,
    title: videoItem.title || 'Video',
    duration: videoItem.rawDuration || 0, // Duration in seconds
    key: videoItem.key || null,
    aspectRatio: videoItem.aspectRatio,
    thumbnail: videoItem.thumbnail,
    size: videoItem.size,
    type: videoItem.fileType || videoItem.type || 'mp4',
  },
});

/**
 * Creates an audio drag payload for react-dnd
 * @param {Object} audioItem - Audio item data
 * @returns {Object} Drag payload for audio items
 */
export const createAudioDragPayload = (audioItem) => ({
  type: 'gallery-audio',
  audio: {
    id: audioItem.id,
    url: audioItem.url,
    title: audioItem.title || 'Audio',
    duration: audioItem.rawDuration ? audioItem.rawDuration * 1000 : 0, // Convert to milliseconds for MobX store
    size: audioItem.size,
    type: audioItem.type || 'mp3',
    tags: audioItem.tags || [],
    category: audioItem.category || 'music',
  },
});

/**
 * Checks if an item can be dragged
 * @param {Object} item - Media item
 * @param {boolean} disabled - External disabled flag
 * @returns {boolean} Whether the item can be dragged
 */
export const canDragItem = (item, disabled = false) => {
  return !disabled && !!item.url && !item.isUploading;
};

/**
 * Creates common drag collect function for monitoring drag state
 * @param {Object} monitor - React DnD monitor
 * @returns {Object} Drag state
 */
export const collectDragState = (monitor) => ({
  isDragging: monitor.isDragging(),
});

/**
 * Creates an image drag payload for react-dnd
 * @param {Object} imageItem - Image item data
 * @returns {Object} Drag payload for image items
 */
export const createImageDragPayload = (imageItem) => ({
  type: 'gallery-image',
  image: {
    _id: imageItem.id || imageItem._id,
    id: imageItem.id || imageItem._id,
    url: imageItem.url,
    minUrl: imageItem.thumbnail || imageItem.minUrl || imageItem.url,
    googleCloudUrl: imageItem.url,
    minGoogleCloudUrl: imageItem.thumbnail || imageItem.minUrl || imageItem.url,
    imageHeight: imageItem.imageHeight || imageItem.metadata?.height || 1080,
    imageWidth: imageItem.imageWidth || imageItem.metadata?.width || 1920,
    prompt: imageItem.prompt || imageItem.subtitle || '',
    negativePrompt: imageItem.negativePrompt || '',
  },
});

/**
 * Creates a universal media drag payload based on item category
 * @param {Object} item - Media item with category field
 * @returns {Object|null} Appropriate drag payload or null if unknown type
 */
export const createMediaDragPayload = (item) => {
  if (!item || !item.category) return null;
  
  const category = item.category.toLowerCase();
  
  switch(category) {
    case 'video':
      return createVideoDragPayload(item);
    case 'audio':
      return createAudioDragPayload(item);
    case 'image':
      return createImageDragPayload(item);
    default:
      // Fallback: try to detect by file extension or type
      const fileType = (item.fileType || item.type || '').toLowerCase();
      const fileName = (item.fileName || item.title || '').toLowerCase();
      
      if (fileType.includes('video') || fileName.match(/\.(mp4|avi|mov|webm)$/)) {
        return createVideoDragPayload(item);
      }
      if (fileType.includes('audio') || fileName.match(/\.(mp3|wav|aac|flac)$/)) {
        return createAudioDragPayload(item);
      }
      if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return createImageDragPayload(item);
      }
      
      return null;
  }
};

/**
 * Checks if a media item can be dragged
 * @param {Object} item - Media item
 * @param {boolean} disabled - External disabled flag
 * @returns {boolean} Whether the item can be dragged
 */
export const canDragMediaItem = (item, disabled = false) => {
  return !disabled && 
         !!item && 
         !!item.url && 
         !item.isUploading && 
         item.category !== 'Uploading';
};

/**
 * Common drag item style based on drag state
 * @param {boolean} isDragging - Whether item is being dragged
 * @param {boolean} canDrag - Whether item can be dragged
 * @returns {Object} CSS style object
 */
export const getDragItemStyle = (isDragging, canDrag = true) => ({
  opacity: isDragging ? 0.5 : 1,
  cursor: !canDrag ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
});