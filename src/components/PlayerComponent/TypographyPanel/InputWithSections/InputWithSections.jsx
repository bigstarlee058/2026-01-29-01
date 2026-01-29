import styles from './InputWithSections.module.scss';
import { useState, useEffect, useRef, useContext } from 'react';
import { ColorPicker } from '../ColorPicker/ColorPicker';
import { StoreContext } from '../../../../mobx';
import { createPortal } from 'react-dom';

const InputWithSections = ({
  value,
  onColorChange,
  isSubtitlesPanel = false,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const colorBtnRef = useRef(null);
  const store = useContext(StoreContext);

  const handleColorChange = newColor => {
    try {
      if (onColorChange && typeof onColorChange === 'function') {
        onColorChange(newColor);
      }
    } catch (error) {
      console.error('Error in handleColorChange:', error);
    }
  };

  const handleColorButtonClick = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsColorPickerOpen(!isColorPickerOpen);
    if (!isColorPickerOpen) {
      updatePickerPosition();
    }
  };

  const updatePickerPosition = () => {
    if (colorBtnRef.current) {
      const rect = colorBtnRef.current.getBoundingClientRect();
      const pickerWidth = 230;
      const pickerHeight = 348;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Increased right offset from 20px to 60px, then moved 10px to the left
      const left = rect.right + 74; // Changed from 60 to 50

      // Check if there's enough space on the right, if not, position to the left
      const spaceOnRight = windowWidth - rect.right;
      const spaceOnLeft = rect.left;

      let position;

      // Calculate top position, ensuring it stays within window bounds
      // Position the picker below the button with a 20px gap
      let topPosition = rect.bottom - 58;
      if (topPosition + pickerHeight > windowHeight) {
        topPosition = Math.max(10, windowHeight - pickerHeight - 10);
      }

      if (spaceOnRight >= pickerWidth + 80) { // Increased from 40 to 80
        // Position to the right of the button with increased gap
        position = {
          left: left,
          top: topPosition,
        };
      } else if (spaceOnLeft >= pickerWidth + 80) { // Increased from 40 to 80
        // Position to the left of the button with increased gap
        position = {
          left: rect.left - pickerWidth - 70, // Changed from 80 to 70
          top: topPosition,
        };
      } else {
        // If not enough space on either side, position to the right and adjust
        position = {
          left: Math.max(10, windowWidth - pickerWidth - 10),
          top: topPosition,
        };
      }

      setPickerPosition(position);
    }
  };

  useEffect(() => {
    const handleClickOutside = event => {
      const isColorPickerClick = event.target.closest(
        '.chrome-picker, #colorPickerPortal'
      );
      const isInsideWrapper =
        wrapperRef.current && wrapperRef.current.contains(event.target);

      if (!isColorPickerClick && !isInsideWrapper) {
        setIsColorPickerOpen(false);
      }
    };

    if (isColorPickerOpen) {
      updatePickerPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePickerPosition);
      window.addEventListener('scroll', updatePickerPosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePickerPosition);
      window.removeEventListener('scroll', updatePickerPosition);
    };
  }, [isColorPickerOpen]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.sectionLeft}>
        <button
          className={styles.colorPicker_btn}
          onClick={handleColorButtonClick}
          style={{ backgroundColor: value }}
          ref={colorBtnRef}
        />
      </div>

      {isColorPickerOpen && 
        createPortal(
          <div
            id="colorPickerPortal"
            style={{
              position: 'fixed',
              left: `${pickerPosition.left}px`,
              top: `${pickerPosition.top}px`,
              zIndex: 999999,
            }}
            className={styles.colorPickerPortal}
          >
            <ColorPicker
              color={value}
              onChange={handleColorChange}
              onClose={() => setIsColorPickerOpen(false)}
              isSubtitlesPanel={isSubtitlesPanel}
              defaultActiveButton="Font"
            />
          </div>,
          document.body
        )
      }
    </div>
  );
};

export { InputWithSections };
