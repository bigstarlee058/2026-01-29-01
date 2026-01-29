import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const InIcon = ({ size = ICON_SIZE.REGULAR, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.63281 6.33301H7.23281M3.63281 6.33301C3.63281 6.01801 4.53011 5.42941 4.75781 5.20801M3.63281 6.33301C3.63281 6.64801 4.53011 7.23661 4.75781 7.45801M10.8328 3.63301C10.8328 3.00301 10.8328 2.68801 10.71 2.44726C10.6022 2.23554 10.4302 2.06336 10.2186 1.95541C9.97781 1.83301 9.66281 1.83301 9.03281 1.83301C8.40281 1.83301 8.08781 1.83301 7.84706 1.95541C7.63544 2.06336 7.46342 2.23554 7.35566 2.44726C7.23281 2.68801 7.23281 3.00301 7.23281 3.63301V9.03301C7.23281 9.66301 7.23281 9.97801 7.35566 10.2188C7.4635 10.4303 7.63551 10.6023 7.84706 10.7102C8.08781 10.833 8.40281 10.833 9.03281 10.833C9.66281 10.833 9.97781 10.833 10.2186 10.7102C10.4301 10.6023 10.6021 10.4303 10.71 10.2188C10.8328 9.97801 10.8328 9.66301 10.8328 9.03301V3.63301Z"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="0.675"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.53203 10.833C3.47948 10.833 2.95343 10.833 2.56913 10.5914C2.36876 10.4657 2.19927 10.2965 2.07323 10.0964C1.83203 9.71116 1.83203 9.18511 1.83203 8.13301V4.53301C1.83203 3.48046 1.83203 2.95441 2.07323 2.57011C2.19916 2.36964 2.36866 2.20014 2.56913 2.07421C2.95343 1.83301 3.47903 1.83301 4.53203 1.83301"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="0.675"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
InIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default InIcon;
