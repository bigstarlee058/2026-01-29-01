import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CenterTextIcon = ({ size = ICON_SIZE.REGULAR, color = '#f1f1f1' }) => {
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
        d="M27.829 10.311h-22.588c-0.753 0-1.255-0.502-1.255-1.255s0.502-1.255 1.255-1.255h22.588c0.753 0 1.255 0.502 1.255 1.255s-0.502 1.255-1.255 1.255z"
      />
      <path 
        fill={color} 
        d="M24.672 17.841h-16.314c-0.753 0-1.255-0.502-1.255-1.255s0.502-1.255 1.255-1.255h16.314c0.753 0 1.255 0.502 1.255 1.255s-0.502 1.255-1.255 1.255z"
      />
      <path 
        fill={color} 
        d="M21.515 25.37h-10.039c-0.753 0-1.255-0.502-1.255-1.255s0.502-1.255 1.255-1.255h10.039c0.753 0 1.255 0.502 1.255 1.255s-0.502 1.255-1.255 1.255z"
      />
    </svg>
  );
};
CenterTextIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CenterTextIcon;
