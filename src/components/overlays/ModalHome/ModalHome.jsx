import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ModalHome.module.scss';
import { BoxWithGradient } from '../../BoxWithGradient/BoxWithGradient';

const modalRoot = document.querySelector('#modal-root');

const ModalComponent = ({
  onConfirm,
  onCancel,
  title,
  description,
  cancelText = 'Cancel',
  confirmText = 'Delete',
  icon: Icon,
  iconProps = { color: 'var(--accent-color)', size: 48 },
  closeModal,
  children,
  hideButtons = false,
}) => {
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
      <BoxWithGradient>
        <div className={styles.modal}>
          <div className={styles.stain}></div>
          <div className={styles.stainBottom}></div>
          
          <button
            className={styles.closeButton}
            onClick={closeModal}
            aria-label="Close"
          >
            ✕
          </button>

          {Icon && (
            <div className={styles.iconContainer}>
              <Icon {...iconProps} />
            </div>
          )}

          {title && <h2 className={styles.title}>{title}</h2>}

          {description && <p className={styles.description}>{description}</p>}

          {children && (
            <div className={styles.contentContainer}>{children}</div>
          )}

          {!hideButtons && (
            <div className={styles.buttonContainer}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  if (onCancel) onCancel();
                  closeModal();
                }}
              >
                {cancelText}
              </button>
              <button
                className={styles.confirmButton}
                onClick={() => {
                  onConfirm();
                  closeModal();
                }}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </BoxWithGradient>
    </div>,
    modalRoot
  );
};

export { ModalComponent };
