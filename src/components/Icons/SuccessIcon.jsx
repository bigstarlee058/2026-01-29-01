import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SuccessIcon = ({ size = ICON_SIZE.LARGE, color = 'var(--accent-color)' }) => {
  return (
    <svg
      width="177"
      height="177"
      viewBox="0 0 177 177"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M88.4993 14.75L107.87 28.8805L131.85 28.8363L139.213 51.6545L158.639 65.7113L151.187 88.5L158.639 111.289L139.213 125.346L131.85 148.164L107.87 148.119L88.4993 162.25L69.1289 148.119L45.1491 148.164L37.7851 125.346L18.3594 111.289L25.8118 88.5L18.3594 65.7113L37.7851 51.6545L45.1491 28.8363L69.1289 28.8805L88.4993 14.75Z"
        fill={color}
        fillOpacity="0.04"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M62.6875 88.5L81.125 106.938L118 70.0625"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
SuccessIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default SuccessIcon;
