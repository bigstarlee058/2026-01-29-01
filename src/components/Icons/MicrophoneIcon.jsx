import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const MicrophoneIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 25 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        opacity="0.4"
        d="M12.444 22.667c-3.676 0-6.667-2.991-6.667-6.667v-8.889c0-3.676 2.991-6.667 6.667-6.667s6.667 2.991 6.667 6.667v8.889c0 3.676-2.991 6.667-6.667 6.667zM12.444 2.667c-2.451 0-4.444 1.994-4.444 4.444v8.889c0 2.45 1.994 4.444 4.444 4.444s4.444-1.994 4.444-4.444v-8.889c0-2.451-1.994-4.444-4.444-4.444zM22.444 13.778c-0.614 0-1.111 0.498-1.111 1.111v1.111c0 4.901-3.988 8.889-8.889 8.889s-8.889-3.988-8.889-8.889v-1.111c0-0.614-0.498-1.111-1.111-1.111s-1.111 0.498-1.111 1.111v1.111c0 5.752 4.393 10.495 10 11.055v2.279h-2.222c-0.614 0-1.111 0.497-1.111 1.111s0.498 1.111 1.111 1.111h6.667c0.614 0 1.111-0.497 1.111-1.111s-0.497-1.111-1.111-1.111h-2.222v-2.279c5.607-0.559 10-5.303 10-11.055v-1.111c0-0.614-0.497-1.111-1.111-1.111z"
      />
    </svg>
  );
};

MicrophoneIcon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
};

export default MicrophoneIcon;
