import styles from './ChatGptIconButton.module.scss';
import { ButtonWithIcon } from '../ButtonWithIcon';

const ChatGptIconButton = ({ onGenerate, isLoading, isNegativePrompt=false }) => {
    return (
      <ButtonWithIcon
        icon="ChatGptIcon"
        color="#f1f1f1"
        accentColor="white"
        onClick={e => {
          e.preventDefault();
          onGenerate(isNegativePrompt);
        }}
        className={styles.generate_btn}
        disabled={isLoading}
        classNameButton={styles.btn_gpt}
        classNameIcon={styles.icon_gpt}
      />
    );
}
export { ChatGptIconButton };