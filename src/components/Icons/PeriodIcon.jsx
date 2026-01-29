import PropTypes from 'prop-types';

const PeriodIcon = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M27.811 16.094c0 3.402-1.134 6.236-3.402 8.504-2.142 2.268-4.976 3.402-8.504 3.402-3.402 0-6.236-1.134-8.504-3.402s-3.402-5.102-3.402-8.504c0-3.528 1.134-6.425 3.402-8.693s5.102-3.402 8.504-3.402c3.528 0 6.362 1.134 8.504 3.402 2.268 2.268 3.402 5.165 3.402 8.693z"
        fill={color}
      />
    </svg>
  );
};

PeriodIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default PeriodIcon;
