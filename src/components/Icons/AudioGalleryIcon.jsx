import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const AudioGalleryIcon = ({ size = ICON_SIZE.MEDIUM, color = '#FFFFFF99' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        fill="none" 
        stroke={color} 
        strokeLinejoin="round" 
        strokeLinecap="round" 
        strokeMiterlimit="4" 
        strokeWidth="2.2967" 
        d="M1.455 16c0-6.856 0-10.286 2.13-12.416s5.558-2.13 12.416-2.13c6.856 0 10.286 0 12.416 2.13s2.13 5.558 2.13 12.416c0 6.856 0 10.286-2.13 12.416s-5.558 2.13-12.416 2.13c-6.856 0-10.286 0-12.416-2.13s-2.13-5.558-2.13-12.416z"
      />
      <path 
        fill="none" 
        stroke={color} 
        strokeLinejoin="round" 
        strokeLinecap="round" 
        strokeMiterlimit="4" 
        strokeWidth="2.2967" 
        d="M17.53 19.828c0 1.015-0.403 1.989-1.121 2.707s-1.691 1.121-2.707 1.121-1.989-0.403-2.707-1.121c-0.718-0.718-1.121-1.691-1.121-2.707s0.403-1.989 1.121-2.707c0.718-0.718 1.691-1.121 2.707-1.121s1.989 0.403 2.707 1.121c0.718 0.718 1.121 1.692 1.121 2.707zM17.53 19.828v-11.483c0.51 0.766 0.919 3.981 4.593 4.593"
      />
    </svg>
  );
};

AudioGalleryIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default AudioGalleryIcon;
