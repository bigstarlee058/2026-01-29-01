import ICON_SIZE from './IconSize';
import PropTypes from 'prop-types';

const PreviewIcon = ({ size = ICON_SIZE.MEDIUM, color = '#fff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        style={{ fill: 'var(--color1, #fff)' }}
        opacity="0.4"
        d="M11 11l-8.333-8.333M2.667 2.667v6.667M2.667 2.667h6.667M21 11l8.333-8.333M29.333 2.667v6.667M29.333 2.667h-6.667M11 21l-8.333 8.333M2.667 29.333v-6.667M2.667 29.333h6.667M21 21l8.333 8.333M29.333 29.333v-6.667M29.333 29.333h-6.667"
        stroke={color}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2.2222"
      />
    </svg>
  );
};

PreviewIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};

export default PreviewIcon;
