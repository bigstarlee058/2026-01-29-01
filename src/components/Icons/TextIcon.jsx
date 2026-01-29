import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const TextIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 3.33203L8 12.6654"
        stroke={color}
        strokeWidth="1.38367"
        strokeLinecap="round"
      />
      <path
        d="M10 13.332H6"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
      />
      <path
        d="M12 4L12 2.66667"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
      />
      <path
        d="M4 4L4 2.66667"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
      />
      <path
        d="M12 2.66602L4 2.66602"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
      />
    </svg>
  );
};
TextIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default TextIcon;
