const TimelineScrollbar = ({
  scale,
  setCurrentScale,
  timelineContentRef,
  isZooming,
}) => {
  const scrollbarRef = useRef(null);
  const handleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const [isResizing, setIsResizing] = useState(null);
  const [initialHandleLeft, setInitialHandleLeft] = useState(0);
  const [initialHandleWidth, setInitialHandleWidth] = useState(0);
  const store = React.useContext(StoreContext);
  const lastScrollRatio = useRef(0);
  const lastZoomOperation = useRef(null);

  const updateHandleSize = useCallback(() => {
    if (
      handleRef.current &&
      scrollbarRef.current &&
      timelineContentRef.current
    ) {
      const scrollbarWidth = scrollbarRef.current.offsetWidth;
      const scaleRatio = Math.max(0, Math.min((scale - 1) / 28.5, 0.98));
      const handleWidth = scrollbarWidth * (1 - scaleRatio);

      // Add transition for smooth width changes
      handleRef.current.style.transition = 'width 0.1s ease-out';
      handleRef.current.style.width = `${handleWidth}px`;

      const scrollRatio =
        timelineContentRef.current.scrollLeft /
        (timelineContentRef.current.scrollWidth -
          timelineContentRef.current.clientWidth);

      // Store last valid scroll ratio
      if (!isNaN(scrollRatio) && isFinite(scrollRatio)) {
        lastScrollRatio.current = scrollRatio;
      }

      const maxLeft = scrollbarWidth - handleWidth;
      // Add transition for smooth position changes
      handleRef.current.style.transition =
        'left 0.1s ease-out, width 0.1s ease-out';
      handleRef.current.style.left = `${maxLeft * lastScrollRatio.current}px`;

      // Ensure pointer is visible after zoom
      if (lastZoomOperation.current) {
        const { newScale, prevScale } = lastZoomOperation.current;
        ensurePointerIsVisible();
        lastZoomOperation.current = null;
      }
    }
  }, [scale, timelineContentRef]);

  // Add back the useLayoutEffect that was removed
  useLayoutEffect(() => {
    updateHandleSize();
  }, [scale, updateHandleSize]);

  // Function to ensure the pointer is visible
  const ensurePointerIsVisible = useCallback(() => {
    if (!timelineContentRef.current) return;

    // Calculate where the pointer should be in the timeline
    const pointerPosition = store.currentTimeInMs / store.maxTime;
    const timelineWidth = timelineContentRef.current.scrollWidth;
    const viewportWidth = timelineContentRef.current.clientWidth;
    const pointerPx = pointerPosition * timelineWidth;

    // Get current scroll position
    const scrollLeft = timelineContentRef.current.scrollLeft;
    const scrollRight = scrollLeft + viewportWidth;

    // Check if pointer is outside visible area
    if (pointerPx < scrollLeft || pointerPx > scrollRight) {
      // Center the pointer in the viewport
      const newScrollPosition = pointerPx - viewportWidth / 2;
      const maxScroll = timelineWidth - viewportWidth;

      // Use smooth scrolling
      timelineContentRef.current.style.scrollBehavior = 'smooth';
      timelineContentRef.current.scrollLeft = Math.max(
        0,
        Math.min(newScrollPosition, maxScroll)
      );

      // Reset scroll behavior after animation
      setTimeout(() => {
        timelineContentRef.current.style.scrollBehavior = 'auto';
      }, 100);
    }
  }, [store.currentTimeInMs, store.maxTime, timelineContentRef]);

  // Add effect to ensure pointer is visible when scale changes
  useEffect(() => {
    ensurePointerIsVisible();
  }, [scale, ensurePointerIsVisible]);

  const handleMouseDown = e => {
    if (e.target.classList.contains(styles.scrollHandleEdge)) {
      const isLeftEdge = e.target.classList.contains(styles.left);
      setIsResizing(isLeftEdge ? 'left' : 'right');
      setDragStartX(e.clientX);
      setInitialHandleLeft(handleRef.current.offsetLeft);
      setInitialHandleWidth(handleRef.current.offsetWidth);
    } else {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartLeft(handleRef.current.offsetLeft);
    }
  };

  const handleMouseMove = e => {
    if (!isDragging && !isResizing) return;
    e.preventDefault();

    const scrollbar = scrollbarRef.current;
    const scrollbarRect = scrollbar.getBoundingClientRect();
    const minWidth = Math.max(scrollbarRect.width * 0.02, 20);
    let newLeft, newWidth;

    if (isResizing) {
      // Remove transition during resize
      if (handleRef.current) {
        handleRef.current.style.transition = 'none';
      }

      const delta = e.clientX - dragStartX;

      // Get current thumb position as ratio (0 to 1) of the timeline
      const thumbPositionRatio = store.currentTimeInMs / store.maxTime;

      if (isResizing === 'left') {
        const idealLeft = initialHandleLeft + delta;
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

      handleRef.current.style.width = `${newWidth}px`;

      // Calculate the new scale
      const widthRatio = newWidth / scrollbarRect.width;
      let newScale = 1 + 28.5 * (1 - widthRatio);
      newScale = Math.max(1, Math.min(newScale, 29.5));

      // Remember previous scale to track zoom direction
      const prevScale = scale;
      lastZoomOperation.current = { newScale, prevScale };

      // Apply new scale first
      setCurrentScale(newScale);

      // Then immediately ensure pointer is visible (don't wait for effect)
      ensurePointerIsVisible();

      // Update scrollbar handle position immediately
      if (timelineContentRef.current) {
        const scrollRatio =
          timelineContentRef.current.scrollLeft /
          (timelineContentRef.current.scrollWidth -
            timelineContentRef.current.clientWidth);

        if (!isNaN(scrollRatio) && isFinite(scrollRatio)) {
          const maxLeft = scrollbarRect.width - newWidth;
          handleRef.current.style.left = `${maxLeft * scrollRatio}px`;
        }
      }
    } else {
      // Remove transition during drag
      if (handleRef.current) {
        handleRef.current.style.transition = 'none';
      }

      const deltaX = e.clientX - dragStartX;
      const maxLeft = scrollbarRect.width - handleRef.current.offsetWidth;
      const newLeftPos = Math.max(0, Math.min(dragStartLeft + deltaX, maxLeft));
      handleRef.current.style.left = `${newLeftPos}px`;

      if (timelineContentRef.current) {
        const scrollRatio = newLeftPos / maxLeft;
        const maxScroll =
          timelineContentRef.current.scrollWidth -
          timelineContentRef.current.clientWidth;
        timelineContentRef.current.scrollLeft = maxScroll * scrollRatio;
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
    // Restore transitions after interaction
    if (handleRef.current) {
      handleRef.current.style.transition =
        'left 0.1s ease-out, width 0.1s ease-out';
    }
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

  return (
    <div
      className={styles.timelineScrollbar}
      ref={scrollbarRef}
      onMouseDown={handleTrackMouseDown}
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
  );
};
