import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AppleIcon = ({ size = ICON_SIZE.REGULAR, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <symbol id="icon-ic_baseline-apple" viewBox="0 0 32 32">
        <path fill="#fff" style={{ fill: 'var(--color1, #fff)' }} d="M24.359 29.464c-1.6 1.551-3.347 1.306-5.028 0.571-1.779-0.751-3.412-0.784-5.289 0-2.351 1.012-3.591 0.718-4.995-0.571-7.967-8.211-6.791-20.716 2.253-21.173 2.204 0.114 3.738 1.208 5.028 1.306 1.926-0.392 3.771-1.518 5.828-1.371 2.465 0.196 4.326 1.175 5.551 2.938-5.093 3.053-3.885 9.762 0.784 11.64-0.93 2.449-2.139 4.881-4.146 6.677l0.016-0.016zM16.163 8.193c-0.245-3.64 2.71-6.644 6.105-6.938 0.473 4.212-3.82 7.346-6.105 6.938z"></path>
      </symbol>
      <use xlinkHref="#icon-ic_baseline-apple" />
    </svg>
  );
};

AppleIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default AppleIcon;
