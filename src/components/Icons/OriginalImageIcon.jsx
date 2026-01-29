import React from 'react';
import ICON_SIZE from '../Icons/IconSize';

const OriginalImageIcon = ({ width = 21, height = 20, color = 'var(--accent-color)' }) => {
  return (
    <svg 
      width={`${width}px`} 
      height={`${height}px`} 
      viewBox="0 0 40 32"
      style={{ minWidth: `${width}px`, minHeight: `${height}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        opacity="0.6"
        d="M34.875 1.125h-29.752c-1.653 0-3.306 1.653-3.306 3.306v23.14c0 1.818 1.488 3.306 3.306 3.306h29.752c1.653 0 3.306-1.653 3.306-3.306v-23.14c0-1.653-1.653-3.306-3.306-3.306zM34.875 27.439c-0.033 0.050-0.099 0.099-0.132 0.132h-29.62v-23.008l0.132-0.132h29.471c0.050 0.033 0.099 0.099 0.132 0.132v22.876h0.017zM18.347 21.803l-4.132-4.975-5.785 7.438h23.141l-7.438-9.917-5.785 7.455z"
      />
    </svg>
  );
};

export default OriginalImageIcon;
