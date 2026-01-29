import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CloseIcon = ({ size = ICON_SIZE.REGULAR, color = '#C7CED1', hoverColor = '#FFFFFF' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="closeIcon"
    >
      <path
        d="M17 1L1 17M1 1L17 17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style jsx>{`
        .closeIcon {
          &:hover {
            path {
              stroke: ${hoverColor ? hoverColor : color};
            }
          }
        }
      `}</style>
    </svg>
  );
};
CloseIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CloseIcon;
