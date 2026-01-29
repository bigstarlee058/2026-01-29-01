import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export async function fetchVideos(storyId) {
    const URL = process.env.REACT_APP_BACKEND_URL;
    const response = await fetch(`${URL}video/${storyId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch videos');
    return response.json();
}