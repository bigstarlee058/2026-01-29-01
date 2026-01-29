import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import PropTypes from 'prop-types';
import styles from './DynamicInput.module.scss';

const DynamicInput = forwardRef(
  (
    {
      value,
      onChange,
      onBlur,
      onKeyDown,
      onClick,
      onDoubleClick,
      maxLength = 40,
      placeholder,
      readOnly,
      tabIndex,
      containerRef,
      className,
      isHighlighted,
      minWidth = 70,
      minusSize = 16,
      maxWidthSize = 0.75,
    },
    ref
  ) => {
    const inputRef = useRef(null);
    const hiddenSpanRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState(value);
    const debounceTimeoutRef = useRef(null);
    const lastTextRef = useRef('');

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
      blur: () => {
        if (inputRef.current) {
          inputRef.current.blur();
        }
      },
    }));

    const updateInputWidth = () => {
      if (inputRef.current && hiddenSpanRef.current) {
        const text = value || placeholder || '';

        // Only update hiddenSpan if text actually changed to prevent blinking
        if (lastTextRef.current !== text) {
          hiddenSpanRef.current.textContent = text;
          lastTextRef.current = text;
        }

        const maxWidth =
          containerRef?.current?.offsetWidth * maxWidthSize || 500;
        const textWidth = hiddenSpanRef?.current?.offsetWidth || 0;
        const calculatedWidth = Math.max(minWidth, textWidth);
        const finalWidth = Math.min(maxWidth, calculatedWidth);

        inputRef.current.style.width = `${finalWidth}px`;

        // Add ellipsis if text is truncated
        if (textWidth > maxWidth) {
          const ellipsis = '...';
          let truncatedText = text;
          while (
            hiddenSpanRef.current.offsetWidth > maxWidth &&
            truncatedText.length > 0
          ) {
            truncatedText = truncatedText.slice(0, -1);
            hiddenSpanRef.current.textContent = truncatedText + ellipsis;
          }
          setDisplayValue(truncatedText + ellipsis);
        } else {
          setDisplayValue(text);
        }
      }
    };

    // Debounced version of updateInputWidth to prevent freezing
    const debouncedUpdateWidth = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        updateInputWidth();
      }, 50); // 50ms debounce
    };

    const handleChange = e => {
      const newValue = e.target.value;
      onChange(e);

      // Check if this is likely a paste operation (large text change)
      const isPaste = newValue.length > (value?.length || 0) + 3;

      if (isPaste) {
        // For paste operations, update width immediately to prevent jumping
        updateInputWidth();
      } else {
        // For normal typing, use debounced version
        debouncedUpdateWidth();
      }
    };

    const handleBlur = e => {
      setIsFocused(false);
      updateInputWidth(); // Update display value when losing focus (immediate)
      onBlur?.(e);
    };

    const handleFocus = () => {
      setIsFocused(true);
      setDisplayValue(value); // Show full text when focused
    };

    const getCaretPosition = e => {
      const input = inputRef.current;
      if (!input) return 0;

      const clickX = e.clientX - input.getBoundingClientRect().left;
      const text = input.value;

      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.font = window.getComputedStyle(input).font;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      document.body.appendChild(span);

      let left = 0;
      let right = text.length;
      let mid;

      // Binary search for the closest character position
      while (left < right) {
        mid = Math.floor((left + right) / 2);
        span.textContent = text.slice(0, mid);
        const width = span.offsetWidth;

        if (width + 4 < clickX) {
          // Add small offset to improve accuracy
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      document.body.removeChild(span);
      return Math.max(0, left - (clickX % 8 < 4 ? 1 : 0)); // Adjust based on click position within character
    };

    const handleDoubleClick = e => {
      onDoubleClick?.(e);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      updateInputWidth();
    }, [value, placeholder]);

    const isMaxLength = value?.length === maxLength;
    const showWarning = isMaxLength && isFocused;

    return (
      <div className={`${styles.inputContainer} ${className || ''}`}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input} ${showWarning ? styles.maxLength : ''} ${
            isHighlighted ? styles.highlighted : ''
          }`}
          value={isFocused ? value : displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={onKeyDown}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readOnly}
          tabIndex={tabIndex}
        />
        <span
          ref={hiddenSpanRef}
          aria-hidden="true"
          className={styles.hiddenSpan}
          style={{ whiteSpace: 'pre' }}
        />
      </div>
    );
  }
);

DynamicInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onKeyDown: PropTypes.func,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  maxLength: PropTypes.number,
  placeholder: PropTypes.string,
  readOnly: PropTypes.bool,
  tabIndex: PropTypes.number,
  containerRef: PropTypes.object,
  className: PropTypes.string,
  isHighlighted: PropTypes.bool,
};

DynamicInput.displayName = 'DynamicInput';

export { DynamicInput };
