import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const RulerIcon = ({ size = ICON_SIZE.MEDIUM, color = '#D3F85A' }) => {
  return (
    <svg
      width="122"
      height="46"
      viewBox="0 0 122 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_di_12116_140380)">
        <path
          d="M14.8543 18.1902C16.7652 13.8223 21.0806 11 25.8482 11H88.1518C92.9194 11 97.2348 13.8223 99.1457 18.1902L103 27H11L14.8543 18.1902Z"
          fill="white"
          fillOpacity="0.04"
        />
        <path
          d="M51.9315 16.1576L56.6163 20.7684C56.7185 20.8695 56.8565 20.9263 57.0003 20.9263C57.144 20.9263 57.282 20.8695 57.3842 20.7684L62.069 16.1586C62.1719 16.0576 62.3103 16.0009 62.4545 16.0009C62.5987 16.0009 62.7371 16.0576 62.84 16.1586C62.8906 16.208 62.9309 16.267 62.9584 16.3322C62.9858 16.3974 63 16.4674 63 16.5381C63 16.6088 62.9858 16.6789 62.9584 16.744C62.9309 16.8092 62.8906 16.8682 62.84 16.9176L58.1562 21.5274C57.8477 21.8303 57.4326 22 57.0003 22C56.5679 22 56.1528 21.8303 55.8443 21.5274L51.1605 16.9176C51.1097 16.8682 51.0694 16.8091 51.0418 16.7439C51.0142 16.6786 51 16.6085 51 16.5376C51 16.4668 51.0142 16.3966 51.0418 16.3314C51.0694 16.2661 51.1097 16.207 51.1605 16.1576C51.2634 16.0566 51.4018 15.9999 51.546 15.9999C51.6902 15.9999 51.8286 16.0566 51.9315 16.1576Z"
          fill={color}
          fillOpacity="0.7"
        />
      </g>
      <defs>
        <filter
          id="filter0_di_12116_140380"
          x="-289"
          y="-289"
          width="692"
          height="616"
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
          <feOffset dx="4" dy="4" />
          <feGaussianBlur stdDeviation="7.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_12116_140380"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_12116_140380"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="-8" dy="8" />
          <feGaussianBlur stdDeviation="7.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect2_innerShadow_12116_140380"
          />
        </filter>
      </defs>
    </svg>
  );
};
RulerIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default RulerIcon;
