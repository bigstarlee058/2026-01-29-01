import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const TypographyIcon = ({
  size = ICON_SIZE.MEDIUM,
  color = '#F1F1F1',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 29 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_typography)">
        <path 
          d="M11.226 21.443h2.556M13.781 21.443h2.556M13.781 21.443v-13.889M13.781 7.555h-5.667v1.778M13.781 7.555h5.667v1.778"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_typography">
          <rect
            width="16"
            height="16"
            fill="white"
            transform="translate(6.5 6.5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
TypographyIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default TypographyIcon;
