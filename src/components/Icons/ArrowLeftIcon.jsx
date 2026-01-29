import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ArrowLeftIcon = ({ size = ICON_SIZE.LARGE, color = '#fff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        opacity="0.4"
        d="M0.735 18.27l13.065 13.002c0.979 0.974 2.562 0.97 3.536-0.008s0.97-2.562-0.008-3.536l-8.77-8.728h36.943c1.381 0 2.5-1.119 2.5-2.5s-1.119-2.5-2.5-2.5h-36.943l8.77-8.728c0.979-0.974 0.982-2.557 0.008-3.535s-2.557-0.982-3.536-0.008l-13.063 13c-0.979 0.977-0.978 2.568-0.002 3.542z"
      />
    </svg>
  );
};

ArrowLeftIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default ArrowLeftIcon;