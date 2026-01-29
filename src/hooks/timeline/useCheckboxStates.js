import { useState, useEffect } from 'react';

export const useCheckboxStates = (storageKey, defaultCount) => {
  const [checkedStates, setCheckedStates] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse checkbox states:', e);
      }
    }
    return new Array(defaultCount).fill(true);
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checkedStates));
  }, [storageKey, checkedStates]);

  const toggleCheckbox = (idx) => {
    setCheckedStates(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  return { checkedStates, toggleCheckbox };
};