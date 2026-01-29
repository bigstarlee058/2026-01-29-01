import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const SlashIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'white',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.384 30.581h-11.42l14.080-29.152h11.42l-14.080 29.152z"
        fill={color}
        style={{ fill: `var(--color1, ${color})` }}
      />
    </svg>
  );
};

SlashIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default SlashIcon;
