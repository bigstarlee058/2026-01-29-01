import { store } from '../redux/store';

// Global function to show errors without needing to use hooks
let globalErrorHandler = null;

// Function to register global error handler
export const registerGlobalErrorHandler = (errorHandler) => {
  globalErrorHandler = errorHandler;
};

// Function to show error
export const showGlobalError = (message, description = '', duration = 3000) => {
  if (globalErrorHandler) {
    return globalErrorHandler.showError(message, description, duration);
  } else {
    // Fallback to console if ErrorContext is unavailable
    console.error('Error:', message, description);
  }
};

// Function to show positive information
export const showGlobalSuccess = (message, description = '', duration = 4000) => {
  if (globalErrorHandler) {
    return globalErrorHandler.showInfoPositive(message, description, duration);
  } else {
    console.log('Success:', message, description);
  }
};

// Function to show completed action
export const showGlobalDone = (message, duration = 4000) => {
  if (globalErrorHandler) {
    return globalErrorHandler.showDonePositive(message, duration);
  } else {
    console.log('Done:', message);
  }
};

// Function to show neutral information
export const showGlobalInfo = (message, description = '', duration = 3000) => {
  if (globalErrorHandler) {
    return globalErrorHandler.showInfoNeutral(message, description, duration);
  } else {
    console.info('Info:', message, description);
  }
};

// Universal function for handling errors in catch blocks
export const handleCatchError = (error, customMessage = null, showToUser = true) => {
  const errorMessage = customMessage || getErrorMessage(error);
  const errorDescription = getErrorDescription(error);
  
  // Always log to console for development
  console.error('Catch error:', error);
  
  // Show to user if needed
  if (showToUser) {
    showGlobalError(errorMessage, errorDescription);
  }
  
  return { message: errorMessage, description: errorDescription };
};

// Function to get understandable message from error
const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.statusText) {
    return error.response.statusText;
  }
  
  return 'An unknown error occurred';
};

// Function to get detailed error description
const getErrorDescription = (error) => {
  if (error?.response?.status) {
    const status = error.response.status;
    switch (status) {
      case 400:
        return 'Bad request';
      case 401:
        return 'Authorization required';
      case 403:
        return 'Access denied';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Too many requests';
      case 500:
        return 'Server error';
      case 502:
        return 'Gateway error';
      case 503:
        return 'Service unavailable';
      default:
        return `Error code: ${status}`;
    }
  }
  
  if (error?.code) {
    return `Code: ${error.code}`;
  }
  
  return '';
};

// Function to handle network errors
export const handleNetworkError = (error) => {
  if (!navigator.onLine) {
    return handleCatchError(error, 'No internet connection', true);
  }
  
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return handleCatchError(error, 'Network error. Check connection', true);
  }
  
  return handleCatchError(error);
};

// Function to handle API errors
export const handleApiError = (error, operation = '') => {
  const prefix = operation ? `${operation}: ` : '';
  
  if (error?.response?.status === 401) {
    return handleCatchError(error, `${prefix}Session expired. Please login again`, true);
  }
  
  if (error?.response?.status === 403) {
    return handleCatchError(error, `${prefix}Insufficient permissions`, true);
  }
  
  if (error?.response?.status >= 500) {
    return handleCatchError(error, `${prefix}Server error. Please try again later`, true);
  }
  
  return handleCatchError(error, prefix ? `${prefix}${getErrorMessage(error)}` : null);
};
