import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SmallArrowDownIcon = ({ size = ICON_SIZE.LARGE, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
SmallArrowDownIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default SmallArrowDownIcon;
