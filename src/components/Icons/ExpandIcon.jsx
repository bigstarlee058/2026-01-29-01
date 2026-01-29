import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ExpandIcon = ({
  size = ICON_SIZE.REGULAR_LARGE,
  color = '#FFFFFF99',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.4993 10.5L4.66602 4.66666M4.66602 4.66666V9.33332M4.66602 4.66666H9.33268M17.4993 10.5L23.3327 4.66666M23.3327 4.66666V9.33332M23.3327 4.66666H18.666M10.4993 17.5L4.66602 23.3333M4.66602 23.3333V18.6667M4.66602 23.3333H9.33268M17.4993 17.5L23.3327 23.3333M23.3327 23.3333V18.6667M23.3327 23.3333H18.666"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
ExpandIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ExpandIcon;
