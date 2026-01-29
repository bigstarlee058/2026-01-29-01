import styles from './MyItemsPopUp.module.scss';
import { useState, useEffect, useRef } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { MyItems } from 'components/MyItems/MyItems';

const MyItemsPopUp = ({ handleClose, storyData }) => {
  const popupRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = event => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        handleClose();
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose]);

  return (
    <div className={styles.myItemsPopUp} ref={popupRef}>
      <div className={styles.title_box}>
        <div className={styles.title_container}>
          <h2 className={styles.title}>My Items</h2>
          <ButtonWithIcon
            icon="CloseIcon"
            size="14px"
            onClick={handleClose}
            color="#BABABA"
            accentColor="white"
            activeColor="var(--accent-color)"
            classNameButton={styles.closeButton}
            style={{ position: 'relative', zIndex: 10 }}
          />
        </div>
      </div>
      <div className={styles.content}>
        <MyItems
          storyData={storyData}
          height="calc(100vh - 120px)"
          showUploadMenu={true}
          showTableHeader={true}
          variant="storyboard"
        />
      </div>
    </div>
  );
};

export { MyItemsPopUp };