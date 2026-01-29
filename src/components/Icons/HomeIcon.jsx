import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const HomeIcon = ({ size = ICON_SIZE.REGULAR, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.133 19.0013C1.955 19.0013 1 18.0213 1 16.8113V8.00925C1 7.34425 1.295 6.71425 1.8 6.29925L7.667 1.48125C8.04186 1.17084 8.5133 1.00098 9 1.00098C9.4867 1.00098 9.95814 1.17084 10.333 1.48125L16.199 6.29925C16.705 6.71425 17 7.34425 17 8.00925V16.8113C17 18.0213 16.045 19.0013 14.867 19.0013H3.133Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 19.001V13.501C6.5 12.9705 6.71071 12.4618 7.08579 12.0868C7.46086 11.7117 7.96957 11.501 8.5 11.501H9.5C10.0304 11.501 10.5391 11.7117 10.9142 12.0868C11.2893 12.4618 11.5 12.9705 11.5 13.501V19.001"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
HomeIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};
export default HomeIcon;
