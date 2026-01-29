import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CheckBoxBlackIcon = ({
  size = ICON_SIZE.SMALL,
  color = ' "#1E1E1E"',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.75 8.75L6.25 12.25L13.25 4.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
CheckBoxBlackIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CheckBoxBlackIcon;
