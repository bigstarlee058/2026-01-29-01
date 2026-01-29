import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const UturnIcon = ({ size = ICON_SIZE.MEDIUM, color = '#9FA6A9', style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M18.4986 7.32228L15.8266 4.59412C15.5162 4.27544 14.9481 4.27683 14.6398 4.59343L11.9671 7.32297C11.699 7.59662 11.7039 8.03515 11.9775 8.30256C12.2518 8.57066 12.6897 8.56651 12.9571 8.29217L14.5408 6.67522L14.47 12.0729C14.47 15.1287 11.9836 17.6151 8.92777 17.6151C5.87193 17.6151 3.38556 15.1287 3.38556 12.0729V3.0668C3.38556 2.68439 3.07519 2.37402 2.69278 2.37402C2.31036 2.37402 2 2.68439 2 3.0668V12.0729C2 15.8929 5.1078 19.0007 8.92777 19.0007C12.7477 19.0007 15.8555 15.8929 15.8555 12.0729L15.9263 6.67522L17.51 8.29217C17.6458 8.43072 17.8252 8.5 18.0047 8.5C18.1792 8.5 18.3545 8.43419 18.4896 8.30187C18.7633 8.03445 18.7674 7.59523 18.5 7.32228H18.4986Z"
        fill={color}
      />
    </svg>
  );
};
UturnIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default UturnIcon;
