import axios from 'axios';
import toast from 'react-hot-toast';
import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const createUser = async credentials => {
  try {
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}auth/register`,
      credentials,
      {
        headers: getAuthHeaders()
      }
    );

    toast.success('Register successful');
    return res.data;
  } catch (error) {
    toast.error(error?.response?.data?.message);
    return;
  }
};
