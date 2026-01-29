import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const BackgroundRemovalIcon = ({
  size = ICON_SIZE.SMALL,
  color = '#D3F85A',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7799_66776)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.95453 2.30821V12.9085H11.4385V14.1454C11.4385 14.3487 11.3577 14.5435 11.214 14.6875C11.0701 14.8311 10.875 14.9119 10.6717 14.9119H1.71227C1.30047 14.9198 0.937217 14.5575 0.94545 14.1454V3.07503C0.94545 2.87171 1.02625 2.67662 1.16992 2.53269C1.31389 2.38901 1.50868 2.30821 1.71227 2.30821H6.95453ZM15.0479 8.30851H11.4385V11.9181H15.0479V8.30851ZM10.8873 4.69916H7.27771V8.30851H10.8873V4.69916ZM15.0479 1.08984H11.4385V4.69916H15.0479V1.08984Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_7799_66776">
          <rect
            width="15"
            height="15"
            fill="white"
            transform="translate(0.5 0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

BackgroundRemovalIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default BackgroundRemovalIcon;
