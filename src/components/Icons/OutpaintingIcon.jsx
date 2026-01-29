import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const OutpaintingIcon = ({ size = ICON_SIZE.REGULAR, color = '#D3F85A' }) => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_7718_69575)">
        <path
          d="M13.7499 0H5.00006C4.31268 0 3.75 0.562683 3.75 1.25006V9.99994C3.75 10.6873 4.31268 11.25 5.00006 11.25H13.7499C14.4373 11.25 15 10.6873 15 9.99994V1.25006C15 0.562683 14.4373 0 13.7499 0ZM11.5612 5.625L11.5618 4.10024L6.91161 8.75006L6.24994 8.08594L10.8979 3.43876L9.37445 3.43744V2.49994H11.8744C12.2199 2.50067 12.4993 2.78005 12.4988 3.12506L12.5001 5.62555L11.5612 5.625Z"
          fill={color}
        />
        <path
          d="M6.24994 12.5001V13.7499H1.25006V8.75006H2.49994V7.5H0.624939C0.281433 7.5 0 7.78143 0 8.12494V14.3751C0 14.718 0.281433 15 0.624939 15H6.87506C7.21857 15 7.5 14.718 7.5 14.3751V12.5001H6.24994Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_7718_69575">
          <rect width="15" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
OutpaintingIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default OutpaintingIcon;
