import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const StroKeIcon = ({ size = ICON_SIZE.LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width="12"
      height="13"
      viewBox="0 0 12 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="9" width="11" height="3" rx="0.5" stroke="#F1F1F1" />
      <rect x="0.5" y="4" width="11" height="2" rx="0.5" stroke="#F1F1F1" />
      <rect x="0.5" y="1" width="11" height="1" rx="0.5" stroke="#F1F1F1" />
    </svg>
  );
};
StroKeIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default StroKeIcon;
