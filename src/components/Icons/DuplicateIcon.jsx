import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const DuplicateIcon = ({ size = ICON_SIZE.SMALL, color = 'rgba(255, 255, 255, 0.4)', fill, fillOpacity }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 2.5C4 1.67157 4.67158 1 5.5 1H12.5C13.3285 1 14 1.67158 14 2.5V11.5C14 12.3285 13.3285 13 12.5 13H12V13.5C12 14.3285 11.3285 15 10.5 15H3.5C2.67158 15 2 14.3285 2 13.5V4.5C2 3.67157 2.67158 3 3.5 3H4V2.5ZM5 3H10.5C11.3285 3 12 3.67158 12 4.5V12H12.5C12.7761 12 13 11.7761 13 11.5V2.5C13 2.22386 12.7761 2 12.5 2H5.5C5.22385 2 5 2.22386 5 2.5V3ZM3 4.5C3 4.22386 3.22386 4 3.5 4H10.5C10.7761 4 11 4.22386 11 4.5V13.5C11 13.7761 10.7761 14 10.5 14H3.5C3.22386 14 3 13.7761 3 13.5V4.5Z"
        fill={fill || color}
        fillOpacity={fillOpacity}
      />
    </svg>
  );
};
DuplicateIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
  fill: PropTypes.string,
  fillOpacity: PropTypes.string,
};
export default DuplicateIcon;
