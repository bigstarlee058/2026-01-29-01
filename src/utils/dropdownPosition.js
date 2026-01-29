/**
 * Calculates optimal dropdown position to prevent viewport overflow
 * @param {Object} anchorRect - getBoundingClientRect() result of anchor element
 * @param {Object} dropdownSize - { width, height } of dropdown content
 * @param {Object} options - positioning preferences and constraints
 * @returns {Object} calculated position and placement info
 */
export const calculateDropdownPosition = (anchorRect, dropdownSize, options = {}) => {
  const {
    preferredPlacement = 'bottom-start', // bottom-start, bottom-end, top-start, top-end, etc.
    offset = 4,
    padding = 8, // minimum distance from viewport edges
    fallbackPlacements = ['bottom-start', 'top-start', 'bottom-end', 'top-end'],
  } = options;

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Available space in each direction
  const availableSpace = {
    top: anchorRect.top - padding,
    bottom: viewport.height - anchorRect.bottom - padding,
    left: anchorRect.left - padding,
    right: viewport.width - anchorRect.right - padding,
  };

  /**
   * Check if a placement would fit within viewport
   */
  const canFitPlacement = (placement) => {
    const { top, left } = getPositionForPlacement(placement, anchorRect, dropdownSize, offset);
    
    return (
      top >= padding && // doesn't go above viewport
      top + dropdownSize.height <= viewport.height - padding && // doesn't go below viewport
      left >= padding && // doesn't go left of viewport
      left + dropdownSize.width <= viewport.width - padding // doesn't go right of viewport
    );
  };

  /**
   * Calculate position for a specific placement
   */
  const getPositionForPlacement = (placement, anchor, size, gap) => {
    const positions = {
      'bottom-start': {
        top: anchor.bottom + gap,
        left: anchor.left,
      },
      'bottom-end': {
        top: anchor.bottom + gap,
        left: anchor.right - size.width,
      },
      'bottom-center': {
        top: anchor.bottom + gap,
        left: anchor.left + (anchor.width - size.width) / 2,
      },
      'top-start': {
        top: anchor.top - size.height - gap,
        left: anchor.left,
      },
      'top-end': {
        top: anchor.top - size.height - gap,
        left: anchor.right - size.width,
      },
      'top-center': {
        top: anchor.top - size.height - gap,
        left: anchor.left + (anchor.width - size.width) / 2,
      },
      'right-start': {
        top: anchor.top,
        left: anchor.right + gap,
      },
      'right-end': {
        top: anchor.bottom - size.height,
        left: anchor.right + gap,
      },
      'left-start': {
        top: anchor.top,
        left: anchor.left - size.width - gap,
      },
      'left-end': {
        top: anchor.bottom - size.height,
        left: anchor.left - size.width - gap,
      },
    };

    return positions[placement] || positions['bottom-start'];
  };

  // Try preferred placement first
  let finalPlacement = preferredPlacement;
  
  if (!canFitPlacement(preferredPlacement)) {
    // Try fallback placements
    finalPlacement = fallbackPlacements.find(placement => canFitPlacement(placement));
    
    // If no fallback works, use the one with most available space
    if (!finalPlacement) {
      const spacePriority = [
        { placement: 'bottom-start', space: availableSpace.bottom },
        { placement: 'top-start', space: availableSpace.top },
        { placement: 'bottom-end', space: availableSpace.bottom },
        { placement: 'top-end', space: availableSpace.top },
      ];
      
      spacePriority.sort((a, b) => b.space - a.space);
      finalPlacement = spacePriority[0].placement;
    }
  }

  // Calculate final position
  let position = getPositionForPlacement(finalPlacement, anchorRect, dropdownSize, offset);

  // Clamp position to viewport bounds as last resort
  position.left = Math.max(
    padding,
    Math.min(position.left, viewport.width - dropdownSize.width - padding)
  );
  position.top = Math.max(
    padding,
    Math.min(position.top, viewport.height - dropdownSize.height - padding)
  );

  return {
    top: position.top,
    left: position.left,
    placement: finalPlacement,
    availableSpace,
    // Useful for applying CSS classes or adjusting arrow position
    placementSide: finalPlacement.split('-')[0], // 'top', 'bottom', 'left', 'right'
    placementAlign: finalPlacement.split('-')[1] || 'center', // 'start', 'center', 'end'
  };
};

/**
 * Hook-friendly version that automatically recalculates on window resize
 */
export const useDropdownPosition = (anchorRef, dropdownRef, options = {}) => {
  const calculatePosition = () => {
    if (!anchorRef.current || !dropdownRef.current) {
      return { top: 0, left: 0, placement: 'bottom-start' };
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    
    return calculateDropdownPosition(
      anchorRect,
      { width: dropdownRect.width, height: dropdownRect.height },
      options
    );
  };

  return { calculatePosition };
};

/**
 * Default dropdown size estimation for common dropdown types
 */
export const getDropdownSizeEstimate = (itemCount, itemHeight = 40, minWidth = 120) => {
  return {
    width: minWidth,
    height: Math.min(itemCount * itemHeight + 16, 300), // max height with padding
  };
};