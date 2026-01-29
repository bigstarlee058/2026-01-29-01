import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './Player.module.scss';
import Timeline from '../Timeline/timeline';
import { ScaleRangeInput } from './timeline-related/ScaleRangeInput';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useDispatch } from 'react-redux';
import { resetActiveScene } from '../../redux/scene/sceneSlice';
import TimeLineControlPanel from './TimeLineControlPanel/TimeLineControlPanel';
import { useCheckboxStates } from 'hooks/timeline/useCheckboxStates';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import Lottie from 'lottie-react';
import { createPortal } from 'react-dom';
import videfyAnime from '../../data/videfyAnime.json';

const formatTime = ms => {
  const time = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(time / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${
    totalSeconds > 3600 ? hours.toString().padStart(2, '0') + ':' : ''
  }${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const formatTimeWithPlaybackRate = (ms, playbackRate) => {
  const adjustedMs = ms / playbackRate;
  return formatTime(adjustedMs);
};

const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const getMarkingsForScale = scale => {
  // Convert scale to percentage for easier calculations
  const scalePercentage = ((scale - 1) / (30 - 1)) * 100;

  if (scalePercentage > 90) {
    return [
      {
        interval: 100, // 0.1s markings at very high zoom
        color: '#C7CED1',
        size: 12,
        width: 1,
        main: true,
      },
      {
        interval: 20, // 0.02s minor markings
        color: '#C7CED1',
        size: 8,
        width: 1,
        main: false,
      },
    ];
  } else if (scalePercentage > 75) {
    return [
      {
        interval: 200, // 0.2s markings at high zoom
        color: '#C7CED1',
        size: 12,
        width: 1,
        main: true,
      },
      {
        interval: 50, // 0.05s minor markings
        color: '#C7CED1',
        size: 8,
        width: 1,
        main: false,
      },
    ];
  } else if (scalePercentage > 50) {
    return [
      {
        interval: 500, // 0.5s markings
        color: '#C7CED1',
        size: 12,
        width: 1,
        main: true,
      },
      {
        interval: 100, // 0.1s minor markings
        color: '#C7CED1',
        size: 8,
        width: 1,
        main: false,
      },
    ];
  } else if (scalePercentage > 25) {
    return [
      {
        interval: 1000, // 1s markings
        color: '#C7CED1',
        size: 12,
        width: 1,
        main: true,
      },
      {
        interval: 200, // 0.2s minor markings
        color: '#C7CED1',
        size: 8,
        width: 1,
        main: false,
      },
    ];
  } else {
    return [
      {
        interval: 5000, // 5s markings
        color: '#C7CED1',
        size: 12,
        width: 1,
        main: true,
      },
      {
        interval: 1000, // 1s minor markings
        color: '#C7CED1',
        size: 8,
        width: 1,
        main: false,
      },
    ];
  }
};

const TimelineScrollbar = ({ scale, setCurrentScale, timelineContentRef }) => {
  const scrollbarRef = useRef(null);
  const handleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const [isResizing, setIsResizing] = useState(null);
  const [initialHandleLeft, setInitialHandleLeft] = useState(0);
  const [initialHandleWidth, setInitialHandleWidth] = useState(0);
  const store = React.useContext(StoreContext);
  const animationFrameRef = useRef(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const updateHandleSize = useCallback(() => {
    if (
      handleRef.current &&
      scrollbarRef.current &&
      timelineContentRef.current
    ) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const scrollbarWidth = scrollbarRef.current.offsetWidth;
        const scaleRatio = Math.max(0, Math.min((scale - 1) / 28.5, 0.98));
        const handleWidth = scrollbarWidth * (1 - scaleRatio);
        handleRef.current.style.width = `${Math.round(handleWidth + 8)}px`;

        const scrollRatio =
          timelineContentRef.current.scrollLeft /
          (timelineContentRef.current.scrollWidth -
            timelineContentRef.current.clientWidth);
        const maxLeft = scrollbarWidth - handleWidth;
        handleRef.current.style.left = `${Math.round(maxLeft * scrollRatio)}px`;
      });
    }
  }, [scale, timelineContentRef]);

  const throttledUpdateHandleSize = useCallback(
    throttle(updateHandleSize, 100),
    [updateHandleSize]
  );

  useLayoutEffect(() => {
    throttledUpdateHandleSize();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scale, throttledUpdateHandleSize]);

  const handleMouseDown = e => {
    if (e.target.classList.contains(styles.scrollHandleEdge)) {
      const isLeftEdge = e.target.classList.contains(styles.left);
      setIsResizing(isLeftEdge ? 'left' : 'right');
      setDragStartX(e.clientX);
      setInitialHandleLeft(handleRef.current.offsetLeft);
      setInitialHandleWidth(handleRef.current.offsetWidth);

      // Hide the time indicator during resizing
      if (document.querySelector(`.${styles.timeIndicator}`)) {
        document.querySelector(`.${styles.timeIndicator}`).style.opacity = '0';
      }

      // Dispatch custom event for resizing start
      window.dispatchEvent(new CustomEvent('timeline:resize:start'));
    } else {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartLeft(handleRef.current.offsetLeft);
    }
  };

  const handleMouseMove = e => {
    if (!isDragging && !isResizing) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const scrollbar = scrollbarRef.current;
      const scrollbarRect = scrollbar.getBoundingClientRect();
      const minWidth = Math.max(scrollbarRect.width * 0.02, 20);
      let newLeft, newWidth;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        // Apply a smaller multiplier to the delta for the left handle to match cursor speed
        const adjustedDelta = isResizing === 'left' ? delta * 0.5 : delta;

        const thumbPositionRatio = store.currentTimeInMs / store.maxTime;

        if (isResizing === 'left') {
          const idealLeft = initialHandleLeft + adjustedDelta;
          if (idealLeft >= 0) {
            newLeft = idealLeft;
            newWidth = initialHandleLeft + initialHandleWidth - idealLeft;
          } else {
            const extra = -idealLeft;
            newLeft = 0;
            newWidth = initialHandleLeft + initialHandleWidth + extra;
          }
          newWidth = Math.min(newWidth, scrollbarRect.width);
          newLeft = Math.min(newLeft, scrollbarRect.width - newWidth);
        } else {
          const idealRight = initialHandleLeft + initialHandleWidth + delta;
          if (idealRight <= scrollbarRect.width) {
            newLeft = initialHandleLeft;
            newWidth = idealRight - initialHandleLeft;
          } else {
            const extra = idealRight - scrollbarRect.width;
            newWidth = scrollbarRect.width - initialHandleLeft + extra;
            newLeft = scrollbarRect.width - newWidth;
            if (newLeft < 0) {
              newLeft = 0;
              newWidth = scrollbarRect.width;
            }
          }
        }
        if (newWidth < minWidth) {
          newWidth = minWidth;
          if (isResizing === 'left') {
            newLeft = initialHandleLeft + initialHandleWidth - newWidth;
            newLeft = Math.max(newLeft, 0);
          } else {
            newLeft = scrollbarRect.width - newWidth;
            newLeft = Math.max(newLeft, 0);
          }
        }
        handleRef.current.style.width = `${Math.round(newWidth)}px`;
        handleRef.current.style.left = `${Math.round(newLeft)}px`;

        const widthRatio = newWidth / scrollbarRect.width;
        let newScale = 1 + 28.5 * (1 - widthRatio);
        newScale = Math.max(1, Math.min(newScale, 29.5));

        setCurrentScale(newScale);

        if (timelineContentRef.current) {
          const newTotalWidth = timelineContentRef.current.scrollWidth;
          const visibleWidth = timelineContentRef.current.clientWidth;
          const scrollableWidth = newTotalWidth - visibleWidth;

          const thumbPositionPx = thumbPositionRatio * newTotalWidth;

          const targetScrollPosition = thumbPositionPx - visibleWidth * 0.5;

          const newScrollPosition = Math.max(
            0,
            Math.min(targetScrollPosition, scrollableWidth)
          );

          timelineContentRef.current.scrollLeft = newScrollPosition;

          if (scrollableWidth > 0) {
            const scrollRatio = newScrollPosition / scrollableWidth;
            const maxLeft = scrollbarRect.width - newWidth;
            handleRef.current.style.left = `${Math.round(
              maxLeft * scrollRatio
            )}px`;
          } else {
            handleRef.current.style.left = '0px';
          }
        }
      } else {
        const deltaX = e.clientX - dragStartX;
        const maxLeft = scrollbarRect.width - handleRef.current.offsetWidth;
        const newLeftPos = Math.max(
          0,
          Math.min(dragStartLeft + deltaX, maxLeft)
        );
        handleRef.current.style.left = `${Math.round(newLeftPos)}px`;

        if (timelineContentRef.current) {
          const scrollRatio = newLeftPos / maxLeft;
          const maxScroll =
            timelineContentRef.current.scrollWidth -
            timelineContentRef.current.clientWidth;
          timelineContentRef.current.scrollLeft = maxScroll * scrollRatio;
        }
      }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Short delay to ensure scale changes have propagated
    setTimeout(() => {
      // Show the thumb indicator again after resizing is complete
      if (document.querySelector(`.${styles.timeIndicator}`)) {
        document.querySelector(`.${styles.timeIndicator}`).style.opacity = '1';
      }

      // Update thumb position in ScaleRangeInput based on current time
      const thumb = document.querySelector(`.${styles.thumb}`);
      if (thumb && timelineContentRef.current) {
        const currentRatio = store.currentTimeInMs / store.maxTime;
        const canvas = document.querySelector(
          `.${styles.scaleRangeContainer} canvas`
        );
        if (canvas) {
          const position = currentRatio * canvas.width;
          thumb.style.transform = `translateX(${position}px)`;
        }
      }

      // Dispatch custom event for resizing end with current time data
      window.dispatchEvent(
        new CustomEvent('timeline:resize:end', {
          detail: {
            currentTimeRatio: store.currentTimeInMs / store.maxTime,
            maxTime: store.maxTime,
          },
        })
      );
    }, 50);
  };

  const handleTrackMouseDown = e => {
    if (e.target !== scrollbarRef.current) return;
    const scrollbarRect = scrollbarRef.current.getBoundingClientRect();
    const handleWidth = handleRef.current.offsetWidth;
    let newLeft = e.clientX - scrollbarRect.left - handleWidth / 2;
    newLeft = Math.max(0, Math.min(newLeft, scrollbarRect.width - handleWidth));
    handleRef.current.style.left = `${newLeft}px`;

    if (timelineContentRef.current) {
      const scrollableWidth =
        timelineContentRef.current.scrollWidth -
        timelineContentRef.current.clientWidth;
      const maxLeft = scrollbarRect.width - handleWidth;
      const scrollRatio = newLeft / maxLeft;
      timelineContentRef.current.scrollLeft = scrollableWidth * scrollRatio;
    }
  };

  useEffect(() => {
    const handleTimelineScroll = () => {
      if (
        timelineContentRef.current &&
        handleRef.current &&
        scrollbarRef.current &&
        !isDragging &&
        !isResizing
      ) {
        const scrollRatio =
          timelineContentRef.current.scrollLeft /
          (timelineContentRef.current.scrollWidth -
            timelineContentRef.current.clientWidth);
        const maxLeft =
          scrollbarRef.current.offsetWidth - handleRef.current.offsetWidth;
        handleRef.current.style.left = `${maxLeft * scrollRatio}px`;
      }
    };

    timelineContentRef.current?.addEventListener(
      'scroll',
      handleTimelineScroll
    );
    return () => {
      timelineContentRef.current?.removeEventListener(
        'scroll',
        handleTimelineScroll
      );
    };
  }, [isDragging, isResizing, timelineContentRef]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  const [animationFrameId, setAnimationFrameId] = useState(null);

  const handleNext = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    const scrollTimeline = () => {
      if (timelineContentRef.current) {
        const scrollAmount = 6; // Increased value for faster scrolling
        timelineContentRef.current.scrollLeft += scrollAmount;
        const id = requestAnimationFrame(scrollTimeline);
        setAnimationFrameId(id);
      }
    };

    scrollTimeline();
  };

  const handlePrev = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    const scrollTimeline = () => {
      if (timelineContentRef.current) {
        const scrollAmount = 6; // Increased value for faster scrolling
        timelineContentRef.current.scrollLeft -= scrollAmount;
        const id = requestAnimationFrame(scrollTimeline);
        setAnimationFrameId(id);
      }
    };

    scrollTimeline();
  };

  const stopScroll = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }
  };

  const updateShadowVisibility = () => {
    if (timelineContentRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        timelineContentRef.current;
      const isStart = scrollLeft === 0;
      const isEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth;

      setShowLeftShadow(!isStart);
      setShowRightShadow(!isEnd);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      updateShadowVisibility();
    };

    const timelineContent = timelineContentRef.current;
    if (timelineContent) {
      timelineContent.addEventListener('scroll', handleScroll);
      // Initial check
      updateShadowVisibility();
    }

    return () => {
      if (timelineContent) {
        timelineContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [timelineContentRef, updateShadowVisibility]);

  useEffect(() => {
    const handleGlobalMouseMove = e => {
      if (animationFrameId) {
        // Get references to the shadow elements
        const leftShadowElement = document.querySelector(
          `.${styles.scrollShadow}.${styles.left}`
        );
        const rightShadowElement = document.querySelector(
          `.${styles.scrollShadow}.${styles.right}`
        );

        let isOverShadow = false;

        // Check if mouse is over either shadow
        if (leftShadowElement) {
          const leftRect = leftShadowElement.getBoundingClientRect();
          if (
            e.clientX >= leftRect.left &&
            e.clientX <= leftRect.right &&
            e.clientY >= leftRect.top &&
            e.clientY <= leftRect.bottom
          ) {
            isOverShadow = true;
          }
        }

        if (rightShadowElement && !isOverShadow) {
          const rightRect = rightShadowElement.getBoundingClientRect();
          if (
            e.clientX >= rightRect.left &&
            e.clientX <= rightRect.right &&
            e.clientY >= rightRect.top &&
            e.clientY <= rightRect.bottom
          ) {
            isOverShadow = true;
          }
        }

        // If mouse is not over any shadow, stop scrolling
        if (!isOverShadow) {
          stopScroll();
        }
      }
    };

    // Add global mouse move listener
    document.addEventListener('mousemove', handleGlobalMouseMove);

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      // Make sure to cancel any animation frame when unmounting
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animationFrameId, stopScroll]);

  return (
    <div className={styles.timelineScrollbarWrapper}>
      {showLeftShadow && (
        <div
          className={`${styles.scrollShadow} ${styles.left}`}
          onMouseEnter={handlePrev}
          onMouseLeave={stopScroll}
        />
      )}
      <div
        className={styles.timelineScrollbar}
        ref={scrollbarRef}
        onMouseDown={handleTrackMouseDown}
        data-timeline-controls-root
      >
        <div
          className={styles.scrollHandle}
          ref={handleRef}
          onMouseDown={handleMouseDown}
        >
          <div className={`${styles.scrollHandleEdge} ${styles.left}`} />
          <div className={`${styles.scrollHandleEdge} ${styles.right}`} />
        </div>
      </div>
      {showRightShadow && (
        <div
          className={`${styles.scrollShadow} ${styles.right}`}
          onMouseEnter={handleNext}
          onMouseLeave={stopScroll}
        />
      )}
    </div>
  );
};

export const TimeLine = observer(
  ({
    handleActiveScene,
    currentScale,
    setCurrentScale,
    currentVolume,
    storyData,
    isCutMode,
    defaultButton,
    setIsCutMode,
    handleMuteToggle,
    handleVolumeChange,
    isMuted,
    volumeRangeRef,
    onUndo,
    onRedo,
    isUndoRedoLoading,
    handlePlaybackClick,
    isActiveScreen,
    onOpenTransitionPanel,
    onOpenEffectPanel,
    isSelectedElementsAudio = false,
    selectedAudioElements = [],
    isInitializing = false,
    initializingMessage = 'Loading timeline….',
  }) => {
    const [isAnimationsVisible, setIsAnimationsVisible] = useState(false);
    const [animationsPanelRow, setAnimationsPanelRow] = useState(0);
    const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
    const [isSpeedControlVisible, setIsSpeedControlVisible] = useState(false);

    // State to preserve animation selection during preview
    const [preservedAnimationSelection, setPreservedAnimationSelection] =
      useState(null);
    const [isPlayingAnimationPreview, setIsPlayingAnimationPreview] =
      useState(false);

    // Draggable timeline controls state
    const [controlsPosition, setControlsPosition] = useState(0); // Store exact pixel position
    const [isControlsDragging, setIsControlsDragging] = useState(false);
    const timelineControlsRef = useRef(null);
    const timelineControlsOptionsRef = useRef(null); // Add ref for the draggable controls

    // Settings menu checkbox states
    const STORAGE_KEY = 'settingsMenuCheckboxStates';
    const menuOptions = [
      { id: 1, name: 'Volume Control' },
      { id: 2, name: 'Reset' },
      { id: 3, name: 'Playback Speed' },
      { id: 4, name: 'Undo/ Redo' },
      { id: 5, name: 'Transitions' },
      { id: 6, name: 'Cut' },
      { id: 7, name: 'Remove silence' },
      { id: 8, name: 'Compact audio' },
      { id: 9, name: 'Zoom' },
    ];

    // More menu options
    const moreMenuOptions = [
      { id: 1, name: 'Edit subtitles', icon: 'EditSubtitlesIcon' },
      { id: 2, name: 'Regenerate audio', icon: 'RegenerateIcon' },
      { id: 3, name: 'Regenerate subtitles', icon: 'RegenerateIcon' },
      { id: 4, name: 'Visual effects', icon: 'ThreeCirclesIcon' },
    ];

    // Speed control options
    const speedOptions = [
      { label: '2x', value: 2 },
      { label: '1.5x', value: 1.5 },
      { label: '1x', value: 1 },
      { label: '0.5x', value: 0.5 },
    ];

    const { checkedStates, toggleCheckbox } = useCheckboxStates(
      STORAGE_KEY,
      menuOptions.length
    );

    // Load controls position from localStorage
    useEffect(() => {
      const savedPosition = localStorage.getItem('timelineControlsPosition');
      if (savedPosition) {
        setControlsPosition(parseInt(savedPosition) || 0);
      }
    }, []);

    // Save controls position to localStorage
    useEffect(() => {
      localStorage.setItem(
        'timelineControlsPosition',
        controlsPosition.toString()
      );
    }, [controlsPosition]);

    const store = React.useContext(StoreContext);

    // Effect to sync preserved selection with store selection, but prevent clearing during preview
    useEffect(() => {
      // Only update preserved selection if we're not currently playing animation preview
      if (!isPlayingAnimationPreview) {
        if (store?.selectedElement?.type === 'animation') {
          setPreservedAnimationSelection(store.selectedElement);
        } else if (!store?.selectedElement) {
          // User manually cleared selection - clear preserved selection too
          setPreservedAnimationSelection(null);
        } else if (store?.selectedElement?.type !== 'animation') {
          // User selected something that's not an animation - clear preserved selection
          setPreservedAnimationSelection(null);
        }
      } else {
      }
    }, [store?.selectedElement, isPlayingAnimationPreview]);

    // Effect to temporarily override setSelectedElement during preview to prevent clearing
    useEffect(() => {
      if (isPlayingAnimationPreview && store && store.setSelectedElement) {
        // Store the original method
        const originalSetSelectedElement = store.setSelectedElement.bind(store);

        // Override the method during preview
        store.setSelectedElement = element => {
          // Only allow setting selection to null if we're explicitly restoring the preserved selection
          if (element === null && preservedAnimationSelection) {
            // Ignore attempts to clear selection during preview
            return;
          }
          // Allow other operations
          originalSetSelectedElement(element);
        };

        // Cleanup - restore original method when preview ends
        return () => {
          store.setSelectedElement = originalSetSelectedElement;
        };
      }
    }, [isPlayingAnimationPreview, store, preservedAnimationSelection]);

    // Create a function to handle animation preview
    const handleAnimationPreview = (selectedElement, store) => {
      if (!selectedElement || !selectedElement.timeFrame) {
        return false;
      }

      // Check if selected element is an animation
      if (selectedElement.type === 'animation' && selectedElement.animationId) {
        // Preserve the animation selection
        setPreservedAnimationSelection(selectedElement);
        setIsPlayingAnimationPreview(true);
        // Find the original animation in store
        const originalAnimation = store.animations.find(
          anim => anim.id === selectedElement.animationId
        );

        if (originalAnimation) {
          if (originalAnimation.type === 'glTransition') {
            // Handle GL Transition preview
            const animationStart =
              originalAnimation.startTime || selectedElement.timeFrame.start;
            const animationEnd =
              originalAnimation.endTime || selectedElement.timeFrame.end;

            // Set current time to the start of the transition
            store.updateTimeTo(animationStart);
            // Start playing
            store.setPlaying(true);

            // Stop playing after transition duration
            setTimeout(() => {
              store.setPlaying(false);
              // Set time back to start of transition
              store.updateTimeTo(animationStart);
              // End preview mode first, then restore selection
              setIsPlayingAnimationPreview(false);
              // Small delay to ensure the preview flag is updated before restoring selection
              setTimeout(() => {
                if (preservedAnimationSelection) {
                  store.setSelectedElement(preservedAnimationSelection);
                }
              }, 10);
            }, animationEnd - animationStart);

            return true; // Indicate that animation preview was handled
          } else {
            // Handle regular animation preview
            // Find the target element this animation is applied to
            const targetElement = store.editorElements.find(
              el =>
                el.id === originalAnimation.targetId && el.type !== 'animation'
            );

            if (targetElement) {
              // Use the target element's timeframe and animation timing
              const elementStart = targetElement.timeFrame.start;
              const animationProps = originalAnimation.properties || {};
              const animationStart =
                elementStart + (animationProps.startTime || 0);
              const animationEnd =
                elementStart +
                (animationProps.endTime || originalAnimation.duration || 1000);

              // Set current time to the start of the animation
              store.updateTimeTo(animationStart);
              // Start playing
              store.setPlaying(true);

              // Stop playing after animation duration
              setTimeout(() => {
                store.setPlaying(false);
                // Set time back to start of animation
                store.updateTimeTo(animationStart);
                // End preview mode first, then restore selection
                setIsPlayingAnimationPreview(false);
                // Small delay to ensure the preview flag is updated before restoring selection
                setTimeout(() => {
                  if (preservedAnimationSelection) {
                    store.setSelectedElement(preservedAnimationSelection);
                  }
                }, 10);
              }, animationEnd - animationStart);

              return true; // Indicate that animation preview was handled
            }
          }
        }
      }
      return false; // Indicate that regular playback should be used
    };

    useKeyboardShortcuts(
      {
        Space: (event, store) => {
          // Use preserved selection if we're currently playing animation preview
          const selectedElement =
            preservedAnimationSelection || store?.selectedElement;

          // Check if there's a selected animation element
          if (selectedElement && selectedElement.type === 'animation') {
            const wasAnimationHandled = handleAnimationPreview(
              selectedElement,
              store
            );
            if (!wasAnimationHandled) {
              // Fallback to regular play/pause
              store.setPlaying(!store.playing);
            }
          } else {
            // No animation selection, use regular play/pause
            store.setPlaying(!store.playing);
          }
        },
      },
      {
        store: store,
      }
    );

    const dispatch = useDispatch();
    const timelineContentRef = useRef(null);
    const scaleRangeRef = useRef(null);
    const scaleRangeInputRef = useRef(null);
    const scaleNumberRef = useRef(null);
    const scaleContainerRef = useRef(null);
    const volumeContainerRef = useRef(null);
    const volumeNumberRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const pendingWheelEventRef = useRef(null);
    const pendingScrollAdjustmentRef = useRef(null);
    const lastPlayheadScreenPositionRef = useRef(null);

    const processZoom = useCallback(() => {
      const event = pendingWheelEventRef.current;
      animationFrameIdRef.current = null;
      pendingWheelEventRef.current = null;
      if (!event) return;

      const primaryDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const delta = primaryDelta > 0 ? -0.5 : 0.5;

      const timelineContent = timelineContentRef.current;
      if (!timelineContent) return;

      const maxTime = Math.max(1, store.maxTime || 1);
      const thumbRatio = Math.max(
        0,
        Math.min(1, store.currentTimeInMs / maxTime)
      );

      const totalWidthBefore = timelineContent.scrollWidth;
      const scrollLeftBefore = timelineContent.scrollLeft;
      const thumbPosBefore = thumbRatio * totalWidthBefore;

      // Use the last known playhead screen position if available, otherwise calculate it
      let screenXBefore;
      if (lastPlayheadScreenPositionRef.current !== null) {
        screenXBefore = lastPlayheadScreenPositionRef.current;
      } else {
        screenXBefore = thumbPosBefore - scrollLeftBefore;
      }

      const newScale = Math.min(Math.max(currentScale + delta, 1), 30);
      const percentage = Math.round(((newScale - 1) / (30 - 1)) * 100);

      const scaleRatio = newScale / currentScale;
      const totalWidthAfter = totalWidthBefore * scaleRatio;
      const thumbPosAfter = thumbRatio * totalWidthAfter;
      const visibleWidthAfter = timelineContent.clientWidth;

      let newScrollLeft = thumbPosAfter - screenXBefore;
      newScrollLeft = Math.max(
        0,
        Math.min(newScrollLeft, totalWidthAfter - visibleWidthAfter)
      );

      setCurrentScale(newScale);

      pendingScrollAdjustmentRef.current = {
        thumbRatio,
        screenXBefore,
        timelineContent,
        preCalculatedScroll: newScrollLeft,
        preCalculatedEffectiveX: thumbPosAfter - newScrollLeft,
        visibleWidthAfter,
      };

      if (scaleRangeRef.current) {
        scaleRangeRef.current.style.setProperty(
          '--range-progress',
          `${percentage}%`
        );
        scaleRangeRef.current.value = newScale;
      }
      if (scaleNumberRef.current) {
        scaleNumberRef.current.value = percentage;
      }
      document.documentElement.style.setProperty('--scale-factor', newScale);
    }, [store, setCurrentScale, scaleRangeRef, scaleNumberRef, currentScale]);

    const handleScaleWheel = useCallback(
      event => {
        event.preventDefault();
        pendingWheelEventRef.current = event;
        if (!animationFrameIdRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(processZoom);
        }
      },
      [processZoom]
    );

    useLayoutEffect(() => {
      if (pendingScrollAdjustmentRef.current) {
        const {
          thumbRatio,
          screenXBefore,
          timelineContent,
          preCalculatedScroll,
          preCalculatedEffectiveX,
          visibleWidthAfter,
        } = pendingScrollAdjustmentRef.current;
        pendingScrollAdjustmentRef.current = null;

        if (preCalculatedScroll !== undefined) {
          // timelineContent.scrollLeft = preCalculatedScroll;
          lastPlayheadScreenPositionRef.current = Math.max(
            0,
            Math.min(preCalculatedEffectiveX, visibleWidthAfter)
          );
        } else {
          void timelineContent.offsetHeight;

          const totalWidthAfter = timelineContent.scrollWidth;
          const visibleWidthAfter = timelineContent.clientWidth;
          const thumbPosAfter = thumbRatio * totalWidthAfter;

          let newScrollLeft = thumbPosAfter - screenXBefore;
          newScrollLeft = Math.max(
            0,
            Math.min(newScrollLeft, totalWidthAfter - visibleWidthAfter)
          );

          // timelineContent.scrollLeft = newScrollLeft;
          const effectiveScreenX = thumbPosAfter - newScrollLeft;
          lastPlayheadScreenPositionRef.current = Math.max(
            0,
            Math.min(effectiveScreenX, visibleWidthAfter)
          );
        }
      }
    }, [currentScale]);

    // Reset persisted playhead screen position when current time changes (user clicked on timeline)
    useEffect(() => {
      lastPlayheadScreenPositionRef.current = null;
    }, [store.currentTimeInMs]);

    const handleVolumeWheel = useCallback(
      event => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -5 : 5; // Increased step size for better control

        const newVolume = Math.min(Math.max(currentVolume + delta, 0), 100);

        if (volumeRangeRef.current) {
          volumeRangeRef.current.style.setProperty(
            '--range-progress',
            `${newVolume}%`
          );
          volumeRangeRef.current.value = newVolume;
        }
        if (volumeNumberRef.current) {
          volumeNumberRef.current.value = newVolume * 2; // Display as 200%
        }

        handleVolumeChange({
          target: { value: newVolume },
        });
      },
      [currentVolume, handleVolumeChange, volumeRangeRef]
    );

    useEffect(() => {
      const scaleContainer = scaleContainerRef.current;
      const volumeContainer = volumeContainerRef.current;
      const zoomRange = scaleRangeRef.current;
      const zoomRangeInput = scaleRangeInputRef.current;
      const timelineContent = timelineContentRef.current;

      if (scaleContainer) {
        scaleContainer.addEventListener('wheel', handleScaleWheel, {
          passive: false,
        });
      }
      if (volumeContainer) {
        volumeContainer.addEventListener('wheel', handleVolumeWheel, {
          passive: false,
        });
      }
      // Add wheel event listener directly to the zoom range input
      if (zoomRange) {
        zoomRange.addEventListener('wheel', handleScaleWheel, {
          passive: false,
        });
      }

      if (zoomRangeInput) {
        zoomRangeInput.addEventListener('wheel', handleScaleWheel, {
          passive: false,
        });
      }

      // Do NOT capture wheel on the main timeline content to preserve page vertical scroll

      return () => {
        if (scaleContainer) {
          scaleContainer.removeEventListener('wheel', handleScaleWheel);
        }
        if (volumeContainer) {
          volumeContainer.removeEventListener('wheel', handleVolumeWheel);
        }
        if (zoomRange) {
          zoomRange.removeEventListener('wheel', handleScaleWheel);
        }
        if (zoomRangeInput) {
          zoomRangeInput.removeEventListener('wheel', handleScaleWheel);
        }
        // No removal needed for timelineContent wheel
      };
    }, [handleScaleWheel, handleVolumeWheel]);

    useEffect(() => {
      // Initialize scale range
      if (scaleRangeRef.current) {
        const scalePercentage = Math.round(
          ((currentScale - 1) / (30 - 1)) * 100
        );
        scaleRangeRef.current.style.setProperty(
          '--range-progress',
          `${scalePercentage}%`
        );
      }

      // Initialize volume range if ref exists
      if (volumeRangeRef?.current) {
        volumeRangeRef.current.style.setProperty(
          '--range-progress',
          `${currentVolume}%`
        );
      }
    }, [currentScale, currentVolume, volumeRangeRef]);

    const handleTimelineClick = useCallback(
      e => {
        // Check if the click is directly on the timeline container or content
        // and not on any timeline items or controls
        const isTimelineItem = e.target.closest('[data-timeline-item]');
        const isTimelineControl = e.target.closest('[data-timeline-control]');
      },
      [store, dispatch]
    );

    const handleCutClick = () => {
      setIsCutMode(!isCutMode);
    };

    const applyAnchoredZoom = useCallback(
      newScale => {
        const timelineContent = timelineContentRef.current;
        if (!timelineContent) {
          setCurrentScale(newScale);
          return;
        }

        const maxTime = Math.max(1, store.maxTime || 1);
        const thumbRatio = Math.max(
          0,
          Math.min(1, store.currentTimeInMs / maxTime)
        );

        const totalWidthBefore = timelineContent.scrollWidth;
        const scrollLeftBefore = timelineContent.scrollLeft;
        const thumbPosBefore = thumbRatio * totalWidthBefore;

        // Use the last known playhead screen position if available, otherwise calculate it
        let screenXBefore;
        if (lastPlayheadScreenPositionRef.current !== null) {
          // Use the persisted screen position to maintain consistency when changing zoom direction
          screenXBefore = lastPlayheadScreenPositionRef.current;
        } else {
          // Calculate playhead's position on screen (relative to viewport)
          screenXBefore = thumbPosBefore - scrollLeftBefore;
        }

        setCurrentScale(newScale);
        const percentage = Math.round(((newScale - 1) / (30 - 1)) * 100);

        // Update UI elements
        if (scaleRangeRef.current) {
          scaleRangeRef.current.style.setProperty(
            '--range-progress',
            `${percentage}%`
          );
          scaleRangeRef.current.value = newScale;
        }
        if (scaleNumberRef.current) {
          scaleNumberRef.current.value = percentage;
        }
        document.documentElement.style.setProperty('--scale-factor', newScale);

        pendingScrollAdjustmentRef.current = {
          thumbRatio,
          screenXBefore,
          timelineContent,
        };
      },
      [setCurrentScale, store, scaleRangeRef, scaleNumberRef]
    );

    const handleScaleChange = useCallback(
      e => {
        const newScale = parseFloat(e.target.value);
        applyAnchoredZoom(newScale);
        e.target.style.setProperty(
          '--range-progress',
          `${Math.round(((newScale - 1) / (30 - 1)) * 100)}%`
        );
      },
      [applyAnchoredZoom]
    );

    const toggleAnimations = row => {
      setAnimationsPanelRow(row);
      setIsAnimationsVisible(prev => !prev);
    };

    useEffect(() => {
      if (!store.selectedElement || store.selectedElement.type === 'audio') {
        setIsAnimationsVisible(false);
      }
    }, [store.selectedElement]);

    const calculateFitScale = useCallback(() => {
      if (!timelineContentRef.current || !store.lastElementEnd) return 1;

      const containerWidth = timelineContentRef.current.clientWidth;
      const totalContentDuration = store.lastElementEnd;

      return Math.max(1, (totalContentDuration / containerWidth) * 0.9);
    }, [store.lastElementEnd]);

    const handleFitClick = useCallback(() => {
      const fitScale = calculateFitScale();
      applyAnchoredZoom(fitScale);
    }, [calculateFitScale, applyAnchoredZoom]);

    const resetTimeline = () => {
      // setCurrentScale(1);
      store.setPlaying(false);
      store.updateTimeTo(0);
      dispatch(resetActiveScene());
    };

    const handleMoreMenuClick = option => {
      setIsMoreMenuVisible(false);
      // Handle different more menu options
      switch (option.id) {
        case 1: // Cut
          setIsCutMode(!isCutMode);
          break;
        case 2: // Remove Silence
          // Add remove silence functionality
          break;
        case 3: // Compact Audio
          store.compactAudioElements();

          break;
        default:
          break;
      }
    };

    const handleSpeedChange = option => {
      setIsSpeedControlVisible(false);
      store.setPlaybackRate(option.value);
    };

    const getCurrentSpeedLabel = () => {
      const option = speedOptions.find(opt => opt.value === store.playbackRate);
      return option ? option.label : '1x';
    };

    // Render timeline controls
    const renderTimelineControls = () => {
      return (
        <div
          className={styles.timelineControls}
          ref={timelineControlsRef}
          data-timeline-controls-root
        >
          <TimeLineControlPanel
            // Control visibility states
            checkedStates={checkedStates}
            onToggleCheckbox={toggleCheckbox}
            // Volume controls
            currentVolume={currentVolume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            isSelectedElementsAudio={isSelectedElementsAudio}
            selectedAudioElements={selectedAudioElements}
            // Speed controls
            currentSpeed={store.playbackRate}
            onSpeedChange={handleSpeedChange}
            speedOptions={speedOptions}
            // Undo/Redo controls
            onUndo={onUndo}
            onRedo={onRedo}
            isUndoRedoLoading={isUndoRedoLoading}
            // Cut controls
            isCutMode={isCutMode}
            onCutToggle={handleCutClick}
            onCompactAudio={() => {
              store.compactAudioElements();
            }}
            // Zoom controls
            currentScale={currentScale}
            onScaleChange={applyAnchoredZoom}
            scaleRangeRef={scaleRangeRef}
            // More menu options
            moreMenuOptions={moreMenuOptions}
            onMoreMenuClick={handleMoreMenuClick}
            // Settings menu options
            settingsMenuOptions={menuOptions}
            // Position and drag controls
            controlsPosition={controlsPosition}
            onPositionChange={setControlsPosition}
            timelineControlsRef={timelineControlsRef}
            onDraggingChange={setIsControlsDragging}
            onReset={resetTimeline}
          />
          {!isControlsDragging && (
            <div className={styles.playbackControls}>
              <div className={styles.playbackControlsItem}>
                <ButtonWithIcon
                  icon="VideoBackwardIcon"
                  color="#FFFFFF66"
                  accentColor="white"
                  size="14"
                  onClick={() => {
                    const newTime = store.currentTimeInMs - 5000;
                    store.handleSeek(
                      Math.max(0, Math.min(newTime, store.maxTime))
                    );
                  }}
                  tooltipText="5 sec back"
                />
                <ButtonWithIcon
                  icon={store.playing ? 'PauseIcon' : 'PlayIcon'}
                  size="20"
                  accentColor="white"
                  color={store.playing ? '#FFFFFF' : '#FFFFFF66'}
                  onClick={() => store.setPlaying(!store.playing)}
                  classNameButton={styles.playButton}
                  classNameIcon={`${styles.playIcon} ${
                    store.playing ? '' : styles.active
                  }`}
                  tooltipText={store.playing ? 'Pause' : 'Play'}
                />
                <ButtonWithIcon
                  icon="VideoForwardIcon"
                  size="14"
                  color="#FFFFFF66"
                  accentColor="white"
                  onClick={() => {
                    const newTime = store.currentTimeInMs + 5000;
                    store.handleSeek(
                      Math.max(0, Math.min(newTime, store.maxTime))
                    );
                  }}
                  tooltipText="5 sec forward"
                />
              </div>
              <div className={styles.timeContainer}>
                <span
                  className={styles.timeText}
                  style={{ color: store.playing ? '#FFFFFF' : '#ffffff99' }}
                >
                  {formatTime(store.currentTimeInMs)}
                </span>
                <span
                  className={styles.timeText}
                  style={{ color: store.playing ? '#FFFFFF' : '#ffffff99' }}
                >
                  /
                </span>
                <span
                  className={styles.timeText}
                  style={{ color: store.playing ? '#FFFFFF' : '#ffffff99' }}
                >
                  {formatTime(store.lastElementEnd)}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    };

    // Compute overlay rect for portal overlay
    const wrapperRef = useRef(null);
    const [overlayRect, setOverlayRect] = useState(null);

    useEffect(() => {
      const updateRect = () => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          setOverlayRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      };

      updateRect();
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);
      const id = requestAnimationFrame(updateRect);

      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect, true);
        cancelAnimationFrame(id);
      };
    }, []);

    return (
      <div
        ref={wrapperRef}
        className={`${styles.timelineWrap} ${
          isCutMode ? 'timeline-scissors-cursor' : ''
        }`}
        data-timeline
        onClick={handleTimelineClick}
        style={{ minHeight: '183px' }}
        data-interactive={true}
      >
        {/* Timeline Loading Overlay via Portal - only during initialization */}
        {store?.isInitializationInProgress === true &&
          (!store?.renderingStatus ||
            store?.renderingStatus?.state !== 'rendering') &&
          overlayRect &&
          createPortal(
            <div
              className={styles.timelineLoadingOverlay}
              data-interactive="true"
              data-portal="true"
              style={{
                position: 'fixed',
                top: `${overlayRect.top}px`,
                left: `${overlayRect.left}px`,
                width: `${overlayRect.width}px`,
                height: `${overlayRect.height}px`,
                zIndex: 1000000,
                pointerEvents: 'all',
              }}
            >
              <div className={styles.timelineLoadingContent}>
                <Lottie
                  animationData={videfyAnime}
                  className={styles.timelineLottieAnimation}
                  data-testid="timeline-loading-animation"
                  loop
                />
                <div className={styles.timelineLoadingText}>
                  {initializingMessage}
                </div>
              </div>
            </div>,
            document.body
          )}

        {renderTimelineControls()}
        <div className={styles.timelineContent} ref={timelineContentRef}>
          <div className={styles.scaleRangeWrap}>
            <ButtonWithIcon
              icon={
                store.playing
                  ? 'PauseIcon'
                  : store.currentTimeInMs >= store.lastElementEnd - 15
                  ? 'RestartIcon'
                  : 'PlayIcon'
              }
              onClick={() => {
                handlePlaybackClick();

                if (!isActiveScreen) {
                  setTimeout(() => {
                    store.setPlaying(!store.playing);
                  }, 1000);
                } else {
                  store.setPlaying(!store.playing);
                }
              }}
              classNameButton={
                store.currentTimeInMs >= store.lastElementEnd - 15
                  ? styles.restartButton
                  : styles.playButtonMain
              }
              size={
                store.currentTimeInMs >= store.lastElementEnd - 15 ? '24' : '18'
              }
              color="#FFFFFF"
              accentColor="white"
              tooltipText={store.playing ? 'Pause' : 'Play'}
            />
            <ScaleRangeInput
              max={store.maxTime}
              value={store.currentTimeInMs}
              onChange={value => {
                store.handleSeek(value);
              }}
              height={30}
              markings={getMarkingsForScale(currentScale)}
              backgroundColor="transparent"
              scale={currentScale}
              onScaleChange={setCurrentScale}
              storyData={storyData}
              timelineContentRef={timelineContentRef}
              scaleRangeRef={scaleRangeInputRef}
            />
          </div>

          <Timeline
            overlays={store.editorElements}
            store={store}
            toggleAnimations={toggleAnimations}
            isAnimationsVisible={isAnimationsVisible}
            animationsPanelRow={animationsPanelRow}
            handleActiveScene={handleActiveScene}
            storyData={storyData}
            scale={currentScale}
            isCutMode={isCutMode}
            defaultButton={defaultButton}
            setIsCutMode={data => setIsCutMode(data)}
            onOpenTransitionPanel={onOpenTransitionPanel}
          />
        </div>

        <TimelineScrollbar
          scale={currentScale}
          setCurrentScale={applyAnchoredZoom}
          timelineContentRef={timelineContentRef}
        />
      </div>
    );
  }
);
