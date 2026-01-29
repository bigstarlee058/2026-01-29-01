import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FontWeightItalic = ({ size = ICON_SIZE.MEDIUM, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.75 32h15c0.518 0 0.938-0.42 0.938-0.938s-0.42-0.937-0.938-0.937h-3.166c-0.306 0-0.583-0.129-0.759-0.355-0.165-0.211-0.218-0.477-0.15-0.749l6.207-25.016c0.314-1.254 1.436-2.13 2.728-2.13h2.639c0.518 0 0.937-0.42 0.937-0.938s-0.42-0.938-0.937-0.938h-15c-0.518 0-0.938 0.42-0.938 0.938s0.42 0.938 0.938 0.938h3.166c0.291 0 0.56 0.131 0.739 0.361s0.241 0.522 0.17 0.805l-6.207 25.016c-0.309 1.237-1.406 2.068-2.728 2.068h-2.639c-0.518 0-0.938 0.42-0.938 0.937s0.42 0.938 0.938 0.938z"
        fill={color}
      />
    </svg>
  );
};

FontWeightItalic.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default FontWeightItalic;
