import styles from './index.module.scss';

function Button({ text, isDisabled, handleClick, color, width, padding, className }) {
  return (
    <button
      type="submit"
      onClick={handleClick}
      className={`${isDisabled ? styles.disabled_btn : styles.button} ${className || ''}`}
      style={{ backgroundColor: color, padding: padding, width: width }}
    >
      {text}
    </button>
  );
}
export { Button };
