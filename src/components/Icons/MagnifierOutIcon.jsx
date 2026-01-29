import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const MagnifierOutIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = '#9fa6a9',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.8502 13.3299L10.4104 9.75253C11.262 8.93198 11.7934 7.7813 11.7934 6.50804C11.7934 4.02226 9.77106 2 7.28538 2C4.7996 2 2.77734 4.02226 2.77734 6.50804C2.77734 8.99377 4.7996 11.0161 7.28538 11.0161C8.21274 11.0161 9.07541 10.7343 9.79285 10.2524L13.2797 13.8785C13.3574 13.9593 13.4612 14 13.565 14C13.6637 14 13.7625 13.9633 13.8393 13.8895C13.9968 13.738 14.0017 13.4874 13.8502 13.3299ZM3.56888 6.50804C3.56888 4.45876 5.23611 2.79153 7.28538 2.79153C9.33466 2.79153 11.0018 4.45876 11.0018 6.50804C11.0018 8.55732 9.33466 10.2245 7.28538 10.2245C5.23611 10.2245 3.56888 8.55732 3.56888 6.50804Z"
        fill={color}
        fillOpacity="1"
      />
      <path
        d="M9.30341 6.10938H5.26686C5.04824 6.10938 4.87109 6.28652 4.87109 6.50514C4.87109 6.72376 5.04824 6.90091 5.26686 6.90091H9.30341C9.52203 6.90091 9.69918 6.72376 9.69918 6.50514C9.69918 6.28652 9.52203 6.10938 9.30341 6.10938Z"
        fill={color}
        fillOpacity="1"
      />
    </svg>
  );
};

MagnifierOutIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default MagnifierOutIcon;
