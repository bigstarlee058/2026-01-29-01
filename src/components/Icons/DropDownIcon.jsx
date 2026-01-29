import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DropDownIcon = ({ size = ICON_SIZE.SMALL, color = '#FFFFFF' }) => {
  // Parse size to get width and height
  let width, height;
  if (typeof size === 'string' && size.includes('px')) {
    const sizeValue = parseInt(size);
    if (sizeValue === 10) {
      width = '10px';
      height = '6px';
    } else {
      width = size;
      height = size;
    }
  } else {
    width = size;
    height = size;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 53 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="none"
        stroke={color}
        style={{ stroke: `var(--color1, ${color})` }}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="5.3333"
        d="M48 28.792l-21.333-21.333-21.333 21.333"
      />
    </svg>
  );
};

DropDownIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default DropDownIcon;