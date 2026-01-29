import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';


const CheckedBtnIcon = ({ size = '14px', color = 'var(--accent-color)' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.933 1.279c7.835 0 14.188 6.352 14.188 14.188s-6.352 14.188-14.188 14.188c-7.835 0-14.188-6.352-14.188-14.188s6.352-14.188 14.188-14.188z"
        fill="none"
        stroke="transparent"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="1.4933"
      />
      <path
        d="M22.082 11.222c0.438 0.459 0.421 1.186-0.038 1.624l-8.424 8.041c-0.444 0.424-1.142 0.424-1.586 0l-4.212-4.021c-0.459-0.438-0.476-1.165-0.038-1.624s1.165-0.476 1.624-0.038l3.419 3.263 7.631-7.284c0.459-0.438 1.186-0.421 1.624 0.038z"
        fill={color}
      />
    </svg>
  );
};

CheckedBtnIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default CheckedBtnIcon;
