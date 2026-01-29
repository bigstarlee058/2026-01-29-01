import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const TopTextIcon = ({ size = ICON_SIZE.LARGE, color = '#f1f1f1' }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill={color} 
        d="M27.804 10.311h-22.588c-1.631 0-1.631-2.51 0-2.51h22.588c1.631 0 1.631 2.51 0 2.51z"
      />
      <path 
        fill={color} 
        d="M24.040 17.841h-18.824c-1.631 0-1.631-2.51 0-2.51h18.824c1.631 0 1.631 2.51 0 2.51z"
      />
      <path 
        fill={color} 
        d="M16.51 25.37h-11.294c-1.631 0-1.631-2.51 0-2.51h11.294c1.631 0 1.631 2.51 0 2.51z"
      />
    </svg>
  );
};
TopTextIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default TopTextIcon;
