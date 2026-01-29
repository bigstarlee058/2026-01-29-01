import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AddUploadMusicButton = ({ size = ICON_SIZE.MEDIUM, color = '#A2A2A2' }) => {
  return (
    <svg width={size} height="42" viewBox="0 0 98 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="96" height="40" rx="20" fill={color} fillOpacity="0.1"/>
      <rect x="1" y="1" width="96" height="40" rx="20" stroke={color} strokeDasharray="4 4"/>
      <path d="M52.8571 21.6429H49.6429V24.8571C49.6429 25.0276 49.5751 25.1912 49.4546 25.3117C49.334 25.4323 49.1705 25.5 49 25.5C48.8295 25.5 48.666 25.4323 48.5454 25.3117C48.4249 25.1912 48.3571 25.0276 48.3571 24.8571V21.6429H45.1429C44.9724 21.6429 44.8088 21.5751 44.6883 21.4546C44.5677 21.334 44.5 21.1705 44.5 21C44.5 20.8295 44.5677 20.666 44.6883 20.5454C44.8088 20.4249 44.9724 20.3571 45.1429 20.3571H48.3571V17.1429C48.3571 16.9724 48.4249 16.8088 48.5454 16.6883C48.666 16.5677 48.8295 16.5 49 16.5C49.1705 16.5 49.334 16.5677 49.4546 16.6883C49.5751 16.8088 49.6429 16.9724 49.6429 17.1429V20.3571H52.8571C53.0276 20.3571 53.1912 20.4249 53.3117 20.5454C53.4323 20.666 53.5 20.8295 53.5 21C53.5 21.1705 53.4323 21.334 53.3117 21.4546C53.1912 21.5751 53.0276 21.6429 52.8571 21.6429Z" fill="#C7CED1"/>
    </svg>
  );
};

AddUploadMusicButton.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default AddUploadMusicButton;

