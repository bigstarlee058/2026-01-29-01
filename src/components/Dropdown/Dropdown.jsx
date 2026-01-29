import styles from './Dropdown.module.scss';

const Dropdown = ({ array, onChange, onClose }) => {
  const handleRadioChange = event => {
    onChange(event.target.value);
    onClose();
  };

  return (
    <div onChange={handleRadioChange} className={styles.btns}>
      {array.map((el, i) => (
        <div className={styles.button} key={i}>
          <label htmlFor={el}>{el}</label>
          <input type="radio" id={el} name="dropdown" value={el} />
        </div>
      ))}
    </div>
  );
};

export default Dropdown;
