import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const BurgerMenu = ({ size = ICON_SIZE.LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7H20M4 12.3333H20M4 17.6667H20"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="1.77778"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
BurgerMenu.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default BurgerMenu;
