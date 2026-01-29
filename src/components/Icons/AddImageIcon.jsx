import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AddImageIcon = ({ size = ICON_SIZE.EXTRA_LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M44 13.5C44.3978 13.5 44.7794 13.342 45.0607 13.0607C45.342 12.7794 45.5 12.3978 45.5 12C45.5 11.6022 45.342 11.2206 45.0607 10.9393C44.7794 10.658 44.3978 10.5 44 10.5V13.5ZM28 10.5C27.6022 10.5 27.2206 10.658 26.9393 10.9393C26.658 11.2206 26.5 11.6022 26.5 12C26.5 12.3978 26.658 12.7794 26.9393 13.0607C27.2206 13.342 27.6022 13.5 28 13.5V10.5ZM37.5 4C37.5 3.60218 37.342 3.22064 37.0607 2.93934C36.7794 2.65804 36.3978 2.5 36 2.5C35.6022 2.5 35.2206 2.65804 34.9393 2.93934C34.658 3.22064 34.5 3.60218 34.5 4H37.5ZM34.5 20C34.5 20.3978 34.658 20.7794 34.9393 21.0607C35.2206 21.342 35.6022 21.5 36 21.5C36.3978 21.5 36.7794 21.342 37.0607 21.0607C37.342 20.7794 37.5 20.3978 37.5 20H34.5ZM44 10.5H36V13.5H44V10.5ZM36 10.5H28V13.5H36V10.5ZM34.5 4V12H37.5V4H34.5ZM34.5 12V20H37.5V12H34.5Z"
        fill={color}
      />
      <path
        d="M23 6C14.044 6 9.564 6 6.782 8.782C4 11.564 4 16.042 4 25C4 33.956 4 38.436 6.782 41.218C9.564 44 14.042 44 23 44C31.956 44 36.436 44 39.218 41.218C42 38.436 42 33.958 42 25V24"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 28.2693C5.24 28.0893 6.488 28.0013 7.744 28.0053C13.048 27.8933 18.222 29.5453 22.344 32.6673C26.164 35.5633 28.85 39.5473 30 43.9993"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41 33.344C38.9111 32.4516 36.7493 31.9986 34.5751 32.0001C31.2844 31.9896 28.0258 33.0096 25 35"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
AddImageIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default AddImageIcon;
