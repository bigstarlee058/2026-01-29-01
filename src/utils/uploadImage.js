import axios from 'axios';
import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const uploadImage = async image => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}images/upload-image`,
      image,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
