import axios from 'axios';
import { store } from '../redux/store';

const URL = `${process.env.REACT_APP_BACKEND_URL}leonardo`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const downloadImages = async ({ storyId, images }) => {
  try {
const response = await axios.post(
      `${URL}/download`,
      {
        storyId: storyId ? storyId : null,
        images,
      },
      { 
        responseType: 'arraybuffer',
        headers: getAuthHeaders()
      }
    );

    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const downloadSingleImage = async body => {
  try {
const response = await axios.post(`${URL}/image-download`, body, {
      responseType: 'blob',
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
}
};
