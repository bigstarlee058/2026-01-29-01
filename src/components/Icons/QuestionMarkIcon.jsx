import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const QuestionMarkIcon = ({
  size = ICON_SIZE.LARGE,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', margin: 'auto' }}
    >
      <path
        d="M32 40C31.4696 40 30.9609 39.7893 30.5858 39.4142C30.2107 39.0391 30 38.5304 30 38C30.1283 36.7427 30.5126 35.5251 31.1294 34.422C31.7461 33.3189 32.5821 32.3537 33.586 31.586C34.828 30.344 36 29.172 36 28C36 26.9391 35.5786 25.9217 34.8284 25.1716C34.0783 24.4214 33.0609 24 32 24C30.9391 24 29.9217 24.4214 29.1716 25.1716C28.4214 25.9217 28 26.9391 28 28C28 28.5304 27.7893 29.0391 27.4142 29.4142C27.0391 29.7893 26.5304 30 26 30C25.4696 30 24.9609 29.7893 24.5858 29.4142C24.2107 29.0391 24 28.5304 24 28C24 25.8783 24.8429 23.8434 26.3431 22.3431C27.8434 20.8429 29.8783 20 32 20C34.1217 20 36.1566 20.8429 37.6569 22.3431C39.1571 23.8434 40 25.8783 40 28C39.8717 29.2573 39.4874 30.4749 38.8706 31.578C38.2539 32.6811 37.4179 33.6463 36.414 34.414C35.172 35.656 34 36.828 34 38C34 38.5304 33.7893 39.0391 33.4142 39.4142C33.0391 39.7893 32.5304 40 32 40Z"
        fill={color}
        fillOpacity="0.6"
      />
      <path
        d="M32 46C33.1046 46 34 45.1046 34 44C34 42.8954 33.1046 42 32 42C30.8954 42 30 42.8954 30 44C30 45.1046 30.8954 46 32 46Z"
        fill={color}
        fillOpacity="0.6"
      />
    </svg>
  );
};
QuestionMarkIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default QuestionMarkIcon;
