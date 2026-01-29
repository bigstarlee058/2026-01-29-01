import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const BackVideoStudioIcon = ({ size = ICON_SIZE.LARGE, color = '#178995' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.8605 6.65822L9.76992 2.53479C9.58125 2.34611 9.275 2.34338 9.08633 2.53205C8.89766 2.72072 8.89492 3.02697 9.08359 3.21564L12.3566 6.51604H0.483984C0.216016 6.51604 0 6.73205 0 7.00002C0 7.26799 0.216016 7.484 0.483984 7.484H12.3566L9.08359 10.7844C8.89492 10.9731 8.89766 11.2793 9.08633 11.468C9.275 11.6567 9.58125 11.6539 9.76992 11.4653L13.8605 7.34182C14.0465 7.15314 14.0465 6.84689 13.8605 6.65822Z"
        fill="#178995"
      />
    </svg>
  );
};
BackVideoStudioIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default BackVideoStudioIcon;
