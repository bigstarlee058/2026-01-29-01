import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const RightArrowIcon = ({ size = ICON_SIZE.LARGE, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.92893 12H19.0711"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4.92896L19.0711 12L12 19.0711"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
RightArrowIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default RightArrowIcon;
