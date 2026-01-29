import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const TooltipIndicator = ({
  showTooltipIndicator,
  canvasRef,
  mousePosition,
  formatTooltipTime,
  hoveredTime,
  scale,
  playbackRate = 1,
  tooltipId,
}) => {
  const [showTooltipWithDelay, setShowTooltipWithDelay] = useState(false);

  useEffect(() => {
    let timeoutId;

    if (showTooltipIndicator) {
      // Set a timeout to show the tooltip after delay
      timeoutId = setTimeout(() => {
        setShowTooltipWithDelay(true);
      }, 2000);
    } else {
      // Hide immediately when showTooltipIndicator becomes false
      setShowTooltipWithDelay(false);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showTooltipIndicator]);

  useEffect(() => {
if (canvasRef?.current) {
    }
  }, [showTooltipIndicator, canvasRef]);

  if (!showTooltipIndicator || !canvasRef?.current) {
    return null;
  }

  // Calculate the position for the indicator
  const rect = canvasRef.current.getBoundingClientRect();
  const parentElement = canvasRef.current.parentElement;
  const scrollLeft = parentElement?.parentElement?.scrollLeft || 0;

  const canvasX = Math.min(
    Math.max(mousePosition.x, 0),
    canvasRef.current.width
  );

  // Try rendering to document.body instead
  const portalTarget = document.body;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'absolute',
        left: `${canvasX}px`,
        top: rect.top + 'px',
        height: rect.height + 'px',
        width: '1px',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {showTooltipWithDelay && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#131A25',
            color: 'white',
            fontSize: '12px',
            padding: '3px 8px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            border: ' 1px solid #FFFFFF1A',
            fontWeight: '400',
            zIndex: 9999999,
            pointerEvents: 'none',
            lineHeight: '1.3',
            letterSpacing: '-0.02em',
          }}
        >
          {formatTooltipTime ? formatTooltipTime(hoveredTime, scale, playbackRate) : ''}
        </div>
      )}
    </div>,
    portalTarget
  );
};

export default TooltipIndicator;
