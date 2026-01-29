import { useEffect } from 'react';

const isCursorInInput = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const inputTypes = ['input', 'textarea', 'select'];
  const contentEditable = activeElement.getAttribute('contenteditable') === 'true';
  
  return inputTypes.includes(activeElement.tagName.toLowerCase()) || contentEditable;
};

export const useKeyboardShortcuts = (shortcuts, options = {}) => {
  const { includeKeyUp = false, keyUpHandlers = {}, store = null } = options;

  useEffect(() => {
    const handleKeyDown = (event) => {
      const shortcut = shortcuts[event.code];
      if (shortcut && !isCursorInInput()) {
        event.preventDefault();
        // Pass store and event to the shortcut handler
        shortcut(event, store);
      }
    };

    const handleKeyUp = (event) => {
      const keyUpHandler = keyUpHandlers[event.key];
      if (keyUpHandler) {
        keyUpHandler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    if (includeKeyUp) {
      window.addEventListener('keyup', handleKeyUp);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (includeKeyUp) {
        window.removeEventListener('keyup', handleKeyUp);
      }
    };
  }, [shortcuts, includeKeyUp, keyUpHandlers, store]);
}; 