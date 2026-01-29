import styles from './DeleteBtn.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

function DeleteBtn({ onDelete, width }) {
  return (
    <ButtonWithIcon
      icon="DeleteIcon"
      classNameButton={styles.delete_btn}
      color="white"
      accentColor="white"
      width={width}
      onClick={() => onDelete()}
    />
  );
}

export { DeleteBtn };
