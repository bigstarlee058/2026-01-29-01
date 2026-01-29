import styles from './UploadSection.module.scss';

const FileDetails = ({ fileInfo }) => {
  // Check if fileInfo exists to prevent errors
  if (!fileInfo) {
    return <div className={styles.fileDetails}>No file selected</div>;
  }

  // Determine if the file is an image based on type
  const isImage =
    fileInfo.type &&
    (fileInfo.type.toLowerCase().includes('jpg') ||
      fileInfo.type.toLowerCase().includes('jpeg') ||
      fileInfo.type.toLowerCase().includes('png') ||
      fileInfo.type.toLowerCase().includes('gif') ||
      fileInfo.type.toLowerCase().includes('webp') ||
      fileInfo.type.toLowerCase().includes('svg') ||
      fileInfo.type.toLowerCase().includes('bmp'));

  // Create an array of detail items to display
  const detailItems = [
    { label: 'File name:', value: fileInfo.name },
    { label: 'Document type:', value: fileInfo.type },
    { label: 'Date created:', value: fileInfo.dateCreated },
    { label: 'Date modified:', value: fileInfo.lastModifiedDate },
    // Only include dimensions if it's an image
    ...(isImage && fileInfo.dimensions
      ? [{ label: 'Image dimensions:', value: fileInfo.dimensions }]
      : []),
  ];

  return (
    <div className={styles.fileDetails_popUp}>
      {detailItems.map((item, index) => (
        <div key={index} className={styles.detailRow}>
          <span className={styles.detailLabel}>{item.label}</span>
          <span className={styles.detailValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export { FileDetails };
