import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const EffectIcon = ({ size = ICON_SIZE.SMALL, color = '#3AFCEA' }) => {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.48" filter="url(#filter0_f_9964_114118)">
        <path
          d="M42.0016 11.7583C58.2387 11.7583 71.4016 6.49315 71.4016 -0.00171852C71.4016 -6.49659 58.2387 -11.7617 42.0016 -11.7617C25.7644 -11.7617 12.6016 -6.49659 12.6016 -0.00171852C12.6016 6.49315 25.7644 11.7583 42.0016 11.7583Z"
          fill={color}
          fillOpacity="0.8"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_9964_114118"
          x="2.14822"
          y="-22.2151"
          width="79.7067"
          height="44.4267"
          filterUnits="userSpaceOnUse"
          colorInterpolation-filters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="5.22667"
            result="effect1_foregroundBlur_9964_114118"
          />
        </filter>
      </defs>
    </svg>
  );
};

EffectIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  bgColor: PropTypes.string,
};

export default EffectIcon;
