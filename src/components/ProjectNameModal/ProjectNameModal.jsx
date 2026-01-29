import React, { useState, useEffect } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { CloseIcon, InformationIcon } from 'components/Icons';
import styles from './ProjectNameModal.module.scss';

const ProjectNameModal = ({
  isOpen,
  onClose,
  onSave,
  currentName = 'My Story',
  title = 'Give your project a name',
  description = 'This helps you stay organized as you create.',
}) => {
  const [projectName, setProjectName] = useState(currentName);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setProjectName(currentName);
      setIsValid(true);
    }
  }, [isOpen, currentName]);

  const handleInputChange = e => {
    const value = e.target.value;
    setProjectName(value);
    setIsValid(value.trim().length >= 3 && value.trim().length <= 50);
  };

  const handleSave = () => {
    const trimmedName = projectName.trim();
    if (trimmedName.length >= 3 && trimmedName.length <= 50) {
      onSave(trimmedName);
      onClose();
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && isValid) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          <CloseIcon color="#6B747A" size={9} />
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={projectName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type Here"
                className={`${styles.input} ${!isValid ? styles.invalid : ''}`}
                maxLength={50}
                autoFocus
              />
              {!isValid && (
                <div className={styles.errorMessage}>
                  <span>Project name must be between 3 and 50 characters</span>
                </div>
              )}
            </div>

            <ButtonWithIcon
              text="Start Creating"
              onClick={handleSave}
              disabled={!isValid}
              color="#060b17"
              accentColor="#060b17"
              classNameButton={styles.createButton}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProjectNameModal };
