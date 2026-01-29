import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ClockIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'white',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8C6.20533 8 8 6.20533 8 4C8 1.79467 6.20535 0 4 0C1.79465 0 0 1.79467 0 4C0 6.20533 1.79467 8 4 8ZM4 0.533324C5.91199 0.533324 7.46668 2.08799 7.46668 4C7.46668 5.91201 5.91201 7.46668 4 7.46668C2.08799 7.46668 0.533324 5.91201 0.533324 4C0.533324 2.08799 2.08801 0.533324 4 0.533324Z"
        fill={color}
        fillOpacity="0.3"
      />
      <path
        d="M5.16771 5.27428C5.21705 5.31427 5.2757 5.33295 5.33437 5.33295C5.41304 5.33295 5.49037 5.29828 5.54236 5.23295C5.63437 5.11828 5.61568 4.95028 5.50103 4.85827L4.2677 3.8716V1.86627C4.2677 1.7196 4.14771 1.59961 4.00104 1.59961C3.85437 1.59961 3.73438 1.7196 3.73438 1.86627V3.99961C3.73438 4.08095 3.77172 4.15695 3.83437 4.2076L5.16771 5.27428Z"
        fill={color}
        fillOpacity="0.3"
      />
    </svg>
  );
};

ClockIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default ClockIcon;
