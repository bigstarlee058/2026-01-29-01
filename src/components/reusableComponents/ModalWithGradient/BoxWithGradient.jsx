import React from 'react';
import PropTypes from 'prop-types';
import styles from './ModalWithGradient.module.scss';

const BoxWithGradient = ({
  children,
  width,
  height,
  padding,
  background,
  className,
  style,
  pageWidth,
  pageHeight,
  pageStyle,
  showStains,
}) => {
  const containerStyle = {
    width: width || 'max-content',
    height: height || 'max-content',
    padding: padding || '0px',
    ...style,
  };

  const pageContainerStyle = {
    width: pageWidth || 'max-content',
    height: pageHeight || 'max-content',
    ...pageStyle,
  };

  return (
    <div className={styles.glassmorphicPage} style={pageContainerStyle}>
      <div
        className={`${styles.glassContainer} ${className || ''}`}
        style={containerStyle}
      >
        <div className={styles.borderEffect}>
          <div className={styles.borderTop}></div>
          <div className={styles.borderRight}></div>
          <div className={styles.borderBottom}></div>
          <div className={styles.borderLeft}></div>

          <div className={styles.cornerTopLeft}></div>
          <div className={styles.cornerTopRight}></div>
          <div className={styles.cornerBottomLeft}></div>
          <div className={styles.cornerBottomRight}></div>
        </div>

        <div className={styles.content_box}>{children}</div>
      </div>
    </div>
  );
};

BoxWithGradient.propTypes = {
  children: PropTypes.node,
  width: PropTypes.string,
  height: PropTypes.string,
  padding: PropTypes.string,
  background: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  pageWidth: PropTypes.string,
  pageHeight: PropTypes.string,
  pageStyle: PropTypes.object,
  showStains: PropTypes.bool,
};

export { BoxWithGradient };
