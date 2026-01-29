import axios from 'axios';
import { store } from '../redux/store';

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const getPixabayImages = async ({ q = '', page = 1, per_page = 24 }) => {
  if (!process.env.REACT_APP_BACKEND_URL) {
    console.error('REACT_APP_BACKEND_URL is not defined');
    return { images: [] };
  }

  const baseUrl = process.env.REACT_APP_BACKEND_URL;
  
  const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  try {
    
    const apiUrl = `${apiBaseUrl}images/pixabay?q=${encodeURIComponent(q)}&page=${page}&per_page=${per_page}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("Pixabay request timed out after 10 seconds");
    }, 10000);

    const response = await axios.get(apiUrl, { 
      signal: controller.signal,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    
    clearTimeout(timeoutId);


    if (!response.data) {
      console.warn("Pixabay API response missing data");
      return { images: [] };
    }
    
    if (!response.data.images || !Array.isArray(response.data.images)) {
      console.warn("Pixabay API response missing images array:", response.data);
      return { images: [] };
    }

    return response.data;
    
  } catch (error) {
    if (axios.isCancel(error)) {
      console.error('Pixabay request was cancelled (timeout)');
    } else {
      console.error('Error fetching Pixabay images:', error.message);
      console.error('Error details:', error);
      
      if (error.response) {
        console.error('Server response data:', error.response.data);
        console.error('Server response status:', error.response.status);
        console.error('Server response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from server, request sent:', error.request);
      }
    }
    
    // Return empty array instead of throwing to prevent UI from being stuck in loading state
    return { images: [] };
  }
};

export const getPixabayVideos = async ({ q = '', page = 1, per_page = 8, order = 'popular' }) => {
  if (!process.env.REACT_APP_BACKEND_URL) {
    console.error('REACT_APP_BACKEND_URL is not defined');
    return { videos: [] };
  }

  const baseUrl = process.env.REACT_APP_BACKEND_URL;
  
  const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  try {
    
    const apiUrl = `${apiBaseUrl}videos?q=${encodeURIComponent(q)}&page=${page}&per_page=${per_page}&order=${order}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("Pixabay videos request timed out after 10 seconds");
    }, 10000);

    const response = await axios.get(apiUrl, { 
      signal: controller.signal,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.data) {
      console.warn("Pixabay videos API response missing data");
      return { videos: [] };
    }
    
    if (!response.data.videos || !Array.isArray(response.data.videos)) {
      console.warn("Pixabay videos API response missing videos array:", response.data);
      return { videos: [] };
    }

    return response.data;
    
  } catch (error) {
    if (axios.isCancel(error)) {
      console.error('Pixabay videos request was cancelled (timeout)');
    } else {
      console.error('Error fetching Pixabay videos:', error.message);
      console.error('Error details:', error);
      
      if (error.response) {
        console.error('Server response data:', error.response.data);
        console.error('Server response status:', error.response.status);
        console.error('Server response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from server, request sent:', error.request);
      }
    }
    
    // Return empty array instead of throwing to prevent UI from being stuck in loading state
    return { videos: [] };
  }
};
