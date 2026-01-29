import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SideNavigationIcon = ({ size = '12px', color = '#FFFFFF66' }) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="15.5"
        stroke={color}
        strokeOpacity="0.09"
      />
      <path
        d="M9.13945 16.3418L13.2301 20.4653C13.4188 20.6539 13.725 20.6567 13.9137 20.468C14.1023 20.2793 14.1051 19.9731 13.9164 19.7844L10.6434 16.484L22.516 16.484C22.784 16.484 23 16.268 23 16C23 15.7321 22.784 15.5161 22.516 15.5161L10.6434 15.5161L13.9164 12.2157C14.1051 12.027 14.1023 11.7207 13.9137 11.5321C13.725 11.3434 13.4188 11.3461 13.2301 11.5348L9.13945 15.6582C8.95352 15.8469 8.95352 16.1532 9.13945 16.3418Z"
        fill={color}
      />
    </svg>
  );
};

SideNavigationIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default SideNavigationIcon;
