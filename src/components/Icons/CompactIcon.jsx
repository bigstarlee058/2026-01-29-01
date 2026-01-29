import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CompactIcon = ({ size = ICON_SIZE.SMALL, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_17467_265385)">
        <path
          d="M12.0722 13L9.07225 10L8.36525 10.707L10.5118 12.8535H6.21875V8H5.21875L5.21875 19.0002H6.21875V13.8535H10.5118L8.36525 16L9.07225 16.707L12.0722 13.707C12.2677 13.5115 12.2677 13.1955 12.0722 13Z"
          fill={color}
        />
        <path
          d="M20.2189 8V12.8535H15.9259L18.0724 10.707L17.3654 10L14.3654 13C14.1699 13.1955 14.1699 13.5115 14.3654 13.707L17.3654 16.707L18.0724 16L15.9259 13.8535H20.2189V18.9995H21.2189V8H20.2189Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_17467_265385">
          <rect
            width="16"
            height="16"
            fill={color}
            transform="translate(5.21875 5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

CompactIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default CompactIcon;
