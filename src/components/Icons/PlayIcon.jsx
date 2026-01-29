import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const PlayIcon = ({ size = ICON_SIZE.SMALL, color = '#F1F1F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.4 7.99969C14.4004 8.15249 14.3612 8.30277 14.2863 8.43594C14.2114 8.5691 14.1033 8.68062 13.9725 8.75963L5.868 13.7175C5.73136 13.8012 5.57486 13.8469 5.41467 13.8498C5.25447 13.8528 5.09639 13.8129 4.95675 13.7344C4.81844 13.657 4.70322 13.5443 4.62294 13.4076C4.54267 13.271 4.50023 13.1155 4.5 12.957V3.04238C4.50023 2.88392 4.54267 2.72837 4.62294 2.59175C4.70322 2.45512 4.81844 2.34234 4.95675 2.26501C5.09639 2.18645 5.25447 2.1466 5.41467 2.14957C5.57486 2.15253 5.73136 2.19821 5.868 2.28188L13.9725 7.23976C14.1033 7.31877 14.2114 7.43029 14.2863 7.56345C14.3612 7.69662 14.4004 7.8469 14.4 7.99969Z"
        fill={color}
      />
    </svg>
  );
};
PlayIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default PlayIcon;
