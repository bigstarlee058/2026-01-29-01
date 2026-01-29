import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const RedoIcon = ({ size = ICON_SIZE.MEDIUM, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.0026 10.8337L16.3359 7.50033M16.3359 7.50033L13.0026 4.16699M16.3359 7.50033H7.16927C6.28522 7.50033 5.43737 7.85151 4.81225 8.47664C4.18713 9.10176 3.83594 9.9496 3.83594 10.8337C3.83594 11.7177 4.18713 12.5656 4.81225 13.1907C5.43737 13.8158 6.28522 14.167 7.16927 14.167H8.0026"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
RedoIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default RedoIcon;
