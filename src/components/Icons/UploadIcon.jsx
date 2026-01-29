import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const UploadIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2168_7236)">
        <path
          d="M19.9963 8.82203C18.8871 4.40324 14.4058 1.72031 9.98704 2.82953C6.53385 3.69639 4.02646 6.68092 3.76811 10.2318C1.31621 10.6362 -0.343691 12.9516 0.0606558 15.4035C0.420101 17.5833 2.30886 19.1796 4.51803 19.1709H8.26762V17.671H4.51803C2.86136 17.671 1.51836 16.328 1.51836 14.6713C1.51836 13.0147 2.86136 11.6717 4.51803 11.6717C4.93222 11.6717 5.26794 11.3359 5.26794 10.9218C5.2642 7.19424 8.28294 4.16945 12.0105 4.16575C15.2372 4.16251 18.0148 6.44367 18.639 9.6094C18.7006 9.92549 18.9571 10.167 19.2764 10.2093C21.3266 10.5013 22.7519 12.3999 22.46 14.4501C22.1978 16.291 20.626 17.6617 18.7665 17.671H15.7668V19.1709H18.7665C21.6656 19.1621 24.0088 16.8047 24 13.9055C23.9926 11.4922 22.3408 9.39474 19.9963 8.82203Z"
          fill={color}
        />
        <path
          d="M11.484 11.8892L8.48438 14.8889L9.54176 15.9463L11.2666 14.229V21.4207H12.7664V14.229L14.4837 15.9463L15.5411 14.8889L12.5414 11.8892C12.2489 11.5984 11.7766 11.5984 11.484 11.8892Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_2168_7236">
          <rect width="24" height="24" fill={color} />
        </clipPath>
      </defs>
    </svg>
  );
};
UploadIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default UploadIcon;
