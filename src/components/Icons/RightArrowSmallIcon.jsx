import React from 'react';

const RightArrowSmallIcon = ({ size = '6px', color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 6 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginTop: '1px' }}
    >
      <path
        d="M1.28516 7.42969L4.71373 4.00112L1.28516 0.572544"
        stroke={color}
        strokeOpacity="0.4"
        strokeWidth="0.857143"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RightArrowSmallIcon;
