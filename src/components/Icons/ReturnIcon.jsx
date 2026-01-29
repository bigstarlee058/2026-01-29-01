import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ReturnIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'white',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.32525 1C5.57473 1 3.2769 2.96739 2.76048 5.56775L1.68184 4.21933L1 4.76497L2.74609 6.94758C2.8312 7.05366 2.95779 7.11127 3.08701 7.11127C3.15292 7.11127 3.2197 7.09642 3.28213 7.06544L5.90125 5.75587L5.51057 4.97493L3.58596 5.93703C3.94303 3.63918 5.92875 1.87303 8.32525 1.87303C10.9728 1.87303 13.127 4.02725 13.127 6.67475C13.127 9.32226 10.9728 11.4765 8.32525 11.4765V12.3495C11.4542 12.3495 14 9.80372 14 6.67475C14 3.54579 11.4542 1 8.32525 1Z"
        fill={color}
        fillOpacity="0.6"
      />
    </svg>
  );
};
ReturnIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ReturnIcon;
