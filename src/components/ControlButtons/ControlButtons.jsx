import { useState } from 'react';
import styles from '../SocialsButtonsSet/SocialsButtonsSet.module.scss';
import PopUp from 'components/PopUp/PopUp';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const ControlButtons = ({
  onInsertBelowClick,
  onInsertUnderClick,
  onDelete,
  onMerge,
  addText,
  deleteText,
  mergeText,
  isMergeShown = false,
}) => {
  const [popUpShown, setPopUpShown] = useState(false);

  const onBackDropClick = e => {
    if (e.target === e.currentTarget) {
      setPopUpShown(false);
    }
  };

  return (
    <>
      {popUpShown && (
        <div className={styles.backdrop} onClick={onBackDropClick}></div>
      )}
      <div className={styles.control_buttons}>
        <div className={styles.button_wrap}>
          {isMergeShown && (
            <ButtonWithIcon
              width="24px"
              icon="MergeSceneIcon"
              color="#C7CED1"
              classNameButton={styles.button}
              aria-label="merge scenes"
              onClick={() => onMerge()}
              tooltipText={mergeText}
            />
          )}
          <ButtonWithIcon
            width="24px"
            icon="PlusWithBorderIcon"
            color="#C7CED1"
            classNameButton={styles.button}
            aria-label="add scene"
            onClick={setPopUpShown}
            tooltipText={addText}
          />
          <ButtonWithIcon
            width="24px"
            icon="DeleteWithBorderIcon"
            color="#C7CED1"
            classNameButton={styles.button}
            aria-label="delete scene"
            onClick={() => onDelete()}
            tooltipText={deleteText}
          />
          {popUpShown && (
            <PopUp
              onInsertBelowClick={onInsertBelowClick}
              onInsertUnderClick={onInsertUnderClick}
              onClose={() => setPopUpShown(false)}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ControlButtons;
