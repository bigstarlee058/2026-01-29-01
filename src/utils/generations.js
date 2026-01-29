import axios from 'axios';
import { store } from '../redux/store';

const URL = `${process.env.REACT_APP_BACKEND_URL}images`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getGenerations = async ({ page, limit, sort = -1 } = {}) => {
  try {
    let url = `${URL}/?`;

    // Only add page and limit if they are provided
    if (page !== undefined && limit !== undefined) {
      url += `page=${page}&limit=${limit}`;
    }

    // Add sort parameter if provided
    if (sort) {
      url += -1;
    }

    const result = await axios.get(url, {
      headers: getAuthHeaders(),
    });
    return result.data;
  } catch (error) {
}
};

export const addGeneration = async image => {
  try {
    const result = await axios.post(`${URL}/add`, image, {
      headers: getAuthHeaders(),
    });

    return result.data;
  } catch (error) {
}
};

export const getPromptGenerations = async ({
  page,
  limit,
  prompt,
  sort,
} = {}) => {
  try {
    let url = `${URL}/prompt/?`;

    // Only add page and limit if they are provided
    if (page !== undefined && limit !== undefined) {
      url += `date=-1&page=${page}&limit=${limit}&`;
    }

    // Add prompt parameter
    if (prompt) {
      url += `prompt=${prompt}`;
    }

    // Add sort parameter if provided
    if (sort) {
      url += -1;
    }

    const result = await axios.get(url, {
      headers: getAuthHeaders(),
    });
    return result.data;
  } catch (error) {
}
};

export const rateImage = async data => {
  try {
    const result = await axios.patch(
      `${URL}/rate`,
      { ...data },
      {
        headers: getAuthHeaders(),
      }
    );

    return result.data;
  } catch (error) {
}
};

export const getImagesRate = async () => {
  try {
    const result = await axios.get(`${URL}/rate`, {
      headers: getAuthHeaders(),
    });

    return result.data;
  } catch (error) {
}
};

export const getPromptImagesRate = async prompt => {
  try {
    const result = await axios.get(`${URL}/prompt-rate?${prompt}`, {
      headers: getAuthHeaders(),
    });

    return result.data;
  } catch (error) {
}
};

export const addTrainingData = async trainingData => {
  try {
    const result = await axios.post(
      `${URL}/training`,
      { trainingData },
      {
        headers: getAuthHeaders(),
      }
    );

    return result.data;
  } catch (error) {
}
};
