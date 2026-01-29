import axios from 'axios';
import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const createPresetStyle = async body => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}subtitle/create-preset-style`,
      body
    );

    return response.data;
  } catch (error) {
    console.error('Error creating preset style:', error);
    throw error;
  }
};

export const updatePresetStyle = async (presetId, body) => {
  try {
    const response = await axios.patch(
      `${process.env.REACT_APP_BACKEND_URL}subtitle/update-preset-style/${presetId}`,
      body
    );

    return response.data;
  } catch (error) {
    console.error('Error updating preset style:', error);
    throw error;
  }
};

export const getPresetStyles = async () => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}subtitle/get-preset-styles`
    );

    return response.data;
  } catch (error) {
    console.error('Error getting preset styles:', error);
    throw error;
  }
};

export const deletePresetStyle = async presetId => {
  try {
    const response = await axios.delete(
      `${process.env.REACT_APP_BACKEND_URL}subtitle/delete-preset-style/${presetId}`
    );

    return response.data;
  } catch (error) {
    console.error('Error deleting preset style:', error);
    throw error;
  }
};
