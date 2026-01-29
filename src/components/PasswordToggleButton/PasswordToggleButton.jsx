import icons from '../../images/icons.svg';

import styles from './PasswordToggleButton.module.scss';

const PasswordToggleButton = ({
  isPasswordShown,
  togglePasswordVisibility,
}) => {
  return (
    <button
      className={styles.button}
      type="button"
      onClick={togglePasswordVisibility}
    >
      {isPasswordShown ? (
        <svg className={styles.icon} width={24} height={16} >
          <use href={icons + `#icon-open_eye`}></use>
        </svg>
      ) : (
        <svg className={styles.icon} width={16} height={10}>
          <use href={icons + `#icon-close_eye`}></use>
        </svg>
      )}
    </button>
  );
};

export default PasswordToggleButton;
