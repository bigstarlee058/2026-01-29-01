import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const BackIcon = ({ size = ICON_SIZE.LARGE, color = '#C7CED1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 12L20 12"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M11.0331 4.34016L4.46015 10.9112C4.31623 11.0534 4.20197 11.2229 4.12399 11.4096C4.04601 11.5964 4.00586 11.7968 4.00586 11.9992C4.00586 12.2015 4.04601 12.4019 4.12399 12.5887C4.20197 12.7754 4.31623 12.9449 4.46015 13.0872L11.0331 19.6602"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
BackIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default BackIcon;
