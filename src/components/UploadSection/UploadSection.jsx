import { useState, useRef, useEffect } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './UploadSection.module.scss';
import { FilesList } from './FilesList';
import { UploadedFile } from './UploadedFile';
import {
  useGetGalleryQuery,
  useUploadFileMutation,
} from '../../redux/gallery/galleryApi';
import { LinkInput } from 'components/reusableComponents';

const UploadSection = ({ scene }) => {
  const { data: gallery } = useGetGalleryQuery();
  const [uploadFile] = useUploadFileMutation();

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isLinkInputShown, setIsLinkInputShown] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (gallery?.files?.length > 0) {
      const sortedFiles = [...gallery.files].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.lastModified || 0);
        const dateB = new Date(b.createdAt || b.lastModified || 0);
        return dateB - dateA; // Newest first
      });
      setFiles(sortedFiles);
    }
  }, [gallery]);

  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = async image => {
    image.preventDefault();
    image.stopPropagation();
    setIsDragging(false);

    if (image.dataTransfer.files && image.dataTransfer.files.length > 0) {
      handleFiles(image.dataTransfer.files);
    }
    try {
    } catch (error) {}
  };

  const handleFileInputChange = e => {
if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async fileList => {
    const currentTime = new Date().toISOString();
    const newFiles = Array.from(fileList).map(file => {
      const formattedDate = file.lastModifiedDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        id: Date.now() + Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        progress: 0,
        size: formatFileSize(file.size),
        type: getFileType(file),
        lastModifiedDate: formattedDate,
        createdAt: currentTime, // Add current timestamp for sorting
        lastModified: currentTime, // Add current timestamp for sorting
        dimensions: file.type.startsWith('image/') ? '1920 × 1080' : null,
        error: false,
      };
    });

    setFiles(prev => [...newFiles, ...prev]);

    // Upload each file
    for (const fileData of newFiles) {
      try {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('name', fileData.name);
        
        const response = await uploadFile(formData);
        
        if (response.error) {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, error: true, progress: 100 } 
                : f
            )
          );
        } else {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, progress: 100 } 
                : f
            )
          );
        }
      } catch (error) {
        setFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, error: true, progress:  100 } 
              : f
          )
        );
      }
    }
  };

  const getFileType = file => {
// First try to get the extension from the filename
    const fileNameParts = file.name.split('.');
    if (fileNameParts.length > 1) {
      const extension = fileNameParts[fileNameParts.length - 1];
      return extension.toUpperCase();
    }

    // Fallback to MIME type if filename doesn't have an extension
    const fileExtension = file.type.split('/')[1];
    if (fileExtension) {
      return fileExtension.toUpperCase();
    }

    // Last resort fallback
    return 'FILE';
  };

  const formatFileSize = bytes => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleLinkClick = () => {
    setIsLinkInputShown(!isLinkInputShown);
  };

  const handleUrlUpload = async (url) => {
    if (!url || !url.trim()) {
      console.error('No URL provided');
      return;
    }

    try {
      // Create a unique ID for this upload
      const uploadId = Date.now() + Math.random().toString(36).substring(2, 9);
      const filename = url.split('/').pop() || 'uploaded-file';
      const fileType = url.split('.').pop()?.split('?')[0] || 'FILE';

      // Add to uploading files
      const newUploadingFile = {
        id: uploadId,
        name: filename,
        progress: 0,
        size: 'Unknown',
        type: fileType.toUpperCase(),
        error: false,
        isUrlUpload: true,
      };

      setFiles(prev => [newUploadingFile, ...prev]);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadId 
              ? { ...f, progress: Math.min((f.progress || 0) + 15, 90) }
              : f
          )
        );
      }, 300);

      // Here you would call your URL upload API
      // For now, we'll just simulate the upload
      setTimeout(() => {
        clearInterval(progressInterval);
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadId 
              ? { ...f, progress: 100 }
              : f
          )
        );
      }, 2000);

      // Clear the URL input
      setLinkUrl('');
      setIsLinkInputShown(false);

    } catch (error) {
      console.error('URL upload error:', error);
    }
  };

  const buttonsList = [
    {
      id: 1,
      label: 'Upload files',
      icon: 'upload',
      method: handleUploadClick,
    },
    {
      id: 2,
      label: 'Add a link',
      icon: 'link',
      method: handleLinkClick,
    },
  ];

  return (
    <div
      className={`${styles.uploadSection} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={styles.buttonsContainer}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          multiple
        />
        {buttonsList.map(btn => (
          <ButtonWithIcon
            key={btn.id}
            text={btn.label}
            icon={btn.id === 1 ? 'PlusIcon' : 'PlusIcon'}
            classNameButton={styles.uploadBtn}
            color="#FFFFFF99"
            accentColor="#FFFFFFCC"
            activeColor="white"
            onClick={btn.method}
            size="15"
            tooltipText={btn.label}
          />
        ))}
      </div>

      {files.length === 0 && !isLinkInputShown && (
        <p className={styles.dropText}>
          or simply drag & drop your media anywhere
        </p>
      )}
      {isLinkInputShown && (
        <LinkInput
          value={linkUrl}
          onChange={setLinkUrl}
          onUpload={handleUrlUpload}
          onCancel={() => setIsLinkInputShown(false)}
        />
      )}

      {files.length > 0 && <FilesList files={files} />}
    </div>
  );
};

export { UploadSection };
