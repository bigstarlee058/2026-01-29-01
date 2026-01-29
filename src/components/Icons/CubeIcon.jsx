import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CubeIcon = ({ size = ICON_SIZE.MEDIUM, color = 'white' }) => {
  return (
    <svg
      width="19"
      height="20"
      viewBox="0 0 19 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="4.34783" height="4.34783" fill={color}/>
      <rect
        y="7.82605"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        y="15.6522"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="6.95654"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="6.95654"
        y="7.82605"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="6.95654"
        y="15.6522"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="13.9131"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="13.9131"
        y="7.82605"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
      <rect
        x="13.9131"
        y="15.6522"
        width="4.34783"
        height="4.34783"
        fill={color}

      />
    </svg>
  );
};
CubeIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CubeIcon;
