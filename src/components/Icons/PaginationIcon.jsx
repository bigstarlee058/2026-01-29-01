import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PaginationIcon = ({ size = ICON_SIZE.LARGE, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        rx="11.5"
        stroke={color}
        strokeOpacity="0.1"
      />
      <path
        d="M10 16L14 12L10 8"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
PaginationIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PaginationIcon;
