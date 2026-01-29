import styles from './ScaleControlInput.module.scss';
import { useEffect, useRef, useState, forwardRef } from 'react';

const ScaleControlInput = forwardRef(({
  currentValue,
  onValueChange,
  step,
  min,
  max,
  measure,
}, ref) => {
  const inputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const numberInputRef = useRef(null);
  const valueContainerRef = useRef(null);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(inputRef.current);
      } else {
        ref.current = inputRef.current;
      }
    }
  }, [ref]);

  useEffect(() => {
    setInputValue(currentValue);
    const progress = ((currentValue - min) / (max - min)) * 100;
    if (inputRef.current) {
      inputRef.current.style.setProperty('--range-progress', `${progress}%`);
    }
  }, [currentValue, min, max]);

  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    const handleWheel = e => {
      e.preventDefault();
      
      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = parseFloat(inputValue);
      const stepVal = parseFloat(step) || 0.1;
      
      let newValue = currentVal + direction * stepVal;
      newValue = Math.max(min, Math.min(max, newValue));
      newValue = parseFloat(newValue.toFixed(1)); 
      
      setInputValue(newValue);
      
      const progress = ((newValue - min) / (max - min)) * 100;
      if (inputRef.current) {
        inputRef.current.style.setProperty('--range-progress', `${progress}%`);
        inputRef.current.value = newValue;
      }
      
      const syntheticEvent = {
        target: { value: newValue }
      };
      onValueChange(syntheticEvent);
    };

    inputElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      inputElement.removeEventListener('wheel', handleWheel);
    };
  }, [inputValue, min, max, step, onValueChange]);

  const handleChange = e => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      const progress = ((value - min) / (max - min)) * 100;
      e.target.style.setProperty('--range-progress', `${progress}%`);
      setInputValue(value);
      onValueChange(e);
    }
  };

  const handleInputChange = e => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const value = parseFloat(newValue);
    if (!isNaN(value)) {
      const progress = ((value - min) / (max - min)) * 100;
      if (inputRef.current) {
        inputRef.current.style.setProperty('--range-progress', `${progress}%`);
        inputRef.current.value = value;
      }
    }
  };

  const handleInputBlur = () => {
    let value = parseFloat(inputValue);
    if (isNaN(value)) {
      value = currentValue;
    } else {
      value = Math.max(min, Math.min(max, value));
    }
    
    setInputValue(value);
    setIsEditing(false);
    
    if (value !== currentValue) {
      const syntheticEvent = {
        target: { value }
      };
      onValueChange(syntheticEvent);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setInputValue(currentValue);
      setIsEditing(false);
    }
  };

  const handleContainerClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && numberInputRef.current) {
      numberInputRef.current.focus();
      numberInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className={styles.scaleControl}>
      <div className={styles.scaleRangeInputBox}>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          onChange={handleChange}
          className={styles.scaleRange}
        />
        <div 
          ref={valueContainerRef}
          className={styles.scaleValueContainer}
          onClick={handleContainerClick}
        >
          <input
            ref={numberInputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className={`${styles.scaleInput} ${isEditing ? styles.editing : ''}`}
          />
          <span className={styles.scalePercentage}>{` ${measure}`}</span>
        </div>
      </div>
    </div>
  );
});

export { ScaleControlInput };
