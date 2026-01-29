import ICON_SIZE from 'components/Icons/IconSize';

const ModelIcon = ({
  size = ICON_SIZE.EXTRA_LARGE,
  color = '#9B9DA2',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_24278_48443)">
        <path
          d="M1.7793 8.54584V11.5594L4.38912 13.0662L6.99897 11.5594V8.54584L4.38912 7.03906L1.7793 8.54584Z"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6.99902 8.54584V11.5594L9.60888 13.0662L12.2187 11.5594V8.54584L9.60888 7.03906L6.99902 8.54584Z"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4.38867 4.02243V7.03601L6.99852 8.54279L9.60838 7.03601V4.02243L6.99852 2.51562L4.38867 4.02243Z"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M7 2.51182V0.929688"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M13.5899 12.3458L12.2197 11.5547"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M0.410156 12.3458L1.78032 11.5547"
          stroke={color}
          stroke-width="0.820312"
          stroke-miterlimit="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_24278_48443">
          <rect width={size} height={size} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ModelIcon;
