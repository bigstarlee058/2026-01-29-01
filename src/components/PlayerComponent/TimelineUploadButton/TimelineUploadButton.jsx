import React, { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addMediaClip } from '../../../redux/timeline/timelineSlice';
import { processMediaFile } from '../../../utils/mediaUpload';
import { getAcceptAttribute } from '../../../utils/fileFormatters';
import toast from 'react-hot-toast';
import styles from './TimelineUploadButton.module.scss';
import { StoreContext } from '../../../mobx';

/**
 * Button to upload media files to the timeline
 * Supports drag & drop and file selection
 */
export const TimelineUploadButton = ({ onUploadStart, onUploadComplete }) => {
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const store = React.useContext(StoreContext);
  const dragOverRef = useRef(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const timelineDropZoneRef = useRef(null);

  // Keep file references alive to prevent blob URL garbage collection
  const fileReferencesRef = useRef(new Map());

  const handleFileSelect = async files => {
    if (!files || files.length === 0) return;

    onUploadStart?.();

    try {
      for (const file of files) {
        try {
          const processedMedia = await processMediaFile(file, 0);

          // Generate unique clip ID
          const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Determine element type and row based on file type
          let elementType = processedMedia.type;
          let propertyKey = 'src';
          let targetRow = 0;

          if (processedMedia.type === 'image') {
            elementType = 'imageUrl';
            propertyKey = 'imageUrl';
            targetRow = store.editorElements.filter(
              el => el.type === 'imageUrl'
            ).length;
          } else if (processedMedia.type === 'video') {
            elementType = 'video';
            propertyKey = 'src';
            targetRow = store.editorElements.filter(
              el => el.type === 'video'
            ).length;
          } else if (processedMedia.type === 'audio') {
            elementType = 'audio';
            propertyKey = 'src';
            targetRow = store.editorElements.filter(
              el => el.type === 'audio'
            ).length;
          }

          // Create element for MobX store
          const newElement = {
            id: clipId,
            type: elementType,
            row: targetRow,
            fileName: processedMedia.fileName,
            timeFrame: {
              start: processedMedia.startTime,
              end: processedMedia.startTime + processedMedia.duration,
            },
            from: processedMedia.startTime,
            to: processedMedia.startTime + processedMedia.duration,
            duration: processedMedia.duration,
            properties: {
              [propertyKey]: processedMedia.source,
              volume: processedMedia.type === 'audio' ? 1.0 : undefined,
              opacity: processedMedia.type === 'image' ? 1.0 : undefined,
            },
            linkedAudioClipId: processedMedia.linkedAudioClipId,
            createdAt: new Date().toISOString(),
          };

          // Clean up undefined properties
          Object.keys(newElement.properties).forEach(key => {
            if (newElement.properties[key] === undefined) {
              delete newElement.properties[key];
            }
          });

          // Keep file reference alive to prevent blob URL garbage collection
          fileReferencesRef.current.set(clipId, file);

          // Add to MobX store for immediate rendering
          store.editorElements.push(newElement);
          console.log(store.editorElements);

          // Update maxTime
          const clipEnd = processedMedia.startTime + processedMedia.duration;
          if (clipEnd > store.maxTime) {
            store.maxTime = clipEnd;
          }

          // Update maxRows if needed
          if (targetRow >= store.maxRows) {
            store.setMaxRows(targetRow + 1);
          }

          // Dispatch Redux action for persistence (DISABLED - no backend)
          // dispatch(
          //   addMediaClip({
          //     type: processedMedia.type,
          //     source: processedMedia.source,
          //     startTime: processedMedia.startTime,
          //     duration: processedMedia.duration,
          //     linkedAudioClipId: processedMedia.linkedAudioClipId,
          //     fileName: processedMedia.fileName,
          //   })
          // );

          // If video has audio, add audio clip too (LOCAL ONLY)
          if (
            processedMedia.linkedAudioClipId &&
            processedMedia.type === 'video'
          ) {
            // Add audio element to MobX
            const audioClipId = processedMedia.linkedAudioClipId;
            const audioRow = store.editorElements.filter(
              el => el.type === 'audio'
            ).length;
            const audioElement = {
              id: audioClipId,
              type: 'audio',
              row: audioRow,
              fileName: `${processedMedia.fileName} (audio)`,
              timeFrame: {
                start: processedMedia.startTime,
                end: processedMedia.startTime + processedMedia.duration,
              },
              from: processedMedia.startTime,
              to: processedMedia.startTime + processedMedia.duration,
              duration: processedMedia.duration,
              properties: {
                src: processedMedia.source,
                volume: 1.0,
              },
              createdAt: new Date().toISOString(),
            };

            store.editorElements.push(audioElement);

            if (audioRow >= store.maxRows) {
              store.setMaxRows(audioRow + 1);
            }

            // DISABLED - no backend
            // dispatch(
            //   addMediaClip({
            //     type: 'audio',
            //     source: processedMedia.source,
            //     startTime: processedMedia.startTime,
            //     duration: processedMedia.duration,
            //     fileName: `${processedMedia.fileName} (audio)`,
            //   })
            // );
          }

          toast.success(`Added ${processedMedia.fileName} to timeline`);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          toast.error(`Failed to add ${file.name}: ${error.message}`);
        }
      }
    } finally {
      onUploadComplete?.();
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsDragActive(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = e => {
    console.log('File input changed:', e.target.files);
    handleFileSelect(e.target.files);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the button itself
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Setup timeline-wide drop zone
  useEffect(() => {
    const timelineContent = document.querySelector('[data-timeline-content]');
    if (timelineContent) {
      const handleTimelineDragOver = e => {
        e.preventDefault();
        e.stopPropagation();
        timelineContent.classList.add('drag-over');
      };

      const handleTimelineDragLeave = e => {
        e.preventDefault();
        e.stopPropagation();
        timelineContent.classList.remove('drag-over');
      };

      const handleTimelineDrop = e => {
        e.preventDefault();
        e.stopPropagation();
        timelineContent.classList.remove('drag-over');
        handleFileSelect(e.dataTransfer.files);
      };

      timelineContent.addEventListener('dragover', handleTimelineDragOver);
      timelineContent.addEventListener('dragleave', handleTimelineDragLeave);
      timelineContent.addEventListener('drop', handleTimelineDrop);

      return () => {
        timelineContent.removeEventListener('dragover', handleTimelineDragOver);
        timelineContent.removeEventListener(
          'dragleave',
          handleTimelineDragLeave
        );
        timelineContent.removeEventListener('drop', handleTimelineDrop);
      };
    }
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getAcceptAttribute('All')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default TimelineUploadButton;
