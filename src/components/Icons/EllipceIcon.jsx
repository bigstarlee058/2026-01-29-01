import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const EllipceIcon = ({
  size = ICON_SIZE.SMALL,
  color = '#FFFFFF',
  bgColor = '#D3F85A'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M30.4 16c0 8.395-6.805 15.2-15.2 15.2s-15.2-6.805-15.2-15.2c0-8.395 6.805-15.2 15.2-15.2s15.2 6.805 15.2 15.2z"
        fill={bgColor}
        fillOpacity="0.04"
      />
      <path
        d="M28.8 16c0 7.511-6.089 13.6-13.6 13.6s-13.6-6.089-13.6-13.6c0-7.511 6.089-13.6 13.6-13.6s13.6 6.089 13.6 13.6z"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit="4"
      />
    </svg>
  );
};

EllipceIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  bgColor: PropTypes.string
};

export default EllipceIcon;

