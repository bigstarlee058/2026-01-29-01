import styles from './NewSimilaritySwitch.module.scss';

const NewSimilaritySwitch = ({ range, onChange }) => {
const handleRangeChange = e => {
const newValue = parseFloat(e.target.value);
onChange(newValue);
  };

  const handleMouseDown = e => {
    e.stopPropagation();
    e.preventDefault();
};

  const handleMouseUp = e => {
    e.stopPropagation();
    e.preventDefault();
};

  const handleClick = e => {
    e.stopPropagation();
    e.preventDefault();
};

  const handleTouchStart = e => {
    e.stopPropagation();
    e.preventDefault();
};

  const handleLabelClick = e => {
    e.stopPropagation();
};

  return (
    <label
      className={styles.regenerate_label}
      htmlFor="similarity"
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
      onClick={handleLabelClick}
    >
      Similarity
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
        onChange={e => handleRangeChange(e)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
      />
      <span className={styles.range}>
        {range.length === 3 ? range + 0 : range}
      </span>
    </label>
  );
};

export { NewSimilaritySwitch };
