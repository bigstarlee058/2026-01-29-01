import React, { forwardRef, useState, useEffect } from 'react';
import styles from './Player.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const ReusablePopup = forwardRef(
  (
    {
      menuOptions,
      onClickMethod,
      hasCheckbox = false,
      hasIcon = false,
      checkedStates = [],
      toggleCheckbox,
      selectedValue,
      className = '',
      onMouseEnter,
      onMouseLeave,
      minWidth,
      alignCenter = false,
      highlightSelected = true,
      isNearRightEdge = false,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    // Handle smooth appearance
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10); // Small delay to ensure the element is rendered

      return () => clearTimeout(timer);
    }, []);

    const handleOptionClick = (option, index) => {
      if (hasCheckbox) {
        toggleCheckbox(index);
      } else {
        onClickMethod(option);
      }
    };

    const renderOptionContent = (option, index) => {
      if (hasCheckbox) {
        return (
          <>
            <span
              className={styles.customCheckbox}
              onClick={e => {
                e.stopPropagation();
                toggleCheckbox(index);
              }}
            >
              {checkedStates[index] && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  style={{ display: 'block' }}
                >
                  <polyline
                    points="3,7 6,10 11,4"
                    style={{
                      fill: 'none',
                      stroke: '#fff',
                      strokeWidth: 1,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  />
                </svg>
              )}
            </span>
            <p style={{ margin: 0 }}>{option.name || option.label}</p>
          </>
        );
      }

      if (hasIcon && option.icon) {
return (
          <ButtonWithIcon
            icon={option.icon}
            text={option.name}
            size="14"
            color="#FFFFFF66"
            classNameButton={styles.iconOption}
          />
        );
      }

      // Default case - simple text option
      return <span>{option.name || option.label}</span>;
    };

    const isOptionSelected = (option, index) => {
      if (hasCheckbox) {
        return checkedStates[index];
      }
      if (selectedValue !== undefined) {
        return option.value === selectedValue || option.id === selectedValue;
      }
      return false;
    };

    return (
      <div
        ref={ref}
        className={`${styles.popUpMenu} ${className} ${
          isVisible ? styles.visible : ''
        }`}
        style={{
          ...(minWidth ? { minWidth } : {}),
          ...(isNearRightEdge
            ? { right: '-6px', left: 'auto' }
            : { left: '-6px', right: 'auto' }),
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={styles.menuContainer}>
          {menuOptions.map((option, index) => (
            <div
              key={option.id || index}
              className={`${styles.menuOption} ${
                isOptionSelected(option, index) && highlightSelected
                  ? styles.selected
                  : ''
              } ${alignCenter ? styles.centered : ''}`}
              onClick={() => handleOptionClick(option, index)}
            >
              {renderOptionContent(option, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export default ReusablePopup;
