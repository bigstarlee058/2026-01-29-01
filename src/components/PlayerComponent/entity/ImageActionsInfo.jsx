import React, { useState } from 'react';
import { observer } from 'mobx-react';
import styles from './ImageActionsInfo.module.scss';
import InfoIcon from 'components/Icons/InfoIcon';

export const ImageActionsInfo = observer(({ animation }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getActionsList = () => {
    if (!animation || !animation.properties) {
      return [];
    }

    const actions = [];

    // Add opacity action if it exists and is not a fade animation
    if (animation.properties.opacity !== undefined && !['fadeIn', 'fadeOut'].includes(animation.type)) {
      actions.push(`Opacity: ${Math.round(animation.properties.opacity * 100)}%`);
    }

    // Add zoom/scale action if it exists
    if (animation.properties.scaleFactor !== undefined) {
      actions.push(`Zoom: ${Math.round(animation.properties.scaleFactor * 100)}%`);
    }

    // Add background color and opacity if they exist
    if (animation.properties.background) {
      if (animation.properties.background.color) {
        actions.push(`Background Color: ${animation.properties.background.color}`);
      }
      if (animation.properties.background.opacity !== undefined) {
        actions.push(`Background Opacity: ${Math.round(animation.properties.background.opacity * 100)}%`);
      }
    }

    return actions;
  };

  const actions = getActionsList();

  return (
    <div className={styles.container}>
      <button 
        className={styles.infoButton}
        onClick={() => setIsOpen(!isOpen)}
        title={actions.length ? "Show image actions" : "No actions applied"}
      >
        <InfoIcon size="16px" color="#9fa6a9" />
      </button>
      
      {isOpen && actions.length > 0 && (
        <div className={styles.actionsList}>
          <h4>Applied Actions:</h4>
          <ul>
            {actions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}); 