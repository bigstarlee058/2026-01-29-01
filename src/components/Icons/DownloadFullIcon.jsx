import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DownloadFullIcon = ({ size = ICON_SIZE.MEDIUM, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5V16M12 16L8 12M12 16L16 12"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(6.5, 17)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.423077 0.926941C0.656737 0.926941 0.846154 1.11638 0.846154 1.35002V2.41617C0.846154 3.06155 1.37217 3.58952 2.02513 3.58952H8.97488C9.62784 3.58952 10.1538 3.06155 10.1538 2.41617V1.35002C10.1538 1.11638 10.3432 0.926941 10.5769 0.926941C10.8106 0.926941 11 1.11638 11 1.35002V2.41617C11 3.53079 10.0932 4.43567 8.97488 4.43567H2.02513C0.906796 4.43567 0 3.53079 0 2.41617V1.35002C0 1.11638 0.189417 0.926941 0.423077 0.926941Z"
          fill={color}
        />
      </g>
    </svg>
  );
};

DownloadFullIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default DownloadFullIcon; 