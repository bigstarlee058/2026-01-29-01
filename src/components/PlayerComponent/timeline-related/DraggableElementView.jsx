import React, { useEffect, useRef, useContext } from 'react';

import { throttle } from 'throttle-debounce';

import styles from '../Player.module.scss';
import { StoreContext } from '../../../mobx';

function DraggableElementView(props) {
  const store = useContext(StoreContext);
  const ref = useRef({
    div: null,

    isDragging: false,

    initialMouseX: 0,

    initialMouseY: 0,

    initialValue: 0,

    parentRow: null,

    initialRow: null,

    elementType: null,
  });

  const { current: data } = ref;

  function calculateNewValue(mouseX) {
    if (!data.div) return 0;

    const deltaX = mouseX - data.initialMouseX;

    const deltaValue =
      (deltaX / data.div.parentElement.clientWidth) * props.total;

    return data.initialValue + deltaValue;
  }

  const handleMouseDown = event => {
    if (!data.div) return;

    if (props.disabled) return;

    data.isDragging = true;

    data.initialMouseX = event.clientX;

    data.initialMouseY = event.clientY;

    data.initialValue = props.value;

    // Store the element type if passed through props
    if (props.elementType) {
      data.elementType = props.elementType;
    }

    let parentEl = data.div.parentElement;
    while (parentEl && !parentEl.hasAttribute('data-timeline-row')) {
      parentEl = parentEl.parentElement;
    }
    data.parentRow = parentEl;

    // Store the initial row attribute value
    if (parentEl) {
      data.initialRow = parentEl.getAttribute('data-timeline-row');
    }

    // Start resize ghost if this handle is a resize handle
    if (props.element && props.resizeType && store) {
      const timelineContainer = data.div.closest('[data-timeline]');
      const timelineRect = timelineContainer?.getBoundingClientRect();
      let initialClickOffset = 0;
      if (timelineRect) {
        // Find the overlaysContainer to get the actual scaled width
        const overlaysContainer = data.div.closest('.overlaysContainer') || 
                                 timelineContainer.querySelector('[data-testid="overlays-container"]');
        const overlaysRect = overlaysContainer?.getBoundingClientRect();
        
        const effectiveWidth = overlaysRect ? overlaysRect.width : timelineRect.width;
        const effectiveLeft = overlaysRect ? overlaysRect.left : timelineRect.left;
        
        const clickRelativeToTimeline = event.clientX - effectiveLeft;
        const handlePosition =
          props.resizeType === 'start'
            ? (props.element.timeFrame.start / store.maxTime) * effectiveWidth
            : (props.element.timeFrame.end / store.maxTime) * effectiveWidth;
        initialClickOffset = clickRelativeToTimeline - handlePosition;
      }
      store.startResizeGhost(props.element, props.resizeType, initialClickOffset);
    }

    if (props.onMouseDown) props.onMouseDown();

    event.stopPropagation();

    event.preventDefault();
  };

  const handleMouseMove = throttle(30, event => {
    if (!data.div) return;

    if (!data.isDragging) return;

    // Be more restrictive with vertical movement for video elements
    const deltaY = Math.abs(event.clientY - data.initialMouseY);
    const verticalThreshold = data.elementType === 'video' ? 5 : 10;

    if (deltaY > verticalThreshold) {
      return;
    }

    // For video elements, always ensure we're in the original row
    if (data.elementType === 'video' && data.initialRow && data.parentRow) {
      const currentRow = data?.parentRow?.getAttribute('data-timeline-row');
      if (currentRow !== data.initialRow) {
        return; // Prevent movement if not in original row
      }
    }

    let newValue = calculateNewValue(event.clientX);

    if (props.constraints) {
      if (newValue < props.constraints.min) {
        newValue = props.constraints.min;
      }

      if (newValue > props.constraints.max) {
        newValue = props.constraints.max;
      }
    }

    if (newValue < 0) newValue = 0;

    if (newValue > props.total) newValue = props.total;

    const prevValue = props.value;

    props.onChange(newValue);

    if (props.value === prevValue) {
      newValue = prevValue;
    }

    data.div.style.left = `${(newValue / props.total) * 100}%`;

    // Update resize ghost if active
    if (store && store.ghostState?.isResizing && props.element && props.resizeType) {
      const element = props.element;
      const timelineContainer = data.div.closest('[data-timeline]');
      const timelineRect = timelineContainer?.getBoundingClientRect();
      if (timelineRect) {
        // Find the overlaysContainer to get the actual scaled width
        const overlaysContainer = data.div.closest('.overlaysContainer') || 
                                 timelineContainer.querySelector('[data-testid="overlays-container"]');
        const overlaysRect = overlaysContainer?.getBoundingClientRect();
        
        const effectiveWidth = overlaysRect ? overlaysRect.width : timelineRect.width;
        const effectiveLeft = overlaysRect ? overlaysRect.left : timelineRect.left;
        
        const mouseRelativeToTimeline = event.clientX - effectiveLeft;
        const initialClickOffset = store.ghostState.initialClickOffset || 0;
        const adjustedMousePosition = mouseRelativeToTimeline - initialClickOffset;
        const newTimeValue = Math.max(
          0,
          Math.min(store.maxTime, (adjustedMousePosition / effectiveWidth) * store.maxTime)
        );

        if (props.resizeType === 'start') {
          const clampedStart = Math.min(newTimeValue, element.timeFrame.end - 100);
          store.updateResizeGhost(clampedStart, element.timeFrame.end);
        } else if (props.resizeType === 'end') {
          const clampedEnd = Math.max(newTimeValue, element.timeFrame.start + 100);
          store.updateResizeGhost(element.timeFrame.start, clampedEnd);
        }
      } else {
        // Fallback: derive by value
        if (props.resizeType === 'start') {
          store.updateResizeGhost(Math.min(newValue, element.timeFrame.end - 100), element.timeFrame.end);
        } else if (props.resizeType === 'end') {
          store.updateResizeGhost(element.timeFrame.start, Math.max(newValue, element.timeFrame.start + 100));
        }
      }
    }

    event.stopPropagation();

    event.preventDefault();
  });

  const handleMouseUp = event => {
    if (!data.div) return;
    if (!data.isDragging) return;

    data.isDragging = false;

    // Only call onChange if we didn't have significant vertical movement
    // Be more restrictive with video elements
    const deltaY = Math.abs(event.clientY - data.initialMouseY);
    const verticalThreshold = data.elementType === 'video' ? 5 : 10;

    if (
      deltaY <= verticalThreshold &&
      (!data.elementType === 'video' ||
        data?.parentRow?.getAttribute('data-timeline-row') === data.initialRow)
    ) {
      if (props.onMouseUp) {
        props.onMouseUp();
      }
    }

    // Finish resize ghost if active
    if (store && store.ghostState?.isResizing && props.element && props.resizeType) {
      const element = props.element;
      const timelineContainer = data.div.closest('[data-timeline]');
      const timelineRect = timelineContainer?.getBoundingClientRect();
      let newTimeValue;
      if (timelineRect) {
        // Find the overlaysContainer to get the actual scaled width
        const overlaysContainer = data.div.closest('.overlaysContainer') || 
                                 timelineContainer.querySelector('[data-testid="overlays-container"]');
        const overlaysRect = overlaysContainer?.getBoundingClientRect();
        
        const effectiveWidth = overlaysRect ? overlaysRect.width : timelineRect.width;
        const effectiveLeft = overlaysRect ? overlaysRect.left : timelineRect.left;
        
        const mouseRelativeToTimeline = event.clientX - effectiveLeft;
        const initialClickOffset = store.ghostState.initialClickOffset || 0;
        const adjustedMousePosition = mouseRelativeToTimeline - initialClickOffset;
        newTimeValue = Math.max(
          0,
          Math.min(store.maxTime, (adjustedMousePosition / effectiveWidth) * store.maxTime)
        );
      } else {
        newTimeValue = calculateNewValue(event.clientX);
      }
      let finalStart = element.timeFrame.start;
      let finalEnd = element.timeFrame.end;
      if (props.resizeType === 'start') {
        finalStart = Math.max(0, Math.min(newTimeValue, element.timeFrame.end - 100));
      } else if (props.resizeType === 'end') {
        finalEnd = Math.max(element.timeFrame.start + 100, Math.min(newTimeValue, store.maxTime));
      }
      store.finishResizeGhost(finalStart, finalEnd);
    }

    // Reset stored values
    data.initialRow = null;
    data.elementType = null;

    event.stopPropagation();
    event.preventDefault();
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);

      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={r => {
        data.div = r;
      }}
      className={`${styles.dragableView} ${props.className}`}
      style={{
        left: `${(props.value / props.total) * 100}%`,

        top: 0,

        bottom: 0,

        ...props.style,
      }}
      onMouseUp={props.onMouseUp}
      onMouseDown={handleMouseDown}
      onDoubleClick={props.onDoubleClick}
    >
      {props.children}
    </div>
  );
}

export default DraggableElementView;
