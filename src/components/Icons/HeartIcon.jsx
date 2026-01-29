import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const HeartIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7621_9898)">
        <path
          d="M5.12565 2.66699C3.10065 2.66699 1.45898 4.30866 1.45898 6.33366C1.45898 10.0003 5.79232 13.3337 8.12565 14.109C10.459 13.3337 14.7923 10.0003 14.7923 6.33366C14.7923 4.30866 13.1507 2.66699 11.1257 2.66699C9.88565 2.66699 8.78898 3.28266 8.12565 4.22499C7.78748 3.74345 7.3383 3.35046 6.8161 3.07927C6.29391 2.80807 5.71407 2.66666 5.12565 2.66699Z"
          stroke={color}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_7621_9898">
          <rect
            width="16"
            height="16"
            fill="white"
            transform="translate(0.125)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
HeartIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default HeartIcon;
