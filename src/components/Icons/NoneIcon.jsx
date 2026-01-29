import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const NoneIcon = ({ size = '12px', color = '#9fa6a9' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      transform="scale(0.75)"
    >
      <path
        d="M6 12c3.308 0 6-2.692 6-6 0-1.604-0.624-3.111-1.757-4.244S7.604 0 6 0C2.692 0 0 2.692 0 6c0 1.604 0.624 3.111 1.757 4.244S4.396 12 6 12zM6 11c-1.168 0-2.275-0.397-3.165-1.127l7.038-7.038C10.603 3.725 11 4.832 11 6c0 2.757-2.243 5-5 5zM6 1c1.168 0 2.275 0.397 3.165 1.127l-7.038 7.038C1.397 8.275 1 7.168 1 6c0-2.757 2.243-5 5-5z"
        fill={color}
      />
    </svg>
  );
};

NoneIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default NoneIcon;