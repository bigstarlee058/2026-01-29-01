import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calculateDropdownPosition, getDropdownSizeEstimate } from '../../utils/dropdownPosition';

export function PortalDropdown({
  anchorRef,
  open,
  children,
  onClose,
  topOffset = 4,
  leftOffset = 0,
  customPosition,
  onMouseEnter,
  onMouseLeave,
  // New props for smart positioning
  preferredPlacement = 'bottom-start',
  enableSmartPositioning = false,
  dropdownSize,
  fallbackPlacements,
}) {
  const dropdownRef = useRef(null);
  const isHoveringDropdown = useRef(false);
  const isHoveringAnchor = useRef(false);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorRef]);

  // Handle hover events for the dropdown
  const handleDropdownMouseEnter = () => {
    isHoveringDropdown.current = true;
    if (onMouseEnter) onMouseEnter();
  };

  const handleDropdownMouseLeave = () => {
    isHoveringDropdown.current = false;
    // Only close if not hovering the anchor element
    setTimeout(() => {
      if (!isHoveringAnchor.current && !isHoveringDropdown.current) {
        onClose();
      }
    }, 200); // Increased delay to allow moving between elements
    if (onMouseLeave) onMouseLeave();
  };

  // Handle hover events for the anchor element
  const handleAnchorMouseEnter = () => {
    isHoveringAnchor.current = true;
  };

  const handleAnchorMouseLeave = () => {
    isHoveringAnchor.current = false;
    // Only close if not hovering the dropdown
    setTimeout(() => {
      if (!isHoveringAnchor.current && !isHoveringDropdown.current) {
        onClose();
      }
    }, 200); // Increased delay to allow moving between elements
  };

  // Add hover listeners to anchor element
  useEffect(() => {
    const anchorElement = anchorRef.current;
    if (anchorElement) {
      anchorElement.addEventListener('mouseenter', handleAnchorMouseEnter);
      anchorElement.addEventListener('mouseleave', handleAnchorMouseLeave);

      return () => {
        anchorElement.removeEventListener('mouseenter', handleAnchorMouseEnter);
        anchorElement.removeEventListener('mouseleave', handleAnchorMouseLeave);
      };
    }
  }, [anchorRef]);

  if (!anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  
  // Base style object
  const style = {
    position: 'fixed',
    zIndex: 99999999999,
    minWidth: '145px',
    opacity: open ? 1 : 0,
    visibility: open ? 'visible' : 'hidden',
    transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
    pointerEvents: open ? 'auto' : 'none',
  };

  const handleDropdownClick = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Smart positioning logic
  if (enableSmartPositioning && open) {
    // Get or estimate dropdown size
    let estimatedSize = dropdownSize;
    if (!estimatedSize && dropdownRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      estimatedSize = { width: dropdownRect.width, height: dropdownRect.height };
    }
    if (!estimatedSize) {
      // Default estimation based on children count or common size
      estimatedSize = getDropdownSizeEstimate(2); // Assume 2 menu items as default
    }

    const smartPosition = calculateDropdownPosition(rect, estimatedSize, {
      preferredPlacement,
      offset: topOffset,
      fallbackPlacements,
    });

    style.top = smartPosition.top;
    style.left = smartPosition.left;
    
    // Store placement info for potential use by children (e.g., arrow positioning)
    style['--dropdown-placement'] = smartPosition.placement;
    
  } else if (customPosition) {
    // Apply custom positioning if provided, calculating relative to anchor element
    if (customPosition.top !== undefined) {
      if (typeof customPosition.top === 'number') {
        style.top = rect.top + customPosition.top;
      } else {
        style.top = customPosition.top;
      }
    }
    if (customPosition.left !== undefined) {
      if (typeof customPosition.left === 'number') {
        style.left = rect.left + customPosition.left;
      } else {
        style.left = customPosition.left;
      }
    }
    if (customPosition.right !== undefined) {
      if (typeof customPosition.right === 'number') {
        style.right = window.innerWidth - rect.right + customPosition.right;
      } else {
        style.right = customPosition.right;
      }
    }
    if (customPosition.bottom !== undefined) {
      if (typeof customPosition.bottom === 'number') {
        style.bottom = window.innerHeight - rect.bottom + customPosition.bottom;
      } else {
        style.bottom = customPosition.bottom;
      }
    }
    // Apply any other custom styles (transform, etc.)
    Object.keys(customPosition).forEach(key => {
      if (!['top', 'left', 'right', 'bottom'].includes(key)) {
        style[key] = customPosition[key];
      }
    });
  } else {
    // Default positioning behavior
    style.top = rect.bottom + (topOffset ?? 4);
    style.left = rect.left + leftOffset;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      style={style}
      onClick={handleDropdownClick}
      onMouseDown={handleDropdownClick}
      onMouseEnter={handleDropdownMouseEnter}
      onMouseLeave={handleDropdownMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
}
