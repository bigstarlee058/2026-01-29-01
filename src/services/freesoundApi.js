import axios from 'axios';
import { store } from '../redux/store';
import { handleApiError } from '../utils/errorHandler';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const getFreesoundAudio = async ({
  q = '',
  page = 1,
  page_size = 20,
  sort = 'score'
}) => {
  try {
    const response = await axios.get(`${BASE_URL}audio/freesound`, {
      params: {
        q,
        page,
        page_size,
        sort
      },
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to search Freesound audio');
    throw error;
  }
}; 