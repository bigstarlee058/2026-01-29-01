import axios from 'axios';
import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

const fetchVisualEffects = async (params = {}) => {
  const { page = 1, limit = 30, category, search } = params;

  try {
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(category && { category }),
      ...(search && { search }),
    }).toString();

    const response = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}visual-effects?${queryParams}`,
      { headers: getAuthHeaders() }
    );

    // Axios already returns parsed JSON in response.data
    return response.data;
  } catch (error) {
    console.error('Error fetching visual effects:', error);
    return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }
};

export { fetchVisualEffects };
