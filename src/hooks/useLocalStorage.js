import { useState, useEffect } from 'react';

export const useLocalStorage = (key, defaultValue) => {
  const [state, setState] = useState(
    () => JSON.parse(window.localStorage.getItem(key)) ?? defaultValue
  );

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
    
    // Dispatch custom event for same-window synchronization
    const event = new CustomEvent('localStorageChange', {
      detail: { key, value: state }
    });
    window.dispatchEvent(event);
  }, [key, state]);

  return [state, setState];
};
