import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const LoadingIcon = ({
  size = ICON_SIZE.MEDIUM_LARGE,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.9993 29.3334C8.65268 29.3334 2.66602 23.3467 2.66602 16.0001C2.66602 13.5067 3.35935 11.0801 4.66602 8.97341C5.05268 8.34675 5.87935 8.16008 6.50602 8.54675C7.13268 8.93341 7.31935 9.76007 6.93268 10.3867C5.89268 12.0667 5.33268 14.0134 5.33268 16.0001C5.33268 21.8801 10.1193 26.6667 15.9993 26.6667C21.8793 26.6667 26.666 21.8801 26.666 16.0001C26.666 10.1201 21.8793 5.33341 15.9993 5.33341C15.266 5.33341 14.666 4.73341 14.666 4.00008C14.666 3.26675 15.266 2.66675 15.9993 2.66675C23.346 2.66675 29.3327 8.65341 29.3327 16.0001C29.3327 23.3467 23.346 29.3334 15.9993 29.3334Z"
        fill={color}
        stroke={color}
        strokeWidth="0.3"
      />
      <circle cx="10.5" cy="5.5" r="1.5" fill={color} />
    </svg>
  );
};
LoadingIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default LoadingIcon;
