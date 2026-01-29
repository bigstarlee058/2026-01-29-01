import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatAspectRatio } from 'utils/size';
import styles from './InfoTooltip.module.scss';

const InfoTooltip = ({
  isVisible,
  position,
  tooltipData,
  onMouseEnter,
  onMouseLeave,
  className = '',
  placement = 'top',
}) => {
  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function - no local timeouts to clear in this component
    };
  }, []);

  if (!tooltipData || !isVisible || !position || typeof position.x !== 'number' || typeof position.y !== 'number' || !tooltipData.title) {
    return null;
  }

  // Define tooltip data structure
  const tooltipItems = [
    {
      label: 'Ratio',
      value: tooltipData.aspectRatio,
      show: !!tooltipData.aspectRatio,
    },
    {
      label: 'Duration',
      value: tooltipData.duration,
      show: !!tooltipData.duration,
    },
    { label: 'Added by', value: tooltipData.addedBy, show: !!tooltipData.addedBy },
    { label: 'Added on', value: tooltipData.addedOn, show: !!tooltipData.addedOn },
    { label: 'Size', value: tooltipData.size, show: !!tooltipData.size },
    { label: 'Type', value: tooltipData.type, show: !!tooltipData.type },
  ].filter(item => item.show);

  // Don't render if no items to show
  if (tooltipItems.length === 0) {
    return null;
  }

  const handleMouseEnter = () => {
    // Keep tooltip visible when hovering over it
    if (onMouseEnter) {
      onMouseEnter();
    }
  };

  const handleMouseLeave = () => {
    if (onMouseLeave) {
      onMouseLeave();
    }
  };

  return createPortal(
    <div
      className={`${styles.info_tooltip} ${styles[placement]} ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transform: placement === 'top' 
          ? 'translateX(-50%) translateY(-100%)' 
          : 'translateX(-50%) translateY(0%)',
        marginTop: placement === 'top' ? '4px' : '-4px',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.info_tooltip_content}>
        <div className={styles.info_tooltip_details}>
          {tooltipItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className={styles.info_tooltip_row}>
                <span className={styles.info_tooltip_label}>
                  {item.label}:
                </span>
                <span className={styles.info_tooltip_value}>
                  {item.value}
                </span>
              </div>
              {index < tooltipItems.length - 1 && (
                <div className={styles.info_tooltip_divider} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export { InfoTooltip }; 