import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FilterLeftIcon = ({ size = ICON_SIZE.MEDIUM, color = '#767676' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.3423 16.2475L7.25234 10L13.3423 3.75253C13.4514 3.64092 13.5124 3.49107 13.5124 3.33503C13.5124 3.179 13.4514 3.02915 13.3423 2.91753C13.2894 2.86349 13.2262 2.82055 13.1564 2.79124C13.0867 2.76192 13.0118 2.74683 12.9361 2.74683C12.8604 2.74683 12.7855 2.76192 12.7158 2.79124C12.646 2.82055 12.5828 2.86349 12.5298 2.91753L6.04984 9.56378C5.93607 9.6805 5.8724 9.83704 5.8724 10C5.8724 10.163 5.93607 10.3196 6.04984 10.4363L12.5286 17.0825C12.5816 17.137 12.6449 17.1802 12.7149 17.2098C12.7849 17.2393 12.8601 17.2545 12.9361 17.2545C13.0121 17.2545 13.0873 17.2393 13.1572 17.2098C13.2272 17.1802 13.2906 17.137 13.3436 17.0825C13.4526 16.9709 13.5137 16.8211 13.5137 16.665C13.5137 16.509 13.4526 16.3592 13.3436 16.2475L13.3423 16.2475Z"
        fill={color}
      />
    </svg>
  );
};
FilterLeftIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FilterLeftIcon;
