import PropTypes from 'prop-types';

const DoubleQuotationMarks = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.096 32h-9.069l-1.027-32h11.294l-1.198 32zM33.54 32h-9.070l-1.027-32h11.123l-1.027 32z"
        fill={color}
      />
    </svg>
  );
};

DoubleQuotationMarks.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default DoubleQuotationMarks;
