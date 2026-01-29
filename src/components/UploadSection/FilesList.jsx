import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './UploadSection.module.scss';
import { useState, useEffect, useRef } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import { Dropdown } from 'components/reusableComponents/Dropdown/Dropdown';
import {
  NoteIcon,
  MovieIcon,
  RenameIcon,
  DeleteBtnIcon,
  RefreshBtnIcon,
} from 'components/Icons';
import { FileDetails } from 'components/UploadSection/FileDetails';
import { PopupPortal } from 'components/UploadSection/PopupPortal';
import { PreviewIcon } from '../Icons';
import { DownloadBtnIcon } from '../Icons';
import { EditBtnIcon } from '../Icons';
import { VievDetailsIcon } from '../Icons';
import { useDeleteFileMutation } from '../../redux/gallery/galleryApi';
import { useDrag } from 'react-dnd';

const FileItem = ({
  file,
  onMenuHover,
  onMenuLeave,
  openMenuId,
  popupPosition,
  dropdownRefs,
  menuButtonRefs,
  handleActionSelect,
  selectedAction,
  actionsList,
}) => {
  const [objectUrl, setObjectUrl] = useState(null);

  // Create and cleanup object URL for local file preview
  useEffect(() => {
    let url = null;
    if (file.progress < 100 && file.file) {
      url = URL.createObjectURL(file.file);
      setObjectUrl(url);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.progress, file.file]);

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: 'gallery-image',
      item: {
        type: 'gallery-image',
        image: {
          _id: file._id,
          id: file._id,
          url: file.url,
          minUrl: file.minUrl || file.url,
          prompt: '',
          negativePrompt: '',
          imageHeight: file.height || 0,
          imageWidth: file.width || 0,
        },
      },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [file]
  );

  const filePreview = file => {
    // If file is still uploading, use local object URL
    if (file.progress < 100 && objectUrl) {
      return objectUrl;
    }

    // For uploaded files, use server URLs
    switch (file.type) {
      case 'image':
        return file.minUrl || file.url;
      case 'video':
        return file.preview;
      case 'audio':
        return file.preview;
      default:
        return file.url;
    }
  };

  const truncateFileName = (name, maxLength = 30) => {
    if (name.length > maxLength) {
      return name.slice(0, maxLength);
    }
    return name;
  };

  return (
    <div
      key={file.id}
      className={`${styles.fileItem} ${isDragging ? styles.dragging : ''}`}
      ref={dragRef}
    >
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
        ) : file.type === 'audio' || file.type === 'AUDIO' ? (
          <div className={styles.mediaIcon}>
            <NoteIcon color="white" />
          </div>
        ) : (
          <>
            <img
              src={filePreview(file)}
              alt={file.name}
              className={styles.thumbnailPreview}
              onError={e => {
                // If image fails to load, show rotating lines
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              className={styles.rotatingLinesContainer}
              style={{ display: 'none' }}
            >
              <RotatingLines
                strokeColor="var(--accent-color)"
                strokeWidth="3"
                animationDuration="0.75"
                width="20"
                visible={true}
              />
            </div>
          </>
        )}
      </div>
      <div className={styles.fileInfo}>
        <div className={styles.fileName}>
          <span className={styles.fileNameText}>
            {truncateFileName(file.name)}
            {file.name.length > 30 && '...'}
          </span>
          {file.error && <span className={styles.errorIcon}>!</span>}
          {file.progress < 100 && (
            <ButtonWithIcon
              icon="InformationIcon"
              size={12}
              color="white"
              classNameButton={styles.infoBtn}
              tooltipContent={<FileDetails fileInfo={file} />}
              tooltipBackground="#131a25"
              tooltipPlace="top"
            />
          )}
        </div>
        {/* <div className={styles.fileDetails}>
          {file.type}
          <span className={styles.dot}></span>
          {file.size} <span className={styles.dot}></span>
          {file.dimensions && `${file.dimensions}`}
        </div> */}
        {file.progress < 100 && (
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${file.progress}%` }}
            ></div>
            <span className={styles.progressPercentage}>{file.progress}%</span>
          </div>
        )}
      </div>
      <div
        ref={el => (menuButtonRefs.current[file.id] = el)}
        className={styles.menuButtonContainer}
        onMouseEnter={e => onMenuHover(file.id, e)}
        onMouseLeave={onMenuLeave}
      >
        <ButtonWithIcon
          classNameButton={styles.fileMenuButton}
          icon="ThreeDotsIcon"
          classNameIcon={styles.fileMenuIcon}
          size={15}
          color="#ffffff54"
          accentColor="white"
        />
      </div>

      {openMenuId === file.id && (
        <PopupPortal>
          <div
            ref={el => (dropdownRefs.current[file.id] = el)}
            className={styles.dropdownContainer}
            style={{
              position: 'fixed',
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              zIndex: 1000,
            }}
            onMouseEnter={e => onMenuHover(file.id, e)}
            onMouseLeave={onMenuLeave}
          >
            <Dropdown
              onSelect={action => handleActionSelect(action, file._id)}
              itemsList={actionsList}
              selectedItem={selectedAction?.name}
            />
          </div>
        </PopupPortal>
      )}
    </div>
  );
};

const FilesList = ({ files }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const dropdownRefs = useRef({});
  const menuButtonRefs = useRef({});
  const hoverTimeoutRef = useRef(null);

  const [deleteFile] = useDeleteFileMutation();

  const handleActionSelect = async (action, fileId) => {
    switch (action.name) {
      case 'Delete':
        await deleteFile(fileId);
        setOpenMenuId(null);
        break;
      default:
        break;
    }
    setSelectedAction(null);
  };

  const handleMenuHover = (fileId, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      const btnNode = menuButtonRefs.current[fileId];
      if (btnNode) {
        const { top, left, height, width } = btnNode.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const estimatedMenuWidth = 180;
        const estimatedMenuHeight = 350;

        let menuX = width + left;
        let menuY = top - 30;

        if (menuX + estimatedMenuWidth > viewportWidth) {
          menuX = left - estimatedMenuWidth;
        }

        if (menuY + estimatedMenuHeight > viewportHeight) {
          if (top - estimatedMenuHeight > 0) {
            menuY = top - estimatedMenuHeight + 30;
          } else {
            menuY = Math.max(0, viewportHeight - estimatedMenuHeight);
          }
        }

        if (menuY < 0) {
          menuY = 0;
        }

        setPopupPosition({
          top: menuY,
          left: menuX,
        });
      }
      setOpenMenuId(fileId);
    }, 100);
  };

  const handleMenuLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setOpenMenuId(null);
    }, 100);
  };

  const actionsList = [
    { id: 1, name: 'Preview', icon: PreviewIcon },
    { id: 2, name: 'Rename', icon: RenameIcon },
    { id: 3, name: 'Download', icon: DownloadBtnIcon },
    { id: 4, name: 'Edit', icon: EditBtnIcon },
    { id: 5, name: 'View details', icon: VievDetailsIcon },
    { id: 6, name: 'Delete', icon: DeleteBtnIcon },
  ];

  return (
    <div className={styles.filesList}>
      {files.map(file => (
        <FileItem
          key={file.id}
          file={file}
          onMenuHover={handleMenuHover}
          onMenuLeave={handleMenuLeave}
          openMenuId={openMenuId}
          popupPosition={popupPosition}
          dropdownRefs={dropdownRefs}
          menuButtonRefs={menuButtonRefs}
          handleActionSelect={handleActionSelect}
          selectedAction={selectedAction}
          actionsList={actionsList}
        />
      ))}
    </div>
  );
};

export { FilesList };
