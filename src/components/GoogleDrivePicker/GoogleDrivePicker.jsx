import React, { useEffect, useState } from 'react';
import styles from './GoogleDrivePicker.module.scss';
import { initializeGoogleDrive, listFiles, downloadFile } from '../../services/googleDrive';

const GoogleDrivePicker = ({ onClose, onFileSelect }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeGoogleDrive();
        const fileList = await listFiles();
        setFiles(fileList);
      } catch (error) {
        console.error('Error initializing Google Drive:', error);
        setError('Failed to connect to Google Drive. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    try {
      const searchResults = await listFiles(`and name contains '${query}'`);
      setFiles(searchResults);
    } catch (error) {
      console.error('Error searching files:', error);
      setError('Failed to search files. Please try again.');
    }
  };

  const handleFileSelect = async (file) => {
    try {
      const fileData = await downloadFile(file.id);
      const blob = new Blob([fileData], { type: file.mimeType });
      const fileObject = new File([blob], file.name, { type: file.mimeType });
      onFileSelect(fileObject);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Select from Google Drive</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.search}>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.fileList}>
          {files.map(file => (
            <div
              key={file.id}
              className={styles.fileItem}
              onClick={() => handleFileSelect(file)}
            >
              <div className={styles.fileIcon}>
                <img src="/icons/video-icon.svg" alt="Video" />
              </div>
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoogleDrivePicker; 