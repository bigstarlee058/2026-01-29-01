import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const HeartFullIcon = ({ size = ICON_SIZE.SMALL, color = 'var(--accent-color)' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.00065 2.66699C2.97565 2.66699 1.33398 4.30866 1.33398 6.33366C1.33398 10.0003 5.66732 13.3337 8.00065 14.109C10.334 13.3337 14.6673 10.0003 14.6673 6.33366C14.6673 4.30866 13.0257 2.66699 11.0007 2.66699C9.76065 2.66699 8.66398 3.28266 8.00065 4.22499C7.66248 3.74345 7.2133 3.35046 6.6911 3.07927C6.16891 2.80807 5.58907 2.66666 5.00065 2.66699Z"
        fill={color}
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
HeartFullIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default HeartFullIcon;
