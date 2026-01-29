import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import TimelineItem from './timeline-item';
import AnimationItem from './AnimationItem';
import TransitionVisualizer from './TransitionVisualizer';
import EffectVisualizer from './EffectVisualizer';
import GapIndicator from './GapIndicator';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';
import { GripIcon } from 'components/Icons';
import { useDrop, useDragDropManager } from 'react-dnd';
import { useDispatch, useSelector } from 'react-redux';
import { saveTimelineState } from '../../redux/timeline/timelineSlice';
import { uploadImage } from '../../utils/uploadImage';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { getUid } from 'utils';
import { uploadVideoToAWS } from '../../utils/awsUpload';
import { saveVideoData } from '../../utils/saveVideoMetadata';
import { user as selectUser } from '../../redux/auth/selectors';
import { Resizable } from 'react-resizable';

// Helper function to check if element types are compatible for mixing on same row
const areTypesCompatible = (type1, type2) => {
  // Subtitles can only be with subtitles
  const isType1Subtitle = type1 === 'text';
  const isType2Subtitle = type2 === 'text';

  if (isType1Subtitle || isType2Subtitle) {
    return isType1Subtitle && isType2Subtitle;
  }

  // Animation can go anywhere (except with subtitles, handled above)
  if (type1 === 'animation' || type2 === 'animation') {
    return true;
  }

  // All other types (audio, video, imageUrl, image) can mix together
  const mixableTypes = ['audio', 'video', 'imageUrl', 'image'];
  return mixableTypes.includes(type1) && mixableTypes.includes(type2);
};

