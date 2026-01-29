import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const RegenerationVoiceover = ({ size = ICON_SIZE.EXTRA_SMALL, color = '#b5b5b5' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill="none" 
        stroke={color} 
        strokeLinejoin="miter" 
        strokeLinecap="butt" 
        strokeMiterlimit="4" 
        strokeWidth="2" 
        d="M16 1c8.284 0 15 6.716 15 15s-6.716 15-15 15c-8.284 0-15-6.716-15-15s6.716-15 15-15z"
      />
      <path 
        fill="#fff" 
        fillOpacity="0.6" 
        d="M16.102 27.18l4.095-4.087-4.097-4.087-1.067 1.067 2.353 2.353c-1.317 0.007-2.487-0.148-3.512-0.465s-1.845-0.785-2.462-1.402c-0.633-0.632-1.109-1.349-1.429-2.152s-0.48-1.606-0.48-2.407c0-0.482 0.053-0.964 0.16-1.446s0.262-0.939 0.466-1.371l-1.152-1.021c-0.329 0.6-0.575 1.222-0.737 1.865s-0.243 1.298-0.242 1.963c0 1.011 0.196 2.008 0.589 2.993s0.973 1.866 1.741 2.646c0.768 0.779 1.777 1.358 3.027 1.735s2.533 0.57 3.85 0.577l-2.173 2.173 1.068 1.067zM23.022 19.818c0.329-0.6 0.574-1.222 0.735-1.865s0.242-1.298 0.243-1.963c0-1.007-0.195-2.008-0.585-3.003s-0.974-1.876-1.753-2.644c-0.756-0.779-1.763-1.356-3.020-1.73-1.258-0.375-2.541-0.563-3.85-0.563l2.173-2.183-1.067-1.067-4.097 4.087 4.097 4.087 1.067-1.067-2.362-2.362c1.31 0 2.482 0.159 3.517 0.478s1.86 0.788 2.475 1.409c0.616 0.62 1.087 1.332 1.412 2.135s0.488 1.607 0.487 2.413c0 0.482-0.053 0.964-0.158 1.446s-0.261 0.939-0.466 1.371l1.152 1.021z"
      />
    </svg>
  );
};

RegenerationVoiceover.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default RegenerationVoiceover;
