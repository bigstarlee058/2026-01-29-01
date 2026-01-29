import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const GenerateIcon = ({ size = 'ICON_SIZE.REGULAR', color = '#F1F1F1' }) => {
  return (
    <svg
      width="20"
      height="19"
      viewBox="0 0 20 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_5328_11076)">
        <path
          d="M3.38672 18.2617V14.9551H6.69339"
          stroke={color}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.4535 8.08517C18.8044 9.95711 18.5238 11.8926 17.6558 13.5878C16.7879 15.2831 15.3817 16.6422 13.6578 17.452C11.934 18.2617 9.99014 18.4762 8.13123 18.0619C6.27232 17.6475 4.60357 16.6277 3.38684 15.1625M1.54951 11.2452C1.19867 9.37323 1.47924 7.43778 2.34719 5.74252C3.21514 4.04726 4.62135 2.68812 6.34517 1.87838C8.069 1.06864 10.0129 0.854122 11.8718 1.26848C13.7307 1.68284 15.3994 2.70263 16.6162 4.16783"
          stroke={color}
          strokeWidth="0.933333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.6139 1.06836V4.37503H13.3072M6.12053 10.111C5.65253 10.0297 5.65253 9.35769 6.12053 9.27636C6.94889 9.13147 7.71546 8.74352 8.32278 8.16185C8.9301 7.58017 9.35073 6.83104 9.5312 6.00969L9.5592 5.88036C9.66053 5.41769 10.3192 5.41503 10.4245 5.87636L10.4592 6.02703C10.6454 6.84519 11.0695 7.59 11.6781 8.16771C12.2866 8.74542 13.0525 9.13022 13.8792 9.27369C14.3499 9.35503 14.3499 10.031 13.8792 10.1137C13.0526 10.2571 12.2869 10.6417 11.6784 11.2191C11.0698 11.7966 10.6457 12.5411 10.4592 13.359L10.4245 13.5084C10.3192 13.9697 9.66053 13.967 9.5592 13.5044L9.53253 13.3764C9.35188 12.5546 8.93085 11.8053 8.32302 11.2235C7.7152 10.6418 6.94805 10.2541 6.1192 10.1097L6.12053 10.111Z"
          stroke={color}
          strokeWidth="0.933333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_5328_11076">
          <rect
            width="18.6667"
            height="18.6667"
            fill="white"
            transform="translate(0.667969 0.332031)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
GenerateIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default GenerateIcon;
