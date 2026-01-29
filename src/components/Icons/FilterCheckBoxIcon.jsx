import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FilterCheckBoxIcon = ({ size = ICON_SIZE.SMALL, color = '#C7CED1' }) => {
  return (
    <svg
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.750977 5.61563L2.61617 7.01467C2.73522 7.10393 2.88416 7.14375 3.03188 7.1258C3.17959 7.10784 3.31466 7.03351 3.40886 6.91832L8.25098 1.00024"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
FilterCheckBoxIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FilterCheckBoxIcon;
