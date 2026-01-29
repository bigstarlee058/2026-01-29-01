import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const NoneColorIcon = ({ size = ICON_SIZE.REGULAR, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        style={{ fill: `var(--color6, ${color})` }}
        opacity="0.4"
        d="M28.074 26.695l-24-24c-0.36-0.361-0.833-0.541-1.305-0.541-1.014 0-1.846 0.836-1.846 1.846 0 0.548 0.223 0.988 0.541 1.305l5.852 5.852c-1.5 2.767-2.701 5.832-2.701 8.535 0 5.608 4.546 10.154 10.154 10.154 3.080 0 5.83-1.378 7.69-3.546l3.005 3.005c0.36 0.361 0.832 0.541 1.305 0.541 1.013 0 1.846-0.836 1.846-1.846 0-0.548-0.223-0.988-0.541-1.305zM13.846 26.154c-3.054 0-5.538-2.484-5.538-5.538 0-0.51 0.413-0.923 0.923-0.923s0.923 0.414 0.923 0.923c0 2.036 1.656 3.692 3.692 3.692 0.51 0 0.923 0.414 0.923 0.923s-0.413 0.923-0.923 0.923zM24.923 19.692c0-6.462-6.84-15.047-8.308-16.515-0.808-0.808-1.254-1.024-1.846-1.024s-1.038 0.216-1.846 1.024c-0.459 0.459-1.442 1.612-2.576 3.178l14.504 14.504c0.043-0.383 0.072-0.772 0.072-1.168z"
      />
    </svg>
  );
};

NoneColorIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default NoneColorIcon;
