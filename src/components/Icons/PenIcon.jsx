import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PenIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'white',
  opacity = '0.4',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask
        id="mask0_17961_83346"
        style={{ maskType: 'luminance' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="14"
        height="14"
      >
        <path d="M0 9.53674e-07H14V14H0V9.53674e-07Z" fill={color} />
      </mask>
      <g mask="url(#mask0_17961_83346)">
        <path
          d="M9.46094 11.9531H4.53906V13.5938H9.46094V11.9531Z"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth="0.820312"
          strokeMiterlimit="10"
        />
        <path
          d="M8.64062 11.9531C8.64062 10.3485 9.11561 8.75238 10.0057 7.41721L10.2812 7.00391L7 0.86797L3.71875 7.00391L3.99427 7.41721C4.88439 8.75238 5.35938 10.3485 5.35938 11.9531"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth="0.820312"
          strokeMiterlimit="10"
        />
        <path
          d="M7.82031 7C7.82031 7.45303 7.45303 7.82031 7 7.82031C6.54697 7.82031 6.17969 7.45303 6.17969 7C6.17969 6.54697 6.54697 6.17969 7 6.17969C7.45303 6.17969 7.82031 6.54697 7.82031 7Z"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth="0.820312"
          strokeMiterlimit="10"
        />
        <path
          d="M7 0.864063V6.17969"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth="0.820312"
          strokeMiterlimit="10"
        />
      </g>
    </svg>
  );
};

PenIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  opacity: PropTypes.string,
};

export default PenIcon;
