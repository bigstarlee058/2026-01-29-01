import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PlusWithBorderIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.880391"
        y="0.48"
        width="23.04"
        height="23.04"
        rx="11.52"
        stroke="#C7CED1"
        strokeWidth="0.96"
      />
      <rect x="11.9004" y="8" width="1" height="8" rx="0.5" fill="#D9D9D9" />
      <rect
        x="8.40039"
        y="12.5"
        width="1"
        height="8"
        rx="0.5"
        transform="rotate(-90 8.40039 12.5)"
        fill="#D9D9D9"
      />
    </svg>
  );
};
PlusWithBorderIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PlusWithBorderIcon;

