import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './CustomDropdown.module.scss';

const CustomDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  width = 'auto',
  icon = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 300, openUpward: false });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Calculate dropdown position
  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const maxMenuHeight = 300; // From SCSS max-height
    const estimatedHeight = Math.min(options.length * 40 + 16, maxMenuHeight);
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom - 8; // 8px margin
    const spaceAbove = triggerRect.top - 8; // 8px margin
    
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > estimatedHeight;

    setPosition({
      top: openUpward 
        ? Math.max(8, triggerRect.top - estimatedHeight + window.scrollY)
        : triggerRect.bottom + window.scrollY,
      left: triggerRect.left + window.scrollX,
      width: triggerRect.width,
      maxHeight: openUpward ? Math.min(estimatedHeight, spaceAbove) : Math.min(estimatedHeight, spaceBelow),
      openUpward
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update position on scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, options.length]);

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        calculatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <>
      <div 
        className={`${styles.dropdown} ${disabled ? styles.disabled : ''}`}
        style={{ width }}
      >
        <button
          ref={triggerRef}
          className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
          onClick={handleToggle}
          disabled={disabled}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.text}>{displayText}</span>
          <svg 
            className={`${styles.arrow} ${isOpen ? styles.rotated : ''}`}
            width="14" 
            height="14" 
            viewBox="0 0 12 12" 
            fill="none"
          >
            <path 
              d="M3 4.5L6 7.5L9 4.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      
      {isOpen && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          className={`${styles.menu} ${styles.portal} ${position.openUpward ? styles.upward : ''}`}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: 9999
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export { CustomDropdown };
