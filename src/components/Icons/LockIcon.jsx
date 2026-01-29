const LockIcon = ({ active }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_16418_153005)">
        <path
          d="M5.4336 5.36204L5.4336 3.83593C5.43279 3.02422 5.72827 2.24011 6.26457 1.63079C6.80086 1.02147 7.5411 0.62883 8.34635 0.526563C9.1516 0.424297 9.96649 0.619436 10.6381 1.07536C11.3097 1.53128 11.7918 2.21663 11.9939 3.00278"
          stroke={active ? 'var(--accent-color)' : '#9FA6A9'}
          strokeWidth="1.21849"
          strokeLinecap="round"
        />
        <path
          d="M2.93555 6.33496H14.5998V13.8334C14.5998 14.2753 14.4242 14.6992 14.1117 15.0116C13.7992 15.3241 13.3754 15.4997 12.9334 15.4997H4.60186C4.15993 15.4997 3.73609 15.3241 3.4236 15.0116C3.1111 14.6992 2.93555 14.2753 2.93555 13.8334V6.33496Z"
          stroke={active ? 'var(--accent-color)' : '#9FA6A9'}
          strokeWidth="1.21849"
          strokeLinejoin="round"
        />
        <path
          d="M10.8438 10.918H10.8504V10.9246H10.8438V10.918Z"
          stroke={active ? 'var(--accent-color)' : '#9FA6A9'}
          strokeWidth="2.49947"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_16418_153005">
          <rect
            width="16"
            height="16"
            fill="white"
            transform="translate(0.779297)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default LockIcon;
