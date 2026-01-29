import styles from './SimilaritySwitch.module.scss';

const SimilaritySwitch = ({ range, onChange }) => {
  return (
    <label className={styles.regenerate_label} htmlFor="similarity">
      Similarity
      <span className={styles.range}>
        {range.length === 3 ? range + 0 : range}
      </span>
      <input
        id="similarity"
        name="similarity"
        type="range"
        value={range}
        min={0.1}
        max={0.9}
        step={0.01}
        className={styles.input}
        style={{ '--range-progress': `${((range - 0.1) / 0.8) * 100}%` }}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
};

export default SimilaritySwitch;
