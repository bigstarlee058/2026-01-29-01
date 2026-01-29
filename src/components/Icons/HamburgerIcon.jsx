import React from 'react';

const HamburgerIcon = React.forwardRef(({ onClick }, ref) => {
  return (
    <svg
      ref={ref}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: 'pointer' }}
      className="hamburgerIcon"
      onClick={onClick}
      data-testid="hamburger-icon"
    >
      <path
        d="M2.66797 5.16663H13.3346M2.66797 8.72218H13.3346M2.66797 12.2777H13.3346"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.18519"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style jsx>{`
        .hamburgerIcon:hover path {
          stroke-opacity: 1;
        }
        .hamburgerIcon {
          margin-bottom: 2px;
        }
      `}</style>
    </svg>
  );
});

export default HamburgerIcon;
