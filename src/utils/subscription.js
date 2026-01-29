import axios from 'axios';
import toast from 'react-hot-toast';
import { store } from '../redux/store';
import { handleApiError } from './errorHandler';

const URL = `${process.env.REACT_APP_BACKEND_URL}subscription`;

const getAuthHeaders = () => {
  const state = store.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const createSubscription = async planType => {
  try {
    const result = await axios.post(
      `${URL}/create-subscription`,
      {
        planType: planType,
      },
      {
        headers: getAuthHeaders(),
      }
    );

    return result?.data?.data;
  } catch (error) {
    handleApiError(error, 'Failed to create subscription');
    throw error;
  }
};

// used to validate that subsription was purchased OR to validate that payment method was changed
export const validateSubscription = async () => {
  try {
    await axios.post(`${URL}/validate-subscription`, {
      headers: getAuthHeaders(),
    });
  } catch (error) {
    handleApiError(error, 'Failed to validate subscription', false);
  }
};

export const getSubscription = async () => {
  try {
    const result = await axios.get(`${URL}/get-subscription`, {
      headers: getAuthHeaders(),
    });

    return result?.data?.data;
  } catch (error) {
    console.error('getSubscription error:', error);
  }
};

export const upgradeSubscription = async planType => {
  try {
    const result = await axios.post(
      `${URL}/upgrade-subscription`,
      { newPlanType: planType },
      { headers: getAuthHeaders() }
    );

    return result?.data;
  } catch (error) {
    console.error('upgradeSubscription error:', error);
  }
};

// used to downgrade subscription OR to change from monthly to yearly OR yearly to monthly
export const changeSubscription = async planType => {
  try {
    const result = await axios.post(
      `${URL}/change-subscription`,
      { newPlanType: planType },
      { headers: getAuthHeaders() }
    );

    return result?.data;
  } catch (error) {
    console.error('changeSubscription error:', error);
  }
};

export const continueSubscription = async () => {
  try {
    const result = await axios.post(`${URL}/continue-subscription`, {
      headers: getAuthHeaders(),
    });

    return result?.data;
  } catch (error) {
    console.error('continueSubscription error:', error);
  }
};

export const getSubscriptionUsage = async () => {
  try {
    const result = await axios.get(`${URL}/get-subscription-usage`, {
      headers: getAuthHeaders(),
    });

    return result?.data?.data;
  } catch (error) {
    console.error('getSubscriptionUsage error:', error);
  }
};

export const cancelSubscription = async () => {
  try {
    const result = await axios.post(`${URL}/cancel-subscription`, {
      headers: getAuthHeaders(),
    });

    return result?.data;
  } catch (error) {
    console.error('cancelSubscription error:', error);
  }
};

export const enableSubscription = async () => {
  try {
    const result = await axios.post(`${URL}/enable-subscription`, {
      headers: getAuthHeaders(),
    });

    return result?.data;
  } catch (error) {
    console.error('enableSubscription error:', error);
  }
};

export const changePaymentMethod = async () => {
  try {
    const result = await axios.post(`${URL}/change-payment-method`, {
      headers: getAuthHeaders(),
    });

    return result?.data?.data;
  } catch (error) {
    console.error('changePaymentMethod error:', error);
  }
};
