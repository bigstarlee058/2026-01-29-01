import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ChosenIcon = ({
  size = ICON_SIZE.SMALL,
  color = 'var(--primary-icon-color)',
}) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 7C0 3.13401 3.13401 0 7 0C10.866 0 14 3.13401 14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7Z"
        fill="#D3F85A"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.351 5.0128C10.5564 5.22791 10.5484 5.56876 10.3333 5.77409L6.38459 9.54332C6.17652 9.74194 5.84908 9.74194 5.641 9.54332L3.66667 7.6587C3.45155 7.45337 3.44363 7.11252 3.64897 6.89741C3.8543 6.6823 4.19515 6.67437 4.41026 6.87971L6.0128 8.40943L9.58975 4.99509C9.80486 4.78976 10.1457 4.79768 10.351 5.0128Z"
        fill="#192C36"
      />
    </svg>
  );
};
ChosenIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ChosenIcon;
