import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a portal for the popup menu into document.body,
 * positioned fixed using viewport coordinates.
 */
const PopupPortal = ({ x, y, onMouseEnter, onMouseLeave, children }) =>
  createPortal(
    <div
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      data-interactive
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );

export default PopupPortal;
