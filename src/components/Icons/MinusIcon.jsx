import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const MinusIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1.99902"
        y="8.50024"
        width="1"
        height="11"
        rx="0.5"
        transform="rotate(-90 1.99902 8.50024)"
        fill={color}
      />
    </svg>
  );
};
MinusIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default MinusIcon;
