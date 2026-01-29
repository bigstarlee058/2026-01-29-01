import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useDispatch } from 'react-redux';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import ReusablePopup from '../ReusablePopup';
import RemoveSilenceMenu from '../RemoveSilenceMenu/RemoveSilenceMenu';
import PopupPortal from '../PopupPortal/PopupPortal';
import { removeSilence } from '../../../services/audioApi';
import { StoreContext } from '../../../mobx';
import { runInAction } from 'mobx';
import { validateFile } from '../../../utils/fileValidation';
import {
  getAcceptAttribute,
  formatFileSize,
} from '../../../utils/fileFormatters';
import { processMediaFile } from '../../../utils/mediaUpload';
import toast from 'react-hot-toast';
import styles from './TimeLineControlPanel.module.scss';

const TimeLineControlPanel = ({
  // Control visibility states
  checkedStates,
  onToggleCheckbox,
  onReset,

  // Volume controls
  currentVolume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  isSelectedElementsAudio = false,
  selectedAudioElements = [],

  // Speed controls
  currentSpeed,
  onSpeedChange,
  speedOptions = [
    { label: '2x', value: 2 },
    { label: '1.5x', value: 1.5 },
    { label: '1x', value: 1 },
    { label: '0.5x', value: 0.5 },
  ],

  // Undo/Redo controls
  onUndo,
  onRedo,
  isUndoRedoLoading = false,

  // Cut controls
  isCutMode = false,
  onCutToggle,

  // Compact audio
  onCompactAudio,

  // Zoom controls
  currentScale,
  onScaleChange,
  scaleRangeRef,

  // More menu options
  showMoreOptions = true,
  moreMenuOptions = [
    { id: 1, name: 'Edit subtitles', icon: 'EditSubtitlesIcon' },
    { id: 2, name: 'Regenerate audio', icon: 'RegenerateIcon' },
    { id: 3, name: 'Regenerate subtitles', icon: 'RegenerateIcon' },
    { id: 4, name: 'Visual effects', icon: 'ThreeCirclesIcon' },
  ],
  onMoreMenuClick,

  // Settings menu options
  settingsMenuOptions = [
    { id: 1, name: 'Volume Control' },
    { id: 2, name: 'Reset' },
    { id: 3, name: 'Playback Speed' },
    { id: 4, name: 'Undo/ Redo' },
    { id: 5, name: 'Transitions' },
    { id: 6, name: 'Cut' },
    { id: 7, name: 'Remove silence' },
    { id: 8, name: 'Compact audio' },
    { id: 9, name: 'Zoom' },
  ],

  // Position and drag controls
  controlsPosition = 0,
  onPositionChange,
  timelineControlsRef,
  onDraggingChange, // New prop to communicate dragging state
  dragVariant = 'timeline', // New prop for drag behavior: 'timeline' or 'freeMove'
}) => {
  const [isVolumeControlHovered, setIsVolumeControlHovered] = useState(false);
  const [isVolumeControlClicked, setIsVolumeControlClicked] = useState(false);
  const [isZoomControlHovered, setIsZoomControlHovered] = useState(false);
  const [isZoomControlClicked, setIsZoomControlClicked] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isSpeedControlVisible, setIsSpeedControlVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isCenterAreaHidden, setIsCenterAreaHidden] = useState(false);
  const [dragOffset, setDragOffset] = useState(0); // Track the offset from where user clicked within controls
  const [isRemoveSilenceVisible, setIsRemoveSilenceVisible] = useState(false);
  const [isProcessingSilence, setIsProcessingSilence] = useState(false);
  const [removeSilenceMenuCoords, setRemoveSilenceMenuCoords] = useState({
    x: 0,
    y: 0,
  });
  const [selectedAudioForSilence, setSelectedAudioForSilence] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Keep file references alive to prevent blob URL garbage collection
  const fileReferencesRef = useRef(new Map());

  const dispatch = useDispatch();
  // DISABLED useUploadProgress - using local blob URLs instead
  // const { upload, cancel, isUploading } = useUploadProgress();
  const isUploading = false; // Dummy value since we're not uploading to backend
  const timelineControlsOptionsRef = useRef(null);
  const volumeContainerRef = useRef(null);
  const volumeNumberRef = useRef(null);
  const moreMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const speedControlRef = useRef(null);
  const settingsMenuTimeoutRef = useRef(null);
  const speedControlTimeoutRef = useRef(null);
  const moreMenuTimeoutRef = useRef(null);
  const removeSilenceRef = useRef(null);
  const removeSilenceTimeoutRef = useRef(null);
  const removeSilenceButtonRef = useRef(null);
  const isMouseOverRemoveSilenceMenuRef = useRef(false);
  const isMouseOverRemoveSilenceButtonRef = useRef(false);
  const selectedAudioIdRef = useRef(null);

  const store = React.useContext(StoreContext);

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = event => {
      // Handle remove silence menu close
      if (
        isRemoveSilenceVisible &&
        removeSilenceRef.current &&
        !removeSilenceRef.current.contains(event.target) &&
        removeSilenceButtonRef.current &&
        !removeSilenceButtonRef.current.contains(event.target)
      ) {
        setIsRemoveSilenceVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRemoveSilenceVisible]);

  // Function to get checked state by option name instead of index
  const getCheckedStateByName = optionName => {
    const optionIndex = settingsMenuOptions.findIndex(
      option => option.name === optionName
    );
    return optionIndex !== -1 ? checkedStates[optionIndex] : false;
  };

  // Single drop zone for the entire timeline controls area
  const [{ isOver }, drop] = useDrop({
    accept: 'timeline-controls',
    drop: (item, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset && timelineControlsRef?.current) {
        const containerRect =
          timelineControlsRef.current.getBoundingClientRect();
        const relativeX = clientOffset.x - containerRect.left;

        // Calculate bounds to prevent overlapping with center area
        const containerWidth = containerRect.width;
        const controlsWidth =
          timelineControlsOptionsRef.current?.offsetWidth || 0;
        const playbackWidth =
          timelineControlsRef.current.querySelector(
            `.${styles.playbackControls}`
          )?.offsetWidth || 0;

        let newPosition = relativeX;

        if (dragVariant === 'timeline') {
          // Timeline variant: Apply snapping and center area restrictions
          // Calculate center area bounds
          const centerStart = (containerWidth - playbackWidth) / 2 - 120;
          const centerEnd = (containerWidth + playbackWidth) / 2 + 60;

          // Edge snapping logic - snap to left or right edge if within 30px
          const snapThreshold = 30;
          const distanceFromLeft = newPosition;
          const distanceFromRight =
            containerWidth - (newPosition + controlsWidth);

          if (distanceFromLeft <= snapThreshold) {
            // Snap to left edge
            newPosition = 10;
          } else if (distanceFromRight <= snapThreshold) {
            // Snap to right edge (with 30px buffer)
            newPosition = containerWidth - controlsWidth - 30;
          } else {
            // Check if dropping in center area and determine which side to snap to
            if (
              newPosition + controlsWidth > centerStart &&
              newPosition < centerEnd
            ) {
              // Determine which side to snap to based on where the drop occurred
              const dropCenter = relativeX;
              const centerAreaCenter = (centerStart + centerEnd) / 2;

              if (dropCenter < centerAreaCenter) {
                // Drop occurred on the left side of center area, snap to left
                newPosition = centerStart - controlsWidth;
              } else {
                // Drop occurred on the right side of center area, snap to right
                newPosition = centerEnd;
              }
            }
          }

          // Final constraint to container bounds (with 30px right buffer)
          newPosition = Math.max(
            0,
            Math.min(newPosition, containerWidth - controlsWidth - 30)
          );
        } else if (dragVariant === 'freeMove') {
          // FreeMove variant: Allow free movement with only container bounds constraint
          const leftPadding = -20;
          const availableWidth = containerWidth;

          // Constrain to the available area within the padding
          newPosition = Math.max(
            leftPadding,
            Math.min(newPosition, leftPadding + availableWidth - controlsWidth)
          );
        }

        onPositionChange?.(newPosition);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
  });

  // Handle drag start
  const handleDragStart = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    // Only hide center area for timeline variant
    if (dragVariant === 'timeline') {
      setIsCenterAreaHidden(true);
    }

    setDragStartPos({ x: e.clientX, y: e.clientY });

    // Calculate the offset from where user clicked within the controls
    if (timelineControlsOptionsRef.current) {
      const controlsRect =
        timelineControlsOptionsRef.current.getBoundingClientRect();
      const offset = e.clientX - controlsRect.left;
      setDragOffset(offset);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);

    // Only show center area for timeline variant
    if (dragVariant === 'timeline') {
      setIsCenterAreaHidden(false);
    }

    // Only apply timeline-specific snapping logic for timeline variant
    if (
      dragVariant === 'timeline' &&
      timelineControlsRef?.current &&
      timelineControlsOptionsRef.current
    ) {
      const containerWidth = timelineControlsRef.current.offsetWidth;
      const controlsWidth = timelineControlsOptionsRef.current.offsetWidth;
      const playbackWidth =
        timelineControlsRef.current.querySelector(`.${styles.playbackControls}`)
          ?.offsetWidth || 0;

      const centerStart = (containerWidth - playbackWidth) / 2 - 120;
      const centerEnd = (containerWidth + playbackWidth) / 2 + 60;

      // Check if controls would overlap with center area
      if (
        controlsPosition + controlsWidth > centerStart &&
        controlsPosition < centerEnd
      ) {
        // Determine which side to snap to based on the current position
        const controlsCenter = controlsPosition + controlsWidth / 2;
        const centerAreaCenter = (centerStart + centerEnd) / 2;

        let newPosition;
        if (controlsCenter < centerAreaCenter) {
          // More of the controls are on the left side, snap to left
          newPosition = centerStart - controlsWidth;
        } else {
          // More of the controls are on the right side, snap to right
          newPosition = centerEnd;
        }

        // Ensure the new position is within container bounds
        newPosition = Math.max(
          0,
          Math.min(newPosition, containerWidth - controlsWidth - 30)
        );
        onPositionChange?.(newPosition);
      }
    }
  };

  useEffect(() => {
    const timelineContent = document.querySelector(
      '[class*="Player_timelineContent"]'
    );
    if (timelineContent && store) {
      const maxTime = Math.max(1, store.maxTime || 1);
      const thumbRatio = Math.max(
        0,
        Math.min(1, store.currentTimeInMs / maxTime)
      );

      requestAnimationFrame(() => {
        const totalWidthAfter = timelineContent.scrollWidth;
        const visibleWidthAfter = timelineContent.clientWidth;
        const thumbPosAfter = thumbRatio * totalWidthAfter;

        let newScrollLeft = thumbPosAfter - visibleWidthAfter / 2;
        const maxScroll = Math.max(0, totalWidthAfter - visibleWidthAfter);
        newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));

        timelineContent.scrollLeft = newScrollLeft;
      });
    }
  }, [currentScale]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    e => {
      if (isDragging && timelineControlsRef?.current) {
        e.preventDefault();
        const containerRect =
          timelineControlsRef.current.getBoundingClientRect();

        // Calculate position relative to the container, maintaining the initial click offset
        const relativeX = e.clientX - containerRect.left;
        const controlsWidth =
          timelineControlsOptionsRef.current?.offsetWidth || 0;
        const containerWidth = containerRect.width;

        // Use the drag offset to maintain the exact position where user clicked
        let finalPosition = relativeX - dragOffset;

        if (dragVariant === 'timeline') {
          // Timeline variant: Apply snapping and center area restrictions
          const playbackWidth =
            timelineControlsRef.current.querySelector(
              `.${styles.playbackControls}`
            )?.offsetWidth || 0;

          // Calculate center area bounds
          const centerStart = (containerWidth - playbackWidth) / 2 - 120;
          const centerEnd = (containerWidth + playbackWidth) / 2 + 60;

          // Edge snapping logic
          const snapThreshold = 30;
          const distanceFromLeft = finalPosition;
          const distanceFromRight =
            containerWidth - (finalPosition + controlsWidth);

          if (distanceFromLeft <= snapThreshold) {
            finalPosition = 10;
          } else if (distanceFromRight <= snapThreshold) {
            finalPosition = containerWidth - controlsWidth - 30;
          } else {
            // Prevent overlapping with center area during dragging
            if (
              finalPosition + controlsWidth > centerStart &&
              finalPosition < centerEnd
            ) {
              // Determine which side to snap to based on where the mouse is
              const mouseCenter = relativeX;
              const centerAreaCenter = (centerStart + centerEnd) / 2;

              if (mouseCenter < centerAreaCenter) {
                // Mouse is on the left side of center area, snap to left
                finalPosition = centerStart - controlsWidth;
              } else {
                // Mouse is on the right side of center area, snap to right
                finalPosition = centerEnd;
              }
            }
          }

          // Apply container bounds constraint during dragging
          finalPosition = Math.max(
            0,
            Math.min(finalPosition, containerWidth - controlsWidth - 30)
          );
        } else if (dragVariant === 'freeMove') {
          finalPosition = relativeX;

          const leftPadding = -20;
          const availableWidth = containerWidth;

          // Constrain to the available area within the padding
          finalPosition = Math.max(
            leftPadding,
            Math.min(
              finalPosition,
              leftPadding + availableWidth - controlsWidth
            )
          );
        }

        onPositionChange?.(finalPosition);
      }
    },
    [isDragging, onPositionChange, timelineControlsRef, dragOffset, dragVariant]
  );

  // Add global mouse move listener when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Communicate dragging state to parent
  useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

  // Effect to recalculate position when controls width changes
  useEffect(() => {
    // Skip this effect during dragging to prevent interference
    if (isDragging) return;

    // Add a small delay to ensure DOM has updated after checked states change
    const timeoutId = setTimeout(() => {
      if (timelineControlsRef?.current && timelineControlsOptionsRef.current) {
        const containerWidth = timelineControlsRef.current.offsetWidth;
        const controlsWidth = timelineControlsOptionsRef.current.offsetWidth;

        if (dragVariant === 'timeline') {
          // Timeline variant: Apply timeline-specific logic
          const playbackWidth =
            timelineControlsRef.current.querySelector(
              `.${styles.playbackControls}`
            )?.offsetWidth || 0;

          const resizeCenterStart = (containerWidth - playbackWidth) / 2 - 120;
          const resizeCenterEnd = (containerWidth + playbackWidth) / 2 + 60;

          // If current position would make controls extend beyond container (with 30px buffer), adjust it
          if (controlsPosition + controlsWidth > containerWidth - 30) {
            const newPosition = Math.max(
              0,
              containerWidth - controlsWidth - 30
            );
            onPositionChange?.(newPosition);
          }

          // If controls are positioned to the left of center area and would overlap when width increases
          if (
            controlsPosition < resizeCenterStart &&
            controlsPosition + controlsWidth > resizeCenterStart
          ) {
            const newPosition = resizeCenterStart - controlsWidth;
            onPositionChange?.(Math.max(0, newPosition));
          }
        } else if (dragVariant === 'freeMove') {
          // FreeMove variant: Only apply container bounds constraint
          const leftPadding = -20;
          const availableWidth = containerWidth;

          if (controlsPosition + controlsWidth > leftPadding + availableWidth) {
            const newPosition = Math.max(
              leftPadding,
              leftPadding + availableWidth - controlsWidth
            );
            onPositionChange?.(newPosition);
          }
        }
      }
    }, 50); // 50ms delay

    return () => clearTimeout(timeoutId);
  }, [
    checkedStates,
    controlsPosition,
    onPositionChange,
    timelineControlsRef,
    isDragging,
    dragVariant,
  ]);

  // Cleanup timeout on unmount for remove silence menu
  useEffect(() => {
    return () => {
      if (removeSilenceTimeoutRef.current) {
        clearTimeout(removeSilenceTimeoutRef.current);
      }
    };
  }, []);

  // Effect to handle initial positioning and window resize
  useEffect(() => {
    // Skip this effect during dragging to prevent interference
    if (isDragging) return;

    const handleResize = () => {
      if (timelineControlsRef?.current && timelineControlsOptionsRef.current) {
        const containerWidth = timelineControlsRef.current.offsetWidth;
        const controlsWidth = timelineControlsOptionsRef.current.offsetWidth;

        if (dragVariant === 'timeline') {
          // Timeline variant: Apply timeline-specific logic
          const playbackWidth =
            timelineControlsRef.current.querySelector(
              `.${styles.playbackControls}`
            )?.offsetWidth || 0;

          const handleResizeCenterStart =
            (containerWidth - playbackWidth) / 2 - 120;
          const handleResizeCenterEnd =
            (containerWidth + playbackWidth) / 2 + 60;

          // Ensure controls don't extend beyond container (with 30px buffer)
          if (controlsPosition + controlsWidth > containerWidth - 30) {
            const newPosition = Math.max(
              0,
              containerWidth - controlsWidth - 30
            );
            onPositionChange?.(newPosition);
          }

          // If controls are positioned to the left of center area and would overlap when width increases
          if (
            controlsPosition < handleResizeCenterStart &&
            controlsPosition + controlsWidth > handleResizeCenterStart
          ) {
            const newPosition = handleResizeCenterStart - controlsWidth;
            onPositionChange?.(Math.max(0, newPosition));
          }
        } else if (dragVariant === 'freeMove') {
          const leftPadding = -20;
          const availableWidth = containerWidth;

          if (controlsPosition + controlsWidth > leftPadding + availableWidth) {
            const newPosition = Math.max(
              leftPadding,
              leftPadding + availableWidth - controlsWidth
            );
            onPositionChange?.(newPosition);
          }
        }
      }
    };

    // Initial check
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [
    controlsPosition,
    onPositionChange,
    timelineControlsRef,
    isDragging,
    dragVariant,
  ]);

  // Get position styles based on current position
  const getPositionStyles = () => {
    return {
      transform: `translateX(${controlsPosition}px)`,
      position: 'relative',
    };
  };

  // Check if controls are near the right edge
  const isNearRightEdge = () => {
    if (!timelineControlsRef?.current || !timelineControlsOptionsRef.current)
      return false;

    const containerRect = timelineControlsRef.current.getBoundingClientRect();
    const controlsWidth = timelineControlsOptionsRef.current.offsetWidth;

    // Check if the right edge of the controls is within 90px of the container's right edge
    const distanceFromRight =
      containerRect.width - (controlsPosition + controlsWidth);
    return distanceFromRight <= 90;
  };

  // Get drop zone styles
  const getDropZoneStyles = () => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: '100%',
    backgroundColor: isDragging
      ? ' rgba(255, 255, 255, 0.06)'
      : isOver
        ? 'rgba(255, 255, 255, 0.06)'
        : 'transparent',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto',
    zIndex: 1,
  });

  // Get center area indicator styles
  const getCenterAreaStyles = () => {
    // Only show center area for timeline variant
    if (dragVariant !== 'timeline' || !timelineControlsRef?.current) return {};

    const containerWidth = timelineControlsRef.current.offsetWidth;
    const playbackWidth =
      timelineControlsRef.current.querySelector(`.${styles.playbackControls}`)
        ?.offsetWidth || 0;

    const indicatorCenterStart = (containerWidth - playbackWidth) / 2 - 120;
    const indicatorCenterEnd = (containerWidth + playbackWidth) / 2 + 60;

    return {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${indicatorCenterStart}px`,
      width: `${indicatorCenterEnd - indicatorCenterStart}px`,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: isCenterAreaHidden ? 0 : isOver || isDragging ? 0.3 : 0,
      transition: 'opacity 0.2s ease',
    };
  };

  const handleMoreMenuClick = option => {
    setIsMoreMenuVisible(false);
    onMoreMenuClick?.(option);
  };

  const handleSpeedChange = option => {
    setIsSpeedControlVisible(false);
    onSpeedChange?.(option);
  };

  const getCurrentSpeedLabel = () => {
    const option = speedOptions.find(opt => opt.value === currentSpeed);
    return option ? option.label : '1x';
  };

  const handleRemoveSilenceMouseEnter = () => {
    // Get all audio elements
    const audioElements = store.editorElements.filter(
      el => el.type === 'audio'
    );

    if (audioElements.length === 0 || isProcessingSilence) {
      return; // No audio elements, don't show menu
    }

    isMouseOverRemoveSilenceButtonRef.current = true;

    if (removeSilenceTimeoutRef.current) {
      clearTimeout(removeSilenceTimeoutRef.current);
    }

    removeSilenceTimeoutRef.current = setTimeout(() => {
      // Auto-select voice audio if no selection
      let targetAudioId = selectedAudioForSilence;

      if (
        !targetAudioId ||
        !audioElements.find(el => el.id === targetAudioId)
      ) {
        // Find voice audio first, then any audio
        const voiceAudio = audioElements.find(
          el => el.properties?.audioType === 'voice'
        );
        const anyAudio = audioElements[0];
        targetAudioId = voiceAudio?.id || anyAudio?.id;
        setSelectedAudioForSilence(targetAudioId);
      }

      // Capture the selected audio element's ID when menu opens
      selectedAudioIdRef.current = targetAudioId;
      const btnNode = removeSilenceButtonRef.current;
      if (btnNode) {
        const { top, left, height, width } = btnNode.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Estimate menu dimensions
        const estimatedMenuWidth = 280;
        const estimatedMenuHeight = 400;

        // Calculate initial position - open upward, centered above button
        let menuX = left + width / 2 - estimatedMenuWidth / 2;
        let menuY = top - estimatedMenuHeight - 8; // 8px gap above button

        // Check if menu would overflow left edge
        if (menuX < 0) {
          menuX = 8; // 8px from left edge
        }

        // Check if menu would overflow right edge
        if (menuX + estimatedMenuWidth > viewportWidth) {
          menuX = viewportWidth - estimatedMenuWidth - 8; // 8px from right edge
        }

        // Check if menu would overflow top edge
        if (menuY < 0) {
          // If not enough space above, show below
          menuY = top + height + 8; // 8px gap below button
        }

        // Final check - if still would overflow bottom, position at top of viewport
        if (menuY + estimatedMenuHeight > viewportHeight) {
          menuY = Math.max(8, viewportHeight - estimatedMenuHeight - 8);
        }

        setRemoveSilenceMenuCoords({
          x: menuX,
          y: menuY,
        });
      }

      setIsRemoveSilenceVisible(true);
    }, 200);
  };

  const handleRemoveSilenceMouseLeave = () => {
    isMouseOverRemoveSilenceButtonRef.current = false;

    if (removeSilenceTimeoutRef.current) {
      clearTimeout(removeSilenceTimeoutRef.current);
    }

    removeSilenceTimeoutRef.current = setTimeout(() => {
      if (
        !isMouseOverRemoveSilenceMenuRef.current &&
        !isMouseOverRemoveSilenceButtonRef.current
      ) {
        setIsRemoveSilenceVisible(false);
      }
    }, 100);
  };

  const handleRemoveSilenceMenuMouseEnter = () => {
    isMouseOverRemoveSilenceMenuRef.current = true;

    if (removeSilenceTimeoutRef.current) {
      clearTimeout(removeSilenceTimeoutRef.current);
    }
  };

  const handleRemoveSilenceMenuMouseLeave = () => {
    isMouseOverRemoveSilenceMenuRef.current = false;

    if (removeSilenceTimeoutRef.current) {
      clearTimeout(removeSilenceTimeoutRef.current);
    }

    // Increase delay to avoid premature close while interacting with selects
    removeSilenceTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverRemoveSilenceButtonRef.current) {
        setIsRemoveSilenceVisible(false);
      }
    }, 250);
  };

  const handleRemoveSilenceClose = () => {
    setIsRemoveSilenceVisible(false);
  };

  const handleRemoveSilenceClick = () => {
    // Get all audio elements
    const audioElements = store.editorElements.filter(
      el => el.type === 'audio'
    );

    if (audioElements.length === 0) {
      return; // No audio elements, don't show menu
    }

    // Toggle menu visibility
    if (isRemoveSilenceVisible) {
      setIsRemoveSilenceVisible(false);
      return;
    }

    // Auto-select voice audio if no selection
    let targetAudioId = selectedAudioForSilence;

    if (!targetAudioId || !audioElements.find(el => el.id === targetAudioId)) {
      // Find voice audio first, then any audio
      const voiceAudio = audioElements.find(
        el => el.properties?.audioType === 'voice'
      );
      const anyAudio = audioElements[0];
      targetAudioId = voiceAudio?.id || anyAudio?.id;
      setSelectedAudioForSilence(targetAudioId);

      // Also select this audio element in the timeline
      const selectedAudio = voiceAudio || anyAudio;
      store.setSelectedElement(selectedAudio);
    }

    // Capture the selected audio element's ID when menu opens
    selectedAudioIdRef.current = targetAudioId;

    // Position menu
    const btnNode = removeSilenceButtonRef.current;
    if (btnNode) {
      const { top, left, height, width } = btnNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Estimate menu dimensions
      const estimatedMenuWidth = 280;
      const estimatedMenuHeight = 400;

      // Calculate initial position - open upward, centered above button
      let menuX = left + width / 2 - estimatedMenuWidth / 2;
      let menuY = top - estimatedMenuHeight - 8;

      // Adjust if would overflow left edge
      if (menuX < 8) {
        menuX = 8;
      }

      // Adjust if would overflow right edge
      if (menuX + estimatedMenuWidth > viewportWidth - 8) {
        menuX = viewportWidth - estimatedMenuWidth - 8;
      }

      // If would overflow top, position below button instead
      if (menuY < 8) {
        menuY = top + height + 8;
      }

      // Final check - if still would overflow bottom, position at top of viewport
      if (menuY + estimatedMenuHeight > viewportHeight) {
        menuY = Math.max(8, viewportHeight - estimatedMenuHeight - 8);
      }

      setRemoveSilenceMenuCoords({
        x: menuX,
        y: menuY,
      });
    }

    setIsRemoveSilenceVisible(true);
  };

  const handleRemoveSilenceApply = async (settings, audioId) => {
    // Find audio element by provided ID
    let audioElement = null;
    if (audioId) {
      audioElement = store.editorElements.find(
        el => el.id === audioId && el.type === 'audio'
      );
    }

    if (!audioElement) {
      console.error('❌ No audio element available to process');
      return;
    }

    setIsProcessingSilence(true);
    // Keep menu open and selection intact during processing
    setIsRemoveSilenceVisible(true);

    // Set loading state on the audio element
    const loadingElement = {
      ...audioElement,
      isLoading: true,
    };
    store.updateEditorElement(loadingElement);

    try {
      const audioUrl = audioElement.src || audioElement.properties?.src;

      if (!audioUrl) {
        throw new Error('Audio URL not found');
      }

      const response = await removeSilence({
        audioUrl,
        startThreshold: settings.startThreshold,
        stopThreshold: settings.stopThreshold,
        stopDuration: settings.stopDuration,
        startDuration: settings.startDuration,
      });

      if (response.success && response.processedAudioUrl) {
        // Calculate new duration and timeFrame
        const newDuration =
          response.duration?.processedMs || audioElement.duration;
        const currentStartTime =
          audioElement.timeFrame?.start || audioElement.from || 1;

        // Update the audio element's src with the processed audio URL
        const updatedElement = {
          ...audioElement,
          duration: newDuration, // Update duration with processed duration
          isLoading: false, // Remove loading state
          timeFrame: {
            start: currentStartTime,
            end: currentStartTime + newDuration, // Update end time based on new duration
          },
          properties: {
            ...audioElement.properties,
            src: response.processedAudioUrl, // Оновлюємо src в properties
            originalAudioUrl: response.originalAudioUrl,
            silenceRemovalStats: response.statistics,
            silenceRemovalSettings: response.settings,
            durationInfo: response.duration, // Store full duration info
          },
        };

        // Use runInAction to ensure MobX tracks the changes
        runInAction(() => {
          store.updateEditorElement(updatedElement);

          // Update HTML audio element src directly
          const htmlAudioElement = document.getElementById(
            audioElement.properties.elementId
          );
          if (htmlAudioElement) {
            htmlAudioElement.src = response.processedAudioUrl;
            htmlAudioElement.load(); // Reload audio with new src
          }

          // Force MobX to trigger updates by touching the editorElements array
          store.editorElements = [...store.editorElements];

          // Синхронізація зображень (опціонально)
          if (settings.syncImages) {
            // Proportionally adjust image elements to fit new audio duration
            const originalAudioDuration = audioElement.duration;
            const compressionRatio = newDuration / originalAudioDuration;

            // Find all image elements - try different approaches
            let imageElements = store.editorElements.filter(
              el => el.type === 'imageUrl' && el.row === audioElement.row
            );

            // If no images in same row, try finding all images
            if (imageElements.length === 0) {
              imageElements = store.editorElements.filter(
                el => el.type === 'imageUrl'
              );
            }

            // Update each image element proportionally
            imageElements.forEach(imageElement => {
              const originalStart = imageElement.timeFrame.start;
              const originalEnd = imageElement.timeFrame.end;
              const originalImageDuration = originalEnd - originalStart;

              // Calculate new proportional timings
              const newStart = originalStart * compressionRatio;
              const newEnd =
                newStart + originalImageDuration * compressionRatio;

              const updatedImageElement = {
                ...imageElement,
                timeFrame: {
                  start: newStart,
                  end: newEnd,
                },
              };

              store.updateEditorElement(updatedImageElement);
            });
          }

          // Update maxTime if this audio was the longest element
          const audioEndTime = currentStartTime + newDuration;
          const maxElementTime = Math.max(
            ...store.editorElements.map(el => el.timeFrame?.end || 0),
            audioEndTime
          );

          if (maxElementTime < store.maxTime) {
            // If all elements now end before current maxTime, adjust maxTime proportionally
            const newMaxTime = Math.max(
              maxElementTime + 5000,
              newDuration + 10000
            );
            store.setMaxTime(newMaxTime);
          }

          // Refresh elements to ensure audio is reloaded
          store.refreshElements();
        });

        // Close after success
        setIsRemoveSilenceVisible(false);
      } else {
        throw new Error(response.message || 'Failed to remove silence');
      }
    } catch (error) {
      console.error('❌ Error removing silence:', error);

      // Remove loading state on error
      const errorElement = {
        ...audioElement,
        isLoading: false,
      };
      store.updateEditorElement(errorElement);
    } finally {
      setIsProcessingSilence(false);
    }
  };

  const handleScaleChange = e => {
    const value = parseFloat(e.target.value);
    onScaleChange?.(value);
    const percentage = Math.round(((value - 1) / (30 - 1)) * 100);
    e.target.style.setProperty('--range-progress', `${percentage}%`);
    document.documentElement.style.setProperty('--scale-factor', value);
  };

  // Upload functionality
  const inferUploadCategory = file => {
    const ft = (file.type || '').toLowerCase();
    if (ft.startsWith('image/')) return 'image';
    if (ft.startsWith('video/')) return 'video';
    if (ft.startsWith('audio/')) return 'audio';
    const n = (file.name || '').toLowerCase();
    if (/\.(png|jpe?g|gif|bmp|webp|svg)$/.test(n)) return 'image';
    if (/\.(mp4|avi|mov|wmv|flv|webm)$/.test(n)) return 'video';
    if (/\.(mp3|wav|aac|flac|aiff)$/.test(n)) return 'audio';
    return 'image';
  };

  const getFileType = file => {
    const fileNameParts = file.name.split('.');
    if (fileNameParts.length > 1) {
      const extension = fileNameParts[fileNameParts.length - 1];
      return extension.toUpperCase();
    }
    const fileExtension = file.type.split('/')[1];
    if (fileExtension) {
      return fileExtension.toUpperCase();
    }
    return 'FILE';
  };

  const addFileToTimeline = async (file, processedMedia) => {
    try {
      console.log('📁 Adding file to timeline:', {
        fileName: file.name,
        fileType: processedMedia.type,
        url: processedMedia.url,
        googleCloudUrl: processedMedia.googleCloudUrl,
        duration: processedMedia.duration,
        dimensions: {
          width: processedMedia.imageWidth || processedMedia.videoWidth,
          height: processedMedia.imageHeight || processedMedia.videoHeight,
        },
        urlType: processedMedia.url?.startsWith('blob:') ? 'blob URL' : 'other',
      });

      // Find existing row with same media type or create new row
      const getRowForMediaType = (mediaType) => {
        // Map media types to element types
        const typeMap = {
          'image': 'imageUrl',
          'video': 'video',
          'audio': 'audio'
        };
        const elementType = typeMap[mediaType];
        
        // Find all rows that contain this media type
        const rowsWithType = new Set();
        store.editorElements.forEach(el => {
          if (el.type === elementType && el.row !== undefined) {
            rowsWithType.add(el.row);
          }
        });
        
        // If rows exist with this type, find the one with space or latest end time
        if (rowsWithType.size > 0) {
          // Get the first row with this type (could be enhanced to find row with most space)
          const sortedRows = Array.from(rowsWithType).sort((a, b) => a - b);
          return sortedRows[0];
        }
        
        // No existing row with this type, create new one
        return store.maxRows;
      };

      // Determine start time based on existing elements in the target row
      const getStartTimeForRow = (row, mediaType) => {
        const typeMap = {
          'image': 'imageUrl',
          'video': 'video',
          'audio': 'audio'
        };
        const elementType = typeMap[mediaType];
        
        // Find all elements of this type in this row
        const elementsInRow = store.editorElements.filter(
          el => el.type === elementType && el.row === row
        );
        
        if (elementsInRow.length === 0) {
          // Empty row, use current time or 0
          return store.currentTimeInMs || 0;
        }
        
        // Find the latest end time in this row
        const latestEndTime = Math.max(
          ...elementsInRow.map(el => el.timeFrame?.end || el.to || 0)
        );
        
        // Add new element right after the last one
        return latestEndTime;
      };

      const newRow = getRowForMediaType(processedMedia.type);
      const startTime = getStartTimeForRow(newRow, processedMedia.type);

      if (processedMedia.type === 'image') {
        console.log(
          '🖼️  Adding image:',
          processedMedia.googleCloudUrl || processedMedia.url
        );
        await store.addImageLocal({
          url: processedMedia.googleCloudUrl || processedMedia.url,
          minUrl:
            processedMedia.minGoogleCloudUrl ||
            processedMedia.minUrl ||
            processedMedia.url,
          row: newRow,
          startTime: startTime,
          endTime: startTime + processedMedia.duration,
        });

        // Update maxRows after adding
        store.setMaxRows(Math.max(store.maxRows, newRow + 1));

        toast.success(`Added ${file.name} to timeline`);
      } else if (processedMedia.type === 'audio') {
        const audioId =
          processedMedia.id ||
          processedMedia._id ||
          `audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        await store.addExistingAudio({
          base64Audio: processedMedia.googleCloudUrl || processedMedia.url,
          durationMs: processedMedia.duration,
          row: newRow,
          startTime: startTime,
          audioType: 'music',
          duration: processedMedia.duration,
          id: audioId,
          name: processedMedia.name || processedMedia.fileName,
        });

        // Update maxRows after adding
        store.setMaxRows(Math.max(store.maxRows, newRow + 1));

        toast.success(`Added ${file.name} to timeline`);
      } else if (processedMedia.type === 'video') {
        console.log(
          '🎥 Adding video:',
          processedMedia.s3Url ||
            processedMedia.googleCloudUrl ||
            processedMedia.url
        );
        await store.handleVideoUploadFromUrl({
          url:
            processedMedia.s3Url ||
            processedMedia.googleCloudUrl ||
            processedMedia.url,
          title: processedMedia.name || file.name,
          key: processedMedia.taskId || processedMedia.id || processedMedia._id,
          duration: processedMedia.duration,
          row: newRow,
          startTime: startTime,
          isNeedLoader: false,
          linkedAudioClipId: processedMedia.linkedAudioClipId,
        });

        // Update maxRows after adding
        store.setMaxRows(Math.max(store.maxRows, newRow + 1));

        toast.success(`Added ${file.name} to timeline`);
      }

      // Refresh elements to ensure proper display
      store.refreshElements();
    } catch (error) {
      console.error('❌ Error adding file to timeline:', error);
      toast.error(`Failed to add ${file.name}: ${error.message}`);
      throw error;
    }
  };

  const processSelectedFiles = async files => {
    const list = Array.from(files || []);
    if (!list.length) return;

    setIsUploadingFiles(true);

    const accepted = [];
    const rejected = [];
    for (const f of list) {
      const res = validateFile(f, 'All');
      if (res.ok) accepted.push(f);
      else rejected.push({ file: f, reason: res.reason });
    }

    if (rejected.length) {
      const head = rejected
        .slice(0, 3)
        .map(r => `${r.file.name} — ${r.reason}`)
        .join(', ');
      toast.error(
        `Some files were rejected: ${head}${rejected.length > 3 ? '…' : ''}`
      );
    }

    if (!accepted.length) {
      setIsUploadingFiles(false);
      return;
    }

    const newUploadingFiles = accepted.map(file => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      progress: 0,
      size: formatFileSize(file.size),
      type: getFileType(file),
      error: false,
    }));

    const initialProgress = {};
    newUploadingFiles.forEach(fileData => {
      initialProgress[fileData.id] = { progress: 0 };
    });
    setUploadProgress(prev => ({ ...prev, ...initialProgress }));

    for (const fileData of newUploadingFiles) {
      try {
        // Update progress - processing
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 25 },
        }));

        // Process media file to get duration, blob URL, etc.
        const processedMedia = await processMediaFile(
          fileData.file,
          store.currentTimeInMs || 0
        );

        // Keep file reference alive to prevent blob URL garbage collection
        fileReferencesRef.current.set(fileData.id, fileData.file);

        // Update progress - adding to timeline
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 50 },
        }));

        // Add file to timeline using processed media data
        await addFileToTimeline(fileData.file, processedMedia);

        // Complete progress
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 100 },
        }));
      } catch (e) {
        console.error('❌ Error processing file:', fileData.name, e);
        toast.error(
          `Failed to add ${fileData.name}: ${e.message || 'Unknown error'}`
        );
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 100, error: true },
        }));
      }
    }

    setIsUploadingFiles(false);
    // Clear progress after upload
    setTimeout(() => {
      setUploadProgress({});
      // Clear file references after a delay to ensure blob URLs are no longer needed
      // Note: Keep references if elements need them
    }, 2000);
  };

  const handleUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = getAcceptAttribute('All'); // Accept all file types
    fileInput.style.display = 'none';

    fileInput.onchange = async e => {
      console.log('📁 Files selected for upload:', e.target.files);
      await processSelectedFiles(e.target.files);
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const checkedCount = checkedStates.filter(state => state).length;

  return (
    <div className={styles.timelineControls} ref={timelineControlsRef}>
      {/* Center area indicator */}
      <div style={getCenterAreaStyles()} />

      {/* Drop zone */}
      <div ref={drop} className={styles.dropZone} style={getDropZoneStyles()} />

      {/* Draggable controls container */}
      <div
        ref={node => {
          timelineControlsOptionsRef.current = node;
        }}
        className={`${styles.timelineControlsOptions} ${
          checkedCount < 1 ? styles.reducedGap : ''
        } ${isDragging ? styles.dragging : ''}`}
        style={{
          ...getPositionStyles(),
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        <div className={styles.timelineControlsItem}>
          <div
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              backgroundColor: 'transparent',
            }}
            onMouseDown={handleDragStart}
          >
            <ButtonWithIcon
              icon="DragIcon"
              size="12"
              color={isDragging ? 'white' : '#FFFFFF33'}
              accentColor="#FFFFFF90"
              activeColor="white"
              classNameButton={styles.dragIcon}
              tooltipText="Drag to reorder"
            />
          </div>
          <div className={styles.settingsContainer}>
            <ButtonWithIcon
              icon="GearIcon"
              size="17"
              color={isSettingsMenuVisible ? 'white' : '#FFFFFF66'}
              classNameButton={styles.settingsButton}
              tooltipText="Settings"
              tooltipPlace="left"
              onMouseEnter={() => {
                // Clear any existing timeout
                if (settingsMenuTimeoutRef.current) {
                  clearTimeout(settingsMenuTimeoutRef.current);
                }
                settingsMenuTimeoutRef.current = setTimeout(() => {
                  setIsSettingsMenuVisible(true);
                }, 300);
              }}
              onMouseLeave={() => {
                // Clear the timeout that would open the menu
                if (settingsMenuTimeoutRef.current) {
                  clearTimeout(settingsMenuTimeoutRef.current);
                  settingsMenuTimeoutRef.current = null;
                }
                // Set timeout to close the menu
                setTimeout(() => {
                  const menuElement = settingsMenuRef.current;
                  if (menuElement && menuElement.matches(':hover')) {
                    return;
                  }
                  setIsSettingsMenuVisible(false);
                }, 300);
              }}
            />
            {isSettingsMenuVisible && (
              <ReusablePopup
                ref={settingsMenuRef}
                menuOptions={settingsMenuOptions}
                hasCheckbox={true}
                checkedStates={checkedStates}
                toggleCheckbox={onToggleCheckbox}
                onMouseEnter={() => setIsSettingsMenuVisible(true)}
                onMouseLeave={() => setIsSettingsMenuVisible(false)}
                highlightSelected={false}
                isNearRightEdge={isNearRightEdge()}
              />
            )}
          </div>
          {getCheckedStateByName('Volume Control') && (
            <div
              className={`${styles.volumeControlNew} ${
                isVolumeControlClicked ? styles.clicked : ''
              } ${isSelectedElementsAudio ? styles.audioElementSelected : ''}`}
              onMouseEnter={() => setIsVolumeControlHovered(true)}
              onMouseLeave={() => {
                setIsVolumeControlHovered(false);
                setIsVolumeControlClicked(false);
              }}
              onMouseDown={() => setIsVolumeControlClicked(true)}
              onMouseUp={() => setIsVolumeControlClicked(false)}
            >
              <ButtonWithIcon
                icon={isMuted ? 'MuteIcon' : 'VolumeIcon'}
                size="12"
                color={
                  isSelectedElementsAudio
                    ? 'var(--accent-color)' // Accent color when audio selected
                    : isVolumeControlClicked
                      ? 'white'
                      : isVolumeControlHovered
                        ? '#FFFFFFB2'
                        : isMuted
                          ? '#FFFFFF66'
                          : '#FFFFFFB2'
                }
                opacity={
                  isSelectedElementsAudio ||
                  isVolumeControlHovered ||
                  isVolumeControlClicked
                    ? 1
                    : 0.4
                }
                accentColor={
                  isSelectedElementsAudio ? 'var(--accent-color)' : '#FFFFFFB2'
                }
                activeColor="white"
                classNameButton={styles.scaleButton}
                tooltipText={
                  isSelectedElementsAudio
                    ? `${isMuted ? 'Unmute' : 'Adjust'} audio elements volume`
                    : `${isMuted ? 'Unmute' : 'Mute'} global audio`
                }
                onClick={onMuteToggle}
              />
              <div
                className={styles.scaleRangeInputBox}
                ref={volumeContainerRef}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={currentVolume}
                  onChange={onVolumeChange}
                  className={`${styles.volumeRange} ${
                    isSelectedElementsAudio ? styles.audioElementSelected : ''
                  }`}
                  style={{
                    '--range-progress': `${currentVolume}%`,
                    '--range-accent-color': isSelectedElementsAudio
                      ? 'var(--accent-color)'
                      : '#FFFFFFB2',
                  }}
                  onMouseDown={() => setIsVolumeControlClicked(true)}
                  onMouseUp={() => setIsVolumeControlClicked(false)}
                />
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={Math.round(currentVolume * 2)}
                  ref={volumeNumberRef}
                  onChange={e => {
                    const inputValue = parseInt(e.target.value) || 0;
                    const value = Math.min(100, Math.max(0, inputValue / 2));
                    onVolumeChange({
                      target: { value },
                    });
                  }}
                  className={`${styles.scalePercentage} ${
                    isSelectedElementsAudio ? styles.audioElementSelected : ''
                  }`}
                  onMouseDown={() => setIsVolumeControlClicked(true)}
                  onMouseUp={() => setIsVolumeControlClicked(false)}
                />
              </div>
            </div>
          )}
        </div>
        {getCheckedStateByName('Reset') && (
          <ButtonWithIcon
            size="14"
            color="#FFFFFF66"
            accentColor="var(--accent-color)"
            marginLeft="0px"
            text={'Reset'}
            classNameButton={styles.resetButton}
            onClick={onReset} // Reset functionality should be passed as prop
          />
        )}
        {getCheckedStateByName('Playback Speed') && (
          <div className={styles.speedContainer}>
            <ButtonWithIcon
              text={getCurrentSpeedLabel()}
              color="#FFFFFF66"
              classNameButton={styles.speedButton}
              tooltipText="Speed"
              tooltipPlace="bottom"
              marginLeft="0px"
              onMouseEnter={() => {
                // Clear any existing timeout
                if (speedControlTimeoutRef.current) {
                  clearTimeout(speedControlTimeoutRef.current);
                }
                speedControlTimeoutRef.current = setTimeout(() => {
                  setIsSpeedControlVisible(true);
                }, 150);
              }}
              onMouseLeave={() => {
                // Clear the timeout that would open the menu
                if (speedControlTimeoutRef.current) {
                  clearTimeout(speedControlTimeoutRef.current);
                  speedControlTimeoutRef.current = null;
                }
                // Set timeout to close the menu
                setTimeout(() => {
                  const menuElement = speedControlRef.current;
                  if (menuElement && menuElement.matches(':hover')) {
                    return;
                  }
                  setIsSpeedControlVisible(false);
                }, 150);
              }}
            />
            {isSpeedControlVisible && (
              <ReusablePopup
                ref={speedControlRef}
                menuOptions={speedOptions}
                onClickMethod={handleSpeedChange}
                selectedValue={currentSpeed}
                onMouseEnter={() => setIsSpeedControlVisible(true)}
                onMouseLeave={() => setIsSpeedControlVisible(false)}
                className="speedControlDropdown"
                minWidth="39px"
                alignCenter={true}
                isNearRightEdge={isNearRightEdge()}
              />
            )}
          </div>
        )}
        {getCheckedStateByName('Undo/ Redo') && (
          <div className={styles.undoRedoBtnSet}>
            <ButtonWithIcon
              icon="UndoIcon"
              size="19"
              accentColor="#FFFFFFB2"
              color="#FFFFFF66"
              activeColor="white"
              classNameButton={`${styles.undoRedoBtn} ${
                isUndoRedoLoading ? styles.disabled : ''
              }`}
              classNameIcon={styles.scaleIcon}
              onClick={onUndo}
              tooltipText="Undo"
            />

            <ButtonWithIcon
              icon="RedoIcon"
              size="19"
              accentColor="#FFFFFFB2"
              color="#FFFFFF66"
              activeColor="white"
              classNameButton={`${styles.undoRedoBtn} ${
                isUndoRedoLoading ? styles.disabled : ''
              }`}
              onClick={onRedo}
              tooltipText="Redo"
            />
          </div>
        )}
        {getCheckedStateByName('Transitions') && (
          <ButtonWithIcon
            icon="TransitionsIcon"
            size="15"
            accentColor="#FFFFFFB2"
            color="#FFFFFF66"
            activeColor="white"
            marginLeft="0px"
            classNameButton={styles.transitionsButton}
            onClick={() => {}}
            tooltipText="Transitions"
          />
        )}

        {getCheckedStateByName('Cut') && (
          <ButtonWithIcon
            icon="CutIcon"
            size="13"
            color={isCutMode ? 'var(--accent-color)' : '#FFFFFF66'}
            activeColor="var(--accent-color)"
            accentColor="#FFFFFFB2"
            classNameButton={`${styles.cutButton} ${
              isCutMode ? styles.active : ''
            }`}
            tooltipText="Cut"
            onClick={onCutToggle}
          />
        )}
        {getCheckedStateByName('Remove silence') && (
          <span ref={removeSilenceButtonRef}>
            <ButtonWithIcon
              icon="RemoveSilenceIcon"
              size="26"
              onClick={handleRemoveSilenceClick}
              color={
                store.editorElements.filter(el => el.type === 'audio').length >
                0
                  ? isProcessingSilence
                    ? 'var(--accent-color)'
                    : isRemoveSilenceVisible
                      ? 'white'
                      : '#FFFFFF66'
                  : '#FFFFFF33'
              }
              accentColor="#FFFFFFB2"
              activeColor="white"
              classNameButton={`${styles.removeSilenceBtn} ${
                isProcessingSilence ? styles.processing : ''
              } ${
                store.editorElements.filter(el => el.type === 'audio')
                  .length === 0
                  ? styles.disabled
                  : ''
              } ${isRemoveSilenceVisible ? styles.active : ''}`}
              tooltipText={
                store.editorElements.filter(el => el.type === 'audio')
                  .length === 0
                  ? 'No audio elements available'
                  : isProcessingSilence
                    ? 'Processing...'
                    : 'Remove Silence'
              }
            />
          </span>
        )}
        {getCheckedStateByName('Compact audio') && (
          <ButtonWithIcon
            icon="CompactIcon"
            size="26"
            accentColor="#FFFFFFB2"
            activeColor="white"
            color="#FFFFFF66"
            classNameButton={styles.compactAudioBtn}
            onClick={onCompactAudio}
            tooltipText="Compact Audio"
          />
        )}
        <ButtonWithIcon
          icon="UploadFileIcon"
          size="16"
          accentColor="#FFFFFFB2"
          activeColor="white"
          color={
            isUploadingFiles || isUploading
              ? 'var(--accent-color)'
              : '#FFFFFF66'
          }
          classNameButton={`${styles.uploadBtn} ${
            isUploadingFiles || isUploading ? styles.uploading : ''
          }`}
          onClick={handleUploadClick}
          tooltipText={
            isUploadingFiles || isUploading
              ? 'Uploading files...'
              : 'Upload files to timeline'
          }
          disabled={isUploadingFiles || isUploading}
        />
        {checkedStates.some(state => state) && (
          <div className={styles.dividerContainer}>
            <span className={styles.divider}></span>
          </div>
        )}
        {getCheckedStateByName('Zoom') && (
          <div
            className={`${styles.zoomControl} ${
              isZoomControlHovered ? styles.hovered : ''
            } ${isZoomControlClicked ? styles.clicked : ''}`}
            onMouseEnter={() => setIsZoomControlHovered(true)}
            onMouseLeave={() => {
              setIsZoomControlHovered(false);
              setIsZoomControlClicked(false);
            }}
            onMouseDown={() => setIsZoomControlClicked(true)}
            onMouseUp={() => setIsZoomControlClicked(false)}
          >
            <ButtonWithIcon
              icon="MagnifierOutIcon"
              size="18"
              color="#FFFFFF66"
              activeColor="white"
              accentColor="#FFFFFFB2"
              classNameButton={`${styles.zoomButton} ${
                isZoomControlClicked ? styles.active : ''
              }`}
              tooltipText="Zoom Out"
              onClick={() => {
                const newScale = Math.max(1, currentScale - 1);
                onScaleChange?.(newScale);
                const percentage = Math.round(
                  ((newScale - 1) / (30 - 1)) * 100
                );
                if (scaleRangeRef?.current) {
                  scaleRangeRef.current.style.setProperty(
                    '--range-progress',
                    `${percentage}%`
                  );
                }
                document.documentElement.style.setProperty(
                  '--scale-factor',
                  newScale
                );
              }}
            />
            <input
              type="range"
              min="1"
              max="30"
              step="0.5"
              value={currentScale}
              onChange={handleScaleChange}
              className={styles.zoomRange}
              ref={scaleRangeRef}
            />
            <ButtonWithIcon
              icon="MagnifierInIcon"
              size="18"
              color="#FFFFFF66"
              activeColor="white"
              accentColor="#FFFFFFB2"
              classNameButton={`${styles.zoomButton} ${
                isZoomControlClicked ? styles.active : ''
              }`}
              tooltipText="Zoom In"
              onClick={() => {
                const newScale = Math.min(30, currentScale + 1);
                onScaleChange?.(newScale);
                const percentage = Math.round(
                  ((newScale - 1) / (30 - 1)) * 100
                );
                if (scaleRangeRef?.current) {
                  scaleRangeRef.current.style.setProperty(
                    '--range-progress',
                    `${percentage}%`
                  );
                }
                document.documentElement.style.setProperty(
                  '--scale-factor',
                  newScale
                );
              }}
            />
          </div>
        )}

        {showMoreOptions && (
          <div className={styles.settingsContainer}>
            <ButtonWithIcon
              icon="ThreeDotsIcon"
              size="13"
              color="#FFFFFF66"
              classNameButton={styles.threeDotsButton}
              tooltipText="More Options"
              tooltipPlace="bottom"
              onMouseEnter={() => {
                // Clear any existing timeout
                if (moreMenuTimeoutRef.current) {
                  clearTimeout(moreMenuTimeoutRef.current);
                }
                moreMenuTimeoutRef.current = setTimeout(() => {
                  setIsMoreMenuVisible(true);
                }, 150);
              }}
              onMouseLeave={() => {
                // Clear the timeout that would open the menu
                if (moreMenuTimeoutRef.current) {
                  clearTimeout(moreMenuTimeoutRef.current);
                  moreMenuTimeoutRef.current = null;
                }
                // Set timeout to close the menu
                setTimeout(() => {
                  const menuElement = moreMenuRef.current;
                  if (menuElement && menuElement.matches(':hover')) {
                    return;
                  }
                  setIsMoreMenuVisible(false);
                }, 150);
              }}
            />

            {isMoreMenuVisible && (
              <ReusablePopup
                ref={moreMenuRef}
                menuOptions={moreMenuOptions}
                hasIcon={true}
                onClickMethod={handleMoreMenuClick}
                onMouseEnter={() => setIsMoreMenuVisible(true)}
                onMouseLeave={() => setIsMoreMenuVisible(false)}
                isNearRightEdge={isNearRightEdge()}
              />
            )}
          </div>
        )}
      </div>

      {/* Remove Silence Menu Portal */}
      {isRemoveSilenceVisible && (
        <PopupPortal
          x={removeSilenceMenuCoords.x}
          y={removeSilenceMenuCoords.y}
        >
          <RemoveSilenceMenu
            ref={removeSilenceRef}
            onApply={handleRemoveSilenceApply}
            isProcessing={isProcessingSilence}
            onClose={handleRemoveSilenceClose}
            audioElements={store.editorElements.filter(
              el => el.type === 'audio'
            )}
            selectedAudioId={selectedAudioForSilence}
            onAudioSelect={setSelectedAudioForSilence}
          />
        </PopupPortal>
      )}
    </div>
  );
};

export default TimeLineControlPanel;
