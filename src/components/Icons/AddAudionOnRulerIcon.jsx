import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AddAudionOnRulerIcon = ({ size = ICON_SIZE.EXTRA_LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 31 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill="#d3f85a" 
        style={{ fill: 'var(--color1, #d3f85a)' }} 
        opacity="0.04" 
        d="M26.286 11.429c0 5.996-4.861 10.857-10.857 10.857s-10.857-4.861-10.857-10.857c0-5.996 4.861-10.857 10.857-10.857s10.857 4.861 10.857 10.857z"
      />
      <path 
        fill="none" 
        stroke={color} 
        style={{ stroke: 'var(--color2, #fff)' }} 
        strokeLinejoin="miter" 
        strokeLinecap="butt" 
        strokeMiterlimit="4" 
        strokeWidth="2.2857" 
        d="M25.143 11.429c0 5.365-4.349 9.714-9.714 9.714s-9.714-4.349-9.714-9.714c0-5.365 4.349-9.714 9.714-9.714s9.714 4.349 9.714 9.714z"
      />
    </svg>
  );
};

AddAudionOnRulerIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default AddAudionOnRulerIcon;
