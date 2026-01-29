import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import icons from 'images/icons.svg';

import styles from './Modal.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const modalRoot = document.querySelector('#modal-root');

const MainModal = ({ closeModal, children, icon="CloseIcon" }) => {
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.code === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal]);

  const handleBackdropClick = e => {
    if (e.currentTarget === e.target) {
      closeModal();
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.main_modal} onClick={e => e.stopPropagation()}>
        {/* {closeModal && <button className={styles.close_btn} onClick={() => closeModal()}>
          <svg className={styles.icon}>
            <use href={icons + `#icon-cross`}></use>
          </svg>
        </button>} */}
        {closeModal && (
          <ButtonWithIcon
            icon={icon}
            onClick={() => closeModal()}
            classNameButton={styles.close_btn}
            classNameIcon={styles.icon}
          />
        )}
        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default MainModal;
