import styles from './Tumbler.module.scss';
import { useState, useEffect } from 'react';

const Tumbler = ({ onChange, defaultChecked = false, checked }) => {

  const isControlled = checked !== undefined;
  const [internalState, setInternalState] = useState(defaultChecked);
  

  const isTumblerOn = isControlled ? checked : internalState;

  useEffect(() => {
    if (!isControlled) {
      setInternalState(defaultChecked);
    }
  }, [defaultChecked, isControlled]);

  const toggleTumbler = e => {
    const newValue = e.target.checked;

    if (!isControlled) {
      setInternalState(newValue);
    }

    onChange?.(newValue);
  };

  return (
    <label className={styles.toggle_container}>
      <input
        type="checkbox"
        className={styles.toggle_input}
        checked={isTumblerOn}
        onChange={toggleTumbler}
      />
      <span
        className={`${styles.toggle_switch} ${
          isTumblerOn ? styles.toggle_switch_active : ''
        }`}
      >
        <span className={styles.toggle_handle}></span>
      </span>
    </label>
  );
};

export { Tumbler };
