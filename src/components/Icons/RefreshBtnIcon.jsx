import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const RefreshBtnIcon = ({ size = ICON_SIZE.MEDIUM, color = '#fff' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={color}
        style={{ fill: 'var(--color1, #fff)' }}
        opacity="0.4"
        d="M32 4.414c-0.688-0.063-1.296 0.444-1.358 1.131l-0.166 1.817c-2.81-4.413-7.688-7.362-13.339-7.362-6.080 0-11.438 3.47-14.098 8.678-0.314 0.615-0.070 1.368 0.545 1.682s1.368 0.070 1.682-0.545c2.251-4.408 6.772-7.315 11.872-7.315 4.649 0 8.844 2.421 11.247 6.213l-1.782-1.273c-0.562-0.401-1.342-0.271-1.744 0.291s-0.271 1.342 0.291 1.744l5.405 3.86c0.792 0.565 1.885 0.048 1.971-0.904l0.607-6.658c0.063-0.688-0.444-1.296-1.131-1.358z"
      />
      <path
        fill={color}
        style={{ fill: 'var(--color1, #fff)' }}
        opacity="0.4"
        d="M30.696 21.637c-0.615-0.314-1.368-0.070-1.682 0.545-2.251 4.408-6.771 7.315-11.872 7.315-4.649 0-8.844-2.421-11.247-6.213l1.782 1.273c0.562 0.401 1.342 0.271 1.744-0.291s0.271-1.343-0.291-1.744l-5.405-3.86c-0.782-0.559-1.884-0.058-1.971 0.904l-0.607 6.658c-0.063 0.688 0.444 1.296 1.131 1.358s1.296-0.445 1.358-1.131l0.166-1.817c2.81 4.413 7.688 7.363 13.339 7.363 6.080 0 11.438-3.47 14.098-8.678 0.314-0.615 0.070-1.368-0.545-1.682z"
      />
    </svg>
  );
};

RefreshBtnIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

export default RefreshBtnIcon;
