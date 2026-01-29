import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SwitchIcon = ({ size = ICON_SIZE.EXTRA_LARGE, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 49"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* <rect
        width="48"
        height="48"
        rx="24"
        transform="matrix(-1 0 0 1 48 0.5)"
        fill={color}
        fillOpacity="0.02"
      /> */}
      {/* <rect
        x="-0.5"
        y="0.5"
        width="47"
        height="47"
        rx="23.5"
        transform="matrix(-1 0 0 1 47 0.5)"
        stroke={color}
        strokeOpacity="0.1"
      /> */}
      <path
        d="M29.347 14.5043L19.603 24.5003L29.347 34.4963C29.5214 34.6749 29.6191 34.9147 29.6191 35.1643C29.6191 35.414 29.5214 35.6537 29.347 35.8323C29.2622 35.9188 29.1611 35.9875 29.0495 36.0344C28.9379 36.0813 28.818 36.1055 28.697 36.1055C28.5759 36.1055 28.456 36.0813 28.3444 36.0344C28.2328 35.9875 28.1317 35.9188 28.047 35.8323L17.679 25.1983C17.4969 25.0116 17.3951 24.7611 17.3951 24.5003C17.3951 24.2396 17.4969 23.9891 17.679 23.8023L28.045 13.1683C28.1298 13.0812 28.2311 13.012 28.3431 12.9648C28.4551 12.9175 28.5754 12.8932 28.697 12.8932C28.8185 12.8932 28.9388 12.9175 29.0508 12.9648C29.1628 13.012 29.2642 13.0812 29.349 13.1683C29.5234 13.3469 29.6211 13.5867 29.6211 13.8363C29.6211 14.086 29.5234 14.3257 29.349 14.5043L29.347 14.5043Z"
        fill="white"
        fillOpacity="0.6"
      />
    </svg>
  );
};
SwitchIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default SwitchIcon;
