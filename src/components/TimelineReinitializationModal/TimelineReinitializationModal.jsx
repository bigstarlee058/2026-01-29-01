import React, { useEffect, useRef } from 'react';
import { IoWarningOutline, IoCloseOutline, IoRefreshOutline } from 'react-icons/io5';
import styles from './TimelineReinitializationModal.module.scss';

const TimelineReinitializationModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  isProcessing 
}) => {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel, isProcessing]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && !isProcessing) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel, isProcessing]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <IoWarningOutline size={24} className={styles.warningIcon} />
            <h2 className={styles.title}>Timeline Reinitialization Required</h2>
          </div>
          {!isProcessing && (
            <button 
              className={styles.closeButton} 
              onClick={onCancel}
              aria-label="Close modal"
            >
              <IoCloseOutline size={24} />
            </button>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.warningContent}>
            <div className={styles.warningMessage}>
              <h3 className={styles.warningTitle}>
                ⚠️ This action will overwrite your current timeline
              </h3>
              <p className={styles.warningDescription}>
                To synchronize the new audio with your updated scenes, we need to rebuild the timeline. 
                This will:
              </p>
              
              <ul className={styles.changesList}>
                <li>
                  <span className={styles.changeIcon}>🗑️</span>
                  Clear all current timeline elements and animations
                </li>
                <li>
                  <span className={styles.changeIcon}>🎵</span>
                  Add the new regenerated audio
                </li>
                <li>
                  <span className={styles.changeIcon}>🎬</span>
                  Re-sync images with your updated scenes
                </li>
                <li>
                  <span className={styles.changeIcon}>⚠️</span>
                  <strong>Remove any manual timeline adjustments you&apos;ve made</strong>
                </li>
              </ul>

              <div className={styles.recommendation}>
                <strong>Recommendation:</strong> If you&apos;ve made important timeline adjustments, 
                consider saving your project first before proceeding.
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button 
                className={styles.cancelButton} 
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmButton} 
                onClick={onConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <IoRefreshOutline className={styles.spinningIcon} />
                    Rebuilding Timeline...
                  </>
                ) : (
                  'Rebuild Timeline'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineReinitializationModal;
