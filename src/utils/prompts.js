import axios from 'axios';
import { store } from '../redux/store';

const URL = `${process.env.REACT_APP_BACKEND_URL}prompt`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const createPrompt = async data => {
  try {
    const result = await axios.post(`${URL}/create`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};

export const changePromptsStatus = async data => {
  try {
    const result = await axios.patch(`${URL}/update`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {}
};

export const getPromptsByStory = async storyId => {
  try {
    const result = await axios.get(`${URL}/story/${storyId}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};

export const deleteStoryPrompts = async storyId => {
  try {
    const result = await axios.delete(`${URL}/story/${storyId}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};

export const deletePointPrompts = async pointId => {
  try {
    const result = await axios.delete(`${URL}/point/${pointId}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};

export const getPromptsByStatus = async data => {
  try {
    const result = await axios.post(`${URL}/find`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {}
};

export const deletePromptStatus = async id => {
  try {
    const result = await axios.delete(`${URL}/delete/${id}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};
