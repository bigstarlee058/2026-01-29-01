import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './CustomDropdown.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  showCustomInput = true,
  customInputTitle = 'Create your own option',
  customInputPlaceholder = 'Type your own option...',
  isTypeField = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isCustomInputFocused, setIsCustomInputFocused] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [localValue, setLocalValue] = useState(value);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      // Add a small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 200; // Approximate dropdown height

        // Open above if there's not enough space below
        const shouldOpenAbove = spaceBelow < dropdownHeight;

        setDropdownPosition({
          top: shouldOpenAbove
            ? rect.top - dropdownHeight - 2
            : rect.bottom + 2,
          left: rect.left,
          width: rect.width,
        });
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isTypeField ? value : null]); // Only recalculate for type field when value changes

  // Calculate trigger width on mount and on resize
  useEffect(() => {
    const calculateWidth = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTriggerWidth(rect.width);
      }
    };

    calculateWidth();

    // Recalculate on window resize
    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, [isTypeField ? value : null]); // Only recalculate for type field when value changes

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = option => {
    setLocalValue(option); // Update local value immediately
    onChange(option);
    setCustomText(''); // Clear custom text when selecting an option
    setIsOpen(false);
  };

  const handleCustomTextChange = text => {
    setCustomText(text);
  };

  // Calculate text width using canvas
  const getTextWidth = useCallback((text, font = '12px Manrope') => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;
    return context.measureText(text).width;
  }, []);

  // Truncate text if it's too long
  const getTruncatedText = useCallback(
    text => {
      if (!text) return text;
      if (!triggerWidth) return text; // Don't truncate if width not calculated yet

      const availableWidth = triggerWidth - 100; // Increased buffer for shorter text
      const textWidth = getTextWidth(text);

      if (textWidth <= availableWidth) return text;

      // Simple truncation: find where to cut and add "..."
      let truncated = text;
      while (
        getTextWidth(truncated + '...') > availableWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }

      return truncated + '...';
    },
    [triggerWidth, getTextWidth]
  );

  // Get truncated text for custom input field
  const getCustomInputTruncatedText = useCallback(
    text => {
      if (!text) return text;
      if (!triggerWidth) return text; // Don't truncate if width not calculated yet

      // Estimate available width for custom input (accounting for Done button)
      const availableWidth = triggerWidth - 120; // More buffer for input field and Done button
      const textWidth = getTextWidth(text);

      if (textWidth <= availableWidth) return text;

      // Simple truncation: find where to cut and add "..."
      let truncated = text;
      while (
        getTextWidth(truncated + '...') > availableWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }

      return truncated + '...';
    },
    [triggerWidth, getTextWidth]
  );

  const handleDone = () => {
    if (customText.trim()) {
      onChange(customText.trim());
      setCustomText('');
      setIsOpen(false);
    }
  };

  const resetDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200;

      const shouldOpenAbove = spaceBelow < dropdownHeight;

      setDropdownPosition({
        top: shouldOpenAbove ? rect.top - dropdownHeight - 2 : rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      if (!isOpen) {
        // Reset position before opening
        resetDropdownPosition();
        setIsCustomInputFocused(false); // Reset focus state when opening
        // Initialize custom text with current value if it's not in options
        const isOptionValue = options.includes(value);
        if (!isOptionValue && value) {
          setCustomText(value);
        } else {
          setCustomText('');
        }
      }
      setIsOpen(!isOpen);
    }
  };

  const selectedOption = options.find(option => option === localValue);

  return (
    <div className={`${styles.customDropdown} ${className}`}>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${
          disabled ? styles.disabled : ''
        }`}
        onClick={handleTriggerClick}
      >
        <span className={styles.value}>
          {getTruncatedText(localValue || placeholder)}
        </span>
        <ButtonWithIcon icon="ArrowDownIcon" classNameButton={styles.caret} />
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {showCustomInput && (
              <div className={styles.customInput}>
                <h4>{customInputTitle}</h4>
                <div className={styles.inputGroup}>
                  <textarea
                    value={
                      isCustomInputFocused
                        ? customText
                        : getCustomInputTruncatedText(customText)
                    }
                    onChange={e => handleCustomTextChange(e.target.value)}
                    onFocus={() => setIsCustomInputFocused(true)}
                    onBlur={() => setIsCustomInputFocused(false)}
                    placeholder={customInputPlaceholder}
                    className={`${styles.customInputField} ${
                      isCustomInputFocused ? styles.expanded : ''
                    } ${!customText ? styles.empty : ''}`}
                    rows={1}
                  />
                  {customText && (
                    <button onClick={handleDone} className={styles.doneButton}>
                      Done
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className={styles.options}>
              {options.map((option, index) => (
                <div
                  key={index}
                  className={`${styles.option} ${
                    option === localValue ? styles.selected : ''
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomDropdown;
