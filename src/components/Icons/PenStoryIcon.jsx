import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PenStoryIcon = ({ size = ICON_SIZE.SMALL, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask
        id="mask0_19133_25560"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="16"
        height="16"
      >
        <path d="M0 9.53674e-07H16V16H0V9.53674e-07Z" fill="white" />
      </mask>
      <g mask="url(#mask0_19133_25560)">
        <path
          d="M10.5123 13.0818H5.48438V14.7578H10.5123V13.0818Z"
          stroke={color}
          strokeWidth="0.697207"
          strokeMiterlimit="10"
        />
        <path
          d="M9.67637 13.0859C9.67637 11.4467 10.1616 9.81622 11.0709 8.45228L11.3523 8.03007L8.00039 1.76192L4.64844 8.03007L4.92989 8.45228C5.83919 9.81622 6.32442 11.4467 6.32442 13.0859"
          stroke={color}
          strokeWidth="0.697207"
          strokeMiterlimit="10"
        />
        <path
          d="M8.84004 8.02139C8.84004 8.48418 8.46484 8.85938 8.00205 8.85938C7.53926 8.85938 7.16406 8.48418 7.16406 8.02139C7.16406 7.55859 7.53926 7.1834 8.00205 7.1834C8.46484 7.1834 8.84004 7.55859 8.84004 8.02139Z"
          stroke={color}
          strokeWidth="0.697207"
          strokeMiterlimit="10"
        />
        <path
          d="M8 1.75733V7.1875"
          stroke={color}
          strokeWidth="0.697207"
          strokeMiterlimit="10"
        />
      </g>
    </svg>
  );
};

PenStoryIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default PenStoryIcon;
