import { uploadVideoSecurely, uploadImageSecurely, uploadAudioSecurely } from '../services/secureUpload';
import { uploadToS3 } from '../services/awsConfig';

// Function to upload video to AWS S3
export const uploadVideoToAWS = async (file, onProgress) => {
  try {
const result = await uploadToS3(file, onProgress);
    return result;
    
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

// Function to upload image to AWS S3
export const uploadImageToAWS = async (file, onProgress) => {
  try {
    const result = await uploadImageSecurely(file, onProgress);
    return result;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Function to upload audio to AWS S3
export const uploadAudioToAWS = async (file, onProgress) => {
  try {
    const result = await uploadAudioSecurely(file, onProgress);
    return result;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};