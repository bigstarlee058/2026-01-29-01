import React from 'react';
import styles from './UploadSection.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { FileDetails } from './FileDetails';
import NoteIcon from 'components/Icons/NoteIcon';
import MovieIcon from 'components/Icons/MovieIcon';
import placeholderImg from '../../images/placeholderUploadSection.png';

const UploadedFile = ({ file }) => {
  return (
    <div className={`${styles.fileItem} ${styles.placeholderItem}`}>
      <div className={styles.fileCheckbox}>
        <input
          type="checkbox"
          id={`file-${file.id}`}
          className={styles.fileCheckboxInput}
        />
      </div>
      <div className={styles.fileIcon}>
        {file.type === 'MP4' || file.type === 'MP3' ? (
          <div className={styles.mediaIcon}>
            {file.type === 'MP3' ? <NoteIcon color="white" /> : <MovieIcon />}
          </div>
        ) : (
          <img
            src={URL.createObjectURL(file.file)}
            alt={file.name}
            className={styles.thumbnailPreview}
            onError={e => {
              e.target.onerror = null;
              e.target.src = placeholderImg;
            }}
          />
        )}
      </div>
      <div className={styles.fileInfo}>
        <div className={styles.fileName}>
          {file.name}
          <ButtonWithIcon
            icon="InformationIcon"
            size={12}
            color="white"
            classNameButton={styles.infoBtn}
            tooltipContent={<FileDetails fileInfo={file} />}
            tooltipBackground="#131a25"
            tooltipPlace="top"
          />
        </div>
        <div className={styles.fileDetails}>
          {file.type}
          <span className={styles.dot}></span>
          {file.size} <span className={styles.dot}></span>
          {file.dimensions && `${file.dimensions}`}
        </div>
      </div>
      <div className={styles.menuButtonContainer}>
        <ButtonWithIcon
          classNameButton={`${styles.fileMenuButton} ${styles.placeholderMenuButton}`}
          icon="ThreeDotsIcon"
          classNameIcon={styles.fileMenuIcon}
          size={15}
          color="#ffffff54"
          accentColor="white"
        />
      </div>
    </div>
  );
};

export { UploadedFile };
