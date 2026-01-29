import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const MyItemsDownloadIcon = ({ size = ICON_SIZE.EXTRA_SMALL, color = 'white', opacity = 1 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.00108 1.6875C7.239 1.6875 7.43185 1.88036 7.43185 2.11827V8.9589C7.43185 9.19679 7.239 9.38967 7.00108 9.38967C6.76316 9.38967 6.57031 9.19679 6.57031 8.9589V2.11827C6.57031 1.88036 6.76316 1.6875 7.00108 1.6875Z"
        fill={color}
        fillOpacity={opacity}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.43044 6.69689C4.59844 6.52845 4.87117 6.52807 5.03962 6.69607L7.00417 8.65524L8.96872 6.69607C9.13716 6.52807 9.40989 6.52845 9.57789 6.69689C9.74589 6.86538 9.74551 7.13811 9.57707 7.30611L7.46957 9.40785C7.46954 9.40788 7.46964 9.40781 7.46957 9.40785C7.20997 9.66731 6.80071 9.65376 6.54872 9.41749C6.54548 9.41446 6.54231 9.4114 6.53918 9.40826L4.43127 7.30611C4.26282 7.13811 4.26244 6.86538 4.43044 6.69689Z"
        fill={color}
        fillOpacity={opacity}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.82921 8.74219C2.06712 8.74219 2.25998 8.93507 2.25998 9.17296V10.2585C2.25998 10.9156 2.79556 11.4532 3.46038 11.4532H10.5365C11.2013 11.4532 11.7369 10.9156 11.7369 10.2585V9.17296C11.7369 8.93507 11.9297 8.74219 12.1677 8.74219C12.4056 8.74219 12.5984 8.93507 12.5984 9.17296V10.2585C12.5984 11.3934 11.6751 12.3147 10.5365 12.3147H3.46038C2.32172 12.3147 1.39844 11.3934 1.39844 10.2585V9.17296C1.39844 8.93507 1.5913 8.74219 1.82921 8.74219Z"
        fill={color}
        fillOpacity={opacity}
      />
    </svg>
  );
};
MyItemsDownloadIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default MyItemsDownloadIcon;
