import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CollapsFullscreenIcon = ({
  size = '22',
  color = '#F1F1F1',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 31 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7769_169598)">
        <path
          d="M6.05581 5.43862L0.706971 5.43862L0.706971 8.44531L9.0625 8.44531L9.0625 0.0897837L6.05581 0.0897834L6.05581 5.43862Z"
          fill={color}
        />
        <path
          d="M22.0859 8.44531L30.4414 8.44531L30.4414 5.43862L25.0926 5.43862L25.0926 0.0897832L22.0859 0.0897829L22.0859 8.44531Z"
          fill={color}
        />
        <path
          d="M9.0625 21.4755L0.706972 21.4755L0.706972 24.4822L6.05581 24.4822L6.05581 29.8311L9.0625 29.8311L9.0625 21.4755Z"
          fill={color}
        />
        <path
          d="M22.0859 29.8311L25.0926 29.8311L25.0926 24.4822L30.4414 24.4822L30.4414 21.4755L22.0859 21.4755L22.0859 29.8311Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_7769_169598">
          <rect
            width="29.7416"
            height="29.7416"
            fill="white"
            transform="translate(0.703125 0.0898438)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
CollapsFullscreenIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CollapsFullscreenIcon;
