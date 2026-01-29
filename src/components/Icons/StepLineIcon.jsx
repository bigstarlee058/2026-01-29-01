import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const StepLineIcon = ({ size = ICON_SIZE.LARGE, color = '#ABB5BA' }) => {
  return (
    <svg
      width="2"
      height={size}
      viewBox="0 0 2 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="1" y1="2.18555e-08" x2="0.999999" y2="24" stroke={color} />
    </svg>
  );
};
StepLineIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default StepLineIcon;
