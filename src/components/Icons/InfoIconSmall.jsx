import React from 'react';

const InfoIconSmall = ({ onMouseEnter, onMouseLeave, id, style, size = '8px', color = 'white' }) => {
  return (
    <svg
      id={id}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      <g clipPath="url(#clip0_16141_160471)">
        <path
          d="M4.25 3.66406C4.25 3.526 4.13807 3.41406 4 3.41406C3.86193 3.41406 3.75 3.526 3.75 3.66406V5.66406C3.75 5.80213 3.86193 5.91406 4 5.91406C4.13807 5.91406 4.25 5.80213 4.25 5.66406V3.66406Z"
          fill={color}
          fillOpacity="0.6"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M4.0013 0.414062C2.02228 0.414062 0.417969 2.01838 0.417969 3.9974C0.417969 5.97643 2.02228 7.58073 4.0013 7.58073C5.98034 7.58073 7.58463 5.97643 7.58463 3.9974C7.58463 2.01838 5.98034 0.414062 4.0013 0.414062ZM0.917969 3.9974C0.917969 2.29452 2.29843 0.914062 4.0013 0.914062C5.70417 0.914062 7.08463 2.29452 7.08463 3.9974C7.08463 5.70026 5.70417 7.08073 4.0013 7.08073C2.29843 7.08073 0.917969 5.70026 0.917969 3.9974Z"
          fill={color}
          fill-opacity="0.6"
        />
        <path
          d="M4.33464 2.66146C4.33464 2.84555 4.1854 2.99479 4.0013 2.99479C3.8172 2.99479 3.66797 2.84555 3.66797 2.66146C3.66797 2.47737 3.8172 2.32812 4.0013 2.32812C4.1854 2.32812 4.33464 2.47737 4.33464 2.66146Z"
          fill={color}
          fill-opacity="0.6"
        />
      </g>
      <defs>
        <clipPath id="clip0_16141_160471">
          <rect width={size} height={size} fill={color} />
        </clipPath>
      </defs>
    </svg>
  );
};

export default InfoIconSmall;
