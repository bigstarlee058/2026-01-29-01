import React, { useState } from 'react';
import styles from './GenerationModeToggle.module.scss';
import {
  Text2ImgIcon,
  Text2VidIcon,
  Img2ImgIcon,
  Img2VidIcon,
} from 'components/Icons';

const GenerationModeToggle = ({
  activeMode = 'textToImage',
  onModeChange,
  disabled = false,
}) => {
  const [hoveredMode, setHoveredMode] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  const modes = [
    {
      id: 'textToImage',
      label: 'Text to Image',
      icon: Text2ImgIcon,
      disabled: false,
    },
    {
      id: 'textToVideo',
      label: 'Text to Video',
      icon: Text2VidIcon,
      disabled: false,
    },
    {
      id: 'imageToImage',
      label: 'Image to Image',
      icon: Img2ImgIcon,
      disabled: true,
    },
    {
      id: 'imageToVideo',
      label: 'Image to Video',
      icon: Img2VidIcon,
      disabled: false,
    },
  ];

  const handleModeClick = modeId => {
    const mode = modes.find(m => m.id === modeId);
    if (!mode.disabled && !disabled && onModeChange) {
      onModeChange(modeId);
    }
  };

  const shouldShowText = mode => {
    return mode.id === activeMode || hoveredMode === mode.id;
  };

  const handleMouseEnter = modeId => {
    if (disabled) return;

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Set timeout for delayed hover effect
    const timeout = setTimeout(() => {
      setHoveredMode(modeId);
    }, 300); // 300ms delay

    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    // Immediate removal of hover state
    setHoveredMode(null);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  return (
    <div className={styles.toggleContainer}>
      {modes.map((mode, index) => {
        const IconComponent = mode.icon;
        const isActive = activeMode === mode.id;
        const isHovered = hoveredMode === mode.id;
        const isDisabled = mode.disabled || disabled;
        const showText = shouldShowText(mode);

        return (
          <button
            key={mode.id}
            className={`
              ${styles.toggleButton} 
              ${isActive ? styles.active : ''} 
              ${isDisabled ? styles.disabled : ''}
              ${index === 0 ? styles.first : ''}
              ${index === modes.length - 1 ? styles.last : ''}
              ${showText ? styles.expanded : styles.collapsed}
            `}
            onClick={() => handleModeClick(mode.id)}
            onMouseEnter={() => handleMouseEnter(mode.id)}
            onMouseLeave={handleMouseLeave}
            disabled={isDisabled}
          >
            <IconComponent
              className={styles.icon}
              size={24}
              color={
                isActive || isHovered ? 'var(--accent-color)' : '#FFFFFF66'
              }
            />
            <span
              className={`${styles.text} ${!showText ? styles.textHidden : ''}`}
              style={{
                color:
                  isActive || isHovered ? 'var(--accent-color)' : '#FFFFFF66',
              }}
            >
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export { GenerationModeToggle };
