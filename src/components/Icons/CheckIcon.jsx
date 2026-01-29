import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CheckIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 37 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.571 21.451l6.821 5.116c0.435 0.326 0.98 0.472 1.52 0.406s1.034-0.337 1.379-0.759l17.708-21.643"
        fill="none"
        stroke={color}
        style={{ stroke: `var(--color1, ${color})` }}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="4.1143"
      />
    </svg>
  );
};

CheckIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default CheckIcon;
