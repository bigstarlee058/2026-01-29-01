import axios from 'axios';
import toast from 'react-hot-toast';
import { store } from '../redux/store';

const URL = `${process.env.REACT_APP_BACKEND_URL}params`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    'Authorization': `Bearer ${token}`
  };
};

export const getParams = async () => {
  try {
    const result = await axios.get(`${URL}`, {
      headers: getAuthHeaders(),
    });

    return result.data;
  } catch (error) {}
};

export const changeParams = async data => {
  try {
    const result = await axios.patch(`${URL}/change`, data, {
      headers: getAuthHeaders()
    });

    toast.success('Parameters changed');
    return result.data;
  } catch (error) {
    toast.error(error.message);
  }
};

export const changeAiParams = async data => {
  try {
    const result = await axios.patch(`${URL}/toggle-ai`, data, {
      headers: getAuthHeaders()
    });

    toast.success('Parameters changed');
    return result.data;
  } catch (error) {
    toast.error(error.message);
  }
};

export const changeGenerationParams = async generationType => {
  try {
    const result = await axios.patch(`${URL}/change-type`, { generationType }, {
      headers: getAuthHeaders()
    });

    toast.success('Parameters changed');
    return result.data;
  } catch (error) {
    toast.success(error.message);
  }
};
