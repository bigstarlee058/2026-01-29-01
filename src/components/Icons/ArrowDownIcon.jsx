import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ArrowDownIcon = ({
  size = ICON_SIZE.LARGE,
  color = '#C7CED1',
  className,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.39731 8.23548L11.4248 15.152C11.5781 15.3037 11.7851 15.3888 12.0008 15.3888C12.2165 15.3888 12.4235 15.3037 12.5768 15.152L19.6043 8.23698C19.7586 8.08537 19.9663 8.00042 20.1826 8.00042C20.3989 8.00042 20.6065 8.08537 20.7608 8.23698C20.8368 8.31105 20.8972 8.39957 20.9384 8.49734C20.9796 8.5951 21.0009 8.70013 21.0009 8.80623C21.0009 8.91234 20.9796 9.01736 20.9384 9.11513C20.8972 9.21289 20.8368 9.30142 20.7608 9.37548L13.7348 16.2905C13.272 16.7449 12.6494 16.9995 12.0008 16.9995C11.3522 16.9995 10.7296 16.7449 10.2668 16.2905L3.24081 9.37548C3.16461 9.30139 3.10404 9.21278 3.06267 9.11487C3.02131 9.01697 3 8.91177 3 8.80548C3 8.6992 3.02131 8.594 3.06267 8.49609C3.10404 8.39819 3.16461 8.30957 3.24081 8.23548C3.39509 8.08387 3.60275 7.99891 3.81906 7.99891C4.03537 7.99891 4.24303 8.08387 4.39731 8.23548Z"
        fill={color}
      />
    </svg>
  );
};
ArrowDownIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  className: PropTypes.string,
};
export default ArrowDownIcon;
