import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AvatarGenerationIcon = ({
  size = ICON_SIZE.LARGE,
  color = '#D3F85A',
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="4.5" fill="#11242E" />
      <path
        d="M17.6569 6.34316C16.1458 4.83216 14.1369 4 12 4C9.86312 4 7.85416 4.83216 6.34313 6.34316C4.83216 7.85416 4 9.86312 4 12C4 14.1369 4.83216 16.1458 6.34313 17.6568C7.85416 19.1678 9.86312 20 12 20C14.1369 20 16.1458 19.1678 17.6569 17.6568C19.1678 16.1458 20 14.1369 20 12C20 9.86312 19.1678 7.85416 17.6569 6.34316ZM12 19.0625C9.91034 19.0625 8.03009 18.1499 6.73587 16.7028C7.53822 14.5757 9.59212 13.0625 12 13.0625C10.4467 13.0625 9.1875 11.8033 9.1875 10.25C9.1875 8.69669 10.4467 7.4375 12 7.4375C13.5533 7.4375 14.8125 8.69669 14.8125 10.25C14.8125 11.8033 13.5533 13.0625 12 13.0625C14.4079 13.0625 16.4618 14.5757 17.2641 16.7028C15.9699 18.1499 14.0897 19.0625 12 19.0625Z"
        fill={color}
      />
    </svg>
  );
};
AvatarGenerationIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default AvatarGenerationIcon;
