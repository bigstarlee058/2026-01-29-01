import ICON_SIZE from 'components/Icons/IconSize';

const PlayBackIcon = ({ size = ICON_SIZE.REGULAR, color = 'FFFFFF99' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.9874 7.07531C16.4687 7.93097 16.4687 10.069 14.9874 10.9247L4.9861 16.6988C3.5048 17.5544 1.65234 16.4854 1.65234 14.7741V3.22593C1.65234 1.5146 3.5048 0.44557 4.9861 1.30124L14.9874 7.07531Z"
        stroke={color}
        strokeWidth="1.36435"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PlayBackIcon;
