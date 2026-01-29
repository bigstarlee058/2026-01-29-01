import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { StoreContext } from '../../../mobx';
import { 
  useUnifiedDropZone, 
  processDroppedFiles,
  isExternalFileDrag
} from '../../../utils/dnd/unifiedDropZone';
import { uploadFile } from '../../../services/fileUploadService';
import toast from 'react-hot-toast';
import styles from './CanvasDropZone.module.scss';

/**
 * Canvas drop zone component that provides visual feedback for file drops
 * while maintaining compatibility with Fabric.js canvas
 */
export const CanvasDropZone = ({ 
  children, 
  disabled = false,
  onFileDropped,
  className 
}) => {
  const store = React.useContext(StoreContext);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dropZoneRef = useRef(null);
  const objectUrlsRef = useRef([]);
  
  // Handle file drop onto canvas
  const handleFileDrop = useCallback(async (files) => {
    if (!store) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Process the first file for canvas
      const file = files[0];
      if (files.length > 1) {
        toast('Only the first file will be added to canvas');
      }
      
      // Process the dropped file
      const [processedFile] = await processDroppedFiles([file], 'canvas');
      
      // Track object URLs for cleanup
      if (processedFile.url && processedFile.url.startsWith('blob:')) {
        objectUrlsRef.current.push(processedFile.url);
      }
      
      // Get current time for placement
      const currentTime = store.currentTimeInMs || 0;
      
      // Upload based on type
      if (processedFile.type === 'image') {
        const uploadedImage = await uploadFile(file, {
          type: 'image',
        });
        
        // Add image to canvas using the correct method signature
        if (store.addImageToCanvas) {
          await store.addImageToCanvas({
            store: store,  // Required parameter
            url: uploadedImage.url || processedFile.url,
            minUrl: processedFile.thumbnail || uploadedImage.thumbnail || uploadedImage.url || processedFile.url,  // Use processed thumbnail first
            imageId: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // Generate unique ID
            startTime: currentTime,
            endTime: currentTime + 5000,  // Default 5 second duration for images
            row: 0,  // Place on first row
            width: processedFile.width,  // Add dimensions from processed file
            height: processedFile.height,
          });
        }
        
        toast.success('Image added to canvas');
      } else if (processedFile.type === 'video') {
        const uploadedVideo = await uploadFile(file, {
          type: 'video',
        });
        
        // Add video using the correct store method
        if (store.handleVideoUploadFromUrl) {
          await store.handleVideoUploadFromUrl({
            url: uploadedVideo.url || processedFile.url,
            title: processedFile.name,
            duration: processedFile.duration ? Math.round(processedFile.duration * 1000) : null,  // Convert to ms and round
            row: 0,  // Place on first available row
            isNeedLoader: false,  // We already have the video loaded
          });
        } else {
          console.error('handleVideoUploadFromUrl method not found on store');
          toast.error('Failed to add video to canvas');
        }
        
        toast.success('Video added to timeline');
      } else if (processedFile.type === 'audio') {
        const uploadedAudio = await uploadFile(file, {
          type: 'audio',
        });
        
        // Add audio using the correct store method
        if (store.addExistingAudio) {
          await store.addExistingAudio({
            base64Audio: uploadedAudio.url || processedFile.url,  // URL works here (base64Audio accepts URLs too)
            durationMs: processedFile.duration ? Math.round(processedFile.duration * 1000) : 5000,  // Convert to ms and round
            duration: processedFile.duration ? Math.round(processedFile.duration * 1000) : 5000,  // Some methods use duration instead of durationMs
            row: undefined,  // Let store find available audio row
            startTime: currentTime,
            name: processedFile.name || 'Audio',
            id: `audio-${Date.now()}`,  // Generate unique ID
            audioType: 'local',  // Specify audio type
          });
        } else {
          console.error('addExistingAudio method not found on store');
          toast.error('Failed to add audio to timeline');
        }
        
        toast.success('Audio added to timeline');
      }
      
      // Call parent callback
      onFileDropped?.(processedFile);
      
    } catch (error) {
      console.error('Error processing canvas drop:', error);
      // More specific error messages
      if (error.message?.includes('method not found')) {
        toast.error('Store method error - please refresh and try again');
      } else if (error.message?.includes('upload')) {
        toast.error('Upload failed - please check your connection');
      } else {
        toast.error('Failed to add file to canvas');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [store, onFileDropped]);
  
  // Use unified drop zone hook
  const { isDragging, isValidDrag, dropZoneProps } = useUnifiedDropZone({
    onDrop: handleFileDrop,
    acceptedTypes: ['image', 'video', 'audio'],
    disabled: disabled || !store,
  });
  
  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      objectUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors from already revoked URLs
        }
      });
      objectUrlsRef.current = [];
    };
  }, []);
  
  // Get overlay class based on drag state
  const getOverlayClass = () => {
    const classes = [styles.dropOverlay];
    
    if (isDragging) {
      classes.push(styles.active);
      classes.push(isValidDrag ? styles.valid : styles.invalid);
    }
    
    if (isUploading) {
      classes.push(styles.uploading);
    }
    
    return classes.join(' ');
  };
  
  // Get hint text based on state
  const getHintText = () => {
    if (isUploading) {
      return `Uploading... ${uploadProgress}%`;
    }
    
    if (!isDragging) {
      return null;
    }
    
    if (isValidDrag) {
      return 'Drop to add to canvas';
    } else {
      return 'Unsupported file type';
    }
  };
  
  return (
    <div 
      ref={dropZoneRef}
      className={`${styles.canvasDropZone} ${className || ''}`}
      {...dropZoneProps}
      data-drop-active={isDragging}
      data-drop-valid={isValidDrag}
      aria-dropeffect={isDragging ? (isValidDrag ? 'copy' : 'none') : undefined}
    >
      {/* Canvas content */}
      {children}
      
      {/* Drop overlay - only visible during drag */}
      <div className={getOverlayClass()}>
        {/* Drop hint text */}
        {getHintText() && (
          <div className={`${styles.dropHint} ${isDragging ? styles.visible : ''}`}>
            {getHintText()}
          </div>
        )}
        
        {/* Upload progress bar */}
        {isUploading && (
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Hidden file input for accessibility */}
      <input
        type="file"
        className={styles.hiddenInput}
        accept="image/*,video/*,audio/*"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileDrop(files);
          }
          // Reset input
          e.target.value = '';
        }}
        aria-label="Upload file to canvas"
      />
    </div>
  );
};