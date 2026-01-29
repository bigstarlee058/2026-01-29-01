import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CopyIcon = ({ size = ICON_SIZE.MEDIUM, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        fillOpacity="0.4"
        d="M5.714 5v1h-1c-1.657 0-3 1.343-3 3v18c0 1.657 1.343 3 3 3h14c1.657 0 3-1.343 3-3v-1h1c1.657 0 3-1.343 3-3v-18c0-1.657-1.343-3-3-3h-14c-1.657 0-3 1.343-3 3zM7.714 6v-1c0-0.552 0.448-1 1-1h14c0.552 0 1 0.448 1 1v18c0 0.552-0.448 1-1 1h-1v-15c0-1.657-1.343-3-3-3h-11zM3.714 9c0-0.552 0.448-1 1-1h14c0.552 0 1 0.448 1 1v18c0 0.552-0.448 1-1 1h-14c-0.552 0-1-0.448-1-1v-18z"
      />
    </svg>
  );
};

CopyIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string
};

export default CopyIcon;
