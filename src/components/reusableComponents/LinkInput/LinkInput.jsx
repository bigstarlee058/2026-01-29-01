import React from 'react';
import PropTypes from 'prop-types';
import styles from './LinkInput.module.scss';

const LinkInput = ({
  value,
  onChange,
  onUpload,
  onCancel,
  placeholder = 'Drop your link here ...',
  disabled = false,
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && value.trim() && !disabled) {
      onUpload(value);
    }
  };

  const handleUpload = () => {
    if (value.trim() && !disabled) {
      onUpload(value);
    }
  };

  return (
    <div className={styles.linkInputContainer}>
      <input
        type="text"
        placeholder={placeholder}
        className={styles.linkInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
      />
      <div className={styles.linkInputActions}>
        <button
          className={styles.addBtn}
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
        <button 
          className={styles.addBtn}
          onClick={handleUpload}
          disabled={!value.trim() || disabled}
        >
          Add
        </button>
      </div>
    </div>
  );
};

LinkInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};

export { LinkInput }; 