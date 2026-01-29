import axios from 'axios';
import { store } from '../../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const getSubtitles = async ({ storyId, audioUrl, subtitleId }) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}subtitle`,
      { storyId, audioUrl, subtitleId },
      {
        headers: getAuthHeaders()
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting subtitles:', error);
    throw error;
  }
};

export const getSubtitlesByAudio = async ({ storyId, audioElements }) => {
  try {
if (!audioElements || audioElements.length === 0) {
      throw new Error('No audio elements provided');
    }

    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}subtitle/process-segments`,
      { storyId, audioElements: audioElements },
      {
        headers: getAuthHeaders()
      }
    );
return response.data;
  } catch (error) {
    console.error('Error getting subtitles:', error);
    throw error;
  }
};
