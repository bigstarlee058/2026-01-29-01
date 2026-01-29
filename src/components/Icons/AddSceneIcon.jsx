import ICON_SIZE from 'components/Icons/IconSize';

const AddSceneIcon = ({ size = ICON_SIZE.SMALL, color = '#FFFFFF99' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="7.19922"
        y="1.60013"
        width="1.6"
        height="12.8"
        rx="0.8"
        fill={color}
        fillOpacity="0.5"
      />
      <rect
        x="1.60156"
        y="8.79895"
        width="1.6"
        height="12.8"
        rx="0.8"
        transform="rotate(-90 1.60156 8.79895)"
        fill={color}
        fillOpacity="0.5"
      />
    </svg>
  );
};

export default AddSceneIcon;
