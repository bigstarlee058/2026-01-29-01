import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DislikeIcon = ({ size = ICON_SIZE.EXTRA_SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.60732 8.10541H11.8349C13.3201 8.10541 11.3892 1.74999 10.3252 1.74999H3.02132C2.87351 1.74875 2.73126 1.80623 2.62582 1.90982C2.52038 2.0134 2.46037 2.15461 2.45898 2.30241V7.77699C2.45898 7.97941 2.57157 8.16549 2.75182 8.26232C3.95465 8.90749 5.36573 9.43599 6.06398 10.6709L6.81065 11.9927C6.85517 12.0713 6.91982 12.1365 6.99796 12.1817C7.07609 12.227 7.16488 12.2505 7.25515 12.25C9.11015 12.25 8.56007 9.54916 8.30807 8.47582C8.29793 8.43113 8.29805 8.38473 8.30842 8.34009C8.31879 8.29545 8.33913 8.25375 8.36793 8.2181C8.39673 8.18245 8.43323 8.1538 8.47469 8.13428C8.51615 8.11476 8.5615 8.10489 8.60732 8.10541Z"
        stroke={color}
        strokeWidth="0.875"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
DislikeIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default DislikeIcon;
