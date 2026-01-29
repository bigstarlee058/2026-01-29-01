import React from 'react';
import styles from './RegenerationConfirmModal.module.scss';

const RegenerationConfirmModal = ({ 
  isOpen, 
  onClose, 
  onRegenerate, 
  onGoToStoryboard,
  hasTextChanges,
  hasSettingsChanges 
}) => {
  if (!isOpen) return null;

  const getChangesSummary = () => {
    const changes = [];
    if (hasTextChanges) changes.push('text content');
    if (hasSettingsChanges) changes.push('settings');
    return changes.join(' and ');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Changes Detected</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>
            You&apos;ve made changes to the {getChangesSummary()}. 
            What would you like to do?
          </p>
          
          <div className={styles.options}>
            <div className={styles.option}>
              <h4>Regenerate Content</h4>
              <p>Update prompts and audio based on your changes (recommended)</p>
            </div>
            <div className={styles.option}>
              <h4>Go to Storyboard</h4>
              <p>Keep current content and proceed without regeneration</p>
            </div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button 
            className={styles.secondaryButton} 
            onClick={onGoToStoryboard}
          >
            Go to Storyboard
          </button>
          <button 
            className={styles.primaryButton} 
            onClick={onRegenerate}
          >
            Regenerate & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export { RegenerationConfirmModal };