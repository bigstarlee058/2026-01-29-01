import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './CustomMultiSectionField.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const CustomMultiSectionField = ({
  field,
  value,
  onChange,
  sections,
  placeholder = 'Select...',
  customInputTitle = 'Create your custom style',
  customInputPlaceholder = 'e.g., Custom description',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customText, setCustomText] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isCustomInputFocused, setIsCustomInputFocused] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

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
  }, []);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Calculate available space
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 200; // Match the CSS max-height

      // Open above if there's not enough space below OR if there's more space above
      const shouldOpenAbove = spaceBelow < dropdownHeight;

      const topPosition = shouldOpenAbove
        ? rect.top - dropdownHeight - 2
        : rect.bottom + 2;

      setDropdownPosition({
        top: topPosition,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        setIsCustomInputFocused(false); // Reset focus state when closing
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

  useEffect(() => {
    // Don't reset customText if user is in custom mode
    if (isCustomMode) return;

    if (value) {
      // Try to parse existing value for selected options
      const newSelectedOptions = {};
      let foundOptions = [];

      sections.forEach(section => {
        const option = section.options.find(opt =>
          value.toLowerCase().includes(opt.toLowerCase())
        );
        if (option) {
          newSelectedOptions[section.key] = option;
          foundOptions.push(option);
        }
      });

      // Check if the entire value exactly matches the combination of found options
      const combinedOptions = foundOptions.join(' ').toLowerCase();
      const valueLower = value.toLowerCase();
      const isExactMatch = valueLower === combinedOptions;

      if (foundOptions.length > 0 && isExactMatch) {
        // Value exactly matches a combination of predefined options
        setSelectedOptions(newSelectedOptions);
        setDisplayValue(value);
        setCustomText('');
      } else {
        // Value is not exactly a combination of predefined options, treat as custom text
        setSelectedOptions({});
        setDisplayValue(value);
        setCustomText(value);
      }
    } else {
      // Reset when value is empty
      setSelectedOptions({});
      setCustomText('');
      setDisplayValue('');
    }
  }, [value, sections, isCustomMode]);

  const handleOptionSelect = (sectionKey, option) => {
    const newSelectedOptions = { ...selectedOptions, [sectionKey]: option };
    setSelectedOptions(newSelectedOptions);

    // Combine all selected options
    const combinedValue = Object.values(newSelectedOptions)
      .filter(Boolean)
      .join(' ');
    setDisplayValue(combinedValue);
    setCustomText(''); // Keep custom input empty
    setIsCustomMode(false); // Exit custom mode
    onChange(combinedValue);
  };

  const handleCustomTextChange = text => {
    setCustomText(text);
    setIsCustomMode(true); // Enter custom mode
    setIsCustomInputFocused(true); // Keep focused when typing
    // Don't update displayValue or onChange until Done is clicked
  };

  const handleDone = () => {
    setDisplayValue(customText); // Update display value with custom text
    onChange(customText); // Apply the custom text
    setSelectedOptions({}); // Reset selected options when using custom text
    setIsCustomInputFocused(false); // Reset focus state
    setIsOpen(false);
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
      if (!triggerWidth || !text) return text;

      const textWidth = getTextWidth(text);
      if (textWidth <= triggerWidth - 60) return text; // 60px for padding, caret, and safety margin

      // Binary search to find the right truncation point
      let start = 0;
      let end = text.length;
      let result = text;

      while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        const testText = text.substring(0, mid) + '...';
        const testWidth = getTextWidth(testText);

        if (testWidth <= triggerWidth - 60) {
          result = testText;
          start = mid + 1;
        } else {
          end = mid - 1;
        }
      }

      return result;
    },
    [triggerWidth, getTextWidth]
  );

  // Get truncated text for custom input field (without binary search for simplicity)
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

  return (
    <div className={styles.customMultiSectionField}>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={() => {
          if (!isOpen) {
            // Initialize custom text with current value if it's not exactly a combination of predefined options
            if (value) {
              let foundOptions = [];
              sections.forEach(section => {
                const option = section.options.find(opt =>
                  value.toLowerCase().includes(opt.toLowerCase())
                );
                if (option) {
                  foundOptions.push(option);
                }
              });

              // Check if the entire value exactly matches the combination of found options
              const combinedOptions = foundOptions.join(' ').toLowerCase();
              const valueLower = value.toLowerCase();
              const isExactMatch = valueLower === combinedOptions;

              if (foundOptions.length > 0 && isExactMatch) {
                setCustomText('');
              } else {
                setCustomText(value);
              }
            } else {
              setCustomText('');
            }
            setIsCustomInputFocused(false); // Reset focus state when opening
          }
          setIsOpen(!isOpen);
        }}
      >
        <span className={styles.value}>
          {getTruncatedText(displayValue || placeholder)}
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
            <div className={styles.sections}>
              {sections.map(section => (
                <div key={section.key} className={styles.section}>
                  <h4>{section.title}</h4>
                  {section.options.map(option => (
                    <div
                      key={option}
                      className={`${styles.option} ${
                        selectedOptions[section.key] === option
                          ? styles.selected
                          : ''
                      }`}
                      onClick={() => handleOptionSelect(section.key, option)}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomMultiSectionField;