import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useEffect, useRef, useState } from 'react';
import styles from './TagDropdown.module.scss';

const TagDropdown = ({
  options = [],
  selectedOptions = {},
  onSelectionChange,
  isMultiselect = false,
  isOpen = false,
  onClose,
  className = '',
  disabled = false,
  optionId = 'default', // Default option ID for compatibility
  triggerRef = null, // Reference to the trigger element for positioning
  onRemoveCustomTag = null, // Callback for removing custom tags
  hoverDelay = 300,
  closeDelay = 200,
}) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({
    top: 'auto',
    bottom: 'auto',
    left: '-50px',
  });
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  // Helper functions for tag objects
  const isObject = value => {
    return value && typeof value === 'object' && !Array.isArray(value);
  };

  const getTagLabel = tag => {
    if (isObject(tag)) {
      return tag.label || tag.name || tag.id || '';
    }
    return tag;
  };

  const handleRemoveCustomTag = (tagToRemove, e) => {
    e.stopPropagation();
    if (onRemoveCustomTag && typeof onRemoveCustomTag === 'function') {
      onRemoveCustomTag(tagToRemove, e);
    }
  };

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (hoverDelay === 0) return; // Skip if hover is disabled

    setIsHovered(true);

    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }

    // Clear any existing hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    const timeout = setTimeout(() => {
      // Only open if still hovered and not already open
      if (isHovered && !isOpen) {
        // This would need to be handled by the parent component
        // For now, we'll just set a flag that can be used by parent
      }
    }, hoverDelay);
    setHoverTimeout(timeout);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (closeDelay === 0) return; // Skip if hover is disabled

    setIsHovered(false);

    // Clear any pending hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    // Set close timeout
    const timeout = setTimeout(() => {
      // Only close if not hovered and currently open
      if (!isHovered && isOpen && onClose) {
        onClose();
      }
    }, closeDelay);
    setCloseTimeout(timeout);
  };

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (isOpen && triggerRef?.current && dropdownRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Estimate dropdown dimensions
      const estimatedDropdownHeight = Math.min(options.length * 80 + 60, 200); // Updated to match your changes
      const estimatedDropdownWidth = 319; // max-width from CSS
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let newPosition = {
        top: 'auto',
        bottom: 'auto',
        left: '-50px',
      };

      // Calculate horizontal position to prevent cutoff
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const dropdownHalfWidth = estimatedDropdownWidth / 2;

      // Check if dropdown would be cut off on the left
      if (triggerCenterX - dropdownHalfWidth < 8) {
        // 8px padding from viewport edge
        newPosition.left = '8px';
        newPosition.transform = 'none';
      }
      // Check if dropdown would be cut off on the right
      else if (triggerCenterX + dropdownHalfWidth > viewportWidth - 8) {
        newPosition.left = 'auto';
        newPosition.right = '8px';
        newPosition.transform = 'none';
      }

      // Handle vertical positioning - prioritize positioning above when near bottom
      const shouldPositionAbove =
        spaceBelow < estimatedDropdownHeight + 20 ||
        (spaceBelow < estimatedDropdownHeight &&
          spaceAbove > estimatedDropdownHeight);

      if (shouldPositionAbove) {
        // Position above the trigger
        const triggerHeight = triggerRect.height;
        newPosition.bottom = `${triggerHeight + 4}px`;
        newPosition.top = 'auto';
      } else {
        // Position below the trigger (default)
        newPosition.top = '100%';
        newPosition.bottom = 'auto';
      }

      setPosition(newPosition);
    }
  }, [isOpen, triggerRef, options.length]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [hoverTimeout, closeTimeout]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (isOpen && onClose) {
        // Don't close if clicking inside the dropdown
        if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
          return;
        }
        // In multiselect mode, don't close on outside clicks
        if (isMultiselect) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, isMultiselect]);

  const handleOptionClick = option => {
    if (disabled) return;

    const newSelectedOptions = { ...selectedOptions };
    const optionLabel = getTagLabel(option);

    if (!isMultiselect) {
      // Single selection - replace current selection
      newSelectedOptions[optionId] = optionLabel;
      onSelectionChange(newSelectedOptions);
      // Don't close dropdown here - let parent handle it
    } else {
      // Multiple selection - toggle option
      const currentSelections = newSelectedOptions[optionId] || [];

      if (Array.isArray(currentSelections)) {
        if (currentSelections.includes(optionLabel)) {
          // Remove option if already selected
          newSelectedOptions[optionId] = currentSelections.filter(
            item => item !== optionLabel
          );
        } else {
          // Add option if not selected
          newSelectedOptions[optionId] = [...currentSelections, optionLabel];
        }
      } else {
        // Convert single selection to array
        newSelectedOptions[optionId] = [optionLabel];
      }

      onSelectionChange(newSelectedOptions);
      // Don't close dropdown in multiselect mode
    }
  };

  const isOptionSelected = option => {
    const selection = selectedOptions[optionId];

    if (!isMultiselect) {
      return selection === getTagLabel(option);
    } else {
      return (
        Array.isArray(selection) && selection.includes(getTagLabel(option))
      );
    }
  };

  if (!options || options.length === 0 || !isOpen) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className={`${styles.dropdown} ${className}`}
      style={{
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
        transform: position.transform,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.dropdownOptions}>
        {options.map((option, index) => {
          const isCustom = isObject(option) && option.isCustom;
          return (
            <div
              key={index}
              className={`${styles.dropdownOption} ${
                isOptionSelected(option) ? styles.selected : ''
              } ${isCustom ? styles.customTag : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              {getTagLabel(option)}
              {isCustom && (
                <ButtonWithIcon
                  icon="CloseIcon"
                  size="6"
                  color="var(--accent-color)"
                  accentColor="black"
                  activeColor="black"
                  onClick={e => handleRemoveCustomTag(option, e)}
                  title="Remove tag"
                  classNameButton={styles.closeButton}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { TagDropdown };
