// Middleware to handle debounced actions
const debouncedActionsMiddleware = () => {
  let timeouts = {};

  return store => next => action => {
    // List of actions to debounce
    const debouncedActions = [
      'timeline/setEditorElements', 
      'timeline/saveToHistory',
      'timeline/saveTimelineState'
    ];
    
    if (debouncedActions.includes(action.type)) {
      if (timeouts[action.type]) {
        clearTimeout(timeouts[action.type]);
      }

      return new Promise(resolve => {
        timeouts[action.type] = setTimeout(() => {
          delete timeouts[action.type];
          resolve(next(action));
        }, 500);
      });
    }

    return next(action);
  };
};

export default debouncedActionsMiddleware; 