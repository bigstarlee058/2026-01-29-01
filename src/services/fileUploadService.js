import { uploadImage } from '../utils/uploadImage';
import { uploadImageToAWS, uploadVideoToAWS, uploadAudioToAWS } from '../utils/awsUpload';
import axios from 'axios';
import { store } from '../redux/store';
import { handleApiError, handleNetworkError } from '../utils/errorHandler';

// Get auth headers consistent with existing API patterns
const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'authorization': `Bearer ${token}`  // lowercase 'authorization' to match existing APIs
  };
};

/**
 * Unified file upload service that handles images, videos, and audio
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {string} options.type - File type: 'image', 'video', 'audio'
 * @param {string} options.sceneId - Associated scene ID
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
export const uploadFile = async (file, options = {}) => {
  const { type = 'image', sceneId } = options;
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    if (sceneId) {
      formData.append('sceneId', sceneId);
    }
    
    // Handle different file types
    switch (type) {
      case 'image': {
        // Primary: Use existing backend image upload endpoint
        try {
          const result = await uploadImage(formData);
          return {
            id: result.id || `img-${Date.now()}`,
            url: result.url || result.googleCloudUrl,
            minUrl: result.minUrl || result.minGoogleCloudUrl,
            ...result
          };
        } catch (backendError) {
          handleApiError(backendError, 'Failed to upload image to backend', false);
          // Fallback: Use AWS S3 direct upload
          const awsResult = await uploadImageToAWS(file, () => {});
          
          return {
            id: `img-aws-${Date.now()}`,
            url: awsResult.url,
            key: awsResult.key,
            source: 'aws',
            ...awsResult
          };
        }
      }
      
      case 'video': {
        // Primary: Try backend video upload endpoint
        try {
          const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}videos/upload`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeaders()
              },
              onUploadProgress: () => {}
            }
          );
          
          return {
            id: response.data.id || `vid-${Date.now()}`,
            url: response.data.url,
            thumbnail: response.data.thumbnail,
            duration: response.data.duration,
            ...response.data
          };
        } catch (backendError) {
          handleApiError(backendError, 'Failed to upload video to backend', false);
          // Fallback: Use AWS S3 direct upload
          const awsResult = await uploadVideoToAWS(file, () => {});
          
          return {
            id: `vid-aws-${Date.now()}`,
            url: awsResult.url,
            key: awsResult.key,
            source: 'aws',
            ...awsResult
          };
        }
      }
      
      case 'audio': {
        // Primary: Try backend audio upload endpoint
        try {
          const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}audio/upload`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeaders()
              }
            }
          );
          
          return {
            id: response.data.id || `aud-${Date.now()}`,
            url: response.data.url,
            duration: response.data.duration,
            ...response.data
          };
        } catch (backendError) {
          // Fallback: Use AWS S3 direct upload
          const awsResult = await uploadAudioToAWS(file, () => {});
          
          return {
            id: `aud-aws-${Date.now()}`,
            url: awsResult.url,
            key: awsResult.key,
            source: 'aws',
            ...awsResult
          };
        }
      }
      
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
  } catch (error) {
    console.error('File upload failed:', error);
    
    // Enhanced development fallback with better error reporting
    if (process.env.NODE_ENV === 'development') {
      if (error.code === 'ERR_NETWORK' || error.message?.includes('AWS')) {
        
        const fileUrl = URL.createObjectURL(file);
        
        return {
          id: `mock-${Date.now()}`,
          url: fileUrl,
          minUrl: fileUrl,
          thumbnail: fileUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          source: 'mock',
          mock: true
        };
      }
    }
    
    throw error;
  }
};

/**
 * Upload multiple files in parallel
 * @param {File[]} files - Array of files to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object[]>} Array of upload results
 */
export const uploadFiles = async (files, options = {}) => {
  const uploadPromises = files.map(file => 
    uploadFile(file, options).catch(error => ({
      error: true,
      message: error.message,
      file: file.name
    }))
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Upload file using Gallery API (recommended for My Items integration)
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadToGallery = async (file, options = {}) => {
  try {
    // Create FormData for Gallery API
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.name) formData.append('name', options.name);
    if (options.description) formData.append('description', options.description);
    if (options.metadata) formData.append('metadata', JSON.stringify(options.metadata));
    
    // Use Gallery API endpoint directly
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}gallery/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Gallery upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      id: result.id || `gallery-${Date.now()}`,
      url: result.url,
      source: 'gallery',
      ...result
    };
  } catch (error) {
    console.error('Gallery upload failed:', error);
    // Fallback to regular upload method
    return uploadFile(file, { type: getFileType(file.type), ...options });
  }
};

/**
 * Determine file type category from MIME type
 * @param {string} mimeType - File MIME type
 * @returns {string} File type category ('image', 'video', 'audio')
 */
export const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'unknown';
};

/**
 * Check if file upload is supported for the given type
 * @param {string} fileType - MIME type of the file
 * @returns {boolean} Whether the file type is supported
 */
export const isFileTypeSupported = (fileType) => {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/mov',
    'video/x-msvideo',
    'video/avi',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
    'audio/m4a'
  ];
  
  return supportedTypes.includes(fileType.toLowerCase());
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with errors if any
 */
export const validateFile = (file, options = {}) => {
  const errors = [];
  const warnings = [];
  
  // File type validation
  if (!isFileTypeSupported(file.type)) {
    errors.push(`File type ${file.type} is not supported`);
  }
  
  // File size validation (default limits based on type)
  const defaultLimits = {
    image: 10 * 1024 * 1024, // 10MB
    video: 500 * 1024 * 1024, // 500MB  
    audio: 50 * 1024 * 1024   // 50MB
  };
  
  const fileType = getFileType(file.type);
  const maxSize = options.maxSize || defaultLimits[fileType] || 10 * 1024 * 1024;
  
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
  }
  
  // File name validation
  if (file.name.length > 255) {
    errors.push('File name is too long (max 255 characters)');
  }
  
  // Warning for large files
  if (file.size > 100 * 1024 * 1024 && errors.length === 0) {
    warnings.push('Large file detected - upload may take some time');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};
