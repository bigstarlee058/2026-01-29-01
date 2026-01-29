import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FashionToolIcon = ({ size = ICON_SIZE.LARGE, color = '#D3F85A' }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7718_69827)">
        <path
          d="M7.53125 4.6875H8.46875V5.625H7.53125V4.6875Z"
          fill={color}
        />
        <path d="M7.53125 6.5625H8.46875V7.5H7.53125V6.5625Z" fill={color} />
        <path
          d="M7.53125 8.4375H8.46875V9.375H7.53125V8.4375Z"
          fill={color}
        />
        <path
          d="M10.7772 2.34375C10.7772 0.874437 10.0875 0.232594 9.97416 0L8.00578 1.72131L6.03741 0C5.91416 0.252969 5.23438 0.857 5.23438 2.34375C5.23438 3.81306 5.92406 4.45484 6.03741 4.6875L8.00578 2.96619L9.97416 4.6875C10.0974 4.43453 10.7772 3.83044 10.7772 2.34375Z"
          fill={color}
        />
        <path d="M0 3.75L8 16L4.58416 3.75H0Z" fill={color} />
        <path d="M8 16L16 3.75H11.4158L8 16Z" fill={color} />
      </g>
      <defs>
        <clipPath id="clip0_7718_69827">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
FashionToolIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FashionToolIcon;
