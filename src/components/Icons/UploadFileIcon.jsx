import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const UploadFileIcon = ({
  size = ICON_SIZE.EXTRA_LARGE,
  color = '#F1F1F1',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.99866 10.6484C7.72675 10.6484 7.50635 10.428 7.50635 10.1561L7.50635 2.33826C7.50635 2.06639 7.72675 1.84595 7.99866 1.84595C8.27057 1.84595 8.49097 2.06639 8.49097 2.33826L8.49097 10.1561C8.49097 10.428 8.27057 10.6484 7.99866 10.6484Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.9437 4.91784C10.7517 5.11035 10.44 5.11078 10.2475 4.91878L8.00228 2.67973L5.75708 4.91878C5.56457 5.11078 5.25288 5.11035 5.06088 4.91783C4.86888 4.72528 4.86932 4.41359 5.06183 4.22159L7.47039 1.8196C7.47043 1.81957 7.47031 1.81964 7.47039 1.8196C7.76708 1.52308 8.23481 1.53856 8.52279 1.80858C8.52649 1.81204 8.53012 1.81555 8.5337 1.81913L10.9427 4.22159C11.1352 4.41359 11.1357 4.72528 10.9437 4.91784Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.09094 9.67188C2.36284 9.67188 2.58325 9.89231 2.58325 10.1642V11.4048C2.58325 12.1558 3.19534 12.7701 3.95514 12.7701H12.0421C12.8019 12.7701 13.414 12.1558 13.414 11.4048V10.1642C13.414 9.89231 13.6344 9.67188 13.9063 9.67188C14.1782 9.67188 14.3986 9.89231 14.3986 10.1642V11.4048C14.3986 12.7018 13.3434 13.7548 12.0421 13.7548H3.95514C2.65381 13.7548 1.59863 12.7018 1.59863 11.4048V10.1642C1.59863 9.89231 1.81904 9.67188 2.09094 9.67188Z"
        fill={color}
      />
    </svg>
  );
};
UploadFileIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default UploadFileIcon;
