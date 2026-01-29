import axios from 'axios';
import { store } from '../redux/store';
import { handleApiError } from './errorHandler';

const URL = `${process.env.REACT_APP_BACKEND_URL}api`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const getApiCreds = async () => {
  try {
    const result = await axios.get(`${URL}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to get API keys');
    throw error;
  }
};

export const createKey = async data => {
  try {
    const result = await axios.post(`${URL}/create`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to create API key');
    throw error;
  }
};

export const changeKey = async data => {
  try {
    const result = await axios.patch(`${URL}/change`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to change API key');
    throw error;
  }
};

export const deleteKey = async id => {
  try {
    const result = await axios.delete(`${URL}/delete/${id}`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to delete API key');
    throw error;
  }
};

export const addUser = async data => {
  try {
    const result = await axios.post(`${URL}/add-user`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to add user');
    throw error;
  }
};

export const removeUser = async data => {
  try {
    const result = await axios.patch(`${URL}/remove-user`, data, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
    handleApiError(error, 'Failed to remove user');
    throw error;
  }
};
