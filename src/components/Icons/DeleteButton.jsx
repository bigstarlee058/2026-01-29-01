import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DeleteButton = ({ size = ICON_SIZE.EXTRA_SMALL, color = '#b5b5b5', strokeColor = '#bababa' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill="none" 
        stroke={color} 
        strokeLinejoin="miter" 
        strokeLinecap="butt" 
        strokeMiterlimit="4" 
        strokeWidth="2" 
        d="M16 1c8.284 0 15 6.716 15 15s-6.716 15-15 15c-8.284 0-15-6.716-15-15s6.716-15 15-15z"
      />
      <path 
        fill="none" 
        stroke={strokeColor} 
        strokeLinejoin="round" 
        strokeLinecap="round" 
        strokeMiterlimit="4" 
        strokeWidth="1.75" 
        d="M22 10l-12 12"
      />
      <path 
        fill="none" 
        stroke={strokeColor} 
        strokeLinejoin="round" 
        strokeLinecap="round" 
        strokeMiterlimit="4" 
        strokeWidth="1.75" 
        d="M10 10l12 12"
      />
    </svg>
  );
};

DeleteButton.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  strokeColor: PropTypes.string,
};

export default DeleteButton;
