import React from 'react';
import styles from './NumberInput.module.scss';

const NumberInput = ({
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  placeholder = 'Enter number',
  label = '',
  width = 'auto',
  icon = null
}) => {
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow empty input for editing
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Allow only digits
    if (!/^\d+$/.test(inputValue)) {
      return; // Don't update for invalid input
    }
    
    const numValue = parseInt(inputValue, 10);
    
    // Update with the number value
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const handleIncrement = () => {
    const currentValue = parseInt(value, 10) || min;
    if (currentValue < max) {
      onChange(currentValue + 1);
    }
  };

  const handleDecrement = () => {
    const currentValue = parseInt(value, 10) || min;
    if (currentValue > min) {
      onChange(currentValue - 1);
    }
  };

  const handleBlur = () => {
    // Ensure we have a valid value on blur
    const numValue = parseInt(value, 10);
    
    if (value === '' || isNaN(numValue)) {
      onChange(min);
      return;
    }
    
    // Clamp value within min/max range
    if (numValue < min) {
      onChange(min);
    } else if (numValue > max) {
      onChange(max);
    }
  };

  return (
    <div className={styles.container} style={{ width }}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrapper} ${disabled ? styles.disabled : ''}`}>
        {icon && (
          <div className={styles.iconContainer}>
            {icon}
          </div>
        )}
        <button
          type="button"
          className={styles.decrementBtn}
          onClick={handleDecrement}
          disabled={disabled || parseInt(value, 10) <= min}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M2.5 6H9.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>
        
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
        
        <button
          type="button"
          className={styles.incrementBtn}
          onClick={handleIncrement}
          disabled={disabled || parseInt(value, 10) >= max}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M6 2.5V9.5M2.5 6H9.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export { NumberInput };
