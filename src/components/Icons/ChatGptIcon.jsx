import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ChatGptIcon = ({ size = ICON_SIZE.LARGE, color = '#B9BFC2' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.18945 13.97V6.76996L14.7845 3.53996C17.8845 1.74996 23.4345 6.16496 21.1045 10.205"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M9.18945 10.47L15.4245 6.87L21.0195 10.1C24.1195 11.89 23.0695 18.905 18.4045 18.905"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M12.2204 8.71997L18.4554 12.32V18.785C18.4554 22.365 11.8554 24.965 9.52539 20.925"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M15.2505 10.6V17.67L9.65547 20.9C6.55547 22.69 1.00547 18.275 3.33547 14.235"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M15.2499 13.97L9.0149 17.57L3.4199 14.34C0.314896 12.545 1.3649 5.53503 6.0299 5.53503"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M12.2194 15.72L5.98438 12.12V5.65501C5.98438 2.07501 12.5844 -0.52499 14.9144 3.51501"
        stroke={color}
        strokeLinejoin="round"
      />
    </svg>
  );
};
ChatGptIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ChatGptIcon;
