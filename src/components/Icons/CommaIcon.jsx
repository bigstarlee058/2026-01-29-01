import PropTypes from 'prop-types';

const CommaIcon = ({ width = '4', height = '5', color = '#C7CED1' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 26 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.698 12.119c0 3.359-0.817 6.536-2.451 9.532s-3.994 5.447-7.081 7.353c-3.087 1.906-6.809 2.905-11.166 2.996v-5.719c3.904-0.272 7.081-1.498 9.532-3.677 2.542-2.088 3.904-4.721 4.085-7.898-0.545 0.272-1.089 0.454-1.634 0.545-0.454 0.091-0.953 0.136-1.498 0.136-2.179 0-3.994-0.726-5.447-2.179-1.362-1.543-2.043-3.313-2.043-5.311 0-2.451 0.772-4.357 2.315-5.719 1.634-1.452 3.586-2.179 5.855-2.179 3.177 0 5.538 1.135 7.081 3.404 1.634 2.179 2.451 5.084 2.451 8.715z"
        fill={color}
      />
    </svg>
  );
};

CommaIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default CommaIcon;
