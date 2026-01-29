import ICON_SIZE from './IconSize';
import PropTypes from 'prop-types';

const VievDetailsIcon = ({ size = ICON_SIZE.MEDIUM, color = '#fff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="rgba(255, 255, 255, 0.4)"
    >
      <path
        d="M31.797 15.377c-0.286-0.391-7.097-9.575-15.797-9.575s-15.511 9.184-15.797 9.575c-0.271 0.371-0.271 0.874 0 1.245 0.286 0.391 7.097 9.575 15.797 9.575s15.511-9.184 15.797-9.575c0.271-0.371 0.271-0.874 0-1.245zM16 24.087c-6.408 0-11.958-6.096-13.601-8.089 1.641-1.995 7.179-8.087 13.601-8.087 6.408 0 11.958 6.095 13.601 8.089-1.641 1.994-7.179 8.087-13.601 8.087z"
        fill={color}
        opacity="0.4"
      />
      <path
        d="M15.998 9.667c-3.49 0-6.33 2.84-6.33 6.33s2.84 6.33 6.33 6.33c3.49 0 6.33-2.84 6.33-6.33s-2.84-6.33-6.33-6.33zM15.998 20.217c-2.327 0-4.22-1.893-4.22-4.22s1.893-4.22 4.22-4.22c2.327 0 4.22 1.893 4.22 4.22s-1.893 4.22-4.22 4.22z"
        fill={color}
        opacity="0.4"
      />
    </svg>
  );
};

VievDetailsIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};

export default VievDetailsIcon;
