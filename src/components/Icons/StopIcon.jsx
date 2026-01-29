import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const StopIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'white',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 2L2 8.156V16L8 22H16L22 16V8.156L16 2H8Z"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 12H8"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
StopIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default StopIcon;
