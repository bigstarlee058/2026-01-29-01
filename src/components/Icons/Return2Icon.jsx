import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const Return2Icon = ({ size = ICON_SIZE.LARGE, color = 'white' }) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.67475 1C9.42527 1 11.7231 2.96739 12.2395 5.56775L13.3182 4.21933L14 4.76497L12.2539 6.94758C12.1688 7.05366 12.0422 7.11127 11.913 7.11127C11.8471 7.11127 11.7803 7.09642 11.7179 7.06544L9.09875 5.75587L9.48943 4.97493L11.414 5.93703C11.057 3.63918 9.07125 1.87303 6.67475 1.87303C4.02725 1.87303 1.87303 4.02725 1.87303 6.67475C1.87303 9.32226 4.02725 11.4765 6.67475 11.4765V12.3495C3.54579 12.3495 1 9.80372 1 6.67475C1 3.54579 3.54579 1 6.67475 1Z"
        fill={color}
        fillOpacity="0.6"
      />
    </svg>
  );
};
Return2Icon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default Return2Icon;
