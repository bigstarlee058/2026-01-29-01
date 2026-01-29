import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PauseIcon = ({ size = ICON_SIZE.LARGE, color = '#C7CED1' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" fill={color} />
      <rect x="14" y="4" width="4" height="16" fill={color} />
    </svg>
  );
};
PauseIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PauseIcon;
