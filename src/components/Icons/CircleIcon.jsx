import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';


const CircleIcon = ({ size = '14px', color = 'rgba(255, 255, 255, 0.8)' }) => {
  return (
    <svg
      width={size}
      height="15px"
      viewBox="0 0 30 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.933 1.279c7.835 0 14.188 6.352 14.188 14.188s-6.352 14.188-14.188 14.188c-7.835 0-14.188-6.352-14.188-14.188s6.352-14.188 14.188-14.188z"
        fill="none"
        opacity="0.8"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        strokeMiterlimit="4"
        strokeWidth="0.9032"
      />
    </svg>
  );
};

CircleIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default CircleIcon;
