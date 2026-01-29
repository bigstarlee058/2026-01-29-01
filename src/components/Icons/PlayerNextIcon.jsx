import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PlayerNextIcon = ({ size = ICON_SIZE.LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width="12"
      height="13"
      viewBox="0 0 12 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 7.11111C10.5 8.10002 10.2068 9.06672 9.65735 9.88896C9.10794 10.7112 8.32705 11.3521 7.41342 11.7305C6.49979 12.1089 5.49446 12.208 4.52455 12.015C3.55465 11.8221 2.66373 11.3459 1.96447 10.6466C1.26521 9.94738 0.789002 9.05647 0.596076 8.08656C0.40315 7.11666 0.502166 6.11132 0.880605 5.19769C1.25904 4.28406 1.89991 3.50317 2.72215 2.95376C3.5444 2.40436 4.5111 2.11111 5.5 2.11111H9.66667M9.66667 2.11111L8.55556 1M9.66667 2.11111L8.55556 3.22222"
        stroke={color}
        strokeWidth="0.833333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.16667 5H5.05556C4.90821 5 4.76691 5.05853 4.66272 5.16272C4.55853 5.26691 4.5 5.40821 4.5 5.55556V6.38889C4.5 6.53623 4.55853 6.67754 4.66272 6.78173C4.76691 6.88591 4.90821 6.94444 5.05556 6.94444H5.61111C5.75845 6.94444 5.89976 7.00298 6.00395 7.10716C6.10813 7.21135 6.16667 7.35266 6.16667 7.5V8.33333C6.16667 8.48067 6.10813 8.62198 6.00395 8.72617C5.89976 8.83036 5.75845 8.88889 5.61111 8.88889H4.5"
        stroke={color}
        strokeWidth="0.833333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
PlayerNextIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PlayerNextIcon;
