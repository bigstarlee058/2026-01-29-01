import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CheckedIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.74943 9.43273L3.72527 7.40856C3.6162 7.29949 3.46827 7.23822 3.31402 7.23822C3.15977 7.23822 3.01184 7.29949 2.90277 7.40856C2.7937 7.51763 2.73242 7.66556 2.73242 7.81981C2.73242 7.89619 2.74747 7.97182 2.77669 8.04238C2.80592 8.11294 2.84876 8.17705 2.90277 8.23106L5.3411 10.6694C5.5686 10.8969 5.9361 10.8969 6.1636 10.6694L12.3353 4.49773C12.4443 4.38866 12.5056 4.24073 12.5056 4.08648C12.5056 3.93223 12.4443 3.7843 12.3353 3.67523C12.2262 3.56616 12.0783 3.50488 11.924 3.50488C11.7698 3.50488 11.6218 3.56616 11.5128 3.67523L5.74943 9.43273Z"
        fill={color}
      />
    </svg>
  );
};
CheckedIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CheckedIcon;
