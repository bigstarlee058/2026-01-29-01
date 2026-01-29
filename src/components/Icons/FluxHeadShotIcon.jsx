import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FluxHeadShotIcon = ({ size = ICON_SIZE.LARGE, color = '#D3F85A' }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.1581 11.2808L11.2537 11.2808C10.768 12.0372 10.1205 12.6774 9.35938 13.1562H13.1581V14.562L16.0018 12.2188L13.1581 9.875V11.2808Z"
        fill={color}
      />
      <path
        d="M6.16059 13.1545C8.99162 13.1352 11.2812 10.8357 11.2812 8C11.2812 5.31059 9.22144 3.1045 6.59375 2.86738V1.4375L3.78125 3.78125L6.59375 6.12453V4.76612C8.17969 4.99603 9.40625 6.35141 9.40625 8C9.40625 9.80909 7.93409 11.2812 6.125 11.2812H0V13.1562H6.16272C6.16178 13.1557 6.1615 13.1551 6.16059 13.1545Z"
        fill={color}
      />
      <path
        d="M3.83591 10.3431C3.22553 9.74684 2.84375 8.91784 2.84375 7.99934C2.84375 6.90987 3.38334 5.94947 4.20325 5.35238L2.73022 4.125C1.65259 5.07006 0.96875 6.45344 0.96875 7.99934C0.96875 8.84637 1.18625 9.63809 1.54816 10.3431H3.83591Z"
        fill={color}
      />
    </svg>
  );
};
FluxHeadShotIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FluxHeadShotIcon;
