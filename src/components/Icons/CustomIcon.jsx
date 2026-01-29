import React from 'react';
import ICON_SIZE from 'components/Icons/IconSize';

const CustomIcon = ({ width = 21, height = 20, color = 'var(--accent-color)' }) => {
  return (
    <svg 
      width={`${width}px`} 
      height={`${height}px`} 
      viewBox="0 0 34 32"
      style={{ minWidth: `${width}px`, minHeight: `${height}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2.4889"
        opacity="0.6"
        d="M2.667 7.111h21.333c0.471 0 0.924 0.187 1.257 0.521s0.521 0.786 0.521 1.257v21.333M8 12.444v10.667c0 0.471 0.187 0.924 0.521 1.257s0.786 0.521 1.257 0.521h10.667M8 1.778v5.333M25.778 24.889h5.333"
      />
    </svg>
  );
};

export default CustomIcon;
