import ICON_SIZE from 'components/Icons/IconSize';

const ChevronRightIcon = ({ size = ICON_SIZE.SMALL, color = '#868F94' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 8.16669L3.66667 5.50002L1 2.83335"
        stroke={color}
        stroke-width="0.666667"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default ChevronRightIcon;
