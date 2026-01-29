import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'react-tooltip';
import styles from './ButtonWithDropdown.module.scss';
import ArrowDownIcon from 'components/Icons/ArrowDownIcon';

// Utility function for throttling
const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Utility function for capitalizing text
const capitalizeFirstLetter = string => {
  if (typeof string !== 'string') {
    if (string === null || string === undefined) return '';
    return String(string);
  }

  if (string.toLowerCase() === 'leonardo ai') {
    return 'Leonardo AI';
  }

  if (string.length === 0) return string;
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const ButtonWithDropdown = ({
  list,
  currentItem,
  onSelect,
  classNameButton,
  classNameDropdownItem,
  classNameDropDownList,
  buttonText = 'Left',
  children,
  dataTestid,
  accentColor = 'white',
  icon,
  hasArrow = false,
  onButtonClick,
  onTextClick,
  tooltipText,
  tooltipPlace = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const dropdownId = useRef(
    `dropdown-${Math.random().toString(36).substr(2, 9)}`
  );
  const tooltipId = useRef(
    `tooltip-${Math.random().toString(36).substr(2, 9)}`
  ).current;

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  const isButtonActuallyVisible = useCallback(() => {
    if (!buttonRef.current) return false;

    const element = buttonRef.current;
    const rect = element.getBoundingClientRect();

    // Check if element has zero dimensions
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    // Check computed styles
    const computedStyle = window.getComputedStyle(element);
    if (
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden' ||
      computedStyle.opacity === '0'
    ) {
      return false;
    }

    // Check if element is in viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (
      rect.top >= viewportHeight ||
      rect.bottom <= 0 ||
      rect.left >= viewportWidth ||
      rect.right <= 0
    ) {
      return false;
    }

    // Check if any parent has overflow hidden and the element is outside
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentStyle = window.getComputedStyle(parent);
      const parentRect = parent.getBoundingClientRect();

      if (
        parentStyle.overflow === 'hidden' ||
        parentStyle.overflowX === 'hidden' ||
        parentStyle.overflowY === 'hidden'
      ) {
        // Check if element is outside parent's visible area
        if (
          rect.top < parentRect.top ||
          rect.bottom > parentRect.bottom ||
          rect.left < parentRect.left ||
          rect.right > parentRect.right
        ) {
          return false;
        }
      }

      parent = parent.parentElement;
    }

    return true;
  }, []);

  const handleClickOutside = useCallback(
    event => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  const handleScroll = useCallback(
    throttle(() => {
      if (isOpen) {
        // Check if button is actually visible, if not close the dropdown
        if (!isButtonActuallyVisible()) {
          setIsOpen(false);
        } else {
          // Only update position if button is still visible
          updateDropdownPosition();
        }
      }
    }, 16), // ~60fps throttling
    [isOpen, isButtonActuallyVisible, updateDropdownPosition]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [handleClickOutside, handleScroll]);



  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);

  const handleButtonClick = useCallback(() => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      setIsOpen(prev => !prev);
    }
  }, [onButtonClick]);

  const handleSelect = useCallback(
    (item, e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(item);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const iconWithHoverEffect = useMemo(() => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          color: isHovered
            ? accentColor
            : child.props.color || 'var(--primary-white-text-color)',
          style: { transition: 'color 0.3s ease-in-out' },
        });
      }
      return child;
    });
  }, [children, isHovered, accentColor]);

  const getButtonText = useMemo(() => {
    if (currentItem) {
      return capitalizeFirstLetter(
        typeof currentItem === 'object'
          ? currentItem?.style || JSON.stringify(currentItem)
          : String(currentItem)
      );
    }

    if (dataTestid === 'provider-dropdown') return 'Leonardo AI';
    if (dataTestid?.includes('font-dropdown')) return 'Bangers';
    if (dataTestid?.includes('fontweight-dropdown')) return 'Normal';

    return buttonText;
  }, [currentItem, dataTestid, buttonText]);

  const renderDropdown = useMemo(() => {
    if (!isOpen) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        role="listbox"
        id={dropdownId.current}
        aria-label="Options"
        data-testid={`${dataTestid}-options`}
        className={`${
          classNameDropDownList ? classNameDropDownList : styles.dropdown_list
        }`}
        style={{
          position: 'absolute',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: dataTestid === 'fontsize-dropdown' ? '170px' : '300px',
          overflowY: 'auto',
          zIndex: 999999,
        }}
      >
        {list.map((item, index) => (
          <button
            key={`${item}-${index}`}
            role="option"
            aria-selected={
              typeof item === 'string'
                ? item.toLowerCase() === currentItem?.toLowerCase()
                : item === currentItem
            }
            className={`${classNameDropdownItem} ${
              typeof item === 'string' && typeof currentItem === 'string'
                ? item.toLowerCase() === currentItem.toLowerCase()
                : item === currentItem
                ? styles.selected_item
                : ''
            }`}
            onClick={e => handleSelect(item, e)}
          >
            {capitalizeFirstLetter(
              typeof item === 'object'
                ? item?.style || JSON.stringify(item)
                : String(item)
            )}
          </button>
        ))}
      </div>,
      document.body
    );
  }, [
    isOpen,
    dropdownRef,
    dropdownId,
    dataTestid,
    classNameDropDownList,
    styles.dropdown_list,
    dropdownPosition,
    list,
    currentItem,
    classNameDropdownItem,
    styles.selected_item,
    handleSelect,
  ]);

  return (
    <div className={styles.dropdown_container}>
      <button
        type="button"
        ref={buttonRef}
        className={classNameButton}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid={dataTestid}
        data-tooltip-id={tooltipText && !isOpen ? tooltipId : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={dropdownId.current}
        style={{
          color: isHovered ? accentColor : '',
          transition: 'color 0.3s ease-in-out',
        }}
      >
        <span
          className={styles.button_text}
          onClick={e => {
            if (onTextClick) {
              e.stopPropagation();
              onTextClick(e);
            }
          }}
          style={{ cursor: onTextClick ? 'text' : 'default' }}
        >
          {currentItem
            ? capitalizeFirstLetter(
                typeof currentItem === 'object'
                  ? currentItem?.style || JSON.stringify(currentItem)
                  : String(currentItem)
              )
            : dataTestid && dataTestid === 'provider-dropdown'
            ? 'Leonardo AI'
            : dataTestid && dataTestid.includes('font-dropdown')
            ? 'Bangers'
            : dataTestid && dataTestid.includes('fontweight-dropdown')
            ? 'Normal'
            : buttonText}
        </span>
        <div className={styles.icon_container}>
          {icon &&
            React.cloneElement(icon, {
              color: isHovered
                ? accentColor
                : icon.props.color || 'var(--primary-white-text-color)',
              style: { transition: 'color 0.3s ease-in-out' },
            })}
          {iconWithHoverEffect}
        </div>
        {hasArrow && (
          <ArrowDownIcon
            size="10px"
            color="white"
            className={`${styles.arrow_icon} ${isOpen ? styles.open : ''}`}
          />
        )}
      </button>

      {renderDropdown}

      {tooltipText && !isOpen && (
        <Tooltip
          id={tooltipId}
          place={tooltipPlace}
          delayShow={200}
          delayHide={100}
          noAnchor={true}
          border="1px solid #FFFFFF1A"
          positionStrategy="fixed"
          className="button-tooltip"
          portalId="tooltip-root"
          style={{
            backgroundColor: '#131A25',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
            zIndex: 100000,
          }}
        >
          {tooltipText}
        </Tooltip>
      )}
    </div>
  );
};

export { ButtonWithDropdown };
