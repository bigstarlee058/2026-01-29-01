import PropTypes from 'prop-types';

const DashIcon = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M141.568 27.776h-141.568v-27.776h141.568v27.776z"
        fill={color}
      />
    </svg>
  );
};

DashIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default DashIcon;
