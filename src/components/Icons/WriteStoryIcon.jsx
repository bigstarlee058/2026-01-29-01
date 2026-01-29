import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const WriteStoryIcon = ({
  size = ICON_SIZE.EXTRA_LARGE,
  color = 'var(--accent-color)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2168_7078)">
        <path
          d="M46.6231 29.2169C45.9282 29.2169 45.365 29.7801 45.365 30.475V41.6458C45.3626 43.729 43.6745 45.4176 41.5908 45.42H6.29039C4.2067 45.4176 2.51861 43.729 2.51616 41.6458V8.86156C2.51861 6.77787 4.2067 5.08978 6.29039 5.08732H17.4608C18.1556 5.08732 18.7188 4.52414 18.7188 3.82925C18.7188 3.13435 18.1556 2.57117 17.4608 2.57117H6.29039C2.8179 2.5751 0.0039315 5.38907 0 8.86156V41.6458C0.0039315 45.1183 2.8179 47.9323 6.29039 47.9362H41.5908C45.0633 47.9323 47.8773 45.1183 47.8812 41.6458V30.4755C47.8812 29.7806 47.318 29.2169 46.6231 29.2169Z"
          fill={color}
        />
        <path
          d="M24.126 21.2814L39.6076 5.79944L44.6005 10.7924L29.1189 26.2744L24.126 21.2814Z"
          fill={color}
        />
        <path
          d="M21.5996 28.8003L27.1173 27.272L23.1279 23.2826L21.5996 28.8003Z"
          fill={color}
        />
        <path
          d="M45.9807 3.17518C44.9448 2.1418 43.2678 2.1418 42.2319 3.17518L41.1074 4.29968L46.1003 9.2926L47.2248 8.16811C48.2586 7.13225 48.2586 5.45523 47.2248 4.41937L45.9807 3.17518Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_2168_7078">
          <rect width="48" height="48" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
WriteStoryIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default WriteStoryIcon;
