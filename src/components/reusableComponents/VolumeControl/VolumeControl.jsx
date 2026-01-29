import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useState, useRef } from 'react';
import styles from './VolumeControl.module.scss';

const VolumeControl = ({
  initialVolume = 20,
  onVolumeChange,
  className = '',
  tooltipText = 'Volume',
}) => {
  const [currentVolume, setCurrentVolume] = useState(initialVolume);

  const volumeContainerRef = useRef(null);
  const volumeRangeRef = useRef(null);
  const volumeNumberRef = useRef(null);

  const handleVolumeChange = value => {
    const newVolume = typeof value === 'object' ? value.target.value : value;
    setCurrentVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  return (
    <div className={`${styles.volumeControlNew} ${className}`}>
      <ButtonWithIcon
        icon="VolumeIcon"
        size={14}
        color="#FFFFFF66"
        accentColor="white"
        classNameButton={styles.scaleButton}
        tooltipText={tooltipText}
        onClick={() => {}}
      />
      <div className={styles.scaleRangeInputBox} ref={volumeContainerRef}>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={currentVolume}
          onChange={e => handleVolumeChange(e.target.value)}
          className={styles.volumeRange}
          ref={volumeRangeRef}
          style={{
            '--range-progress': `${currentVolume}%`,
          }}
        />
        <input
          type="number"
          min="0"
          max="200"
          value={Math.round(currentVolume * 2)}
          ref={volumeNumberRef}
          onChange={e => {
            const inputValue = parseInt(e.target.value) || 0;
            const value = Math.min(100, Math.max(0, inputValue / 2));
            handleVolumeChange({
              target: { value },
            });
          }}
          className={styles.scalePercentage}
        />
      </div>
    </div>
  );
};

export { VolumeControl };
