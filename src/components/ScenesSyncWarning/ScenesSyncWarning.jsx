import React, { useRef, useState } from 'react';
import { IoWarningOutline, IoCloseOutline } from "react-icons/io5";
import { Tooltip } from 'react-tooltip';
import styles from './ScenesSyncWarning.module.scss';

const ScenesSyncWarning = ({ isVisible, onRegenerateAudio, onDismiss }) => {
  const tooltipId = useRef(`scenes-sync-tooltip-${Math.random().toString(36).substr(2, 9)}`).current;
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isVisible || isDismissed) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRegenerateClick = (e) => {
    e.stopPropagation();
    onRegenerateAudio();
  };

  return (
    <>
      <div 
        className={styles.scenesSyncWarning}
        data-tooltip-id={tooltipId}
        data-tooltip-content="Scenes are out of sync! Your scenes text or order has changed since the last audio generation. Click the warning icon to regenerate audio, or the X to dismiss this warning."
      >
        <div className={styles.warningIcon} onClick={handleRegenerateClick}>
          <IoWarningOutline size={16} />
        </div>
        <div className={styles.dismissIcon} onClick={handleDismiss}>
          <IoCloseOutline size={14} />
        </div>
      </div>
      
      <Tooltip
        id={tooltipId}
        place="top"
        delayShow={200}
        delayHide={100}
        noArrow={false}
        border="1px solid #FFFFFF1A"
        style={{
          backgroundColor: '#131A25',
          color: 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 100000,
          maxWidth: '280px',
          textAlign: 'center',
        }}
      />
    </>
  );
};

export default ScenesSyncWarning;
