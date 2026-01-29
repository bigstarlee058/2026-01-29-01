import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PlayerBackIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.898438 7.11111C0.898438 8.10002 1.19168 9.06672 1.74109 9.88896C2.2905 10.7112 3.07139 11.3521 3.98502 11.7305C4.89865 12.1089 5.90398 12.208 6.87389 12.015C7.84379 11.8221 8.73471 11.3459 9.43397 10.6466C10.1332 9.94738 10.6094 9.05647 10.8024 8.08656C10.9953 7.11666 10.8963 6.11132 10.5178 5.19769C10.1394 4.28406 9.49853 3.50317 8.67629 2.95376C7.85404 2.40436 6.88734 2.11111 5.89844 2.11111H1.73177M1.73177 2.11111L2.84288 1M1.73177 2.11111L2.84288 3.22222"
        stroke="#F1F1F1"
        strokeWidth="0.833333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5651 5H5.45399C5.30665 5 5.16534 5.05853 5.06116 5.16272C4.95697 5.26691 4.89844 5.40821 4.89844 5.55556V6.38889C4.89844 6.53623 4.95697 6.67754 5.06116 6.78173C5.16534 6.88591 5.30665 6.94444 5.45399 6.94444H6.00955C6.15689 6.94444 6.2982 7.00298 6.40239 7.10716C6.50657 7.21135 6.5651 7.35266 6.5651 7.5V8.33333C6.5651 8.48067 6.50657 8.62198 6.40239 8.72617C6.2982 8.83036 6.15689 8.88889 6.00955 8.88889H4.89844"
        stroke="#F1F1F1"
        strokeWidth="0.833333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
PlayerBackIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PlayerBackIcon;