const TimelineRow = observer(
  ({
    rowIndex,
    overlays,
    moveElementBetweenRows,
    toggleAnimations,
    handleActiveScene,
    storyData,
    rowId,
    defaultButton,
    isCutMode,
    setIsCutMode,
    scenes,
    onOpenTransitionPanel,
    onOpenEffectPanel,
  }) => {
    const [lastSwapTime, setLastSwapTime] = useState(null);
    const swapCooldown = 600;
    const minOverlapPercentage = 0.4;
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isDraggingFileOverDropZone, setIsDraggingFileOverDropZone] =
      useState(false);
    const [isDraggingFileOverTopDropZone, setIsDraggingFileOverTopDropZone] =
      useState(false);
    const [isDraggingTimelineElement, setIsDraggingTimelineElement] =
      useState(false);

    const dispatch = useDispatch();
    const dragDropManager = useDragDropManager();

    // Optimized row height management
    const rowType = overlays[0]?.type;

    const defaultHeight = useMemo(() => {
      const heights = {
        text: 28,
        image: 40,
        imageUrl: 40,
        audio: 36,
        transition: 24,
        video: 44,
        animation: 26,
      };
      return heights[rowType] || 32;
    }, [rowType]);

    const [rowHeight, setRowHeight] = useState(defaultHeight);

    // Update height only when row type changes
    useEffect(() => {
      setRowHeight(defaultHeight);
    }, [defaultHeight]);

    // Optimized resize handler with constraints
    const handleRowResize = useCallback((event, { size }) => {
      const newHeight = Math.max(20, Math.min(200, Math.round(size.height)));
      setRowHeight(newHeight);
    }, []);

    // Monitor for timeline element dragging
    useEffect(() => {
      const monitor = dragDropManager.getMonitor();

      const checkDragState = () => {
        const isDragging = monitor.isDragging();
        const itemType = monitor.getItemType();
        const isTimelineItem = itemType === 'timeline-item';

        if (isDragging && isTimelineItem) {
          setIsDraggingTimelineElement(true);
        } else {
          setIsDraggingTimelineElement(false);
        }
      };

      const unsubscribe = monitor.subscribeToStateChange(checkDragState);

      return () => {
        unsubscribe();
      };
    }, [dragDropManager]);

    const store = React.useContext(StoreContext);
    const user = useSelector(selectUser);
    const dropRef = useRef(null);
    const dragData = useRef({
      initialMouseX: 0,
      initialClickOffset: 0,
      initialRowId: null,
      draggedElementId: null,
    });

    const handleHover = useCallback(
      (draggedItem, monitor) => {
        const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        const initialClientOffset = monitor.getInitialClientOffset();
        const initialSourceClientOffset =
          monitor.getInitialSourceClientOffset();

        if (
          !hoverBoundingRect ||
          !clientOffset ||
          !initialClientOffset ||
          !initialSourceClientOffset
        )
          return;

        // If a resize just finished and the next action is a move, ensure the ghost starts immediately
        if (
          monitor.getItemType() === 'timeline-item' &&
          !store.ghostState.isDragging &&
          !store.ghostState.isMultiDragging
        ) {
          const element = store.editorElements.find(
            el => el.id === draggedItem.id
          );
          if (element) {
            const initialClickOffset =
              initialClientOffset.x - initialSourceClientOffset.x;
            store.startGhostDrag(element, initialClickOffset, 0, 'move');
          }
        }

        // Handle gallery items (images, videos, etc.)
        if (
          draggedItem.type === 'gallery-image' ||
          draggedItem.type === 'scene-image'
        ) {
          // If pointer is over a timeline item that accepts image drop, do not show row-level ghost
          const nodeUnderPointer = document.elementFromPoint(
            clientOffset.x,
            clientOffset.y
          );
          const timelineItemEl = nodeUnderPointer?.closest(
            '[data-timeline-item]'
          );
          if (timelineItemEl) {
            let overlayId = timelineItemEl.getAttribute('data-overlay-id');
            if (!overlayId) {
              const idHolder =
                timelineItemEl.querySelector('[data-overlay-id]');
              overlayId = idHolder?.getAttribute('data-overlay-id') || null;
            }
            if (overlayId) {
              const overlay = store.editorElements.find(
                el => el.id === overlayId
              );
              if (overlay && overlay.type === 'imageUrl') {
                // Hide row-level gallery ghost while hovering an accepting item
                if (store.hideGalleryGhostOnItemHover) {
                  store.hideGalleryGhostOnItemHover();
                }
                return; // let timeline-item handle updateImage drop
              }
            } else {
              // If hovering an item but id is unknown, avoid showing row ghost to prevent conflicts
              if (store.hideGalleryGhostOnItemHover) {
                store.hideGalleryGhostOnItemHover();
              }
              return;
            }
          }
          // Not over an accepting item: ensure the row-level ghost is visible again
          if (store.showGalleryGhostFromCache) {
            store.showGalleryGhostFromCache();
          }

          if (!store.ghostState.isGalleryDragging) {
            store.startGalleryGhostDrag(draggedItem.image, 'imageUrl', 5000);
          }

          const mouseX = clientOffset.x - hoverBoundingRect.left;
          const newPosition =
            (mouseX / hoverBoundingRect.width) * store.maxTime;
          const rowType = overlays[0]?.type;
          const isIncompatible =
            rowType && !areTypesCompatible(rowType, 'imageUrl');

          store.updateGalleryGhost(newPosition, rowIndex, isIncompatible);
          return;
        }

        if (
          draggedItem.type === 'gallery-video' ||
          draggedItem.type === 'scene-video'
        ) {
          // If pointer is over a timeline item that accepts video drop, do not show row-level ghost
          const nodeUnderPointer = document.elementFromPoint(
            clientOffset.x,
            clientOffset.y
          );
          const timelineItemEl = nodeUnderPointer?.closest(
            '[data-timeline-item]'
          );
          if (timelineItemEl) {
            let overlayId = timelineItemEl.getAttribute('data-overlay-id');
            if (!overlayId) {
              const idHolder =
                timelineItemEl.querySelector('[data-overlay-id]');
              overlayId = idHolder?.getAttribute('data-overlay-id') || null;
            }
            if (overlayId) {
              const overlay = store.editorElements.find(
                el => el.id === overlayId
              );
              if (overlay && overlay.type === 'video') {
                if (store.hideGalleryGhostOnItemHover) {
                  store.hideGalleryGhostOnItemHover();
                }
                return; // let timeline-item handle its own drop
              }
            } else {
              if (store.hideGalleryGhostOnItemHover) {
                store.hideGalleryGhostOnItemHover();
              }
              return;
            }
          }
          if (store.showGalleryGhostFromCache) {
            store.showGalleryGhostFromCache();
          }

          if (!store.ghostState.isGalleryDragging) {
            const videoDuration = draggedItem.video?.duration || 10000;
            store.startGalleryGhostDrag(
              draggedItem.video,
              'video',
              videoDuration
            );
          }

          const mouseX = clientOffset.x - hoverBoundingRect.left;
          const newPosition =
            (mouseX / hoverBoundingRect.width) * store.maxTime;
          const rowType = overlays[0]?.type;
          const isIncompatible =
            rowType && !areTypesCompatible(rowType, 'video');

          store.updateGalleryGhost(newPosition, rowIndex, isIncompatible);
          return;
        }

        if (draggedItem.type === 'animation-effect') {
          if (!store.ghostState.isGalleryDragging) {
            const effectDuration = draggedItem.effect?.duration || 10000;
            store.startGalleryGhostDrag(
              draggedItem.effect,
              'video',
              effectDuration
            );
          }

          const mouseX = clientOffset.x - hoverBoundingRect.left;
          const newPosition =
            (mouseX / hoverBoundingRect.width) * store.maxTime;
          const rowType = overlays[0]?.type;
          const isIncompatible =
            rowType && !areTypesCompatible(rowType, 'video');

          store.updateGalleryGhost(newPosition, rowIndex, isIncompatible);
          return;
        }

        if (draggedItem.type === 'animation-drop') {
          if (!store.ghostState.isGalleryDragging) {
            const animationDuration = draggedItem.animation?.duration || 1000;
            store.startGalleryGhostDrag(
              draggedItem.animation,
              'animation',
              animationDuration
            );
          }

          const mouseX = clientOffset.x - hoverBoundingRect.left;
          const newPosition =
            (mouseX / hoverBoundingRect.width) * store.maxTime;

          // Animations can be placed on any visual row (imageUrl, video, audio)
          const rowType = overlays[0]?.type;
          const isIncompatible = rowType && rowType === 'text'; // Only incompatible with text/subtitle rows

          store.updateGalleryGhost(newPosition, rowIndex, isIncompatible);
          return;
        }

        if (draggedItem.type === 'gl-transition-drop') {
          if (!store.ghostState.isGalleryDragging) {
            const transitionDuration =
              draggedItem.glTransition?.duration || 1000;
            store.startGalleryGhostDrag(
              draggedItem.glTransition,
              'transition',
              transitionDuration
            );
          }

          const mouseX = clientOffset.x - hoverBoundingRect.left;
          const newPosition =
            (mouseX / hoverBoundingRect.width) * store.maxTime;

          // GL Transitions can be placed on any visual row - system will find targets automatically
          const rowType = overlays[0]?.type;
          const isIncompatible = rowType && rowType === 'text'; // Only incompatible with text/subtitle rows

          store.updateGalleryGhost(newPosition, rowIndex, isIncompatible);
          return;
        }

        const draggedElement = store.editorElements.find(
          el => el.id === draggedItem.id
        );
        if (!draggedElement) return;

        const selectedElements =
          store?.selectedElements &&
          Object.keys(store.selectedElements).length > 0
            ? Object.values(store.selectedElements)
                .filter(selected => selected && selected.id)
                .map(selected =>
                  store.editorElements.find(
                    element => element.id === selected.id
                  )
                )
                .filter(Boolean)
            : [];

        const draggedElementIsSelected = selectedElements.some(
          selected => selected.id === draggedItem.id
        );

        if (draggedElementIsSelected && selectedElements?.length > 1) {
          // Use multi-ghost system for multiple elements
          if (!store.ghostState.isMultiDragging) {
            // Start multi-ghost drag
            const initialClickOffset =
              initialClientOffset.x - initialSourceClientOffset.x;
            store.startMultiGhostDrag(
              selectedElements,
              draggedElement,
              initialClickOffset
            );
          }

          // Use delta-based approach like single ghost
          if (store.ghostState.initialClientX === null) {
            store.ghostState.initialClientX = clientOffset.x;
          }

          const deltaX = clientOffset.x - store.ghostState.initialClientX;
          const deltaTime = (deltaX / hoverBoundingRect.width) * store.maxTime;
          const newPosition = Math.max(
            0,
            Math.min(
              store.maxTime,
              store.ghostState.initialElementStarts[
                store.ghostState.selectedElements.findIndex(
                  el => el.id === draggedElement.id
                )
              ] + deltaTime
            )
          );

          // Update multi-ghost elements
          store.updateMultiGhostElements(newPosition);
          return; // Exit early since we're handling multiple elements
        } else {
          store.setSelectedElements(null);
        }

        const elementBelongsToRow = overlays.some(
          el => el.id === draggedItem.id
        );

        // Initialize dragData if not already done (only for legacy system, not ghost)
        if (
          dragData.current.initialMouseX === 0 &&
          !store.ghostState.isDragging
        ) {
          if (!elementBelongsToRow) {
            const rowType = overlays[0]?.type;
            // Allow animation elements to be dragged to any row
            if (
              draggedElement.type !== rowType &&
              draggedElement.type !== 'animation'
            )
              return;
            return;
          }

          dragData.current = {
            initialMouseX: initialClientOffset.x,
            initialRowId: rowId,
            draggedElementId: draggedItem.id,
            initialClickOffset:
              initialClientOffset.x -
              hoverBoundingRect.left -
              (draggedElement.timeFrame.start / store.maxTime) *
                hoverBoundingRect.width,
          };
        }

        // Handle ghost system for all rows when dragging - this should work for ANY row
        if (
          store.ghostState.isDragging &&
          store.ghostState.draggedElement &&
          !store.ghostState.isMultiDragging
        ) {
          const draggedElement = store.ghostState.draggedElement;
          const rowType = overlays[0]?.type;

          // Check if element type is compatible with target row
          const isCompatible =
            !rowType || // Empty row
            areTypesCompatible(rowType, draggedElement.type);

          const mouseX = clientOffset.x - hoverBoundingRect.left;

          // Use delta-based approach like react-video-editor-pro
          if (store.ghostState.initialClientX === null) {
            // First hover - store initial mouse position
            store.ghostState.initialClientX = clientOffset.x;
          }

          const deltaX = clientOffset.x - store.ghostState.initialClientX;
          const deltaTime = (deltaX / hoverBoundingRect.width) * store.maxTime;
          const newPosition = Math.max(
            0,
            Math.min(
              store.maxTime,
              store.ghostState.initialElementStart + deltaTime
            )
          );

          // Always update ghost element position with push logic, regardless of compatibility
          // Use animation-specific push logic for animation elements
          if (draggedElement.type === 'animation') {
            store.updateAnimationGhostElementWithPush(
              newPosition,
              rowIndex,
              !isCompatible,
              draggedElement
            );
          } else {
            store.updateGhostElementWithPush(
              newPosition,
              rowIndex,
              !isCompatible,
              draggedElement
            );
          }
          return; // Exit early for ghost system
        }
      },
      [
        rowId,
        rowIndex,
        overlays,
        store.maxTime,
        store.editorElements,
        store.ghostState.isDragging,
        store.ghostState.draggedElement,
      ]
    );

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

    // Main row drop target
    const [{ isOver, canDrop }, drop] = useDrop({
      accept: [
        'timeline-item',
        'gallery-image',
        'scene-image',
        'gallery-video',
        'scene-video',
        'animation-effect',
        'animation-drop',
        'gl-transition-drop',
      ],
      hover: handleHover,
      drop: async (item, monitor) => {
        // Check if drop was already handled by a child
        if (monitor.didDrop()) {
          return;
        }

        // Handle timeline-item drop (ghost system)
        if (
          monitor.getItemType() === 'timeline-item' &&
          (store.ghostState.isDragging || store.ghostState.isMultiDragging)
        ) {
          const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
          const clientOffset = monitor.getClientOffset();

          if (hoverBoundingRect && clientOffset) {
            // Handle multi-ghost drop
            if (store.ghostState.isMultiDragging) {
              const deltaX = clientOffset.x - store.ghostState.initialClientX;
              const deltaTime =
                (deltaX / hoverBoundingRect.width) * store.maxTime;
              const draggedIndex = store.ghostState.selectedElements.findIndex(
                el => el.id === store.ghostState.draggedElement.id
              );
              const finalPosition = Math.max(
                0,
                Math.min(
                  store.maxTime,
                  store.ghostState.initialElementStarts[draggedIndex] +
                    deltaTime
                )
              );

              store.finishMultiGhostDrag(finalPosition);
              return;
            }

            // Handle single ghost drop
            if (store.ghostState.isDragging) {
              const draggedElement = store.ghostState.draggedElement;
              const rowType = overlays[0]?.type;

              // Check if element type is compatible with target row
              const isCompatible =
                !rowType || // Empty row
                areTypesCompatible(rowType, draggedElement.type);

              if (isCompatible) {
                // Use the same delta-based approach as in hover
                if (store.ghostState.initialClientX === null) {
                  store.ghostState.initialClientX = clientOffset.x;
                }

                const deltaX = clientOffset.x - store.ghostState.initialClientX;
                const deltaTime =
                  (deltaX / hoverBoundingRect.width) * store.maxTime;
                const finalPosition = Math.max(
                  0,
                  Math.min(
                    store.maxTime,
                    store.ghostState.initialElementStart + deltaTime
                  )
                );

                // Use appropriate finish method based on element type
                if (store.ghostState.isAnimationDrag) {
                  store.finishAnimationGhostDrag(finalPosition, rowIndex);
                } else {
                  store.finishGhostDrag(finalPosition, rowIndex);
                }
              }
            }
          }
          return;
        }

        if (item.type === 'gallery-image' || item.type === 'scene-image') {
          // Use gallery ghost position if available
          if (
            store.ghostState.isGalleryDragging &&
            store.ghostState.galleryGhostElement
          ) {
            const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();

            if (hoverBoundingRect && clientOffset) {
              const mouseX = clientOffset.x - hoverBoundingRect.left;
              const finalPosition =
                (mouseX / hoverBoundingRect.width) * store.maxTime;

              store.finishGalleryGhostDrag(
                finalPosition,
                rowIndex,
                async (startTime, targetRow) => {
                  const imageData = item.image;
                  await store.addImageLocal({
                    url: imageData.googleCloudUrl || imageData.url,
                    minUrl: imageData.minGoogleCloudUrl || imageData.minUrl,
                    row: targetRow,
                    startTime: startTime,
                  });
                }
              );
            }
            return;
          }

          // Fallback to old logic if no ghost
          const imageData = item.image;
          const rowElements = store.editorElements.filter(
            el => el.row === rowIndex
          );
          let startTime = 0;
          let hasSpace = true;

          if (rowElements.length > 0) {
            const sortedElements = [...rowElements].sort(
              (a, b) => a.timeFrame.start - b.timeFrame.start
            );
            hasSpace = false;

            for (let i = 0; i <= sortedElements.length; i++) {
              const currentStart =
                i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
              const nextStart =
                i === sortedElements.length
                  ? store.maxTime
                  : sortedElements[i].timeFrame.start;

              if (nextStart - currentStart >= 5000) {
                // 5 seconds for images
                startTime = currentStart;
                hasSpace = true;
                break;
              }
            }
          }

          if (hasSpace) {
            await store.addImageLocal({
              url: imageData.googleCloudUrl || imageData.url,
              minUrl: imageData.minGoogleCloudUrl || imageData.minUrl,
              row: rowIndex,
              startTime: startTime,
            });
          } else {
            store.shiftRowsDown(rowIndex + 1);
            await store.addImageLocal({
              url: imageData.googleCloudUrl || imageData.url,
              minUrl: imageData.minGoogleCloudUrl || imageData.minUrl,
              row: rowIndex + 1,
              startTime: 0,
            });
          }
          return;
        }

        if (item.type === 'gallery-video' || item.type === 'scene-video') {
          // Use gallery ghost position if available
          if (
            store.ghostState.isGalleryDragging &&
            store.ghostState.galleryGhostElement
          ) {
            const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();

            if (hoverBoundingRect && clientOffset) {
              const mouseX = clientOffset.x - hoverBoundingRect.left;
              const finalPosition =
                (mouseX / hoverBoundingRect.width) * store.maxTime;

              store.finishGalleryGhostDrag(
                finalPosition,
                rowIndex,
                async (startTime, targetRow) => {
                  const videoData = item.video;

                  // Use proxy for cross-origin videos
                  let videoUrl = videoData.url;
                  if (videoUrl && videoUrl.includes('videocdn.pollo.ai')) {
                    const path = videoUrl.replace(
                      'https://videocdn.pollo.ai/',
                      ''
                    );
                    videoUrl = `/api/proxy/video/${path}`;
                  }

                  await store.handleVideoUploadFromUrl({
                    url: videoUrl,
                    title: videoData.title || 'Video',
                    key: videoData.key || null,
                    duration: videoData.duration || null,
                    row: targetRow,
                    startTime: startTime,
                  });
                }
              );
            }
            return;
          }

          // Fallback to old logic if no ghost
          const videoData = item.video;
          const rowElements = store.editorElements.filter(
            el => el.row === rowIndex
          );
          let startTime = 0;
          let hasSpace = true;

          if (rowElements.length > 0) {
            const sortedElements = [...rowElements].sort(
              (a, b) => a.timeFrame.start - b.timeFrame.start
            );
            hasSpace = false;

            for (let i = 0; i <= sortedElements.length; i++) {
              const currentStart =
                i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
              const nextStart =
                i === sortedElements.length
                  ? store.maxTime
                  : sortedElements[i].timeFrame.start;

              // Assume minimum 10 seconds for videos (can be adjusted)
              if (nextStart - currentStart >= 10000) {
                startTime = currentStart;
                hasSpace = true;
                break;
              }
            }
          }

          if (hasSpace) {
            // Use proxy for cross-origin videos
            let videoUrl = videoData.url;
            if (videoUrl && videoUrl.includes('videocdn.pollo.ai')) {
              const path = videoUrl.replace('https://videocdn.pollo.ai/', '');
              videoUrl = `/api/proxy/video/${path}`;
            }

            await store.handleVideoUploadFromUrl({
              url: videoUrl,
              title: videoData.title || 'Video',
              key: videoData.key || null,
              duration: videoData.duration || null,
              row: rowIndex,
            });
          } else {
            // Use proxy for cross-origin videos
            let videoUrl = videoData.url;
            if (videoUrl && videoUrl.includes('videocdn.pollo.ai')) {
              const path = videoUrl.replace('https://videocdn.pollo.ai/', '');
              videoUrl = `/api/proxy/video/${path}`;
            }

            store.shiftRowsDown(rowIndex + 1);
            await store.handleVideoUploadFromUrl({
              url: videoUrl,
              title: videoData.title || 'Video',
              key: videoData.key || null,
              duration: videoData.duration || null,
              row: rowIndex + 1,
            });
          }
          return;
        }

        if (item.type === 'animation-effect') {
          // Use gallery ghost position if available
          if (
            store.ghostState.isGalleryDragging &&
            store.ghostState.galleryGhostElement
          ) {
            const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();

            if (hoverBoundingRect && clientOffset) {
              const mouseX = clientOffset.x - hoverBoundingRect.left;
              const finalPosition =
                (mouseX / hoverBoundingRect.width) * store.maxTime;

              store.finishGalleryGhostDrag(
                finalPosition,
                rowIndex,
                async (startTime, targetRow) => {
                  const effectData = item.effect;

                  // Use proxy for cross-origin videos
                  let effectUrl = effectData.url;
                  if (effectUrl && effectUrl.includes('videocdn.pollo.ai')) {
                    const path = effectUrl.replace(
                      'https://videocdn.pollo.ai/',
                      ''
                    );
                    effectUrl = `/api/proxy/video/${path}`;
                  }

                  await store.handleVideoUploadFromUrl({
                    url: effectUrl,
                    title: effectData.title || 'Animation Effect',
                    key: effectData.key || null,
                    duration: effectData.duration || null,
                    row: targetRow,
                    startTime: startTime,
                  });
                  // Auto-select the newly added effect video on the canvas
                  try {
                    const newlyAdded = store.editorElements
                      .slice()
                      .reverse()
                      .find(
                        el =>
                          el.type === 'video' &&
                          el.row === targetRow &&
                          el.properties?.src === effectData.url
                      );
                    if (newlyAdded) {
                      if (store.setSelectedElement) {
                        store.setSelectedElement(newlyAdded);
                      }
                      if (store.setSelectedElements) {
                        store.setSelectedElements({
                          ...[newlyAdded],
                          effect: newlyAdded.effect || 'in',
                        });
                      }
                    }
                  } catch (e) {
                    handleCatchError(
                      e,
                      'Auto-select effect video failed',
                      false
                    );
                  }
                }
              );
            }
            return;
          }

          // Fallback to old logic if no ghost
          const effectData = item.effect;
          const rowElements = store.editorElements.filter(
            el => el.row === rowIndex
          );
          let startTime = 0;
          let hasSpace = true;

          if (rowElements.length > 0) {
            const sortedElements = [...rowElements].sort(
              (a, b) => a.timeFrame.start - b.timeFrame.start
            );
            hasSpace = false;

            for (let i = 0; i <= sortedElements.length; i++) {
              const currentStart =
                i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
              const nextStart =
                i === sortedElements.length
                  ? store.maxTime
                  : sortedElements[i].timeFrame.start;

              // Assume minimum 10 seconds for animation effects (can be adjusted)
              if (nextStart - currentStart >= 10000) {
                startTime = currentStart;
                hasSpace = true;
                break;
              }
            }
          }

          if (hasSpace) {
            // Use proxy for cross-origin videos
            let effectUrl = effectData.url;
            if (effectUrl && effectUrl.includes('videocdn.pollo.ai')) {
              const path = effectUrl.replace('https://videocdn.pollo.ai/', '');
              effectUrl = `/api/proxy/video/${path}`;
            }

            await store.handleVideoUploadFromUrl({
              url: effectUrl,
              title: effectData.title || 'Animation Effect',
              key: effectData.key || null,
              duration: effectData.duration || null,
              row: rowIndex,
            });
            // Auto-select the newly added effect video on the canvas (current row)
            try {
              const newlyAdded = store.editorElements
                .slice()
                .reverse()
                .find(
                  el =>
                    el.type === 'video' &&
                    el.row === rowIndex &&
                    el.properties?.src === effectData.url
                );
              if (newlyAdded) {
                if (store.setSelectedElement) {
                  store.setSelectedElement(newlyAdded);
                }
                if (store.setSelectedElements) {
                  store.setSelectedElements({
                    ...[newlyAdded],
                    effect: newlyAdded.effect || 'in',
                  });
                }
              }
            } catch (e) {
              console.warn('Auto-select effect video failed', e);
            }
          } else {
            // Use proxy for cross-origin videos
            let effectUrl = effectData.url;
            if (effectUrl && effectUrl.includes('videocdn.pollo.ai')) {
              const path = effectUrl.replace('https://videocdn.pollo.ai/', '');
              effectUrl = `/api/proxy/video/${path}`;
            }

            store.shiftRowsDown(rowIndex + 1);
            await store.handleVideoUploadFromUrl({
              url: effectUrl,
              title: effectData.title || 'Animation Effect',
              key: effectData.key || null,
              duration: effectData.duration || null,
              row: rowIndex + 1,
            });
            // Auto-select the newly added effect video on the canvas (next row)
            try {
              const targetRow = rowIndex + 1;
              const newlyAdded = store.editorElements
                .slice()
                .reverse()
                .find(
                  el =>
                    el.type === 'video' &&
                    el.row === targetRow &&
                    el.properties?.src === effectData.url
                );
              if (newlyAdded) {
                if (store.setSelectedElement) {
                  store.setSelectedElement(newlyAdded);
                }
                if (store.setSelectedElements) {
                  store.setSelectedElements({
                    ...[newlyAdded],
                    effect: newlyAdded.effect || 'in',
                  });
                }
              }
            } catch (e) {
              console.warn('Auto-select effect video failed', e);
            }
          }
          return;
        }

        if (item.type === 'animation-drop') {
          console.log(
            'TimelineRow: animation-drop detected in drop handler',
            item
          );

          // Skip if this is actually a timeline-item drag (existing element being moved)
          if (store.ghostState.isDragging && store.ghostState.isAnimationDrag) {
            console.log(
              'TimelineRow: Skipping animation-drop - this is an existing animation being moved'
            );
            return;
          }

          // Use gallery ghost position for precise placement
          if (
            store.ghostState.isGalleryDragging &&
            store.ghostState.galleryGhostElement
          ) {
            console.log('TimelineRow: Using gallery ghost for animation-drop');
            const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();

            if (hoverBoundingRect && clientOffset) {
              const mouseX = clientOffset.x - hoverBoundingRect.left;
              const finalPosition =
                (mouseX / hoverBoundingRect.width) * store.maxTime;

              store.finishGalleryGhostDrag(
                finalPosition,
                rowIndex,
                async (startTime, targetRow) => {
                  console.log('TimelineRow: finishGalleryGhostDrag callback', {
                    startTime,
                    targetRow,
                  });
                  const animationData = item.animation;
                  console.log('TimelineRow: animationData', animationData);

                  // Create animation without specific targets - let the system determine them
                  const actualType =
                    animationData.unifiedType || animationData.type;
                  const actualProperties =
                    animationData.unifiedProperties ||
                    animationData.properties ||
                    {};

                  // Create new animation with minimal properties - no targetId needed
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
                    row: targetRow,
                  };
                  console.log(
                    'TimelineRow: Created newAnimation',
                    newAnimation
                  );

                  // Add animation to store
                  console.log(
                    'TimelineRow: Adding animation to store',
                    newAnimation
                  );
                  if (store) {
                    store.addAnimation(newAnimation);
                    console.log('TimelineRow: Animation added successfully');

                    // Validate and update animation targets
                    console.log(
                      'TimelineRow: Validating animation targets for row',
                      targetRow
                    );
                    console.log(
                      'TimelineRow: Elements in target row before validation:',
                      store.editorElements.filter(el => el.row === targetRow)
                    );
                    store.validateAndUpdateAnimationTargets(
                      newAnimation.id,
                      targetRow
                    );
                    console.log('TimelineRow: Animation targets validated');
                    console.log(
                      'TimelineRow: Updated animation:',
                      store.animations.find(a => a.id === newAnimation.id)
                    );

                    store.scheduleAnimationRefresh();

                    // Trigger Redux sync
                    if (
                      window.dispatchSaveTimelineState &&
                      !store.isUndoRedoOperation
                    ) {
                      window.dispatchSaveTimelineState(store);
                    }
                  } else {
                    console.error('TimelineRow: Store is not available');
                  }
                }
              );
            }
            return;
          }

          // Fallback if no ghost (shouldn't happen with new system)
          console.log('TimelineRow: Using fallback logic (no ghost)');
          const animationData = item.animation;

          const actualType = animationData.unifiedType || animationData.type;
          const actualProperties =
            animationData.unifiedProperties || animationData.properties || {};

          const newAnimation = {
            id: getUid(),
            type: actualType,
            duration:
              actualProperties.duration || animationData.duration || 600,
            properties: {
              ...actualProperties,
              absoluteStart: 0, // Default start position
              absoluteEnd:
                actualProperties.duration || animationData.duration || 600,
            },
            effectVariant: animationData.effectVariant,
            row: rowIndex,
          };

          console.log(
            'TimelineRow: Fallback - created animation',
            newAnimation
          );
          store.addAnimation(newAnimation);
          console.log('TimelineRow: Fallback - animation added');

          // Validate and update animation targets
          console.log(
            'TimelineRow: Fallback - validating animation targets for row',
            rowIndex
          );
          store.validateAndUpdateAnimationTargets(newAnimation.id, rowIndex);
          console.log('TimelineRow: Fallback - animation targets validated');

          store.scheduleAnimationRefresh();

          if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
            window.dispatchSaveTimelineState(store);
          }
          return;
        }

        if (item.type === 'gl-transition-drop') {
          console.log(
            'TimelineRow: gl-transition-drop detected in drop handler',
            item
          );

          // Skip if this is actually a timeline-item drag (existing element being moved)
          if (store.ghostState.isDragging && store.ghostState.isAnimationDrag) {
            console.log(
              'TimelineRow: Skipping gl-transition-drop - this is an existing animation being moved'
            );
            return;
          }

          // GL transitions need special handling - they should be added between elements
          if (
            store.ghostState.isGalleryDragging &&
            store.ghostState.galleryGhostElement
          ) {
            console.log(
              'TimelineRow: Using gallery ghost for gl-transition-drop'
            );
            const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();

            if (hoverBoundingRect && clientOffset) {
              const mouseX = clientOffset.x - hoverBoundingRect.left;
              const finalPosition =
                (mouseX / hoverBoundingRect.width) * store.maxTime;

              store.finishGalleryGhostDrag(
                finalPosition,
                rowIndex,
                async (startTime, targetRow) => {
                  console.log(
                    'TimelineRow: GL transition finishGalleryGhostDrag callback',
                    { startTime, targetRow }
                  );
                  const glTransitionData = item.glTransition;
                  console.log(
                    'TimelineRow: glTransitionData',
                    glTransitionData
                  );

                  // Create GL transition with minimal data - system will find targets automatically
                  const newGLTransition = {
                    id: getUid(),
                    type: 'glTransition',
                    transitionType: glTransitionData.transitionType,
                    duration: glTransitionData.duration,
                    startTime: startTime,
                    endTime: startTime + glTransitionData.duration,
                    row: targetRow,
                    properties: {
                      absoluteStart: startTime,
                      absoluteEnd: startTime + glTransitionData.duration,
                      duration: glTransitionData.duration,
                    },
                  };

                  console.log(
                    'TimelineRow: Created GL transition',
                    newGLTransition
                  );

                  // Add GL transition to store using animations array (like addGLTransition does)
                  if (store) {
                    // Add missing fields to match addGLTransition structure
                    newGLTransition.fromElementId = null; // Will be set by validateAndUpdateAnimationTargets
                    newGLTransition.toElementId = null; // Will be set by validateAndUpdateAnimationTargets
                    newGLTransition.targetIds = []; // Will be populated by validateAndUpdateAnimationTargets
                    newGLTransition.manuallyAdjusted = false;
                    newGLTransition.properties.transitionType =
                      glTransitionData.transitionType;

                    store.animations.push(newGLTransition);

                    // Create timeline element for GL transition
                    const timelineElement = {
                      id: getUid(),
                      type: 'animation',
                      animationId: newGLTransition.id,
                      row: targetRow,
                      timeFrame: {
                        start: startTime,
                        end: startTime + glTransitionData.duration,
                      },
                      isGLTransition: true,
                      effectDirection: 'transition', // This makes it show as purple GL transition
                      properties: {
                        displayName:
                          glTransitionData.name ||
                          glTransitionData.transitionType,
                      },
                    };

                    store.editorElements.push(timelineElement);
                    console.log('TimelineRow: GL transition added to timeline');

                    // Let system validate and find targets automatically
                    store.validateAndUpdateAnimationTargets(
                      newGLTransition.id,
                      targetRow
                    );
                    console.log('TimelineRow: GL transition targets validated');

                    store.scheduleAnimationRefresh();
                  }

                  // Trigger Redux sync
                  if (
                    window.dispatchSaveTimelineState &&
                    !store.isUndoRedoOperation
                  ) {
                    window.dispatchSaveTimelineState(store);
                  }
                }
              );
            }
          }

          return;
        }

        // If this is a file drop, don't handle it here
        if (!monitor.getItem()) return;
      },
      canDrop: item => {
        if (item.type === 'gallery-image' || item.type === 'scene-image') {
          const canDropImage =
            !overlays.length ||
            areTypesCompatible(overlays[0]?.type, 'imageUrl');
          return canDropImage;
        }

        if (item.type === 'gallery-video' || item.type === 'scene-video') {
          const canDropVideo =
            !overlays.length || areTypesCompatible(overlays[0]?.type, 'video');
          return canDropVideo;
        }

        if (item.type === 'animation-effect') {
          const canDropAnimation =
            !overlays.length ||
            areTypesCompatible(overlays[0]?.type, 'video') ||
            areTypesCompatible(overlays[0]?.type, 'imageUrl');
          return canDropAnimation;
        }

        if (item.type === 'animation-drop') {
          // Animations can be dropped on any visual row (not text/subtitle rows)
          const canDropAnimation =
            !overlays.length ||
            areTypesCompatible(overlays[0]?.type, 'imageUrl') ||
            areTypesCompatible(overlays[0]?.type, 'video') ||
            areTypesCompatible(overlays[0]?.type, 'audio');
          return canDropAnimation;
        }

        if (item.type === 'gl-transition-drop') {
          // GL transitions can be dropped on any visual row - system will find targets automatically
          const canDropGLTransition =
            !overlays.length ||
            areTypesCompatible(overlays[0]?.type, 'imageUrl') ||
            areTypesCompatible(overlays[0]?.type, 'video') ||
            areTypesCompatible(overlays[0]?.type, 'audio');
          return canDropGLTransition;
        }
        const draggedElement = store.editorElements.find(
          el => el.id === item.id
        );
        const rowType = overlays[0]?.type;

        if (!draggedElement) return false;

        const canDropResult =
          overlays.some(el => el.id === item.id) ||
          !rowType ||
          areTypesCompatible(rowType, draggedElement.type);

        return canDropResult;
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });

    const handleFileDropWithPosition = async (file, startTime, targetRow) => {
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
          handleCatchError(error, 'Failed to upload image');
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

          // Upload to AWS in the background
          const { url, key } = await uploadVideoToAWS(file, progress => {
            // Progress callback for video upload
          });

          // Save video metadata
          const videoData = {
            key: key,
            s3Url: url,
            title: file.name,
            length: duration / 1000, // Convert back to seconds for saveVideoData
          };

          const saved = await saveVideoData(
            videoData,
            store.currentStoryId,
            user
          );

          // Update store with uploaded video
          store.handleVideoUploadFromUrl({
            url: url,
            title: file.name,
            key: key,
            duration: duration,
            row: targetRow,
            startTime: startTime,
            isNeedLoader: false,
          });
        } catch (error) {
          handleCatchError(error, 'Failed to upload video');
        }
      }
    };

    const onFileDrop = async e => {
      e.preventDefault();
      setIsDraggingFile(false);

      // Check if we're currently dragging a timeline element
      if (isDraggingTimelineElement) {
        return;
      }

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];

        // Use file ghost position if available
        if (
          store.ghostState.isFileDragging &&
          store.ghostState.fileGhostElement
        ) {
          const rect = dropRef.current?.getBoundingClientRect();
          if (rect) {
            const mouseX = e.clientX - rect.left;
            const finalPosition = (mouseX / rect.width) * store.maxTime;

            store.finishFileGhostDrag(
              finalPosition,
              rowIndex,
              async (startTime, targetRow) => {
                await handleFileDropWithPosition(file, startTime, targetRow);
              }
            );
            return;
          }
        }

        if (
          file.type.startsWith('audio/') &&
          (!overlays.length || areTypesCompatible(overlays[0]?.type, 'audio'))
        ) {
        } else if (file.type.startsWith('image/')) {
          try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await uploadImage(formData);

            if (response) {
              // Check if current row is empty or compatible with imageUrl type
              if (
                !overlays.length ||
                areTypesCompatible(overlays[0]?.type, 'imageUrl')
              ) {
                // Check if there's enough space in current row
                const rowElements = store.editorElements.filter(
                  el => el.row === rowIndex
                );

                // Find first available position
                let startTime = 0;
                let hasSpace = true;

                if (rowElements.length > 0) {
                  // Sort elements by start time
                  const sortedElements = [...rowElements].sort(
                    (a, b) => a.timeFrame.start - b.timeFrame.start
                  );

                  hasSpace = false; // Reset hasSpace before checking gaps

                  // Check gaps between elements
                  for (let i = 0; i <= sortedElements.length; i++) {
                    const currentStart =
                      i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
                    const nextStart =
                      i === sortedElements.length
                        ? store.maxTime
                        : sortedElements[i].timeFrame.start;

                    if (nextStart - currentStart >= 5000) {
                      // 5 seconds for images
                      startTime = currentStart;
                      hasSpace = true;
                      break;
                    }
                  }
                }

                if (hasSpace) {
                  // Add to current row
                  await store.addImageLocal({
                    url: response.data.url,
                    minUrl: response.data.minUrl,
                    row: rowIndex,
                    startTime: startTime,
                  });
                } else {
                  // Create new row and add element there
                  store.shiftRowsDown(rowIndex + 1);
                  await store.addImageLocal({
                    url: response.data.url,
                    minUrl: response.data.minUrl,
                    row: rowIndex + 1,
                    startTime: 0,
                  });
                }
              } else {
                // Add to new row if current row is not imageUrl type
                await store.addImageLocal({
                  url: response.data.url,
                  minUrl: response.data.minUrl,
                  row: store.maxRows,
                  startTime: 0,
                });
              }
            }
          } catch (error) {
            handleCatchError(error, 'Failed to upload image');
          }
        } else if (file.type.startsWith('video/')) {
        }
      }
    };

    useEffect(() => {
      const dropTarget = dropRef.current;
      if (!dropTarget) return;

      const handleDragEnter = e => {
        e.preventDefault();
        // Don't treat timeline elements as file drags
        if (isDraggingTimelineElement) {
          return;
        }

        // Check if this is a React DnD operation (animation drop, etc.)
        // React DnD uses 'application/json' and specific keys for its operations
        if (
          e.dataTransfer?.types.includes('application/json') ||
          e.dataTransfer?.types.some(type =>
            type.startsWith('__REACT_DND_NATIVE_TYPE__')
          )
        ) {
          // This is a React DnD operation, don't handle it here
          return;
        }

        if (e.dataTransfer?.types.includes('Files')) {
          const fileType = e.dataTransfer.items?.[0]?.type;
          if (
            (fileType.startsWith('audio/') &&
              (!overlays.length ||
                areTypesCompatible(overlays[0]?.type, 'audio'))) ||
            (fileType.startsWith('image/') &&
              (!overlays.length ||
                areTypesCompatible(overlays[0]?.type, 'imageUrl'))) ||
            (fileType.startsWith('video/') &&
              (!overlays.length ||
                areTypesCompatible(overlays[0]?.type, 'video')))
          ) {
            setIsDraggingFile(true);

            // Start file ghost drag only once
            if (!store.ghostState.isFileDragging) {
              const file = e.dataTransfer.items?.[0];
              let elementType = 'imageUrl';
              let defaultDuration = 5000; // 5 seconds for images

              if (fileType.startsWith('audio/')) {
                elementType = 'audio';
                defaultDuration = 30000; // 30 seconds for audio
              } else if (fileType.startsWith('video/')) {
                elementType = 'video';
                defaultDuration = 10000; // 10 seconds for video
              }

              store.startFileGhostDrag(file, elementType, defaultDuration);
            }
          }
        }
      };

      const handleDragOver = e => {
        e.preventDefault();

        // Update file ghost position if dragging files - local handler has priority
        if (
          store.ghostState.isFileDragging &&
          e.dataTransfer?.types.includes('Files')
        ) {
          const rect = dropRef.current?.getBoundingClientRect();
          if (rect) {
            const mouseX = e.clientX - rect.left;
            const newPosition = (mouseX / rect.width) * store.maxTime;
            const rowType = overlays[0]?.type;
            const fileType = e.dataTransfer.items?.[0]?.type;

            let targetElementType = 'imageUrl';
            if (fileType?.startsWith('audio/')) {
              targetElementType = 'audio';
            } else if (fileType?.startsWith('video/')) {
              targetElementType = 'video';
            }

            const isIncompatible =
              rowType && !areTypesCompatible(rowType, targetElementType);
            store.updateFileGhost(newPosition, rowIndex, isIncompatible);
          }
        }
      };

      const handleDragLeave = e => {
        e.preventDefault();
        setIsDraggingFile(false);
        // Don't reset ghost here - let global handler in timeline-grid manage it
      };

      const handleDrop = e => {
        // Check if this is a React DnD operation (animation drop, etc.)
        // React DnD uses 'application/json' and specific keys for its operations
        if (
          e.dataTransfer?.types.includes('application/json') ||
          e.dataTransfer?.types.some(type =>
            type.startsWith('__REACT_DND_NATIVE_TYPE__')
          )
        ) {
          // This is a React DnD operation, don't handle it here
          return;
        }

        setIsDraggingFile(false);
        onFileDrop(e);
      };

      dropTarget.addEventListener('dragenter', handleDragEnter);
      dropTarget.addEventListener('dragover', handleDragOver);
      dropTarget.addEventListener('dragleave', handleDragLeave);
      dropTarget.addEventListener('drop', handleDrop);

      return () => {
        dropTarget.removeEventListener('dragenter', handleDragEnter);
        dropTarget.removeEventListener('dragover', handleDragOver);
        dropTarget.removeEventListener('dragleave', handleDragLeave);
        dropTarget.removeEventListener('drop', handleDrop);
      };
    }, [overlays, onFileDrop]);

    useEffect(() => {
      const handleDragEnd = () => {
        setIsDraggingFile(false);
        setIsDraggingFileOverDropZone(false);
        setIsDraggingFileOverTopDropZone(false);
      };

      document.addEventListener('drop', handleDragEnd);

      return () => {
        document.removeEventListener('drop', handleDragEnd);
      };
    }, []);

    const renderRowDragHandle = useCallback(() => {
      const hasElements = overlays.length > 0;

      return (
        <div
          className={`${styles.rowDragHandle} ${
            store.ghostState.dragOverRowIndex === rowIndex
              ? styles.dragOver
              : ''
          } ${
            store.ghostState.draggedRowIndex === rowIndex ? styles.dragging : ''
          }`}
          data-row-drag-handle
          onMouseDown={e => {
            if (!hasElements) return;

            e.preventDefault();
            e.stopPropagation();

            store.startRowDrag(rowIndex);

            const handleMouseMove = moveEvent => {
              // Use outer wrappers with data-row-index from timeline-grid for reliable indexing
              const allRowWrappers = Array.from(
                document.querySelectorAll('[data-row-index]')
              );
              if (!allRowWrappers.length) return;

              const originWrapper = allRowWrappers[rowIndex];
              if (!originWrapper) return;
              const originRect = originWrapper.getBoundingClientRect();

              const hoveredWrapper = document
                .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
                ?.closest('[data-row-index]');

              if (!hoveredWrapper) {
                store.updateRowDragOver(null);
                return;
              }

              const candidateIndex = parseInt(
                hoveredWrapper.getAttribute('data-row-index'),
                10
              );
              if (Number.isNaN(candidateIndex)) {
                store.updateRowDragOver(null);
                return;
              }

              if (candidateIndex === rowIndex) {
                store.updateRowDragOver(null);
                return;
              }

              const candidateRect = hoveredWrapper.getBoundingClientRect();
              let targetRowIndex = rowIndex;
              let insertPosition = null; // 'above' | 'below'
              if (candidateIndex > rowIndex) {
                const boundary = (originRect.bottom + candidateRect.top) / 2;
                if (moveEvent.clientY >= boundary) {
                  targetRowIndex = candidateIndex;
                  insertPosition = 'below';
                }
              } else {
                const boundary = (candidateRect.bottom + originRect.top) / 2;
                if (moveEvent.clientY <= boundary) {
                  targetRowIndex = candidateIndex;
                  insertPosition = 'above';
                }
              }

              if (targetRowIndex !== rowIndex) {
                store.updateRowDragOver(targetRowIndex, insertPosition);
              } else {
                store.updateRowDragOver(null, null);
              }
            };

            const handleMouseUp = upEvent => {
              const allRowWrappers = Array.from(
                document.querySelectorAll('[data-row-index]')
              );
              let targetRowIndex = rowIndex;
              if (allRowWrappers.length) {
                const originWrapper = allRowWrappers[rowIndex];
                if (originWrapper) {
                  const originRect = originWrapper.getBoundingClientRect();
                  const hoveredWrapper = document
                    .elementFromPoint(upEvent.clientX, upEvent.clientY)
                    ?.closest('[data-row-index]');
                  if (hoveredWrapper) {
                    const candidateIndex = parseInt(
                      hoveredWrapper.getAttribute('data-row-index'),
                      10
                    );
                    if (!Number.isNaN(candidateIndex)) {
                      if (candidateIndex === rowIndex) {
                        targetRowIndex = rowIndex;
                      } else {
                        const candidateRect =
                          hoveredWrapper.getBoundingClientRect();
                        if (candidateIndex > rowIndex) {
                          const boundary =
                            (originRect.bottom + candidateRect.top) / 2;
                          targetRowIndex =
                            upEvent.clientY >= boundary
                              ? candidateIndex
                              : rowIndex;
                        } else {
                          const boundary =
                            (candidateRect.bottom + originRect.top) / 2;
                          targetRowIndex =
                            upEvent.clientY <= boundary
                              ? candidateIndex
                              : rowIndex;
                        }
                      }
                    }
                  }
                }
              }

              if (targetRowIndex !== rowIndex) {
                store.finishRowDrag(targetRowIndex);
              } else {
                store.cancelRowDrag();
              }

              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          onClick={e => {
            e.stopPropagation();
          }}
          style={{
            opacity: hasElements ? 1 : 0.3,
            cursor: hasElements
              ? store.ghostState.draggedRowIndex === rowIndex
                ? 'grabbing'
                : 'grab'
              : 'default',
          }}
        >
          {hasElements && <GripIcon size={14} color="#ffffff66" />}
        </div>
      );
    }, [overlays.length, rowIndex, store]);

    return (
      <div style={{ position: 'relative' }} data-testid="timeline-row">
        {/* Top drop zone removed - now handled in timeline-grid.jsx */}
        {false && rowIndex === 0 && (
          <div
            ref={node => {
              // dropAddTop(node);
              // dropAddFileTop(node);
            }}
            className={styles.dropZone}
            style={{
              position: 'absolute',
              top: '-4px',
              left: 0,
              right: 0,
              height: '12px',
              cursor: 'pointer',
            }}
            onDragEnter={e => {
              e.preventDefault();
              // Don't treat timeline elements as file drags
              if (isDraggingTimelineElement) {
                return;
              }

              // Check if this is a React DnD operation (animation drop, etc.)
              // React DnD uses 'application/json' and specific keys for its operations
              if (
                e.dataTransfer?.types.includes('application/json') ||
                e.dataTransfer?.types.some(type =>
                  type.startsWith('__REACT_DND_NATIVE_TYPE__')
                )
              ) {
                // This is a React DnD operation, don't handle it here
                return;
              }

              if (e.dataTransfer?.types.includes('Files')) {
                const fileType = e.dataTransfer.items?.[0]?.type;
                if (
                  fileType.startsWith('audio/') ||
                  fileType.startsWith('image/') ||
                  fileType.startsWith('video/')
                ) {
                  setIsDraggingFileOverTopDropZone(true);
                }
              }
            }}
            onDragLeave={e => {
              e.preventDefault();
              setIsDraggingFileOverTopDropZone(false);
            }}
            onDragOver={e => {
              e.preventDefault();
            }}
            onDrop={async e => {
              e.preventDefault();
              setIsDraggingFileOverTopDropZone(false);

              // Check if we're currently dragging a timeline element
              if (isDraggingTimelineElement) {
                return;
              }

              // Check if this is a React DnD operation (animation drop, etc.)
              // React DnD uses 'application/json' and specific keys for its operations
              if (
                e.dataTransfer?.types.includes('application/json') ||
                e.dataTransfer?.types.some(type =>
                  type.startsWith('__REACT_DND_NATIVE_TYPE__')
                )
              ) {
                // This is a React DnD operation, don't handle it here
                return;
              }

              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const file = files[0];

                if (file.type.startsWith('audio/')) {
                } else if (file.type.startsWith('image/')) {
                  try {
                    const formData = new FormData();
                    formData.append('image', file);

                    const response = await uploadImage(formData);

                    if (response) {
                      store.shiftRowsDown(0);
                      await store.addImageLocal({
                        url: response.data.url,
                        minUrl: response.data.minUrl,
                        row: 0,
                        startTime: 0,
                      });
                    }
                  } catch (error) {
                    handleCatchError(error, 'Failed to upload image');
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

                    // Upload to AWS in the background
                    const { url, key } = await uploadVideoToAWS(
                      file,
                      progress => {
                        // Progress callback for video upload
                      }
                    );

                    // Save video metadata
                    const videoData = {
                      key: key,
                      s3Url: url,
                      title: file.name,
                      length: duration / 1000, // Convert back to seconds for saveVideoData
                    };

                    const saved = await saveVideoData(
                      videoData,
                      store.currentStoryId,
                      user
                    );

                    // Update store with uploaded video
                    store.handleVideoUploadFromUrl({
                      url: url,
                      title: file.name,
                      key: key,
                      duration: duration,
                      row: 0,
                      startTime: 0,
                      isNeedLoader: false,
                    });
                  } catch (error) {
                    handleCatchError(error, 'Failed to upload video');
                  }
                }
              }
            }}
          >
            {!store.selectedElements && (
              <div
                className={styles.dropIndicator}
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: '',
                  zIndex: 1000,
                  borderRadius: '2px',
                  transition: 'all 0.2s ease',
                  opacity: 0,
                  boxShadow: 'none',
                }}
              />
            )}
          </div>
        )}

        <Resizable
          height={rowHeight}
          width={0}
          axis="y"
          minConstraints={[0, 20]}
          maxConstraints={[0, 200]}
          onResize={handleRowResize}
          resizeHandles={['s']}
        >
          <div
            ref={node => {
              drop(node);
              dropRef.current = node;
            }}
            className={`${styles.timelineRow} ${
              (isOver && canDrop) ||
              (isDraggingFile &&
                (!rowType || areTypesCompatible(rowType, overlays[0]?.type)))
                ? styles.rowHover
                : ''
            }`}
            data-testid="timeline-row"
            data-timeline-row={rowId}
            style={{
              height: `${rowHeight}px`,
              minHeight: `${rowHeight}px`,
              border: !rowType && '1px solid #ffffff05',
              padding: rowType === 'transition' ? '2px 0' : '0',
              position: 'relative',
            }}
          >
            {/* Full-row drop indicator for row swapping */}
            {store.ghostState.isDraggingRow &&
              store.ghostState.dragOverRowIndex === rowIndex && (
                <>
                  {/* Full overlay to indicate the target row */}
                  <div
                  // style={{
                  //   position: 'absolute',
                  //   left: 0,
                  //   right: 0,
                  //   top: 0,
                  //   bottom: 0,
                  //   border: '2px dashed var(--accent-color)',
                  //   borderRadius: '4px',
                  //   background:
                  //     'linear-gradient(0deg, rgba(105,133,255,0.08), rgba(105,133,255,0.08))',
                  //   pointerEvents: 'none',
                  //   zIndex: 50,
                  // }}
                  />
                  {/* Insert position line (above/below) */}
                  {store.ghostState.rowInsertPosition === 'above' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '-2px',
                        height: '2px',
                        background: 'var(--accent-color)',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                        zIndex: 55,
                      }}
                    />
                  )}
                  {store.ghostState.rowInsertPosition === 'below' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: '-2px',
                        height: '2px',
                        background: 'var(--accent-color)',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                        zIndex: 55,
                      }}
                    />
                  )}
                </>
              )}
            <div
              className={styles.rowType}
              style={{
                height: `${rowHeight}px`,
                minHeight: `${rowHeight}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {renderRowDragHandle()}
            </div>
            <div
              className={styles.overlaysContainer}
              data-testid="overlays-container"
              style={{ position: 'relative' }}
            >
              {overlays.map(overlay => {
                // Render AnimationItem for animation elements
                if (overlay.type === 'animation') {
                  return (
                    <AnimationItem
                      key={overlay.id}
                      item={overlay}
                      rowHeight={rowHeight}
                    />
                  );
                }

                // Render regular TimelineItem for other elements
                return (
                  <TimelineItem
                    key={overlay.id}
                    item={overlay}
                    toggleAnimations={toggleAnimations}
                    handleActiveScene={handleActiveScene}
                    storyData={storyData}
                    isCutMode={isCutMode}
                    defaultButton={defaultButton}
                    setIsCutMode={data => setIsCutMode(data)}
                    scenes={scenes}
                    rowHeight={rowHeight}
                  />
                );
              })}

              {/* Gap Indicators - if row empty, render a full-width clickable gap to delete row */}
              {!store.ghostState.isDragging &&
                (overlays.length === 0 ? (
                  <div
                    className={`${styles.gapIndicator} ${styles.gapIndicatorGroup}`}
                    style={{
                      left: '0%',
                      width: '100%',
                      opacity: 1,
                      zIndex: 20,
                      pointerEvents: 'auto',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (store.deleteRow) {
                        store.deleteRow(rowIndex);
                      }
                    }}
                  >
                    <div className={styles.gapPattern} />
                    <div className={styles.gapCloseButton}>
                      <div className={styles.gapCloseIcon}>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M18 6L6 18M6 6L18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  store.getRowGaps(rowIndex).map((gap, gapIndex) => {
                    // Create a more unique key that includes gap bounds and elements count
                    const elementsInRow = overlays.length;
                    const gapKey = `gap-${rowIndex}-${gap.start}-${gap.end}-${elementsInRow}`;

                    return (
                      <GapIndicator
                        key={gapKey}
                        gap={gap}
                        rowIndex={rowIndex}
                        totalDuration={store.maxTime}
                      />
                    );
                  })
                ))}

              {/* Show TransitionVisualizer for visual element rows to show gaps and existing transitions */}
              {overlays.length > 0 &&
                (overlays[0]?.type === 'imageUrl' ||
                  overlays[0]?.type === 'video') && (
                  <TransitionVisualizer
                    rowIndex={rowIndex}
                    onOpenTransitionPanel={onOpenTransitionPanel}
                  />
                )}
              {/* Show EffectVisualizer only when no animations */}
              {!overlays.some(overlay => overlay.type === 'animation') &&
                !store.animations.some(anim =>
                  overlays.some(overlay => overlay.id === anim.targetId)
                ) && (
                  <EffectVisualizer
                    rowIndex={rowIndex}
                    onOpenEffectPanel={onOpenEffectPanel}
                  />
                )}
            </div>
          </div>
        </Resizable>
        {/* Bottom drop zone removed - now handled in timeline-grid.jsx */}
        <div
          ref={node => {
            // dropAddBottom(node);
            // dropAddFileBottom(node);
          }}
          className={styles.dropZone}
          style={{
            display: 'none', // Hide this element
            position: 'absolute',
            bottom: '-12px',
            left: 0,
            right: 0,
            height: '12px',
            cursor: 'pointer',
          }}
          onDragEnter={e => {
            e.preventDefault();
            // Don't treat timeline elements as file drags
            if (isDraggingTimelineElement) {
              return;
            }

            // Check if this is a React DnD operation (animation drop, etc.)
            // React DnD uses 'application/json' and specific keys for its operations
            if (
              e.dataTransfer?.types.includes('application/json') ||
              e.dataTransfer?.types.some(type =>
                type.startsWith('__REACT_DND_NATIVE_TYPE__')
              )
            ) {
              // This is a React DnD operation, don't handle it here
              return;
            }

            if (e.dataTransfer?.types.includes('Files')) {
              const fileType = e.dataTransfer.items?.[0]?.type;
              if (
                fileType.startsWith('audio/') ||
                fileType.startsWith('image/') ||
                fileType.startsWith('video/')
              ) {
                setIsDraggingFileOverDropZone(true);
              }
            }
          }}
          onDragLeave={e => {
            e.preventDefault();
            setIsDraggingFileOverDropZone(false);
          }}
          onDragOver={e => {
            e.preventDefault();
          }}
          onDrop={async e => {
            e.preventDefault();
            setIsDraggingFileOverDropZone(false);

            // Check if we're currently dragging a timeline element
            if (isDraggingTimelineElement) {
              return;
            }

            // Check if this is a React DnD operation (animation drop, etc.)
            // React DnD uses 'application/json' and specific keys for its operations
            if (
              e.dataTransfer?.types.includes('application/json') ||
              e.dataTransfer?.types.some(type =>
                type.startsWith('__REACT_DND_NATIVE_TYPE__')
              )
            ) {
              // This is a React DnD operation, don't handle it here
              return;
            }

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              const file = files[0];

              if (file.type.startsWith('audio/')) {
              } else if (file.type.startsWith('image/')) {
                try {
                  const formData = new FormData();
                  formData.append('image', file);

                  const response = await uploadImage(formData);

                  if (response) {
                    store.shiftRowsDown(rowIndex + 1);
                    await store.addImageLocal({
                      url: response.data.url,
                      minUrl: response.data.minUrl,
                      row: rowIndex + 1,
                      startTime: 0,
                    });
                  }
                } catch (error) {
                  handleCatchError(error, 'Failed to upload image');
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

                  // Upload to AWS in the background
                  const { url, key } = await uploadVideoToAWS(
                    file,
                    progress => {
                      // Handle progress if needed
                    }
                  );

                  const videoData = {
                    key: key,
                    s3Url: url,
                    title: file.name,
                    length: duration / 1000, // Convert back to seconds for saveVideoData
                  };

                  const saved = await saveVideoData(
                    videoData,
                    store.currentStoryId,
                    user
                  );

                  store.handleVideoUploadFromUrl({
                    url: url,
                    title: file.name,
                    key: key,
                    duration: duration,
                    row: rowIndex + 1,
                    startTime: 0,
                    isNeedLoader: false,
                  });
                } catch (error) {
                  handleCatchError(error, 'Failed to upload video');
                }
              }
            }
          }}
        >
          {!store.selectedElements && (
            <div
              className={styles.dropIndicator}
              style={{
                position: 'absolute',
                top: '4px',
                left: 0,
                right: 0,
                height: '4px',
                background: '',
                zIndex: 1000,
                borderRadius: '2px',
                transition: 'all 0.2s ease',
                opacity: 0,
                boxShadow: 'none',
              }}
            />
          )}
        </div>
      </div>
    );
  }
);

export default TimelineRow;
