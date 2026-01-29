/**
 * Utility for calculating context menu position relative to cursor with smart edge detection
 * Ensures menu appears at cursor position but shifts to stay within viewport bounds
 */

/**
 * Calculate optimal context menu position from cursor coordinates
 * @param {number} cursorX - X coordinate of cursor (e.clientX)
 * @param {number} cursorY - Y coordinate of cursor (e.clientY)
 * @param {Object} menuSize - { width, height } of context menu
 * @param {Object} options - positioning options
 * @returns {Object} calculated position and placement info
 */
export const calculateContextMenuPosition = (cursorX, cursorY, menuSize, options = {}) => {
  const {
    padding = 8, // Minimum distance from viewport edges
    offset = 2,  // Small offset from exact cursor position
  } = options;

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Start with cursor position + small offset
  let finalX = cursorX + offset;
  let finalY = cursorY + offset;
  let placement = 'bottom-start'; // Default placement

  // Check if menu overflows right edge
  if (finalX + menuSize.width + padding > viewport.width) {
    // Position menu to the left of cursor
    finalX = cursorX - menuSize.width - offset;
    placement = placement.replace('start', 'end');
  }

  // Check if menu overflows bottom edge  
  if (finalY + menuSize.height + padding > viewport.height) {
    // Position menu above cursor
    finalY = cursorY - menuSize.height - offset;
    placement = placement.replace('bottom', 'top');
  }

  // Ensure menu doesn't go off left edge (when positioned left of cursor)
  if (finalX < padding) {
    finalX = padding;
  }

  // Ensure menu doesn't go off top edge (when positioned above cursor)
  if (finalY < padding) {
    finalY = padding;
  }

  // Final bounds check - clamp to viewport with padding
  finalX = Math.max(
    padding,
    Math.min(finalX, viewport.width - menuSize.width - padding)
  );
  finalY = Math.max(
    padding,
    Math.min(finalY, viewport.height - menuSize.height - padding)
  );

  return {
    x: finalX,
    y: finalY,
    placement,
    // Additional info for debugging/styling
    cursorOffset: {
      x: finalX - cursorX,
      y: finalY - cursorY,
    },
    wasShifted: {
      horizontal: Math.abs(finalX - (cursorX + offset)) > 1,
      vertical: Math.abs(finalY - (cursorY + offset)) > 1,
    }
  };
};

/**
 * Create a virtual anchor element at cursor position for PortalDropdown
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {HTMLElement} virtual anchor element
 */
export const createCursorAnchor = (x, y) => {
  const anchor = document.createElement('div');
  anchor.style.position = 'fixed';
  anchor.style.left = `${x}px`;
  anchor.style.top = `${y}px`;
  anchor.style.width = '1px';
  anchor.style.height = '1px';
  anchor.style.pointerEvents = 'none';
  anchor.style.visibility = 'hidden';
  anchor.style.zIndex = '-1';
  anchor.dataset.contextMenuAnchor = 'true';
  
  document.body.appendChild(anchor);
  return anchor;
};

/**
 * Remove virtual anchor element from DOM
 * @param {HTMLElement} anchor - anchor element to remove
 */
export const removeCursorAnchor = (anchor) => {
  if (anchor && anchor.parentNode) {
    anchor.parentNode.removeChild(anchor);
  }
};

/**
 * Default context menu size estimation
 */
export const getContextMenuSizeEstimate = (itemCount) => {
  const itemHeight = 40; // Height per menu item
  const padding = 8;     // Top/bottom padding
  const minWidth = 160;  // Minimum menu width
  
  return {
    width: minWidth,
    height: (itemCount * itemHeight) + padding,
  };
};