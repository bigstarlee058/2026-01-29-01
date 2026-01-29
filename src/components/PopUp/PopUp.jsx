import styles from './PopUp.module.scss';
import React, { useEffect, useRef } from 'react';

const PopUp = ({
  textTop = 'Insert above',
  textBottom = 'Insert below',
  onInsertUnderClick,
  onInsertBelowClick,
  onClose,
}) => {

const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose(); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <>
      <div ref={popupRef}  className={styles.popup}>
        <button
          className={styles.popup_button}
          type="button"
          onClick={() => {
            onInsertUnderClick();
            onClose();
          }}
        >
          {textTop}
        </button>
        <button
          className={styles.popup_button}
          type="button"
          onClick={() => {
            onInsertBelowClick();
            onClose();
          }}
        >
          {textBottom}
        </button>
      </div>
    </>
  );
};

export default PopUp;
