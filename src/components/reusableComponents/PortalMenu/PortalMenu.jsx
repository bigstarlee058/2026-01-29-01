import React, { useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './PortalMenu.module.scss';

const PortalMenu = ({
  open,
  anchorRef,
  children,
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  offset = { x: 0, y: 0 },
  zIndex = 2000,
  className = '',
  style = {},
  onMouseEnter,
  onMouseLeave,
}) => {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (open && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      let top, left;

      switch (position) {
        case 'bottom-right':
          top = rect.bottom + scrollY + offset.y;
          left = rect.right + scrollX + offset.x;
          break;
        case 'bottom-left':
          top = rect.bottom + scrollY + offset.y;
          left = rect.left + scrollX + offset.x;
          break;
        case 'top-right':
          top = rect.top + scrollY + offset.y;
          left = rect.right + scrollX + offset.x;
          break;
        case 'top-left':
          top = rect.top + scrollY + offset.y;
          left = rect.left + scrollX + offset.x;
          break;
        default:
          top = rect.bottom + scrollY + offset.y;
          left = rect.right + scrollX + offset.x;
      }

      setMenuPosition({ top, left });
    }
  }, [open, anchorRef, position, offset]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className={`${styles.portalMenu} ${className}`}
      style={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex,
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
};

export { PortalMenu };
