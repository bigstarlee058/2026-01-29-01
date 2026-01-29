import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './TimeRangeInput.module.scss';

const TimeRangeInput = ({
  min,
  max,
  valueStart,
  valueEnd,
  onChange,
  step = 1,
  displayAsPercent = false,
  disableRangeMove = false,
}) => {
  const [isDragging, setIsDragging] = useState(null);
  const [isRangeDragging, setIsRangeDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0 });
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const lastPosition = useRef({ x: 0 });

  const handleMouseDown = type => e => {
    setIsDragging(type);
    e.preventDefault();
  };

  const handleTouchStart = type => e => {
    setIsDragging(type);
    e.preventDefault();
  };

  const handleRangeDragStart = e => {
    // Don't start range drag if clicking on thumbs
    if (e.target.closest('[class*="sliderThumbContainer"]')) {
      return;
    }

    // Don't start range drag if disabled
    if (disableRangeMove) {
      return;
    }

    e.preventDefault();
    setIsRangeDragging(true);

    // Calculate offset from where user clicked within the range
    const rangeRect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rangeRect.left,
    });
  };

  const handleRangeDrag = useCallback(
    e => {
      if (!isRangeDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left - dragOffset.x;
      const timelineWidth = rect.width;

      const newTimePosition = (relativeX / timelineWidth) * (max - min);
      const rangeWidth = valueEnd - valueStart;

      // Calculate new start position
      let newStart = newTimePosition;

      // Constrain within bounds
      newStart = Math.max(min, Math.min(max - rangeWidth, newStart));
      let newEnd = newStart + rangeWidth;

      // Ensure newEnd doesn't exceed max
      newEnd = Math.min(max, newEnd);
      // Adjust newStart if newEnd was constrained
      if (newEnd === max) {
        newStart = Math.max(min, newEnd - rangeWidth);
      }

      onChange(newStart, newEnd);
    },
    [isRangeDragging, dragOffset, min, max, valueStart, valueEnd, onChange]
  );

  const handleRangeDragEnd = useCallback(() => {
    setIsRangeDragging(false);
    setDragOffset({ x: 0 });
    lastPosition.current = { x: 0 };
  }, []);

  const getEventPosition = e => {
    return e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleMove = useCallback(
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

  const handleEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    const handleMouseMove = e => {
      if (isRangeDragging) {
        handleRangeDrag(e);
      }
    };

    if (isRangeDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleRangeDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleRangeDragEnd);
      };
    }
  }, [isRangeDragging, handleRangeDrag, handleRangeDragEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Validate and constrain values to ensure they don't exceed max
  // Removed automatic onChange call to prevent infinite loops in parent components

  const startPercent = ((valueStart - min) / (max - min)) * 100;
  const endPercent = ((valueEnd - min) / (max - min)) * 100;
  const rangeWidthPercent = endPercent - startPercent;

  // Calculate actual pixel width
  const [rangeWidthPx, setRangeWidthPx] = useState(0);

  useEffect(() => {
    if (sliderRef.current) {
      const sliderWidth = sliderRef.current.offsetWidth;
      const pixelWidth = (rangeWidthPercent / 100) * sliderWidth;
      setRangeWidthPx(pixelWidth);
    }
  }, [rangeWidthPercent, sliderRef.current]);

  const isRangeTooSmall = rangeWidthPx < 36; // 36px threshold

  const formatLabel = (valueMs, type = 'absolute') => {
    if (displayAsPercent) {
      // Compute percent based on [min, max]
      const clamped = Math.max(min, Math.min(max, valueMs));
      const percent = ((clamped - min) / (max - min)) * 100;
      return `${Math.round(percent)}%`;
    }
    // default time format
    if (valueMs === 0) return '0s';
    const seconds = Math.floor(valueMs / 1000);
    const ms = Math.floor((valueMs % 1000) / 10);
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
              className={`${styles.sliderRange} ${
                isRangeDragging ? styles.dragging : ''
              }`}
              style={{
                left: `${startPercent}%`,
                width: `${Math.max(
                  0,
                  Math.min(100 - startPercent, endPercent - startPercent)
                )}%`,
              }}
              onMouseDown={handleRangeDragStart}
              title="Drag to move time range"
            >
              {valueStart !== 0 && (
                <div
                  className={`${styles.timeRangeInfo} ${styles.start} ${
                    isRangeTooSmall ? styles.small : ''
                  }`}
                >
                  {formatLabel(valueStart, 'start')}
                </div>
              )}
              <div
                className={`${styles.timeRangeInfo} ${
                  isRangeTooSmall ? styles.bottom : ''
                }`}
              >
                {displayAsPercent
                  ? `${Math.round(((valueEnd - valueStart) / (max - min)) * 100)}%`
                  : formatLabel(valueEnd - valueStart, 'duration')}
              </div>
              {valueEnd !== max && (
                <div
                  className={`${styles.timeRangeInfo} ${styles.end} ${
                    isRangeTooSmall ? styles.small : ''
                  }`}
                >
                  {formatLabel(valueEnd, 'end')}
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.rangeInfo} ${styles.start}`}>
            {displayAsPercent ? '0%' : formatLabel(min)}
          </div>
          <div className={`${styles.rangeInfo} ${styles.end}`}>
            {displayAsPercent ? '100%' : formatLabel(max)}
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
