import styles from '../Player.module.scss';

export const UploadButton = ({ accept,onClick, onChange, isImage, style }) => {
  return (
    <label
      htmlFor="fileInput"
      className={`${styles.dragableView} ${styles.addElementButton} ${
        isImage && styles.image
      }`}
      onClick={onClick}

      style={style}
    >
      <input
        id="fileInput"
        type="file"
        accept={accept}
        className={styles.upload_input}
        onChange={onChange}
      />
      +
    </label>
  );
};
