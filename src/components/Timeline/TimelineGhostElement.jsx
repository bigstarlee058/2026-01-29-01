import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';

const TimelineGhostElement = observer(
  ({
    left,
    width,
    row,
    elementType,
    totalRows = 10,
    isIncompatible = false,
  }) => {
    const [rowPosition, setRowPosition] = useState(null);
    const [overlayMetrics, setOverlayMetrics] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      const updateRowPosition = () => {
        // Find the actual timeline row element
        const timelineRow = document.querySelector(
          `[data-timeline-row="${row}"]`
        );
        if (timelineRow) {
          const container = timelineRow.closest(
            '[class*="timelineRowContainer"]'
          );
          const containerRect = container?.getBoundingClientRect();
          const rowRect = timelineRow.getBoundingClientRect();
          // Try to find overlays container to account for left gutter (row type column)
          const overlaysEl = timelineRow.querySelector(
            '[class*="overlaysContainer"]'
          );
          const overlaysRect = overlaysEl?.getBoundingClientRect();

          if (containerRect && rowRect) {
            const top = rowRect.top - containerRect.top;
            const height = rowRect.height;
            setRowPosition({ top, height });
            if (overlaysRect) {
              // Left base is overlays container left relative to container
              const leftBase = overlaysRect.left - containerRect.left;
              const widthPx = overlaysRect.width;
              setOverlayMetrics({ leftBase, widthPx });
            } else {
              // Fallback to row rect if overlays container not found
              const leftBase = rowRect.left - containerRect.left;
              const widthPx = rowRect.width;
              setOverlayMetrics({ leftBase, widthPx });
            }
            // Mark as ready only after we have calculated positions (only if not ready yet)
            if (!isReady) {
              // Use requestAnimationFrame to ensure DOM is ready
              requestAnimationFrame(() => {
                setIsReady(true);
              });
            }
          }
        }
      };

      // Initial update
      updateRowPosition();

      // Set up ResizeObserver to watch for row size changes
      const timelineRow = document.querySelector(
        `[data-timeline-row="${row}"]`
      );
      if (timelineRow) {
        const resizeObserver = new ResizeObserver(() => {
          updateRowPosition();
        });

        resizeObserver.observe(timelineRow);

        return () => {
          resizeObserver.disconnect();
        };
      }
    }, [row, left, width]); // Also update when ghost position changes

    // Don't render until we have proper positioning data
    if (!isReady) {
      return null;
    }

    // Fallback to percentage calculation if real position not available
    const fallbackRowHeight = 100 / totalRows;
    const fallbackTop = row * fallbackRowHeight;

    // Calculate pixel-perfect left/width based on overlays container metrics
    let style;
    if (rowPosition && overlayMetrics) {
      // Small compensating offset to visually match item borders/handles
      const compensation = 60; // px
      const pixelLeft =
        overlayMetrics.leftBase +
        (left / 100) * overlayMetrics.widthPx +
        compensation;
      const pixelWidth = Math.max(1, (width / 100) * overlayMetrics.widthPx);
      style = {
        left: `${pixelLeft}px`,
        width: `${pixelWidth}px`,
        top: `${rowPosition.top}px`,
        height: `${rowPosition.height}px`,
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
      };
    } else if (rowPosition) {
      style = {
        left: `${left}%`,
        width: `${Math.max(width, 1)}%`,
        top: `${rowPosition.top}px`,
        height: `${rowPosition.height}px`,
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
      };
    } else {
      style = {
        left: `${left}%`,
        width: `${Math.max(width, 1)}%`,
        top: `${fallbackTop}%`,
        height: `${fallbackRowHeight}%`,
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
      };
    }

    return (
      <div
        className={`${styles.timelineGhostElement} ${
          styles[elementType] || ''
        } ${isIncompatible ? styles.incompatible : ''}`}
        style={style}
      >
        {/* Dashed background pattern */}
        <div className={styles.ghostPattern} />

        {/* Additional overlay for better visibility */}
        <div className={styles.ghostOverlay} />
      </div>
    );
  }
);

export default TimelineGhostElement;
