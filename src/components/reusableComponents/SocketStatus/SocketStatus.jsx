import React from 'react';
import { useSocket } from 'contexts/SocketContext';
import styles from './SocketStatus.module.scss';

const SocketStatus = ({ showDetails = false }) => {
  const { isConnected, socket } = useSocket();

  if (!showDetails && isConnected) {
    return null; // Не показуємо нічого якщо з'єднання працює
  }

  return (
    <div className={`${styles.container} ${isConnected ? styles.connected : styles.disconnected}`}>
      <div className={styles.indicator}>
        <span className={styles.dot} />
        <span className={styles.text}>
          {isConnected ? 'Socket Connected' : 'Socket Disconnected'}
        </span>
      </div>
      {showDetails && socket && (
        <div className={styles.details}>
          ID: {socket.id || 'Unknown'}
        </div>
      )}
    </div>
  );
};

export { SocketStatus }; 