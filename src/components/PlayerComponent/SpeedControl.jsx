import React, { useState, useContext, useEffect } from 'react';
import { observer } from 'mobx-react';
import { makeAutoObservable, action, runInAction } from 'mobx';
import { StoreContext } from '../../mobx';
import styles from './SpeedControl.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const speedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

function SpeedControlComponent() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const store = useContext(StoreContext);

  // Initialize playbackRate in store if it doesn't exist
  useEffect(() => {
    runInAction(() => {
      if (!store.playbackRate) {
        store.playbackRate = 1;
      }
      if (!store.setPlaybackRate) {
        store.setPlaybackRate = action(async (rate) => {
          store.playbackRate = rate;
          // Update video playback speed
          store.videos.forEach(video => {
            if (video.element) {
              video.element.playbackRate = rate;
            }
          });

          // Update audio playback speed
          store.audios.forEach(audio => {
            if (audio.element) {
              audio.element.playbackRate = rate;
            }
          });
        });
      }
    });
  }, [store]);

  const handleSpeedChange = async (option) => {
    setIsDropdownOpen(false);
    
    // Reduce delay for higher speeds to minimize stuttering
    const delay = option.value >= 1.5 ? 25 : 50;
    
    setTimeout(async () => {
      await store.setPlaybackRate(option.value);
    }, delay);
  };

  // Get current speed label
  const getCurrentSpeedLabel = () => {
    const option = speedOptions.find(opt => opt.value === store.playbackRate);
    return option ? option.label : '1x';
  };

  return (
    <div className={styles.speedControl}>
      <ButtonWithIcon
        text={getCurrentSpeedLabel()}
        classNameButton={styles.speedButton}
        tooltipText="Speed"
      />
      <div className={styles.speedDropdown}>
        {speedOptions.map((option) => (
          <button
            key={option.label}
            className={`${styles.speedOption} ${option.value === store.playbackRate ? styles.selected : ''}`}
            onClick={() => handleSpeedChange(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SpeedControl = observer(SpeedControlComponent);

export default SpeedControl;
