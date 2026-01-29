import axios from 'axios';
import toast from 'react-hot-toast';
import { store } from '../redux/store';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}image-editing`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const removeBg = async ({ imageUrl, storyId, imageId }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/remove-bg`, {
      imageUrl,
      storyId,
      imageId,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};

export const replaceBg = async ({
  imageUrl,
  storyId,
  imageId,
  prompt,
  seed = 1,
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/replace-bg`, {
      imageUrl,
      storyId,
      imageId,
      prompt,
      seed,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error replacing background');
    console.error('Error replacing background:', error);
    throw error;
  }
};

export const generativeRemove = async ({
  imageUrl,
  storyId,
  imageId,
  prompt,
  multiple,
  removeShadow,
  regions,
}) => {
  multiple = multiple === 'Yes' ? true : false;
  removeShadow = removeShadow === 'Yes' ? true : false;

  try {
    const response = await axios.post(`${API_BASE_URL}/generative-remove`, {
      imageUrl,
      storyId,
      imageId,
      prompt,
      multiple,
      removeShadow,
      regions,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};

export const objectReplace = async ({
  imageUrl,
  storyId,
  imageId,
  fromObject,
  toObject,
  preserveGeometry,
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/object-replace`, {
      imageUrl,
      storyId,
      imageId,
      fromObject,
      toObject,
      preserveGeometry,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};

export const generativeFill = async ({
  imageUrl,
  storyId,
  imageId,
  width,
  height,
  aspectRatio,
  cropMode,
  gravity,
  prompt,
  seed,
}) => {
  width = width || 800;
  height = height || 1200;

  switch (gravity) {
    case 'Top left':
      gravity = 'north_west';
      break;
    case 'Top':
      gravity = 'north';
      break;
    case 'Top right':
      gravity = 'north_east';
      break;
    case 'Right':
      gravity = 'west';
      break;
    case 'Bottom right':
      gravity = 'south_west';
      break;
    case 'Bottom':
      gravity = 'south';
      break;
    case 'Bottom left':
      gravity = 'south_east';
      break;
    case 'Left':
      gravity = 'east';
      break;
    case 'Center':
      gravity = 'center';
      break;
    default:
      break;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/generative-fill`, {
      imageUrl,
      storyId,
      imageId,
      width,
      height,
      aspectRatio,
      cropMode,
      gravity,
      prompt,
      seed,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};

export const generativeRecolor = async ({
  imageUrl,
  storyId,
  imageId,
  targetObject,
  toColor,
  multiple,
  applyToTier,
  multipleObjects,
}) => {
  multiple = multiple === 'Yes' ? true : false;

  try {
    const response = await axios.post(`${API_BASE_URL}/generative-recolor`, {
      imageUrl,
      storyId,
      imageId,
      targetObject,
      toColor,
      multiple,
      applyToTier,
      multipleObjects,
    }, {
      headers: getAuthHeaders()
    });

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};

export const generativeRestoreEnhance = async ({
  imageUrl,
  storyId,
  imageId,
  enhanceMode,
}) => {
  enhanceMode = enhanceMode?.toLowerCase()?.replace(/ & /g, '_');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/generative-restore-enhance`,
      {
        imageUrl,
        storyId,
        imageId,
        enhanceMode,
      },
      {
        headers: getAuthHeaders()
      }
    );

    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error removing background');
    console.error('Error removing background:', error);
    throw error;
  }
};
