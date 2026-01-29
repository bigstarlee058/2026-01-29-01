import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const InformationIcon = ({
  size = ICON_SIZE.EXTRA_SMALL,
  color = 'var(--primary-gray-text-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 7.33337C8.5 7.05724 8.27613 6.83337 8 6.83337C7.72387 6.83337 7.5 7.05724 7.5 7.33337V11.3334C7.5 11.6095 7.72387 11.8334 8 11.8334C8.27613 11.8334 8.5 11.6095 8.5 11.3334V7.33337Z"
        fill={color}
        fillOpacity="0.6"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.00065 0.833374C4.04261 0.833374 0.833984 4.042 0.833984 8.00004C0.833984 11.9581 4.04261 15.1667 8.00065 15.1667C11.9587 15.1667 15.1673 11.9581 15.1673 8.00004C15.1673 4.042 11.9587 0.833374 8.00065 0.833374ZM1.83398 8.00004C1.83398 4.59429 4.5949 1.83337 8.00065 1.83337C11.4064 1.83337 14.1673 4.59429 14.1673 8.00004C14.1673 11.4058 11.4064 14.1667 8.00065 14.1667C4.5949 14.1667 1.83398 11.4058 1.83398 8.00004Z"
        fill={color}
        fillOpacity="0.6"
      />
      <path
        d="M8.66732 5.33341C8.66732 5.7016 8.36885 6.00008 8.00065 6.00008C7.63245 6.00008 7.33398 5.7016 7.33398 5.33341C7.33398 4.96523 7.63245 4.66675 8.00065 4.66675C8.36885 4.66675 8.66732 4.96523 8.66732 5.33341Z"
        fill={color}
        fillOpacity="0.6"
      />
    </svg>
  );
};

export default InformationIcon;
