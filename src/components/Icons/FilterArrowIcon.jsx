import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FilterArrowIcon = ({ size = ICON_SIZE.LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width="14"
      height="11"
      viewBox="0 0 14 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.9999 0.333386L0.999944 0.333385C0.878449 0.333766 0.759359 0.367275 0.655493 0.430303C0.551626 0.493333 0.466916 0.583495 0.410479 0.691087C0.354044 0.798678 0.328019 0.919625 0.335208 1.04091C0.342397 1.16219 0.382526 1.27921 0.451277 1.37938L6.45128 10.0461C6.69994 10.4054 7.29861 10.4054 7.54794 10.0461L13.5479 1.37939C13.6174 1.27942 13.6581 1.16234 13.6657 1.04086C13.6733 0.919372 13.6474 0.798134 13.5909 0.690314C13.5344 0.582495 13.4495 0.492217 13.3453 0.42929C13.2411 0.366363 13.1217 0.333195 12.9999 0.333386ZM6.99994 8.49538L2.27194 1.66672L11.7279 1.66672L6.99994 8.49538Z"
        fill={color}
      />
    </svg>
  );
};
FilterArrowIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FilterArrowIcon;
