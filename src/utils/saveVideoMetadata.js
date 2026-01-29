import { store as reduxStore } from '../redux/store';

export const saveVideoData = async (videoData, storyId) => {
  const state = reduxStore.getState();
  const token = state.auth.token;
  const URL = process.env.REACT_APP_BACKEND_URL;
const response = await fetch(`${URL}video/${storyId}?type=video`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(videoData)
  });

  return response.json();
};