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
        d="M15.435 12.8c0.251 0.251 0.502 0.376 0.878 0.376s0.627-0.126 0.878-0.376l3.765-3.765c0.502-0.502 0.502-1.255 0-1.757s-1.255-0.502-1.757 0l-1.631 1.631v-5.773c0-0.753-0.502-1.255-1.255-1.255s-1.255 0.502-1.255 1.255v5.773l-1.631-1.631c-0.502-0.502-1.255-0.502-1.757 0s-0.502 1.255 0 1.757l3.765 3.765zM17.192 18.573c-0.502-0.502-1.255-0.502-1.757 0l-3.765 3.765c-0.502 0.502-0.502 1.255 0 1.757s1.255 0.502 1.757 0l1.631-1.631v5.773c0 0.753 0.502 1.255 1.255 1.255s1.255-0.502 1.255-1.255v-5.773l1.631 1.631c0.251 0.251 0.627 0.376 0.878 0.376s0.627-0.126 0.878-0.376c0.502-0.502 0.502-1.255 0-1.757l-3.765-3.765zM26.355 14.431h-19.453c-0.753 0-1.255 0.502-1.255 1.255s0.502 1.255 1.255 1.255h19.453c0.753 0 1.255-0.502 1.255-1.255s-0.502-1.255-1.255-1.255z"
      />
    </svg>
  );
};
CenterTextIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CenterTextIcon;
