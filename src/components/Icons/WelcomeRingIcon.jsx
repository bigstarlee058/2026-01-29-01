import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const WelcomeRingIcon = ({ size = ICON_SIZE.LARGE, color = '#F1F1F1' }) => {
  return (
    <svg
      width="83"
      height="59"
      viewBox="0 0 83 59"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g style={{ mixBlendMode: 'screen' }} filter="url(#filter0_f_11259_5573)">
        <ellipse
          cx="40.6673"
          cy="29.519"
          rx="29.9784"
          ry="6.35462"
          transform="rotate(-37.5222 40.6673 29.519)"
          stroke="url(#paint0_linear_11259_5573)"
          strokeWidth="1.49389"
        />
      </g>
      <g filter="url(#filter1_d_11259_5573)">
        <path
          d="M34.2696 14.8271C34.839 14.638 35.4446 14.9018 35.7204 15.468C38.2558 20.4855 39.2194 20.9813 44.4876 19.8721C45.0963 19.7489 45.7097 20.089 45.8986 20.6579C46.0902 21.2346 45.8048 21.8557 45.2484 22.1369C40.437 24.5154 40.0169 25.3391 40.8496 30.9133C40.9409 31.532 40.6292 32.1004 40.0678 32.2869C39.4905 32.4786 38.8929 32.2122 38.6012 31.6511C36.0842 26.6363 35.1207 26.1406 29.8604 27.2471C29.2332 27.3676 28.6329 27.0407 28.4388 26.4561C28.2499 25.8872 28.5195 25.2714 29.0916 24.9849C33.9058 22.588 34.3205 21.7748 33.4721 16.2059C33.3939 15.574 33.7161 15.0109 34.2696 14.8271Z"
          fill="#D3F85A"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_11259_5573"
          x="15.1353"
          y="9.1337"
          width="51.0634"
          height="40.7706"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="0.34593"
            result="effect1_foregroundBlur_11259_5573"
          />
        </filter>
        <filter
          id="filter1_d_11259_5573"
          x="20.4333"
          y="8.88946"
          width="33.4704"
          height="33.4735"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2.06869" />
          <feGaussianBlur stdDeviation="3.97282" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.220722 0 0 0 0 0.210451 0 0 0 0 0.241667 0 0 0 0.6 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_11259_5573"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_11259_5573"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_11259_5573"
          x1="70.9833"
          y1="24.8586"
          x2="70.923"
          y2="33.2558"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
WelcomeRingIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default WelcomeRingIcon;
