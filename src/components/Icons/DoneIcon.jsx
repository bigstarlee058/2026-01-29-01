import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DoneIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.5 21C7.8 21 4 17.2 4 12.5C4 7.8 7.8 4 12.5 4C17.2 4 21 7.8 21 12.5C21 17.2 17.2 21 12.5 21ZM12.5 5C8.35 5 5 8.35 5 12.5C5 16.65 8.35 20 12.5 20C16.65 20 20 16.65 20 12.5C20 8.35 16.65 5 12.5 5Z"
        fill={color}
      />
      <path
        d="M11.4984 16.2004L7.14844 11.8504L7.84844 11.1504L11.4984 14.8004L17.1484 9.15039L17.8484 9.85039L11.4984 16.2004Z"
        fill={color}
      />
    </svg>
  );
};
DoneIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default DoneIcon;
