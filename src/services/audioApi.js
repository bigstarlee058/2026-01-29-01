import axios from 'axios';
import { store } from '../redux/store';
import { handleApiError } from '../utils/errorHandler';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getAudio = async ({
  storyId = null,
  query = '',
  page = 1,
  perPage = 30,
  audioType = 'music',
}) => {
  try {
    const response = await axios.get(`${BASE_URL}audio/${storyId}`, {
      params: {
        q: query,
        type: audioType,
        page,
        per_page: perPage,
      },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to get audio');
    throw error;
  }
};

export const removeSilence = async ({
  audioUrl,
  startThreshold = '-45dB',
  stopThreshold = '-35dB',
  stopDuration = '0.3',
}) => {
  try {
    const response = await axios.post(
      `${BASE_URL}audio/remove-silence`,
      {
        audioUrl,
        startThreshold,
        stopThreshold,
        stopDuration,
      },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to remove silence from audio');
    throw error;
  }
};
