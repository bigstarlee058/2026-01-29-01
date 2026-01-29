import React from 'react';
import styles from './LoadingOverlay.module.scss';
import Lottie from 'lottie-react';
import videfyAnime from '../../data/videfyAnime.json';

const LoadingOverlay = ({ state = 'loading', progress = 0, message = '' }) => {
  const getStatusMessage = () => {
    switch (state) {
      case 'rendering':
        if (message) return message;
        if (progress === 0) return 'Initializing render...';
        return `Rendering video: ${progress}%`;
      case 'error':
        return message || 'An error occurred during rendering';
      default:
        return 'Loading...';
    }
  };

  const getProgressFromMessage = (message) => {
    if (!message) return 0;
    
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && data.length > 0) {
        const lastItem = data[data.length - 1];
        
        // If it's a file URL, rendering is complete
        if (lastItem.type === 'file') {
          return 100;
        }
        
        // If it's a frame progress
        if (lastItem.frame) {
          // Assuming total frames is around 287 (from your example)
          // You might want to adjust this based on your video length and FPS
          return Math.min(Math.round((lastItem.frame / 287) * 100), 99);
        }
        
        // Handle execution states
        if (lastItem.type === 'execution') {
          switch (lastItem.state) {
            case 'allocating':
              return 5;
            case 'launching':
              return 10;
            default:
              return 0;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing progress message:', e);
    }
    
    return 0;
  };

  const currentProgress = message ? getProgressFromMessage(message) : progress;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <Lottie
          animationData={videfyAnime}
          className={styles.lottieAnimation}
          data-testid="loading-animation"
        />
        <div className={styles.progressInfo}>
          <p>Duplicating story...</p>
        </div>
        {state === 'rendering' && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {getStatusMessage()}
            </div>
            {message && message.includes('time') && (
              <div className={styles.timeInfo}>
                {JSON.parse(message).find(m => m.time)?.time || 'Calculating time...'}
              </div>
            )}
          </div>
        )}
        {state === 'error' && (
          <div className={styles.errorMessage}>
            {message || 'An error occurred during rendering'}
          </div>
        )}
      </div>
    </div>
  );
};

export { LoadingOverlay };
