import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ShareBackIcon = ({
  size = ICON_SIZE.SMALL,
  color = 'white',
  opacity = 1,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.0843 2.04432C8.26353 1.9634 8.47352 1.995 8.621 2.12507L14.1048 6.96114C14.6317 7.42587 14.6317 8.24741 14.1048 8.71214L8.621 13.5482C8.47352 13.6783 8.26353 13.7099 8.0843 13.629C7.90506 13.5481 7.78987 13.3696 7.78987 13.173V10.6721C6.49066 10.6764 5.3797 10.7121 4.37107 11.0012C3.29723 11.3089 2.32214 11.9108 1.40051 13.1396C1.27131 13.3119 1.04637 13.3822 0.842081 13.3141C0.637791 13.246 0.5 13.0549 0.5 12.8395C0.5 9.75859 1.51988 7.774 3.04591 6.57072C4.4427 5.46935 6.19582 5.07684 7.78987 5.01181V2.50029C7.78987 2.30364 7.90506 2.12522 8.0843 2.04432ZM8.79043 3.60852V5.36858C8.79043 5.71771 8.50921 5.99915 8.16274 6.00297C6.58752 6.02035 4.92517 6.36312 3.66544 7.35643C2.64648 8.15989 1.83732 9.43174 1.58369 11.4435C2.36233 10.7304 3.19699 10.2968 4.09544 10.0393C5.3558 9.67815 6.72399 9.67135 8.15614 9.67101C8.50407 9.67095 8.79043 9.95257 8.79043 10.3047V12.0648L13.443 7.96171C13.5182 7.89534 13.5182 7.77794 13.443 7.71157L8.79043 3.60852Z"
        fill={color}
        fillOpacity={opacity}
      />
    </svg>
  );
};
ShareBackIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  opacity: PropTypes.number,
};
export default ShareBackIcon;
