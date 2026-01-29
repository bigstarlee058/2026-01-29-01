import React, { useState } from 'react';
import styles from './AddLinkInput.module.scss';

export const AddLinkInput = ({
  placeholder = 'Drop your link here ...',
  onCancel,
  onAdd,
  initialValue = '',
}) => {
  const [inputValue, setInputValue] = useState(initialValue);

  const handleInputChange = e => {
    setInputValue(e.target.value);
  };

  const handleCancel = () => {
    setInputValue('');
    if (onCancel) {
      onCancel();
    }
  };

  const handleAdd = () => {
    if (onAdd && inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className={styles.addLinkInputContainer}>
      <input
        type="text"
        className={styles.addLinkInput}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
      />
      <div className={styles.inputButtonContainer}>
        <button className={`${styles.addLinkButton} ${styles.cancelButton}`} onClick={handleCancel}>
          Cancel
        </button>
        <button className={styles.addLinkButton} onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
};
