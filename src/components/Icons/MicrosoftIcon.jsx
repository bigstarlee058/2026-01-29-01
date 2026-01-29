import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const MicrosoftIcon = ({ size = ICON_SIZE.REGULAR, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <symbol id="icon-logos_microsoft-icon" viewBox="0 0 34 32">
        <path fill="#f1511b" style={{ fill: 'var(--color6, #f1511b)' }} d="M16.11 14.92h-14.632v-14.632h14.632v14.632z"></path>
        <path fill="#80cc28" style={{ fill: 'var(--color7, #80cc28)' }} d="M32.265 14.92h-14.632v-14.632h14.632v14.632z"></path>
        <path fill="#00adef" style={{ fill: 'var(--color8, #00adef)' }} d="M16.11 31.074h-14.632v-14.632h14.632v14.632z"></path>
        <path fill="#fbbc09" style={{ fill: 'var(--color9, #fbbc09)' }} d="M32.265 31.074h-14.632v-14.632h14.632v14.632z"></path>
      </symbol>
      <use xlinkHref="#icon-logos_microsoft-icon" />
    </svg>
  );
};

MicrosoftIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default MicrosoftIcon;
