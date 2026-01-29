import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const GalleryNavigationIcon = ({
  size = ICON_SIZE.MEDIUM,
  color = 'FFFFFF99',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.4748 8.19961C14.4689 8.19961 15.2748 7.39372 15.2748 6.39961C15.2748 5.4055 14.4689 4.59961 13.4748 4.59961C12.4807 4.59961 11.6748 5.4055 11.6748 6.39961C11.6748 7.39372 12.4807 8.19961 13.4748 8.19961Z"
        stroke={color}
        strokeWidth="1.35"
      />
      <path
        d="M0.875 10.4499L2.4518 9.0702C2.84702 8.72467 3.35877 8.54221 3.88345 8.55975C4.40813 8.5773 4.90654 8.79354 5.2778 9.1647L9.1388 13.0257C9.43842 13.3253 9.8341 13.5095 10.2562 13.5461C10.6783 13.5826 11.0998 13.4691 11.4464 13.2255L11.7155 13.0365C12.2155 12.6853 12.8199 12.5141 13.4298 12.5509C14.0398 12.5877 14.6192 12.8303 15.0734 13.239L17.975 15.8499"
        stroke={color}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M18.875 10C18.875 14.2426 18.875 16.3639 17.5565 17.6815C16.2398 19 14.1176 19 9.875 19C5.6324 19 3.5111 19 2.1926 17.6815C0.875 16.3648 0.875 14.2426 0.875 10C0.875 5.7574 0.875 3.6361 2.1926 2.3176C3.512 1 5.6324 1 9.875 1C14.1176 1 16.2389 1 17.5565 2.3176C18.4331 3.1942 18.7265 4.4263 18.8255 6.4"
        stroke={color}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
};
GalleryNavigationIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default GalleryNavigationIcon;
