import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';
import ZoomOutIcon from './ZoomOutIcon';

const ZoomIcon = ({ size = ICON_SIZE.MEDIUM, color = '#9fa6a9' }) => {
  return <ZoomOutIcon size={size} color={color} />;
};

ZoomIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ZoomIcon;
