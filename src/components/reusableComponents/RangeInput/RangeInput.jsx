import styles from './RangeInput.module.scss';
import { useEffect, useRef, useState, forwardRef } from 'react';

const RangeInput = forwardRef(
  (
    {
      label,
      min,
      max,
      step,
      value,
      onChange,
      currentValue,
      onValueChange,
      measure,
    },
    ref
  ) => {
    const inputRef = useRef(null);
    const numberInputRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(0);
    const actualValue = currentValue !== undefined ? currentValue : value;
    const actualOnChange = onValueChange || onChange;
    const actualMin = parseFloat(min);
    const actualMax = parseFloat(max);
    const actualStep = parseFloat(step) || 0.1;

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
      setInputValue(actualValue);
      const progress =
        ((actualValue - actualMin) / (actualMax - actualMin)) * 100;
      if (inputRef.current) {
        inputRef.current.style.setProperty('--value', `${progress}%`);
      }
    }, [actualValue, actualMin, actualMax]);

    useEffect(() => {
      const inputElement = inputRef.current;
      if (!inputElement) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseFloat(inputValue);

        let newValue = currentVal + direction * actualStep;
        newValue = Math.max(actualMin, Math.min(actualMax, newValue));
        newValue = parseFloat(newValue.toFixed(1));

        setInputValue(newValue);

        const progress =
          ((newValue - actualMin) / (actualMax - actualMin)) * 100;
        if (inputRef.current) {
          inputRef.current.style.setProperty('--value', `${progress}%`);
          inputRef.current.value = newValue;
        }

        // Create synthetic event for consistency
        const syntheticEvent = {
          target: { value: newValue },
        };
        actualOnChange(syntheticEvent);
      };

      inputElement.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        inputElement.removeEventListener('wheel', handleWheel);
      };
    }, [inputValue, actualStep, actualMin, actualMax, actualOnChange]);

    const handleRangeChange = e => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        const progress = ((value - actualMin) / (actualMax - actualMin)) * 100;
        e.target.style.setProperty('--value', `${progress}%`);
        setInputValue(value);
        actualOnChange(e);
      }
    };

    const handleNumberInputChange = e => {
      const newValue = e.target.value;

      // Remove measure from the input value for processing
      const cleanValue = measure
        ? newValue.replace(measure, '').trim()
        : newValue;

      // Filter out non-numeric characters (allow numbers, decimal points, and minus signs)
      const numericValue = cleanValue.replace(/[^0-9.-]/g, '');

      // Prevent multiple decimal points
      const parts = numericValue.split('.');
      const filteredValue =
        parts.length > 2
          ? parts[0] + '.' + parts.slice(1).join('')
          : numericValue;

      const value = parseFloat(filteredValue);

      if (!isNaN(value)) {
        // Enforce max value immediately
        const clampedValue = Math.max(actualMin, Math.min(actualMax, value));
        const finalValue =
          clampedValue === value ? filteredValue : clampedValue.toString();

        setInputValue(finalValue);

        const progress =
          ((clampedValue - actualMin) / (actualMax - actualMin)) * 100;
        if (inputRef.current) {
          inputRef.current.style.setProperty('--value', `${progress}%`);
          inputRef.current.value = clampedValue;
        }
      } else {
        // Only allow numeric input, empty string, or partial numbers
        if (filteredValue === '' || /^[0-9.-]*$/.test(filteredValue)) {
          setInputValue(filteredValue);
        }
      }
    };

    const handleNumberInputBlur = () => {
      // Remove measure from the input value for processing
      const cleanValue = measure
        ? inputValue.replace(measure, '').trim()
        : inputValue;
      let value = parseFloat(cleanValue);
      if (isNaN(value)) {
        value = actualValue;
      } else {
        value = Math.max(actualMin, Math.min(actualMax, value));
      }

      setInputValue(value);
      setIsEditing(false);

      if (value !== actualValue) {
        const syntheticEvent = {
          target: { value },
        };
        actualOnChange(syntheticEvent);
      }
    };

    const handleKeyDown = e => {
      if (e.key === 'Enter') {
        handleNumberInputBlur();
      } else if (e.key === 'Escape') {
        setInputValue(actualValue);
        setIsEditing(false);
      }
    };

    const handleContainerClick = e => {
      e.stopPropagation();
      setIsEditing(true);
    };

    useEffect(() => {
      if (isEditing && numberInputRef.current) {
        numberInputRef.current.focus();
        numberInputRef.current.select();
      }
    }, [isEditing]);

    // Create display value with measure
    const displayValue = isEditing
      ? inputValue
      : measure
      ? `${inputValue} ${measure}`
      : inputValue;

    return (
      <div className={styles.rangeInputContainer}>
        <div className={styles.rangeInputHeader}>
          {label && <label>{label}</label>}{' '}
          <div
            className={styles.numberInputContainer}
            onClick={handleContainerClick}
          >
            <input
              ref={numberInputRef}
              type="text"
              value={displayValue}
              onChange={handleNumberInputChange}
              onBlur={handleNumberInputBlur}
              onKeyDown={handleKeyDown}
              className={`${styles.numberInput} ${
                isEditing ? styles.editing : ''
              }`}
            />
          </div>
        </div>
        <input
          ref={inputRef}
          type="range"
          min={actualMin}
          max={actualMax}
          step={actualStep}
          value={inputValue}
          onChange={handleRangeChange}
          className={styles.rangeInput}
          style={{
            '--value': `${
              ((inputValue - actualMin) / (actualMax - actualMin)) * 100
            }%`,
          }}
        />
      </div>
    );
  }
);

export { RangeInput };
