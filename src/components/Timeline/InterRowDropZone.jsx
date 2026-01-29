import { useState, useEffect, useRef, useContext } from 'react';
import { useDrop, useDragDropManager } from 'react-dnd';
import styles from './Timeline.module.scss';
import { StoreContext } from '../../mobx';
import { uploadImage } from '../../utils/uploadImage';
import { getUid } from 'utils';

const InterRowDropZone = ({
  rowIndex,
  position = 'bottom', // 'top' or 'bottom'
}) => {
  const store = useContext(StoreContext);
  const dragDropManager = useDragDropManager();

  // Track if there's an active drag operation
  const [isDragActive, setIsDragActive] = useState(false);
  const [isStableHover, setIsStableHover] = useState(false);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const timeoutRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const dropZoneRef = useRef(null);
  const globalMouseTrackingRef = useRef(null);

  useEffect(() => {
    const monitor = dragDropManager.getMonitor();

    const checkDragState = () => {
      const isDragging = monitor.isDragging();
      const itemType = monitor.getItemType();
      // Only activate for timeline items and gallery items, with a small delay
      const isRelevantDrag =
        isDragging &&
        (itemType === 'timeline-item' ||
          itemType === 'gallery-image' ||
          itemType === 'scene-image' ||
          itemType === 'gallery-video' ||
          itemType === 'scene-video' ||
          itemType === 'gallery-audio' ||
          itemType === 'animation-effect' ||
          itemType === 'animation-drop' ||
          itemType === 'gl-transition-drop');

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (isRelevantDrag) {
        // Add a small delay to allow drag to start properly
        timeoutRef.current = setTimeout(() => {
          setIsDragActive(true);
          document.body.classList.add('drag-active');
          timeoutRef.current = null;
        }, 200); // Longer delay to ensure drag starts properly
      } else {
        setIsDragActive(false);
        setIsStableHover(false);
        document.body.classList.remove('drag-active');
      }
    };

    checkDragState(); // Initial check
    const unsubscribe = monitor.subscribeToStateChange(checkDragState);

    return () => {
      unsubscribe();
      document.body.classList.remove('drag-active');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [dragDropManager]);

  // Track file drag state from store
  useEffect(() => {
    setIsFileDragActive(store.ghostState.isFileDragging);
  }, [store.ghostState.isFileDragging]);

  // Add global mouse tracking to handle cases where resizable handles interfere
  useEffect(() => {
    if (!isDragActive && !isFileDragActive) return;

    const handleGlobalMouseMove = e => {
      if (!dropZoneRef.current) return;

      // Check if mouse is over a resizable handle - if so, ignore
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (
        elementUnderMouse &&
        elementUnderMouse.classList.contains('react-resizable-handle')
      ) {
        return; // Don't interfere with resizable handles
      }

      const rect = dropZoneRef.current.getBoundingClientRect();
      // Expand detection zone to catch mouse near the drop zone
      const expandedZone = 8;
      const isMouseOver =
        e.clientX >= rect.left - expandedZone &&
        e.clientX <= rect.right + expandedZone &&
        e.clientY >= rect.top - expandedZone &&
        e.clientY <= rect.bottom + expandedZone;

      // Clear any existing timeout
      if (globalMouseTrackingRef.current) {
        clearTimeout(globalMouseTrackingRef.current);
        globalMouseTrackingRef.current = null;
      }

      if (isMouseOver && !isStableHover) {
        setIsStableHover(true);

        // Handle file ghost hover
        if (store.ghostState.isFileDragging) {
          const timelineContainer = document.querySelector(
            '[class*="timelineRowContainer"]'
          );
          if (timelineContainer) {
            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft || 0;
            const mouseX = e.clientX - containerRect.left + scrollLeft;
            const actualWidth =
              timelineContainer.scrollWidth || containerRect.width;
            const newPosition = (mouseX / actualWidth) * store.maxTime;
            const targetRow = position === 'top' ? rowIndex : rowIndex + 1;

            // Inter-row drops are always compatible (new row)
            store.updateFileGhost(newPosition, targetRow, false);
          }
        }

        // Hide all timeline ghosts when hovering over inter-row drop zone
        if (store.ghostState.isDragging || store.ghostState.isMultiDragging) {
          // Hide timeline element ghosts, but keep the drag state
          const currentGhostState = { ...store.ghostState };
          store.ghostState.ghostElement = null;
          store.ghostState.multiGhostElements = [];
          // Keep drag state active for proper drop handling
        }

        // Keep gallery ghost active for inter-row hover (so user sees preview). Do not reset here.
      } else if (!isMouseOver && isStableHover) {
        // Add delay before removing hover to prevent flickering
        globalMouseTrackingRef.current = setTimeout(() => {
          // Double-check that we're still not over the zone
          if (dropZoneRef.current) {
            const currentRect = dropZoneRef.current.getBoundingClientRect();
            const stillOver =
              e.clientX >= currentRect.left - expandedZone &&
              e.clientX <= currentRect.right + expandedZone &&
              e.clientY >= currentRect.top - expandedZone &&
              e.clientY <= currentRect.bottom + expandedZone;

            if (!stillOver) {
              setIsStableHover(false);
            }
          }
          globalMouseTrackingRef.current = null;
        }, 150); // Longer delay to handle resizable handle interference
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      if (globalMouseTrackingRef.current) {
        clearTimeout(globalMouseTrackingRef.current);
        globalMouseTrackingRef.current = null;
      }
    };
  }, [isDragActive, isFileDragActive, isStableHover]);

  const getAudioLengthFromUrl = async url => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration * 1000);
      });
      audio.addEventListener('error', reject);
      audio.src = url;
    });
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [
      'timeline-item',
      'gallery-image',
      'scene-image',
      'gallery-video',
      'scene-video',
      'gallery-audio',
      'animation-effect',
      'animation-drop',
      'gl-transition-drop',
      '__NATIVE_FILE__',
    ],
    drop: async (item, monitor) => {
      if (monitor.didDrop()) {
        return;
      }

      const targetRow = position === 'top' ? rowIndex : rowIndex + 1;

      // Handle timeline items (existing elements moved between rows)
      if (item.type === undefined && item.id) {
        const draggedElement = store.editorElements.find(
          el => el.id === item.id
        );
        if (!draggedElement) return;

        // Compute exact drop time from mouse coordinates
        const clientOffset = monitor.getClientOffset();
        const initialClientOffset = monitor.getInitialClientOffset();
        const initialSourceClientOffset =
          monitor.getInitialSourceClientOffset();
        let dropTimePosition = null;

        if (clientOffset) {
          const timelineContainer = document.querySelector(
            '[class*="timelineRowContainer"]'
          );
          if (timelineContainer) {
            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft || 0;
            const mouseX = clientOffset.x - containerRect.left + scrollLeft;
            let adjustedX = mouseX;

            if (initialClientOffset && initialSourceClientOffset) {
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const elementCurrentPosition =
                (draggedElement.timeFrame.start / store.maxTime) * actualWidth;
              const initialClickX =
                initialClientOffset.x - containerRect.left + scrollLeft;
              const initialClickOffset = initialClickX - elementCurrentPosition;
              adjustedX = Math.max(0, mouseX - initialClickOffset);
            } else {
              const elementDuration =
                draggedElement.timeFrame.end - draggedElement.timeFrame.start;
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const elementWidthPx =
                (elementDuration / store.maxTime) * actualWidth;
              adjustedX = Math.max(0, mouseX - elementWidthPx / 2);
            }

            const actualWidth =
              timelineContainer.scrollWidth || containerRect.width;
            dropTimePosition = (adjustedX / actualWidth) * store.maxTime;
            dropTimePosition = Math.max(
              0,
              Math.min(store.maxTime, dropTimePosition)
            );
          }
        }

        // If the current drag is an animation drag (including GL transitions), finish via ghost API
        if (
          store.ghostState.isDragging &&
          store.ghostState.isAnimationDrag &&
          store.ghostState.draggedElement?.id === item.id
        ) {
          // Create a new row at the inter-row position, then finish the animation move into that row
          store.shiftRowsDown(targetRow);
          store.finishAnimationGhostDrag(
            dropTimePosition ?? draggedElement.timeFrame.start,
            targetRow
          );
        } else {
          // Fallback for non-animation timeline items
          store.moveElementToInterRowDropZone(
            item.id,
            targetRow,
            dropTimePosition
          );
        }
        return;
      }

      // Handle gallery items with ghost positioning
      if (
        item.type === 'gallery-image' ||
        item.type === 'scene-image' ||
        item.type === 'animation-drop' ||
        item.type === 'gl-transition-drop'
      ) {
        // Use gallery ghost to determine position
        if (
          store.ghostState.isGalleryDragging &&
          store.ghostState.galleryGhostElement
        ) {
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            const timelineContainer = document.querySelector(
              '[class*="timelineRowContainer"]'
            );
            if (timelineContainer) {
              const containerRect = timelineContainer.getBoundingClientRect();
              const scrollLeft = timelineContainer.scrollLeft || 0;
              const mouseX = clientOffset.x - containerRect.left + scrollLeft;
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const finalPosition = (mouseX / actualWidth) * store.maxTime;

              // Finish gallery ghost drag with custom drop handler
              store.finishGalleryGhostDrag(
                finalPosition,
                targetRow,
                async (startTime, finalTargetRow) => {
                  if (
                    item.type === 'gallery-image' ||
                    item.type === 'scene-image'
                  ) {
                    store.shiftRowsDown(finalTargetRow);
                    await store.addImageLocal({
                      url: item.image.googleCloudUrl || item.image.url,
                      minUrl: item.image.minGoogleCloudUrl || item.image.minUrl,
                      row: finalTargetRow,
                      startTime: startTime,
                    });
                  } else if (item.type === 'animation-drop') {
                    // Skip if this is actually a timeline-item drag (existing element being moved)
                    if (
                      store.ghostState.isDragging &&
                      store.ghostState.isAnimationDrag
                    ) {
                      return;
                    }

                    // Always insert a new row for inter-row drops
                    store.shiftRowsDown(finalTargetRow);
                    const animationData = item.animation;
                    const actualType =
                      animationData.unifiedType || animationData.type;
                    const actualProperties =
                      animationData.unifiedProperties ||
                      animationData.properties ||
                      {};

                    const newAnimation = {
                      id: getUid(),
                      type: actualType,
                      duration:
                        actualProperties.duration ||
                        animationData.duration ||
                        600,
                      properties: {
                        ...actualProperties,
                        absoluteStart: startTime,
                        absoluteEnd:
                          startTime +
                          (actualProperties.duration ||
                            animationData.duration ||
                            600),
                      },
                      effectVariant: animationData.effectVariant,
                      row: finalTargetRow,
                    };

                    store.addAnimation(newAnimation);
                    store.validateAndUpdateAnimationTargets(
                      newAnimation.id,
                      finalTargetRow
                    );
                    store.scheduleAnimationRefresh();
                  } else if (item.type === 'gl-transition-drop') {
                    // Skip if this is actually a timeline-item drag (existing element being moved)
                    if (
                      store.ghostState.isDragging &&
                      store.ghostState.isAnimationDrag
                    ) {
                      return;
                    }

                    // Always insert a new row for inter-row drops
                    store.shiftRowsDown(finalTargetRow);
                    const glTransitionData = item.glTransition;

                    // Create GL transition with proper structure like addGLTransition
                    const transitionId = getUid();
                    const newAnimation = {
                      id: transitionId,
                      type: 'glTransition',
                      transitionType: glTransitionData.transitionType,
                      duration: glTransitionData.duration || 1000,
                      startTime: startTime,
                      endTime: startTime + (glTransitionData.duration || 1000),
                      row: finalTargetRow,
                      manuallyAdjusted: false,
                      fromElementId: null, // Will be set by validateAndUpdateAnimationTargets
                      toElementId: null, // Will be set by validateAndUpdateAnimationTargets
                      targetIds: [], // Will be populated by validateAndUpdateAnimationTargets
                      properties: {
                        transitionType: glTransitionData.transitionType,
                        duration: glTransitionData.duration || 1000,
                        startTime: startTime,
                        endTime:
                          startTime + (glTransitionData.duration || 1000),
                        absoluteStart: startTime,
                        absoluteEnd:
                          startTime + (glTransitionData.duration || 1000),
                      },
                    };

                    // Add to animations array directly like addGLTransition does
                    store.animations.push(newAnimation);

                    // Create the timeline element separately like for regular animations
                    const timelineElement = {
                      id: getUid(),
                      type: 'animation',
                      animationId: newAnimation.id,
                      row: finalTargetRow,
                      timeFrame: {
                        start: startTime,
                        end: startTime + (glTransitionData.duration || 1000),
                      },
                      isGLTransition: true,
                      effectDirection: 'transition',
                      properties: {
                        displayName:
                          glTransitionData.name ||
                          glTransitionData.transitionType,
                      },
                    };
                    store.editorElements.push(timelineElement);

                    store.validateAndUpdateAnimationTargets(
                      newAnimation.id,
                      finalTargetRow
                    );
                    store.scheduleAnimationRefresh();
                  }
                }
              );
              return;
            }
          }
        }

        // Fallback:
        if (item.type === 'gallery-image' || item.type === 'scene-image') {
          store.shiftRowsDown(targetRow);
          await store.addImageLocal({
            url: item.image.googleCloudUrl || item.image.url,
            minUrl: item.image.minGoogleCloudUrl || item.image.minUrl,
            row: targetRow,
            startTime: 0,
          });
          return;
        }
      }

      if (item.type === 'gallery-video' || item.type === 'scene-video') {
        // Use gallery ghost to determine position
        if (
          store.ghostState.isGalleryDragging &&
          store.ghostState.galleryGhostElement
        ) {
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            const timelineContainer = document.querySelector(
              '[class*="timelineRowContainer"]'
            );
            if (timelineContainer) {
              const containerRect = timelineContainer.getBoundingClientRect();
              const scrollLeft = timelineContainer.scrollLeft || 0;
              const mouseX = clientOffset.x - containerRect.left + scrollLeft;
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const finalPosition = (mouseX / actualWidth) * store.maxTime;

              // Finish gallery ghost drag with custom drop handler
              store.finishGalleryGhostDrag(
                finalPosition,
                targetRow,
                async (startTime, finalTargetRow) => {
                  store.shiftRowsDown(finalTargetRow);
                  await store.handleVideoUploadFromUrl({
                    url: item.video.url,
                    title: item.video.title || 'Video',
                    key: item.video.key || null,
                    duration: item.video.duration || null,
                    row: finalTargetRow,
                    startTime: startTime,
                  });
                }
              );
              return;
            }
          }
        }

        // Fallback to old logic
        store.shiftRowsDown(targetRow);
        await store.handleVideoUploadFromUrl({
          url: item.video.url,
          title: item.video.title || 'Video',
          key: item.video.key || null,
          duration: item.video.duration || null,
          row: targetRow,
        });
        return;
      }

      if (item.type === 'gallery-audio') {
        // Use gallery ghost to determine position
        if (
          store.ghostState.isGalleryDragging &&
          store.ghostState.galleryGhostElement
        ) {
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            const timelineContainer = document.querySelector(
              '[class*="timelineRowContainer"]'
            );
            if (timelineContainer) {
              const containerRect = timelineContainer.getBoundingClientRect();
              const scrollLeft = timelineContainer.scrollLeft || 0;
              const mouseX = clientOffset.x - containerRect.left + scrollLeft;
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const finalPosition = (mouseX / actualWidth) * store.maxTime;

              // Finish gallery ghost drag with custom drop handler
              store.finishGalleryGhostDrag(
                finalPosition,
                targetRow,
                async (startTime, finalTargetRow) => {
                  store.shiftRowsDown(finalTargetRow);
                  store.addExistingAudio({
                    base64Audio: item.audio.url,
                    durationMs: item.audio.duration,
                    row: finalTargetRow,
                    startTime: startTime,
                    audioType: 'music',
                    duration: item.audio.duration,
                    ...(item.audio.id && { id: item.audio.id }),
                  });
                }
              );
              return;
            }
          }
        }

        // Fallback to old logic
        store.shiftRowsDown(targetRow);
        store.addExistingAudio({
          base64Audio: item.audio.url,
          durationMs: item.audio.duration,
          row: targetRow,
          startTime: 0,
          audioType: 'music',
          duration: item.audio.duration,
          ...(item.audio.id && { id: item.audio.id }),
        });
        return;
      }

      if (item.type === 'animation-effect') {
        // Use gallery ghost to determine position
        if (
          store.ghostState.isGalleryDragging &&
          store.ghostState.galleryGhostElement
        ) {
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            const timelineContainer = document.querySelector(
              '[class*="timelineRowContainer"]'
            );
            if (timelineContainer) {
              const containerRect = timelineContainer.getBoundingClientRect();
              const scrollLeft = timelineContainer.scrollLeft || 0;
              const mouseX = clientOffset.x - containerRect.left + scrollLeft;
              const actualWidth =
                timelineContainer.scrollWidth || containerRect.width;
              const finalPosition = (mouseX / actualWidth) * store.maxTime;

              // Finish gallery ghost drag with custom drop handler
              store.finishGalleryGhostDrag(
                finalPosition,
                targetRow,
                async (startTime, finalTargetRow) => {
                  store.shiftRowsDown(finalTargetRow);
                  await store.handleVideoUploadFromUrl({
                    url: item.effect.url,
                    title: item.effect.title || 'Animation Effect',
                    key: item.effect.key || null,
                    duration: item.effect.duration || null,
                    row: finalTargetRow,
                    startTime: startTime,
                  });
                }
              );
              return;
            }
          }
        }

        // Fallback to old logic
        store.shiftRowsDown(targetRow);
        await store.handleVideoUploadFromUrl({
          url: item.effect.url,
          title: item.effect.title || 'Animation Effect',
          key: item.effect.key || null,
          duration: item.effect.duration || null,
          row: targetRow,
        });
        return;
      }

      // Handle native file drops
      if (monitor.getItemType() === '__NATIVE_FILE__') {
        const files = monitor.getItem().files;
        if (files && files.length > 0) {
          const file = files[0];
          const targetRow = position === 'top' ? rowIndex : rowIndex + 1;

          // Use file ghost position if available
          if (
            store.ghostState.isFileDragging &&
            store.ghostState.fileGhostElement
          ) {
            const clientOffset = monitor.getClientOffset();
            if (clientOffset) {
              const timelineContainer = document.querySelector(
                '[class*="timelineRowContainer"]'
              );
              if (timelineContainer) {
                const containerRect = timelineContainer.getBoundingClientRect();
                const scrollLeft = timelineContainer.scrollLeft || 0;
                const mouseX = clientOffset.x - containerRect.left + scrollLeft;
                const actualWidth =
                  timelineContainer.scrollWidth || containerRect.width;
                const finalPosition = (mouseX / actualWidth) * store.maxTime;

                // Finish file ghost drag with custom drop handler
                store.finishFileGhostDrag(
                  finalPosition,
                  targetRow,
                  async (startTime, finalTargetRow) => {
                    // Create new row for the file
                    store.shiftRowsDown(finalTargetRow);

                    // Handle different file types - implement actual file upload logic
                    await handleFileDropWithPosition(
                      file,
                      startTime,
                      finalTargetRow
                    );

                    async function handleFileDropWithPosition(
                      file,
                      startTime,
                      targetRow
                    ) {
                      if (file.type.startsWith('audio/')) {
                      } else if (file.type.startsWith('image/')) {
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          const response = await uploadImage(formData);

                          if (response) {
                            await store.addImageLocal({
                              url: response.data.url,
                              minUrl: response.data.minUrl,
                              row: targetRow,
                              startTime: startTime,
                            });
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error);
                        }
                      } else if (file.type.startsWith('video/')) {
                        try {
                          // Handle video locally for immediate preview
                          await store.handleVideoUpload(file);

                          // Get video duration
                          const duration = await new Promise(resolve => {
                            const video = document.createElement('video');
                            video.preload = 'metadata';
                            video.onloadedmetadata = () => {
                              resolve(video.duration * 1000); // Convert to milliseconds
                            };
                            video.src = URL.createObjectURL(file);
                          });

                          // For now, just add to timeline with local URL
                          // Full AWS upload would happen in background
                          await store.handleVideoUploadFromUrl({
                            url: URL.createObjectURL(file),
                            title: file.name,
                            key: null,
                            duration: duration,
                            row: targetRow,
                            startTime: startTime,
                            isNeedLoader: false,
                          });
                        } catch (error) {
                          console.error('Error uploading video:', error);
                        }
                      }
                    }
                  }
                );
                return;
              }
            }
          }

          // Fallback: create new row at position 0
          store.shiftRowsDown(targetRow);

          // Handle file upload without ghost position
          if (file.type.startsWith('audio/')) {
          } else if (file.type.startsWith('image/')) {
            try {
              const formData = new FormData();
              formData.append('image', file);
              const response = await uploadImage(formData);
              if (response) {
                await store.addImageLocal({
                  url: response.data.url,
                  minUrl: response.data.minUrl,
                  row: targetRow,
                  startTime: 0,
                });
              }
            } catch (error) {
              console.error('Error uploading image:', error);
            }
          } else if (file.type.startsWith('video/')) {
            try {
              // Handle video locally for immediate preview
              await store.handleVideoUpload(file);

              // Get video duration
              const duration = await new Promise(resolve => {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                  resolve(video.duration * 1000); // Convert to milliseconds
                };
                video.src = URL.createObjectURL(file);
              });

              // Add to timeline with local URL
              await store.handleVideoUploadFromUrl({
                url: URL.createObjectURL(file),
                title: file.name,
                key: null,
                duration: duration,
                row: targetRow,
                startTime: 0,
                isNeedLoader: false,
              });
            } catch (error) {
              console.error('Error uploading video:', error);
            }
          }
        }
        return;
      }

      store.refreshElements();
    },
    canDrop: item => {
      return true;
    },
    hover: (item, monitor) => {
      if (!isStableHover) {
        setIsStableHover(true);
      }

      // Clear any pending timeout to hide hover
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Hide timeline element ghosts when hovering over inter-row drop zone
      if (store.ghostState.isDragging || store.ghostState.isMultiDragging) {
        // Temporarily hide timeline ghosts
        store.ghostState.ghostElement = null;
        store.ghostState.multiGhostElements = [];
      }

      // Handle file ghost hover
      if (store.ghostState.isFileDragging) {
        const clientOffset = monitor.getClientOffset();
        if (clientOffset) {
          const timelineContainer = document.querySelector(
            '[class*="timelineRowContainer"]'
          );
          if (timelineContainer) {
            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft || 0;
            const mouseX = clientOffset.x - containerRect.left + scrollLeft;
            const actualWidth =
              timelineContainer.scrollWidth || containerRect.width;
            const newPosition = (mouseX / actualWidth) * store.maxTime;
            const targetRow = position === 'top' ? rowIndex : rowIndex + 1;

            // Inter-row drops are always compatible (new row)
            store.updateFileGhost(newPosition, targetRow, false);
          }
        }
        return; // Exit early for file ghost
      }

      // Handle gallery items with ghost system (including animation-drop and gl-transition-drop)
      if (
        item.type === 'gallery-image' ||
        item.type === 'scene-image' ||
        item.type === 'gallery-video' ||
        item.type === 'scene-video' ||
        item.type === 'gallery-audio' ||
        item.type === 'animation-effect' ||
        item.type === 'animation-drop' ||
        item.type === 'gl-transition-drop'
      ) {
        const clientOffset = monitor.getClientOffset();
        if (clientOffset) {
          // Find timeline container to calculate relative position
          const timelineContainer = document.querySelector(
            '[class*="timelineRowContainer"]'
          );
          if (timelineContainer) {
            const containerRect = timelineContainer.getBoundingClientRect();
            const scrollLeft = timelineContainer.scrollLeft || 0;
            const mouseX = clientOffset.x - containerRect.left + scrollLeft;
            const actualWidth =
              timelineContainer.scrollWidth || containerRect.width;
            const newPosition = (mouseX / actualWidth) * store.maxTime;

            // Determine element type and default duration
            let elementType, defaultDuration;
            if (item.type === 'gallery-image' || item.type === 'scene-image') {
              elementType = 'imageUrl';
              defaultDuration = 5000; // 5 seconds for images
            } else if (
              item.type === 'gallery-video' ||
              item.type === 'scene-video'
            ) {
              elementType = 'video';
              const videoData = item.video;
              defaultDuration = videoData.duration || 10000; // Use video duration or default 10 seconds
            } else if (item.type === 'gallery-audio') {
              elementType = 'audio';
              const audioData = item.audio;
              defaultDuration = audioData.duration || 30000; // Use audio duration or default 30 seconds
            } else if (item.type === 'animation-effect') {
              elementType = 'video'; // Animation effects are treated as videos
              const effectData = item.effect;
              defaultDuration = effectData.duration || 10000; // Use effect duration or default 10 seconds
            } else if (item.type === 'animation-drop') {
              elementType = 'animation';
              const anim = item.animation;
              defaultDuration =
                anim?.duration || anim?.unifiedProperties?.duration || 600;
            } else if (item.type === 'gl-transition-drop') {
              elementType = 'transition';
              const gl = item.glTransition;
              defaultDuration = gl?.duration || 1000;
            }

            // Start gallery ghost if not already started
            if (!store.ghostState.isGalleryDragging) {
              store.startGalleryGhostDrag(item, elementType, defaultDuration);
            }

            const targetRow = position === 'top' ? rowIndex : rowIndex + 1;

            // Update gallery ghost position - inter-row drops are always compatible
            // Offset preview to the inter-row zone's row (not the row below/above visual), to avoid appearing on the wrong line
            store.updateGalleryGhost(newPosition, targetRow, false);
          }
        }
      }
    },
    collect: monitor => {
      const currentIsOver = monitor.isOver({ shallow: true }); // Only direct hover, not children

      // Since we're using global mouse tracking, React DnD hover is supplementary
      // Only use React DnD to activate hover if global tracking hasn't already
      if (currentIsOver && !isStableHover) {
        setIsStableHover(true);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }

      return {
        isOver: currentIsOver,
        canDrop: monitor.canDrop(),
      };
    },
  });

  return (
    <>
      {(isDragActive || isFileDragActive) && (
        <div
          ref={node => {
            drop(node);
            dropZoneRef.current = node;
          }}
          className={`${styles.interRowDropZone} ${
            isOver && canDrop ? styles.dropZoneActive : ''
          }`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '16px', // Larger hover zone (8px + 4px top + 4px bottom)
            [position]: '-8px', // Center the hover zone
            zIndex: 50, // Lower z-index to not interfere with drag start
            pointerEvents: 'auto',
            background:
              isStableHover || isOver
                ? 'rgba(58, 252, 234, 0.1)'
                : 'transparent',
            border: '1px dashed rgba(58, 252, 234, 0.3)',
          }}
        >
          {(isStableHover || isOver) && canDrop && (
            <div
              className={styles.dropIndicator}
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '2px',
                transform: 'translateY(-50%)',
                background: '#3AFCEA',
                borderRadius: '1px',
                boxShadow: '0 0 6px rgba(58, 252, 234, 0.8)',
                animation: 'dropPulse 1s infinite',
                zIndex: 1001,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InterRowDropZone;
