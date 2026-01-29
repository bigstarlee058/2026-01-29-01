import PropTypes from 'prop-types';

const ApostropheIcon = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.096 32h-9.069l-1.027-32h11.294l-1.198 32z"
        fill={color}
      />
    </svg>
  );
};

ApostropheIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default ApostropheIcon;
