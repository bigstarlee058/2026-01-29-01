import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SettingSection } from '../SettingSection/SettingSection';
import styles from './SettingsPopup.module.scss';
import {ButtonWithIcon} from 'components/reusableComponents/ButtonWithIcon';

const SettingsPopup = ({
  isOpen,
  onClose,
  storyData,
  refetch,
  isStoryBoardOpen,
}) => {
  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = event => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup}>
        <div className={styles.glow_container}>
          <div className={styles.stain}></div>
        </div>
        <div className={styles.header}>
          <ButtonWithIcon
            icon="CloseIcon"
            color='#799A9E'
            accentColor='white'
            size='8px'
            onClick={onClose}
            classNameButton={styles.closeButton}
          />
        </div>
        <div className={styles.content}>
          <SettingSection
            storyData={storyData}
            refetch={refetch}
            isStoryBoardOpen={isStoryBoardOpen}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export { SettingsPopup };
