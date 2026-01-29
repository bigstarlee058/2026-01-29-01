import styles from '../Player.module.scss';
import { useEffect, useRef } from 'react';

const PopupPanel = ({
  isOpen,
  x,
  y,
  onClose,
  toggleAnimations,
  onRegenerateAudio,
  isAudioType,
  isImageType,
  deleteElement,
  splitPoint,
  onSplitAudio,
  onSplitImage,
  element, // renamed from selectedElement for clarity
}) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVisualEffects = () => {
    // First trigger screen change
    const screenEvent = new CustomEvent('changeScreen', {
      detail: { screen: 'playback' },
    });
    window.dispatchEvent(screenEvent);

    // Then open the animation sidebar
    const event = new CustomEvent('openAnimationSidebar', {
      detail: { type: 'transition' },
    });
    window.dispatchEvent(event);
    onClose();
  };

  const handleSubtitles = () => {
    // First trigger screen change
    const screenEvent = new CustomEvent('changeScreen', {
      detail: { screen: 'playback' },
    });
    window.dispatchEvent(screenEvent);

    // Then open the appropriate panel based on element type
    const panelType =
      element?.subType === 'subtitles' ? 'subtitles' : 'typography';
    const event = new CustomEvent('openAnimationSidebar', {
      detail: { type: panelType },
    });
    window.dispatchEvent(event);
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className={styles.popupPanel}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      {isAudioType ? (
        <>
          <button
            className={styles.popupButton}
            onClick={() => {
              onSplitAudio(splitPoint);
              onClose();
            }}
          >
            Split
          </button>
          <button
            className={styles.popupButton}
            onClick={() => {
              deleteElement();
              onClose();
            }}
          >
            Delete audio
          </button>
          {element?.properties?.autoSubtitles && (
            <button
              className={styles.popupButton}
              onClick={() => {
                onRegenerateAudio();
              }}
            >
              Regenerate audio
            </button>
          )}
        </>
      ) : isImageType ? (
        <>
          <button className={styles.popupButton} onClick={handleVisualEffects}>
            Visual effects
          </button>
          <button
            className={styles.popupButton}
            onClick={() => {
              deleteElement();
            }}
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <button className={styles.popupButton} onClick={handleVisualEffects}>
            Visual effects
          </button>
          <button className={styles.popupButton} onClick={handleSubtitles}>
            Text
          </button>
          <button
            className={styles.popupButton}
            onClick={() => {
              deleteElement();
            }}
          >
            Remove
          </button>
        </>
      )}
    </div>
  );
};

export default PopupPanel;
