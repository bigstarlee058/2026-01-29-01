import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as Icons from 'components/Icons';
import { Tooltip } from 'react-tooltip';
import ICON_SIZE from 'components/Icons/IconSize';
import styles from './ButtonWithIcon.module.scss';

const IconMap = Object.fromEntries(
  Object.keys(Icons).map(key => [key, Icons[key]])
);

const ButtonWithIcon = forwardRef(
  (
    {
      name,
      text,
      path,
      icon,
      customIcon,
      size = ICON_SIZE.REGULAR,
      accentSize = size,
      children,
      classNameButton,
      classNameIcon,
      color,
      accentColor,
      activeColor,
      textColor = color,
      onClick,
      disabled,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      onMouseEnter,
      tooltipText,
      tooltipContent,
      tooltipPlace = 'top',
      tooltipBackground = '#131A25',
      dataTestid,
      style,
      opacity,
      marginLeft = '6px',
      iconPosition = 'before', // 'before' or 'after'
      rightIcon,
      rightIconSize,
      classNameRightIcon,
      isDragging,
    },
    ref
  ) => {
    const [isInteracting, setIsInteracting] = useState(false);
    const buttonRef = useRef(null);
    const tooltipId = useRef(
      `tooltip-${Math.random().toString(36).substr(2, 9)}`
    ).current;
    const navigate = useNavigate();

    // Use the forwarded ref if provided, otherwise use the internal ref
    const finalRef = ref || buttonRef;

    const handleClick = e => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (path) navigate(path);
      if (onClick) onClick(e);
    };

    const IconComponent = IconMap[icon];
    const RightIconComponent = rightIcon ? IconMap[rightIcon] : null;
    const isActive = classNameButton?.includes('active');

    const getCurrentColor = () => {
      if (isActive && activeColor) return activeColor;
      if (isInteracting || isActive) return accentColor;
      return color;
    };

    const getTextColor = () => {
      if (isActive && activeColor) return activeColor;
      if (isInteracting || isActive) return accentColor;
      return textColor;
    };

    const normalizeSize = (sizeValue) => {
      if (typeof sizeValue === 'number') {
        return `${sizeValue}px`;
      }
      return sizeValue;
    };

    const getIconSize = () => {
      if (icon === 'FadeIcon') return ICON_SIZE.EXTRA_SMALL;
      const currentSize = isInteracting || isActive ? accentSize : size;
      return normalizeSize(currentSize);
    };

    const renderIcon = () => (
      <span className={classNameIcon}>
        {customIcon ? (
          customIcon
        ) : icon && IconComponent ? (
          <IconComponent
            color={getCurrentColor()}
            size={getIconSize()}
            opacity={opacity}
            style={{
              transition: 'color 0.3s ease, transform 0.3s ease',
              transform: `scale(${isInteracting || isActive ? 1.1 : 1}) ${
                classNameIcon?.includes('flipped_icon') ? 'scaleY(-1)' : ''
              }`,
            }}
          />
        ) : null}
      </span>
    );

    const renderText = () =>
      text && (
        <span style={{ color: getTextColor(), marginLeft: marginLeft }}>
          {text}
        </span>
      );

    return (
      <>
        <button
          ref={finalRef}
          className={classNameButton}
          onClick={handleClick}
          disabled={disabled}
          onMouseEnter={e => {
            setIsInteracting(true);
            if (onMouseEnter) onMouseEnter(e);
          }}
          onMouseLeave={e => {
            setIsInteracting(false);
            if (onMouseLeave) onMouseLeave(e);
          }}
          onFocus={() => setIsInteracting(true)}
          onBlur={() => setIsInteracting(false)}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          data-tooltip-id={
            tooltipText || tooltipContent ? tooltipId : undefined
          }
          data-tooltip-content={tooltipText}
          data-tooltip-html={
            typeof tooltipText === 'string' ? tooltipText : undefined
          }
          data-button-name={name}
          aria-label={typeof tooltipText === 'string' ? tooltipText : 'button'}
          data-testid={dataTestid}
          style={style}
        >
          {iconPosition === 'after' ? (
            <>
              {renderText()}
              {renderIcon()}
            </>
          ) : (
            <>
              {renderIcon()}
              {renderText()}
            </>
          )}
          {rightIcon && RightIconComponent && (
            <span className={classNameRightIcon}>
              <RightIconComponent
                color={getCurrentColor()}
                size={normalizeSize(rightIconSize || size)}
                opacity={opacity}
                style={{
                  transition: 'color 0.3s ease, transform 0.3s ease',
                  transform: `scale(${isInteracting || isActive ? 1.1 : 1})`,
                }}
              />
            </span>
          )}
          {children}
        </button>

        {(tooltipText || tooltipContent) && !isDragging && (
          <Tooltip
            id={tooltipId}
            place={tooltipPlace}
            render={({ content }) => (
              <div
                style={{
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '1.3',
                  letterSpacing: '0.03em',
                }}
              >
                {tooltipContent || content}
              </div>
            )}
            delayShow={200}
            delayHide={100}
            noAnchor={true}
            border="1px solid #FFFFFF1A"
            positionStrategy="fixed"
            className={`button-tooltip ${
              classNameButton?.includes('infoBtn')
                ? styles['info-button-tooltip']
                : ''
            }`}
            portalId="tooltip-root"
            style={{
              backgroundColor: tooltipBackground,
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px',
              zIndex: 100000,
            }}
          />
        )}
      </>
    );
  }
);

ButtonWithIcon.displayName = 'ButtonWithIcon';

ButtonWithIcon.propTypes = {
  name: PropTypes.string,
  text: PropTypes.any,
  path: PropTypes.string,
  icon: PropTypes.string,
  customIcon: PropTypes.node,
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  accentSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.node,
  classNameButton: PropTypes.string,
  classNameIcon: PropTypes.string,
  color: PropTypes.string,
  accentColor: PropTypes.string,
  activeColor: PropTypes.string,
  textColor: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  onMouseDown: PropTypes.func,
  onMouseUp: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  tooltipText: PropTypes.string,
  tooltipContent: PropTypes.node,
  tooltipPlace: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  tooltipBackground: PropTypes.string,
  dataTestid: PropTypes.string,
  style: PropTypes.object,
  opacity: PropTypes.number,
  marginLeft: PropTypes.string,
  iconPosition: PropTypes.oneOf(['before', 'after']),
  rightIcon: PropTypes.string,
  rightIconSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  classNameRightIcon: PropTypes.string,
  isDragging: PropTypes.bool,
};

export { ButtonWithIcon };
