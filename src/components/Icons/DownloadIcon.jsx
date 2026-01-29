import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DownloadIcon = ({ size = ICON_SIZE.MEDIUM, color = '#C7CED1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.0155 7.5V7.98485H12.5003H13.8253C14.1269 7.98485 14.2911 8.35686 14.0658 8.58216L10.2408 12.4072C10.1052 12.5428 9.88715 12.5428 9.7515 12.4072L5.9265 8.58216C5.70852 8.36418 5.86337 7.98485 6.17533 7.98485H7.50033H7.98517V7.5V3.33333C7.98517 3.14277 8.1431 2.98485 8.33366 2.98485H11.667C11.8576 2.98485 12.0155 3.14277 12.0155 3.33333V7.5ZM5.00033 16.1818C4.80977 16.1818 4.65184 16.0239 4.65184 15.8333C4.65184 15.6428 4.80977 15.4848 5.00033 15.4848H15.0003C15.1909 15.4848 15.3488 15.6428 15.3488 15.8333C15.3488 16.0239 15.1909 16.1818 15.0003 16.1818H5.00033Z"
        stroke={color}
        strokeWidth="0.969697"
      />
    </svg>
  );
};
DownloadIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default DownloadIcon;
