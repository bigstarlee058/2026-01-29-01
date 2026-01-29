import { useState, useRef, useEffect } from 'react';
import { formatAspectRatio } from 'utils/size';

export const useInfoTooltip = () => {
  const [infoTooltipData, setInfoTooltipData] = useState(null);
  const [infoTooltipPosition, setInfoTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [tooltipPlacement, setTooltipPlacement] = useState('top'); // 'top' or 'bottom'
  const infoTooltipTimeoutRef = useRef(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (infoTooltipTimeoutRef.current) {
        clearTimeout(infoTooltipTimeoutRef.current);
        infoTooltipTimeoutRef.current = null;
      }
      // Reset state on unmount
      setShowInfoTooltip(false);
      setInfoTooltipData(null);
    };
  }, []);

  // Handle scroll events to hide tooltip
  useEffect(() => {
    const handleScroll = () => {
      if (showInfoTooltip) {
        setShowInfoTooltip(false);
        setTimeout(() => {
          setInfoTooltipData(null);
        }, 100);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showInfoTooltip]);

  const calculateTooltipPosition = (targetRect) => {
    if (!targetRect) return { x: 200, y: 200, placement: 'top' };

    const viewportHeight = window.innerHeight;
    const tooltipHeight = 200; // Approximate tooltip height
    const margin = 20; // Space from viewport edge

    const centerX = targetRect.left + targetRect.width / 2;
    const topY = targetRect.top - margin;
    const bottomY = targetRect.bottom + margin;

    // Check if there's enough space on top
    const hasSpaceOnTop = topY > tooltipHeight + margin;
    // Check if there's enough space on bottom
    const hasSpaceOnBottom = bottomY + tooltipHeight < viewportHeight - margin;

    let placement = 'top';
    let y = topY;

    if (!hasSpaceOnTop && hasSpaceOnBottom) {
      placement = 'bottom';
      y = bottomY;
    } else if (!hasSpaceOnTop && !hasSpaceOnBottom) {
      // If no space on either side, prefer top but adjust position
      placement = 'top';
      y = margin;
    }

    return { x: centerX, y, placement };
  };

  const handleInfoIconHover = (item, event) => {
    // Clear any existing timeout immediately
    if (infoTooltipTimeoutRef.current) {
      clearTimeout(infoTooltipTimeoutRef.current);
      infoTooltipTimeoutRef.current = null;
    }

    // Set a small delay before showing the tooltip
    infoTooltipTimeoutRef.current = setTimeout(() => {
      try {
        let targetRect = null;

        // Get bounding box from thumbnail
        const thumbnailEl = document.querySelector(
          `[data-testid="info-icon-${item.id}"]`
        );
if (thumbnailEl) {
          targetRect = thumbnailEl.getBoundingClientRect();
        }

        const position = calculateTooltipPosition(targetRect);
        setInfoTooltipPosition({
          x: position.x,
          y: position.y,
        });
        setTooltipPlacement(position.placement);

        // Set tooltip data - only if item has required data
        if (item.title) {
          const tooltipData = {
            title: item.title,
            type: item.type || '',
            size: item.size || '',
            duration: item.duration || '',
            addedBy: item.addedBy || '',
            addedOn: item.addedOn || '',
            aspectRatio: item.aspectRatio
              ? formatAspectRatio(item.aspectRatio)
              : null,
            category: item.category || 'file',
          };
          setInfoTooltipData(tooltipData);
        }
        setShowInfoTooltip(true);
      } catch (error) {
        console.warn('Error setting tooltip data:', error);
        setInfoTooltipPosition({ x: 200, y: 200 });
        setTooltipPlacement('top');
        setInfoTooltipData({
          title: item.title,
          type: item.type,
          size: item.size,
          duration: item.duration,
          addedBy: item.addedBy,
          addedOn: item.addedOn,
          aspectRatio: item.aspectRatio
            ? formatAspectRatio(item.aspectRatio)
            : null,
          category: item.category || 'file',
        });
        setShowInfoTooltip(true);
      }
    }, 100);
  };

  const handleInfoIconLeave = () => {
    // Clear any existing timeout
    if (infoTooltipTimeoutRef.current) {
      clearTimeout(infoTooltipTimeoutRef.current);
      infoTooltipTimeoutRef.current = null;
    }

    // Small delay before hiding to allow moving mouse to tooltip
    infoTooltipTimeoutRef.current = setTimeout(() => {
      setShowInfoTooltip(false);
      // Additional delay before clearing data
      setTimeout(() => {
        setInfoTooltipData(null);
      }, 100);
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    // Keep tooltip visible when hovering over it
    if (infoTooltipTimeoutRef.current) {
      clearTimeout(infoTooltipTimeoutRef.current);
      infoTooltipTimeoutRef.current = null;
    }
    setShowInfoTooltip(true);
  };

  const handleTooltipMouseLeave = () => {
    // Small delay before hiding to allow moving mouse back to tooltip
    infoTooltipTimeoutRef.current = setTimeout(() => {
      setShowInfoTooltip(false);
      // Additional delay before clearing data
      setTimeout(() => {
        setInfoTooltipData(null);
      }, 100);
    }, 100);
  };

  return {
    infoTooltipData,
    infoTooltipPosition,
    showInfoTooltip,
    tooltipPlacement,
    handleInfoIconHover,
    handleInfoIconLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  };
}; 