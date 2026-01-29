import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ObjectRemovalIcon = ({ size = ICON_SIZE.LARGE, color = '#D3F85A' }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7718_69644)">
        <path
          d="M6.64931 0.0644531L0.46875 3.63283L6.64931 7.20117L12.8299 3.63283L6.64931 0.0644531Z"
          fill={color}
        />
        <path
          d="M13.0701 10.0762C11.4548 10.0762 10.1406 11.3903 10.1406 13.0056C10.1406 14.6209 11.4548 15.935 13.0701 15.935C14.6854 15.935 15.9995 14.6209 15.9995 13.0056C15.9995 11.3903 14.6854 10.0762 13.0701 10.0762ZM14.7481 13.4744H11.3921V12.5369H14.7481V13.4744Z"
          fill={color}
        />
        <path
          d="M6.18056 8.01369L0 4.44531V11.582L6.18056 15.1504V8.01369Z"
          fill={color}
        />
        <path
          d="M9.20272 13.0059C9.20272 10.8737 10.9374 9.139 13.0697 9.139C13.1463 9.139 13.2223 9.1415 13.2978 9.14591V4.44531L7.11719 8.01369V15.1504L9.30422 13.8877C9.23791 13.6044 9.20272 13.3092 9.20272 13.0059Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_7718_69644">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
ObjectRemovalIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ObjectRemovalIcon;
