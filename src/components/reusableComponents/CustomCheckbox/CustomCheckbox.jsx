import styles from './CustomCheckbox.module.scss';

const CustomCheckbox = ({ checked, onChange, className = '' }) => {
  return (
    <span
      className={`${styles.customCheckbox} ${className}`}
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          style={{ display: 'block' }}
        >
          <polyline
            points="3,7 6,10 11,4"
            style={{
              fill: 'none',
              stroke: '#fff',
              strokeWidth: 1,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          />
        </svg>
      )}
    </span>
  );
};

export { CustomCheckbox };
