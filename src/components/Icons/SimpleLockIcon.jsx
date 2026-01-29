import PropTypes from 'prop-types';

const SimpleLockIcon = ({ size = '24px', color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.66536 7.33333H2.9987C2.55667 7.33333 2.13275 7.50893 1.82019 7.82149C1.50763 8.13405 1.33203 8.55797 1.33203 9V14.8333C1.33203 15.2754 1.50763 15.6993 1.82019 16.0118C2.13275 16.3244 2.55667 16.5 2.9987 16.5H12.9987C13.4407 16.5 13.8646 16.3244 14.1772 16.0118C14.4898 15.6993 14.6654 15.2754 14.6654 14.8333V9C14.6654 8.55797 14.4898 8.13405 14.1772 7.82149C13.8646 7.50893 13.4407 7.33333 12.9987 7.33333H11.332M4.66536 7.33333V4.83333C4.66536 3.94928 5.01655 3.10143 5.64168 2.47631C6.2668 1.85119 7.11464 1.5 7.9987 1.5C8.88275 1.5 9.7306 1.85119 10.3557 2.47631C10.9808 3.10143 11.332 3.94928 11.332 4.83333V7.33333M4.66536 7.33333H11.332M7.9987 10.6667V13.1667"
        stroke={color}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

SimpleLockIcon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
};

export default SimpleLockIcon;