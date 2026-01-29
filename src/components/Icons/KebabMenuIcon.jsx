import React from 'react';

const KebabMenuIcon = ({ visible, onClick, disabled }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      className="kebabMenuIcon"
      onClick={onClick}
    >
      <g opacity={visible ? 0.6 : 0}>
        <path
          d="M8.80078 8.00005C8.80078 7.33845 8.26238 6.80005 7.60078 6.80005C6.93918 6.80005 6.40078 7.33845 6.40078 8.00005C6.40078 8.66165 6.93918 9.20005 7.60078 9.20005C8.26238 9.20005 8.80078 8.66165 8.80078 8.00005Z"
          fill="white"
          fill-opacity="0.4"
        />
        <path
          d="M8.80078 4.00005C8.80078 3.33845 8.26238 2.80005 7.60078 2.80005C6.93918 2.80005 6.40078 3.33845 6.40078 4.00005C6.40078 4.66165 6.93918 5.20005 7.60078 5.20005C8.26238 5.20005 8.80078 4.66165 8.80078 4.00005Z"
          fill="white"
          fill-opacity="0.4"
        />
        <path
          d="M8.80078 12C8.80078 11.3384 8.26238 10.8 7.60078 10.8C6.93918 10.8 6.40078 11.3384 6.40078 12C6.40078 12.6616 6.93918 13.2 7.60078 13.2C8.26238 13.2 8.80078 12.6616 8.80078 12Z"
          fill="white"
          fill-opacity="0.4"
        />
      </g>
      <style jsx>{`
        .kebabMenuIcon:hover path {
          fill-opacity: 1;
        }
      `}</style>
    </svg>
  );
};

export default KebabMenuIcon;
