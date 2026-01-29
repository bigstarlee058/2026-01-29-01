import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const UppercaseIcon = ({ size = ICON_SIZE.LARGE, color = '#d3f85a' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        d="M15.35 3.844h-6.498l-8.852 24.323h5.937l1.712-5.411h8.65l1.733 5.411h5.968l-8.65-24.323zM8.822 18.552l3.117-9.728 3.105 9.728h-6.222z"
      />
      <path
        fill={color}
        d="M43.35 3.844h-6.498l-8.852 24.323h5.937l1.712-5.411h8.65l1.734 5.411h5.968l-8.65-24.323zM36.822 18.552l3.117-9.728 3.105 9.728h-6.222z"
      />
    </svg>
  );
};

UppercaseIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default UppercaseIcon;
