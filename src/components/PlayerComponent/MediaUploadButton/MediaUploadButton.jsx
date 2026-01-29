import React, { useRef, useContext, useState } from 'react';
import { observer } from 'mobx-react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { StoreContext } from '../../../mobx';
import { prepareMediaFiles } from '../../../utils/mediaUpload';
import { runInAction } from 'mobx';
import toast from 'react-hot-toast';
import styles from './MediaUploadButton.module.scss';

/**
 * Upload Media Button Component
 * Allows users to select and upload media files to the timeline
 */
const MediaUploadButton = observer(({ disabled = false }) => {
  const fileInputRef = useRef(null);
  const store = useContext(StoreContext);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Handle file selection from input
   */
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFiles(files);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Process selected files
   */
  const processFiles = async (files) => {
    setIsUploading(true);

    try {
      // Prepare all files (validates and extracts metadata)
      const preparedMediaList = await prepareMediaFiles(files);

      if (preparedMediaList.length === 0) {
        toast.error('No valid media files to upload');
        return;
      }

      // Add each media file to timeline
      const currentTime = store.currentTimeInMs || 0;

      for (const preparedMedia of preparedMediaList) {
        try {
          await runInAction(async () => {
            await store.addMediaToTimeline(preparedMedia, currentTime);
          });

          toast.success(`Added ${preparedMedia.name} to timeline`);
        } catch (error) {
          console.error(`Failed to add ${preparedMedia.name}:`, error);
          toast.error(`Failed to add ${preparedMedia.name}: ${error.message}`);
        }
      }

      // Refresh timeline display
      store.refreshElements?.();
    } catch (error) {
      console.error('Failed to process files:', error);
      toast.error(`Failed to process files: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Trigger file input click
   */
  const handleButtonClick = () => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={styles.mediaUploadButton}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      <ButtonWithIcon
        icon="UploadIcon"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        tooltipText={isUploading ? 'Uploading...' : 'Upload media files'}
        className={styles.uploadButton}
      />
    </div>
  );
});

export default MediaUploadButton;
