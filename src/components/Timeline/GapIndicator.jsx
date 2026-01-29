import React, { useState, useRef, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';
import { StoreContext } from '../../mobx';

const GapIndicator = observer(({ 
  gap, 
  rowIndex, 
  totalDuration 
}) => {
  const store = React.useContext(StoreContext);
  const [mouseX, setMouseX] = useState(50); // Default to center (50%)
  const gapRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Hide gap indicator during resize operations
  const isResizing = store.ghostState?.isResizing;

  const handleRemoveGap = (e) => {
    e.stopPropagation();
    // If this is a synthetic gap for an empty row, delete the row
    if (gap?.isEmptyRow && store.deleteRow) {
      store.deleteRow(rowIndex);
      return;
    }
    // Otherwise, use existing gap removal if available
    if (store.removeGap) {
      store.removeGap(gap.start, gap.end, rowIndex);
    }
  };

  const handleMouseMove = useCallback((e) => {
    // Cancel previous animation frame if it exists
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      if (gapRef.current) {
        const rect = gapRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
        setMouseX(percentage);
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Don't reset position - keep the icon where the cursor was
    // The icon will just fade out via CSS opacity transition
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={gapRef}
      className={`${styles.gapIndicator} ${styles.gapIndicatorGroup}`}
      style={{
        left: `${(gap.start / totalDuration) * 100}%`,
        width: `${((gap.end - gap.start) / totalDuration) * 100}%`,
      }}
      onClick={handleRemoveGap}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Striped pattern background */}
      <div className={styles.gapPattern} />
      
      {/* Close button - hide during resize operations */}
      {!isResizing && (
        <div 
          className={styles.gapCloseButton}
          style={{
            left: `${mouseX}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={styles.gapCloseIcon}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});

export default GapIndicator;
