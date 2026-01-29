import PropTypes from 'prop-types';

const ExclamationMark = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 7 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.207 21.388h-2.085l-0.551-21.166h3.226l-0.59 21.166zM5.702 26.227c0 0.708-0.249 1.298-0.747 1.77-0.472 0.446-1.062 0.669-1.77 0.669s-1.311-0.223-1.81-0.669c-0.472-0.472-0.708-1.062-0.708-1.77 0-0.734 0.236-1.325 0.708-1.77 0.498-0.472 1.102-0.708 1.81-0.708 0.734 0 1.338 0.236 1.81 0.708 0.472 0.446 0.708 1.036 0.708 1.77z"
        fill={color}
      />
    </svg>
  );
};

ExclamationMark.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default ExclamationMark;
