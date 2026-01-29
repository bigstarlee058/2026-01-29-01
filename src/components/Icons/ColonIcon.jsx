import PropTypes from 'prop-types';

const ColonIcon = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 4 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 4C3.10457 4 4 3.10457 4 2C4 0.895431 3.10457 0 2 0C0.895431 0 0 0.895431 0 2C0 3.10457 0.895431 4 2 4Z"
        fill={color}
      />
      <path
        d="M2 16C3.10457 16 4 15.1046 4 14C4 12.8954 3.10457 12 2 12C0.895431 12 0 12.8954 0 14C0 15.1046 0.895431 16 2 16Z"
        fill={color}
      />
    </svg>
  );
};

ColonIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default ColonIcon;
