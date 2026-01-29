import React from 'react';
import styles from './UploadOptions.module.scss';
import { ButtonWithIcon } from '../reusableComponents/ButtonWithIcon';

const UploadOptions = ({ onClose, onLocalUpload, onGoogleDriveUpload }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Choose Upload Source</h2>
        <div className={styles.options}>
          <button 
            className={styles.option}
            onClick={onLocalUpload}
          >
            <ButtonWithIcon
              icon="UploadIcon"
              accentColor="var(--accent-color)"
              classNameButton={styles.optionButton}
              tooltipText="Upload from Local"
            />
            <span>Upload from Local</span>
          </button>
          
          <button 
            className={styles.option}
            onClick={onGoogleDriveUpload}
          >
            <ButtonWithIcon
              icon="GoogleDriveIcon"
              accentColor="var(--accent-color)"
              classNameButton={styles.optionButton}
              tooltipText="Upload from Google Drive"
            />
            <span>Upload from Google Drive</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadOptions; 