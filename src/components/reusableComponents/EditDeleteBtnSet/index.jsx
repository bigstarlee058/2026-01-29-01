import { ButtonWithIcon } from "components/reusableComponents/ButtonWithIcon";
import styles from './index.module.scss';
import PropTypes from 'prop-types';

function EditDeleteBtnSet({ onDelete }) {
  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete && onDelete(e);
  };

  const buttons = [
    // { icon: 'AddUserIcon', path: '' },
    { icon: 'DeleteIcon', path: '', onClick: handleDeleteClick },
  ];

  const handleSetClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={styles.btn_set} onClick={handleSetClick}>
      {buttons.map(button => (
        <ButtonWithIcon
          key={button.icon}
          text={button.text}
          icon={button.icon}
          path={button.path}
          size="18px"
          onClick={button.onClick}
          classNameButton={styles.btn_container}
          classNameIcon={styles.icon}
          color="#F1F1F1"
          accentColor="white"
          tooltipText="Delete project"
        />
      ))}
    </div>
  );
}

EditDeleteBtnSet.propTypes = {
  onDelete: PropTypes.func
};

export { EditDeleteBtnSet };