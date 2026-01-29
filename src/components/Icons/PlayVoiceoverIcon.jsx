import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PlayVoiceoverIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        style={{ fill: color }}
        d="M28.039 12.42l-19.874-11.213c-0.649-0.371-1.385-0.563-2.132-0.558s-1.48 0.209-2.123 0.59c-0.627 0.358-1.147 0.876-1.509 1.501s-0.552 1.334-0.55 2.056v22.425c-0.001 0.722 0.189 1.431 0.55 2.056s0.882 1.143 1.509 1.501c0.643 0.381 1.376 0.584 2.123 0.59s1.483-0.187 2.132-0.557l19.874-11.212c0.641-0.355 1.175-0.875 1.547-1.507s0.568-1.351 0.568-2.083c0-0.733-0.196-1.452-0.568-2.083s-0.906-1.152-1.547-1.507z"
      />
    </svg>
  );
};

PlayVoiceoverIcon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
};

export default PlayVoiceoverIcon;
