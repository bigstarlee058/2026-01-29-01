import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const ImageIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
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
        strokeWidth="2.16"
        d="M21.761 13.119c1.591 0 2.88-1.289 2.88-2.88s-1.289-2.88-2.88-2.88c-1.591 0-2.88 1.289-2.88 2.88s1.289 2.88 2.88 2.88z"
      />
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2.16"
        d="M1.6 16.72l2.523-2.208c0.632-0.553 1.451-0.845 2.291-0.817s1.637 0.374 2.231 0.968l6.178 6.178c0.479 0.479 1.112 0.774 1.788 0.833s1.35-0.123 1.904-0.513l0.431-0.302c0.8-0.562 1.767-0.836 2.743-0.777s1.903 0.447 2.63 1.101l4.643 4.177"
      />
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2.16"
        d="M30.4 16c0 6.788 0 10.182-2.11 12.29-2.107 2.11-5.502 2.11-12.29 2.11s-10.182 0-12.292-2.11c-2.108-2.107-2.108-5.502-2.108-12.29s0-10.182 2.108-12.292c2.111-2.108 5.504-2.108 12.292-2.108s10.182 0 12.29 2.108c1.403 1.403 1.872 3.374 2.030 6.532"
      />
    </svg>
  );
};
ImageIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default ImageIcon;
