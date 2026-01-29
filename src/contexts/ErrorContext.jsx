import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ErrorNotification from 'components/ErrorNotification/ErrorNotification';
import { registerGlobalErrorHandler } from 'utils/errorHandler';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);

  const showError = useCallback((message, description = '', duration = 3000) => {
    const id = Date.now();
    const newError = { id, message, description, duration, type: 'info-negative' };
    setErrors(prev => [...prev, newError]);
    return id;
  }, []);

  const showInfoPositive = useCallback((message, description = '', duration = 4000) => {
    const id = Date.now();
    const newError = { id, message, description, duration, type: 'info-positive' };
    setErrors(prev => [...prev, newError]);
    return id;
  }, []);

  const showDonePositive = useCallback((message, duration = 4000) => {
    const id = Date.now();
    const newError = { id, message, duration, type: 'done-positive' };
    setErrors(prev => [...prev, newError]);
    return id;
  }, []);

  const showInfoNeutral = useCallback((message, description = '', duration = 3000) => {
    const id = Date.now();
    const newError = { id, message, description, duration, type: 'info-neutral' };
    setErrors(prev => [...prev, newError]);
    return id;
  }, []);

  const hideError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  // Register global error handler
  useEffect(() => {
    registerGlobalErrorHandler({
      showError,
      showInfoPositive,
      showDonePositive,
      showInfoNeutral,
      hideError
    });
  }, [showError, showInfoPositive, showDonePositive, showInfoNeutral, hideError]);

  return (
    <ErrorContext.Provider value={{ 
      showError, 
      showInfoPositive, 
      showDonePositive, 
      showInfoNeutral,
      hideError 
    }}>
      {children}
      {errors.map(error => (
        <ErrorNotification
          key={error.id}
          message={error.message}
          description={error.description}
          type={error.type}
          duration={error.duration}
          onClose={() => hideError(error.id)}
        />
      ))}
    </ErrorContext.Provider>
  );
};
