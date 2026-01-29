import PropTypes from 'prop-types';
import ICON_SIZE from 'components/Icons/IconSize';

const TransitionBackIcon = ({
  size = ICON_SIZE.SMALL,
  color = 'white',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.183709 8.56741L3.45002 11.818C3.69468 12.0615 4.0904 12.0606 4.33393 11.8159C4.57743 11.5712 4.57649 11.1755 4.33183 10.932L2.13921 8.75L6.7571 8.75L11.375 8.75C11.7202 8.75 12 8.47019 12 8.125C12 7.77981 11.7202 7.5 11.375 7.5L2.13924 7.5L4.3318 5.318C4.57646 5.0745 4.5774 4.67878 4.3339 4.43413C4.09037 4.18941 3.69462 4.18856 3.44999 4.432L0.184241 7.682C-0.0605408 7.92631 -0.0603215 8.32391 0.183709 8.56741Z"
        fill={color}
      />
    </svg>
  );
};

TransitionBackIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  color: PropTypes.string,
};

export default TransitionBackIcon;
