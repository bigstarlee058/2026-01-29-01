import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DislikeFullWhiteIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = '#F1F1F1', // Белый цвет по умолчанию
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.48232 8.10541H11.7099C13.1951 8.10541 11.2642 1.74999 10.2002 1.74999H2.89632C2.74851 1.74875 2.60626 1.80623 2.50082 1.90982C2.39538 2.0134 2.33537 2.15461 2.33398 2.30241V7.77699C2.33398 7.97941 2.44657 8.16549 2.62682 8.26232C3.82965 8.90749 5.24073 9.43599 5.93898 10.6709L6.68565 11.9927C6.73017 12.0713 6.79482 12.1365 6.87296 12.1817C6.95109 12.227 7.03988 12.2505 7.13015 12.25C8.98515 12.25 8.43507 9.54916 8.18307 8.47582C8.17293 8.43113 8.17305 8.38473 8.18342 8.34009C8.19379 8.29545 8.21413 8.25375 8.24293 8.2181C8.27173 8.18245 8.30823 8.1538 8.34969 8.13428C8.39115 8.11476 8.43649 8.10489 8.48232 8.10541Z"
        fill={color}
        stroke={color}
        strokeWidth="0.875"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

DislikeFullWhiteIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default DislikeFullWhiteIcon; 