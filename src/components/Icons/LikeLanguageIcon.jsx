import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const LikeLanguageIcon = ({ size = ICON_SIZE.LARGE, color = 'rgba(255, 255, 255, 0.4)' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        opacity="0.4"
        d="M16 30.235c-0.456 0-0.895-0.165-1.237-0.465-1.293-1.13-2.539-2.193-3.639-3.13l-0.006-0.005c-3.224-2.747-6.008-5.12-7.945-7.457-2.165-2.613-3.174-5.090-3.174-7.796 0-2.629 0.902-5.055 2.539-6.831 1.656-1.797 3.929-2.786 6.401-2.786 1.847 0 3.539 0.584 5.028 1.736 0.751 0.581 1.433 1.293 2.033 2.123 0.6-0.83 1.281-1.541 2.033-2.123 1.489-1.152 3.181-1.736 5.028-1.736 2.471 0 4.744 0.99 6.401 2.786 1.637 1.776 2.538 4.201 2.538 6.831 0 2.706-1.008 5.184-3.174 7.796-1.937 2.337-4.721 4.71-7.944 7.457-1.102 0.939-2.35 2.003-3.646 3.136-0.342 0.299-0.782 0.464-1.237 0.464zM8.939 3.64c-1.942 0-3.725 0.775-5.023 2.182-1.317 1.428-2.042 3.403-2.042 5.56 0 2.276 0.846 4.312 2.743 6.6 1.833 2.212 4.56 4.536 7.717 7.226l0.006 0.005c1.104 0.941 2.355 2.007 3.657 3.146 1.31-1.141 2.563-2.209 3.669-3.151 3.157-2.691 5.884-5.014 7.717-7.226 1.896-2.289 2.742-4.324 2.742-6.6 0-2.157-0.725-4.132-2.042-5.56-1.297-1.407-3.081-2.182-5.023-2.182-1.422 0-2.728 0.452-3.881 1.344-1.028 0.795-1.743 1.8-2.163 2.503-0.216 0.362-0.596 0.577-1.016 0.577s-0.801-0.216-1.016-0.577c-0.419-0.703-1.135-1.708-2.163-2.503-1.153-0.892-2.459-1.344-3.881-1.344z"
      />
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2"
        d="M11 12.547h10"
      />
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2"
        d="M13 16.547h6"
      />
      <path
        fill="none"
        stroke={color}
        strokeLinejoin="miter"
        strokeLinecap="round"
        strokeMiterlimit="4"
        strokeWidth="2"
        d="M15 20.547h2"
      />
    </svg>
  );
};

LikeLanguageIcon.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string,
};

export default LikeLanguageIcon;
