import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ImportAudioIcon = ({ size = ICON_SIZE.MEDIUM, color = '#fff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.842 22.052v1.771c0 1.414 0.562 2.771 1.562 3.771s2.357 1.562 3.771 1.562h17.778c1.414 0 2.771-0.562 3.771-1.562s1.562-2.357 1.562-3.771v-1.778M17.064 21.156v-19.556M17.064 1.6l6.222 6.222M17.064 1.6l-6.222 6.222"
        stroke={color}
        strokeWidth="2.6667"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="4"
      />
    </svg>
  );
};

ImportAudioIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default ImportAudioIcon;
