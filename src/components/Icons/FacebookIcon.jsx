import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const FacebookIcon = ({
  size = ICON_SIZE.REGULAR,
  color = 'var(--primary-white-text-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2251_7239)">
        <path
          d="M17.1133 8.58976C17.1133 3.84505 13.2906 -0.00109863 8.57577 -0.00109863C3.8588 -3.14452e-05 0.0361328 3.84505 0.0361328 8.59083C0.0361328 12.8777 3.15872 16.4315 7.23965 17.076V11.0731H5.07326V8.59083H7.24178V6.69657C7.24178 4.54405 8.51707 3.35521 10.4668 3.35521C11.4017 3.35521 12.3782 3.52275 12.3782 3.52275V5.63579H11.3014C10.2416 5.63579 9.91082 6.29851 9.91082 6.97831V8.58976H12.2778L11.9001 11.072H9.90975V17.075C13.9907 16.4304 17.1133 12.8767 17.1133 8.58976Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_2251_7239">
          <rect
            x="0.0380859"
            width="17.075"
            height="17.075"
            rx="8.5375"
            fill={color}
          />
        </clipPath>
      </defs>
    </svg>
  );
};
FacebookIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default FacebookIcon;
