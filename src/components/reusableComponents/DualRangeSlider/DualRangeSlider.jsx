import React from 'react';
import styles from './DualRangeSlider.module.scss';

const TimeRangeInput = ({
  min,
  max,
  valueStart,
  valueEnd,
  onChange,
  step = 1,
}) => {
  const [isDragging, setIsDragging] = React.useState(null);
  const sliderRef = React.useRef(null);

  const handleMouseDown = type => e => {
    setIsDragging(type);
    e.preventDefault();
  };

  const handleTouchStart = type => e => {
    setIsDragging(type);
    e.preventDefault();
  };

  const getEventPosition = e => {
    return e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleMove = React.useCallback(
    e => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientX = getEventPosition(e);
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const newValue = min + (max - min) * percentage;

      if (isDragging === 'start') {
        const newStart = Math.min(newValue, valueEnd - step);
        onChange(Math.max(min, newStart), valueEnd);
      } else if (isDragging === 'end') {
        const newEnd = Math.max(newValue, valueStart + step);
        onChange(valueStart, Math.min(max, newEnd));
      }
    },
    [isDragging, min, max, valueStart, valueEnd, onChange, step]
  );

  const handleEnd = React.useCallback(() => {
    setIsDragging(null);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      const handleMouseMove = e => handleMove(e);
      const handleTouchMove = e => handleMove(e);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const startPercent = ((valueStart - min) / (max - min)) * 100;
  const endPercent = ((valueEnd - min) / (max - min)) * 100;

  const formatTime = timeMs => {
    if (timeMs === 0) return '0s';
    const seconds = Math.floor(timeMs / 1000);
    const ms = Math.floor((timeMs % 1000) / 10);
    return `${seconds}.${ms.toString().padStart(2, '0')}s`;
  };

  return (
    <div className={styles.timeRangeSection}>
      <div className={styles.timeRangeHeader}>
        <h4>Animation Time Range</h4>
      </div>

      <div className={styles.timeRangeSlider}>
        <div className={styles.dualRangeSlider} ref={sliderRef}>
          <div className={styles.sliderTrack}>
            <div
              className={styles.sliderRange}
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`,
              }}
            >
              {valueStart !== 0 && (
                <div className={`${styles.timeRangeInfo} ${styles.start}`}>
                  {formatTime(valueStart)}
                </div>
              )}
              <div className={styles.timeRangeInfo}>
                {formatTime(valueEnd - valueStart)}
              </div>
              {valueEnd !== max && (
                <div className={`${styles.timeRangeInfo} ${styles.end}`}>
                  {formatTime(valueEnd)}
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.rangeInfo} ${styles.start}`}>
            {formatTime(min)}
          </div>
          <div className={`${styles.rangeInfo} ${styles.end}`}>
            {formatTime(max)}
          </div>
          <div
            className={styles.sliderThumbContainer}
            style={{ left: `${startPercent}%` }}
            onMouseDown={handleMouseDown('start')}
            onTouchStart={handleTouchStart('start')}
          >
            <div className={styles.sliderThumb} />
          </div>
          <div
            className={styles.sliderThumbContainer}
            style={{ left: `${endPercent}%` }}
            onMouseDown={handleMouseDown('end')}
            onTouchStart={handleTouchStart('end')}
          >
            <div className={styles.sliderThumb} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeRangeInput;
