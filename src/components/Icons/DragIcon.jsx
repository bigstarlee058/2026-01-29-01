import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DragIcon = ({
  size = ICON_SIZE.SMALL,
  color = '#FFFFFF1A',
  strokeWidth = 1.8,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 2H11.51V2.01H11.5V2Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M12 2C12 2.13261 11.9473 2.25979 11.8536 2.35355C11.7598 2.44732 11.6326 2.5 11.5 2.5C11.3674 2.5 11.2402 2.44732 11.1464 2.35355C11.0527 2.25979 11 2.13261 11 2C11 1.86739 11.0527 1.74021 11.1464 1.64645C11.2402 1.55268 11.3674 1.5 11.5 1.5C11.6326 1.5 11.7598 1.55268 11.8536 1.64645C11.9473 1.74021 12 1.86739 12 2ZM11.5 8.49H11.51V8.5H11.5V8.49Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M12 8.48999C12 8.6226 11.9473 8.74978 11.8536 8.84354C11.7598 8.93731 11.6326 8.98999 11.5 8.98999C11.3674 8.98999 11.2402 8.93731 11.1464 8.84354C11.0527 8.74978 11 8.6226 11 8.48999C11 8.35738 11.0527 8.23021 11.1464 8.13644C11.2402 8.04267 11.3674 7.98999 11.5 7.98999C11.6326 7.98999 11.7598 8.04267 11.8536 8.13644C11.9473 8.23021 12 8.35738 12 8.48999ZM11.5 15H11.51V15.01H11.5V15Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M12 15C12 15.1326 11.9473 15.2598 11.8536 15.3536C11.7598 15.4473 11.6326 15.5 11.5 15.5C11.3674 15.5 11.2402 15.4473 11.1464 15.3536C11.0527 15.2598 11 15.1326 11 15C11 14.8674 11.0527 14.7402 11.1464 14.6464C11.2402 14.5527 11.3674 14.5 11.5 14.5C11.6326 14.5 11.7598 14.5527 11.8536 14.6464C11.9473 14.7402 12 14.8674 12 15ZM4.5 2H4.51V2.01H4.5V2Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M5 2C5 2.13261 4.94732 2.25979 4.85355 2.35355C4.75979 2.44732 4.63261 2.5 4.5 2.5C4.36739 2.5 4.24021 2.44732 4.14645 2.35355C4.05268 2.25979 4 2.13261 4 2C4 1.86739 4.05268 1.74021 4.14645 1.64645C4.24021 1.55268 4.36739 1.5 4.5 1.5C4.63261 1.5 4.75979 1.55268 4.85355 1.64645C4.94732 1.74021 5 1.86739 5 2ZM4.5 8.49H4.51V8.5H4.5V8.49Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M5 8.48999C5 8.6226 4.94732 8.74978 4.85355 8.84354C4.75979 8.93731 4.63261 8.98999 4.5 8.98999C4.36739 8.98999 4.24021 8.93731 4.14645 8.84354C4.05268 8.74978 4 8.6226 4 8.48999C4 8.35738 4.05268 8.23021 4.14645 8.13644C4.24021 8.04267 4.36739 7.98999 4.5 7.98999C4.63261 7.98999 4.75979 8.04267 4.85355 8.13644C4.94732 8.23021 5 8.35738 5 8.48999ZM4.5 15H4.51V15.01H4.5V15Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M5 15C5 15.1326 4.94732 15.2598 4.85355 15.3536C4.75979 15.4473 4.63261 15.5 4.5 15.5C4.36739 15.5 4.24021 15.4473 4.14645 15.3536C4.05268 15.2598 4 15.1326 4 15C4 14.8674 4.05268 14.7402 4.14645 14.6464C4.24021 14.5527 4.36739 14.5 4.5 14.5C4.63261 14.5 4.75979 14.5527 4.85355 14.6464C4.94732 14.7402 5 14.8674 5 15Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
DragIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  strokeWidth: PropTypes.number,
};
export default DragIcon;
