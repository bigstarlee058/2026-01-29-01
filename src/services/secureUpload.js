import axios from 'axios';
import { handleApiError } from '../utils/errorHandler';

const API_ENDPOINT = process.env.REACT_APP_API_GATEWAY_URL;

export const getPresignedUrl = async (fileName, fileType) => {
  try {
    const response = await axios.post(`${API_ENDPOINT}/generate-presigned-url`, {
      fileName,
      fileType
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to get pre-signed URL');
    throw error;
  }
};

export const uploadFileWithPresignedUrl = async (file, onProgress) => {
try {
    // Get pre-signed URL
    const { uploadURL, key } = await getPresignedUrl(file.name, file.type);
    
    // Upload to S3 using pre-signed URL
    await axios.put(uploadURL, file, {
      headers: {
        'Content-Type': file.type
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
onProgress(percentage);
        }
      }
    });

    // Return the file key and construct the URL
    return {
      key,
      url: `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${key}`
    };
  } catch (error) {
    handleApiError(error, 'Failed to upload file');
    throw error;
  }
};

// Specific upload functions for different file types
export const uploadVideoSecurely = async (file, onProgress) => {
return uploadFileWithPresignedUrl(file, onProgress);
};

export const uploadImageSecurely = async (file, onProgress) => {
  return uploadFileWithPresignedUrl(file, onProgress);
};

export const uploadAudioSecurely = async (file, onProgress) => {
  return uploadFileWithPresignedUrl(file, onProgress);
}; 