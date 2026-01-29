import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SeparatorIcon = ({ size = ICON_SIZE.LARGE, color = 'white' }) => {
  return (
    <svg
      width="26"
      height="10"
      viewBox="0 0 26 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25.8726 4.6875L19.6226 0V2.5H4.6875V6.875H19.6226V9.375L25.8726 4.6875Z"
        fill={color}
      />
      <path d="M2.625 2.5H3.875V6.875H2.625V2.5Z" fill={color} />
      <path d="M0.5 2.5H1.75V6.875H0.5V2.5Z" fill={color} />
    </svg>
  );
};
SeparatorIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default SeparatorIcon;
