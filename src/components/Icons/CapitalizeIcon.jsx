import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CapitalizeIcon = ({ size = ICON_SIZE.LARGE, color = '#d3f85a' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 35 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        d="M13.527 6.813h-4.822l-6.57 18.051h4.406l1.27-4.016h6.419l1.286 4.016h4.429l-6.419-18.051zM8.683 17.728l2.314-7.219 2.304 7.219h-4.618z"
      />
      <path
        fill={color}
        d="M27.024 11.667c-0.787 0-1.664 0.109-2.624 0.326-0.963 0.218-1.718 0.47-2.272 0.755v2.995c1.386-0.912 2.845-1.37 4.381-1.37 1.526 0 2.291 0.704 2.291 2.112l-3.501 0.467c-2.963 0.387-4.445 1.83-4.445 4.33 0 1.184 0.362 2.131 1.078 2.838 0.717 0.71 1.699 1.066 2.95 1.066 1.696 0 2.976-0.723 3.84-2.166h0.051v1.85h3.763v-7.702c0-3.667-1.837-5.501-5.514-5.501zM28.8 19.635c0 0.79-0.237 1.44-0.707 1.958-0.47 0.515-1.078 0.771-1.824 0.771-0.538 0-0.963-0.144-1.277-0.432-0.317-0.291-0.474-0.662-0.474-1.114 0-0.998 0.646-1.584 1.939-1.75l2.342-0.304v0.87z"
      />
    </svg>
  );
};

CapitalizeIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default CapitalizeIcon;
