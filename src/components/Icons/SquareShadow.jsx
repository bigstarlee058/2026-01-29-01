import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SquareShadow = ({ size = ICON_SIZE.SMALL, color = '#ABB5BA' }) => {
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
        d="M28 4v-4h-28v28h4v4h28v-28h-4zM26 26h-24v-24h24v24z"
      />
    </svg>
  );
};

SquareShadow.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default SquareShadow;
