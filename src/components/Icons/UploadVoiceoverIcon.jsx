import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const UploadVoiceoverIcon = ({ size = ICON_SIZE.LARGE, color = 'rgba(255, 255, 255, 0.4)' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#fff" opacity="0.4" d="M16.004 22.609c-0.68 0-1.231-0.551-1.231-1.231v-19.545c0-0.68 0.551-1.231 1.231-1.231s1.231 0.551 1.231 1.231v19.545c0 0.68-0.551 1.231-1.231 1.231z"></path>
      <path fill="#fff" opacity="0.4" d="M23.359 8.295c-0.48 0.481-1.259 0.482-1.74 0.002l-5.613-5.598-5.613 5.598c-0.481 0.48-1.261 0.479-1.741-0.002s-0.479-1.261 0.002-1.741l6.021-6.005c0-0-0 0 0 0 0.742-0.741 1.911-0.703 2.631-0.028 0.009 0.009 0.018 0.017 0.027 0.026l6.023 6.006c0.481 0.48 0.482 1.259 0.002 1.741z"></path>
      <path fill="#fff" opacity="0.4" d="M1.231 20.172c0.68 0 1.231 0.551 1.231 1.231v3.102c0 1.877 1.53 3.413 3.43 3.413h20.218c1.899 0 3.43-1.536 3.43-3.413v-3.102c0-0.68 0.551-1.231 1.231-1.231s1.231 0.551 1.231 1.231v3.102c0 3.243-2.638 5.875-5.891 5.875h-20.218c-3.253 0-5.891-2.632-5.891-5.875v-3.102c0-0.68 0.551-1.231 1.231-1.231z"></path>
    </svg>
  );
};

UploadVoiceoverIcon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
};

export default UploadVoiceoverIcon;
