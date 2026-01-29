import axios from 'axios';
import { store } from '../redux/store';

const URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const deleteAudio = async ({ storyId, audioId }) => {
  try {
const response = await axios.delete(`${URL}audio`, {
      data: {
        storyId: storyId ? storyId : null,
        audioId,
      },
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    console.error(error);
  }
};
