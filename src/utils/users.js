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

const URL = `${process.env.REACT_APP_BACKEND_URL}user`;

export const usersList = async () => {
  try {
    const result = await axios.get(`${URL}/`, {
      headers: getAuthHeaders()
    });

    return result.data;
  } catch (error) {
}
};

export const changeUserType = async (id, newType) => {
  try {
    const result = await axios.patch(`${URL}/type`, { id, newType }, {
      headers: getAuthHeaders()
    });

    toast.success('Type changed successfully');
    return result.data;
  } catch (error) {
}
};

export const deleteUser = async id => {
  try {
    const result = await axios.delete(`${URL}/delete/${id}`, {
      headers: getAuthHeaders()
    });

    toast.success('User deleted');
    return result.data;
  } catch (error) {
}
};
