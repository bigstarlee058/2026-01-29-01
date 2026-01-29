import React, { memo } from 'react';
import { CustomCheckbox } from '../CustomCheckbox/CustomCheckbox';
import { ThreeDotsIcon, NoteIcon, MovieIcon, ImageIcon } from 'components/Icons';
import styles from './DataTable.module.scss';

const UploadingRow = memo(({
  item,
  itemIndex,
  columns,
  itemProgress,
  isSmallVideoPlaceholder,
  selectable,
  showCheckbox,
  checkedStates,
  toggleCheckbox,
  onCancelUpload,
}) => {
  const isVideo = item.type === 'VIDEO' || item.type === 'MP4';
  const progress = itemProgress?.progress || 0;
  const isCompleted = itemProgress?.completed || false;
  const hasError = itemProgress?.error || false;
  
  const getStatusText = () => {
    if (hasError) return 'Upload failed';
    if (isCompleted) return 'Upload complete';
    if (progress < 30) return 'Uploading...';
    if (progress < 70) return 'Processing...';
    if (progress < 95) return 'Finalizing...';
    return 'Almost done...';
  };
  
  const getProgressColor = () => {
    if (hasError) return '#f44336';
    if (isCompleted) return '#4CAF50';
    return 'var(--accent-color)';
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    if (onCancelUpload && item.id) {
      onCancelUpload(item.id);
    }
  };

  return (
    <tr
      key={item.id || itemIndex}
      className={`${styles.item_row} ${styles.uploading_row}`}
    >
      {selectable && showCheckbox && (
        <td className={`${styles.row_content} ${styles.col_checkbox}`}>
          <CustomCheckbox
            checked={checkedStates[itemIndex]}
            onChange={() => toggleCheckbox(itemIndex)}
            onClick={e => e.stopPropagation()}
          />
        </td>
      )}
      <td
        colSpan={columns.length}
        className={`${styles.row_content} ${styles.col_nameColumn}`}
      >
        <div className={styles.uploading_item_container}>
          <div
            className={`${styles.uploading_thumbnail} ${
              isVideo && !isSmallVideoPlaceholder && styles.placeholder_video
            }`}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt="thumb"
                className={styles.thumbnail}
              />
            ) : (
              <div className={styles.uploading_placeholder}>
                {item.type === 'MP3' || item.type === 'AUDIO' ? (
                  <NoteIcon size="16px" />
                ) : item.type === 'MP4' || item.type === 'VIDEO' ? (
                  <MovieIcon
                    size={isVideo && !isSmallVideoPlaceholder ? '20px' : '16px'}
                  />
                ) : (
                  <ImageIcon size="16px" />
                )}
              </div>
            )}
          </div>
          <div className={styles.uploading_name}>
            <div className={styles.uploading_title}>{item.title}</div>
            <div className={`${styles.uploading_subtitle} ${
              hasError ? styles.error : isCompleted ? styles.success : ''
            }`}>
              {getStatusText()}
            </div>
            <div className={styles.uploading_progress_container}>
              <div className={styles.uploading_progress_bar}>
                <div
                  className={styles.uploading_progress_fill}
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: getProgressColor()
                  }}
                />
              </div>
              <div className={styles.uploading_progress_info}>
                <span className={styles.uploading_percentage}>
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>

          <div 
            className={styles.uploading_dots}
            onClick={handleCancelClick}
            style={{ cursor: 'pointer' }}
            title="Cancel upload"
          >
            <ThreeDotsIcon size="15px" />
          </div>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.itemProgress?.progress === nextProps.itemProgress?.progress &&
    prevProps.itemProgress?.error === nextProps.itemProgress?.error &&
    prevProps.checkedStates[prevProps.itemIndex] === nextProps.checkedStates[nextProps.itemIndex]
  );
});

UploadingRow.displayName = 'UploadingRow';

export { UploadingRow };