import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const GenerateStoryIcon = ({
  size = ICON_SIZE.EXTRA_LARGE,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2168_7088)">
        <path
          d="M44.3021 30.1533C43.6418 30.1533 43.1067 30.6885 43.1067 31.3488V41.963C43.1043 43.943 41.5003 45.5475 39.5203 45.5494H5.97724C3.99728 45.5475 2.39323 43.943 2.3909 41.963V10.8109C2.39323 8.83137 3.99728 7.22685 5.97724 7.22452H16.5915C17.2518 7.22452 17.787 6.68937 17.787 6.02907C17.787 5.36924 17.2518 4.83362 16.5915 4.83362H5.97724C2.67762 4.83735 0.00373578 7.51124 0 10.8109V41.9635C0.00373578 45.2631 2.67762 47.937 5.97724 47.9407H39.5203C42.8199 47.937 45.4938 45.2631 45.4976 41.9635V31.3488C45.4976 30.6885 44.9624 30.1533 44.3021 30.1533Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M31.79 18.3055C36.774 18.3055 40.82 22.3515 40.82 27.3355C40.82 22.3515 44.866 18.3055 49.85 18.3055C44.866 18.3055 40.82 14.2595 40.82 9.27551C40.82 14.2595 36.774 18.3055 31.79 18.3055Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19.75 25.8298C23.0722 25.8298 25.77 28.5276 25.77 31.8498C25.77 28.5276 28.4678 25.8298 31.79 25.8298C28.4678 25.8298 25.77 23.132 25.77 19.8098C25.77 23.132 23.0722 25.8298 19.75 25.8298Z"
          fill={color}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M22.7598 7.76988C26.082 7.76988 28.7798 10.4677 28.7798 13.7899C28.7798 10.4677 31.4776 7.76988 34.7998 7.76988C31.4776 7.76988 28.7798 5.07208 28.7798 1.74988C28.7798 5.07208 26.082 7.76988 22.7598 7.76988Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_2168_7088">
          <rect width="48" height="48" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
GenerateStoryIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default GenerateStoryIcon;
