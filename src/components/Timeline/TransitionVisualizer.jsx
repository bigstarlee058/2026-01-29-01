import React, {
  useState,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './TransitionVisualizer.module.scss';
import effectStyles from './EffectVisualizer.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

// Add this outside the component to track which menu is open
let openActionMenuId = null;

const TransitionVisualizer = observer(({ rowIndex, onOpenTransitionPanel }) => {
  const store = useContext(StoreContext);
  const [draggingTransition, setDraggingTransition] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [availableTransitions, setAvailableTransitions] = useState([]);
  const [resizingTransition, setResizingTransition] = useState(null);
  const [resizeType, setResizeType] = useState(null); // 'left' or 'right'
  const [hoveredGap, setHoveredGap] = useState(null);
  const [resizeStartData, setResizeStartData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const transitionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const lastPosition = useRef({ x: 0, y: 0 });
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Menu states
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
  const [activeTransitionId, setActiveTransitionId] = useState(null);
  const menuTimeoutRef = useRef(null);
  const isMouseOverMenuRef = useRef(false);
  const isMouseOverButtonRef = useRef(false);
  const buttonRefs = useRef(new Map());

  // Load available transitions
  useEffect(() => {
    const loadTransitions = async () => {
      try {
        const { availableTransitions: transitions } = await import(
          '../../utils/gl-transitions'
        );

        // Check if transitions are loaded, wait if not
        let attempts = 0;
        const maxAttempts = 50;

        const checkTransitions = () => {
          if (transitions && transitions.length > 0) {
            setAvailableTransitions(transitions);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkTransitions, 100);
          }
        };

        checkTransitions();
      } catch (error) {
        console.error('Failed to load transitions:', error);
      }
    };

    loadTransitions();
  }, []);

  // Get image elements for current row
  const getImageElementsForRow = useCallback(
    row => {
      return store.editorElements
        .filter(
          el =>
            el.row === row &&
            (el.type === 'image' ||
              el.type === 'imageUrl' ||
              el.type === 'video')
        )
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);
    },
    [store.editorElements]
  );

  // Get potential transition gaps between images
  const getTransitionGaps = useCallback(() => {
    const imageElements = getImageElementsForRow(rowIndex);
    const gaps = [];

    for (let i = 0; i < imageElements.length - 1; i++) {
      const fromElement = imageElements[i];
      const toElement = imageElements[i + 1];

      // Check if there's already a transition between these elements
      const existingTransition = store.animations.find(
        anim =>
          anim.type === 'glTransition' &&
          anim.fromElementId === fromElement.id &&
          anim.toElementId === toElement.id
      );

      if (!existingTransition) {
        // Calculate gap position
        const gapStart = fromElement.timeFrame.end;
        const gapEnd = toElement.timeFrame.start;
        const gapCenter = (gapStart + gapEnd) / 2;

        gaps.push({
          id: `gap-${fromElement.id}-${toElement.id}`,
          fromElement,
          toElement,
          gapStart,
          gapEnd,
          gapCenter,
          position: (gapCenter / store.maxTime) * 100,
        });
      }
    }

    return gaps;
  }, [getImageElementsForRow, rowIndex, store.animations, store.maxTime]);

  // Get GL transitions for current row
  const getGLTransitionsForRow = useCallback(
    row => {
      const rowElements = store.editorElements
        .filter(el => el.row === row)
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

      const transitions = store.animations
        .filter(anim => anim.type === 'glTransition')
        .map(transition => {
          const fromElement = rowElements.find(
            el => el.id === transition.fromElementId
          );
          const toElement = rowElements.find(
            el => el.id === transition.toElementId
          );

          if (!fromElement || !toElement) return null;

          const transitionInfo = availableTransitions.find(
            t => t.name === transition.transitionType
          );

          return {
            ...transition,
            fromElement,
            toElement,
            transitionInfo,
            // Calculate visual position
            visualStart: transition.startTime,
            visualEnd: transition.endTime,
            overlap: {
              withFrom: Math.max(
                0,
                fromElement.timeFrame.end - transition.startTime
              ),
              withTo: Math.max(
                0,
                transition.endTime - toElement.timeFrame.start
              ),
            },
          };
        })
        .filter(Boolean);

      return transitions;
    },
    [store.editorElements, store.animations, availableTransitions]
  );

  const transitions = getGLTransitionsForRow(rowIndex);
  const transitionGaps = getTransitionGaps();

  // Stabilize transitions during playback to prevent visual glitches
  const [stableTransitions, setStableTransitions] = useState([]);
  const [lastPlayingState, setLastPlayingState] = useState(store.playing);

  // Use stable transitions during playback, live transitions when paused
  // Set to empty array to disable visualization but keep plus sign on gaps
  const displayTransitions = [];

  // Handle opening transition panel for selection
  const handleOpenTransitionSelection = gap => {
    // First, activate the fromElement (the image before the gap)
    if (gap.fromElement && store.setSelectedElement) {
      store.setSelectedElement(gap.fromElement);
    }

    if (onOpenTransitionPanel) {
      onOpenTransitionPanel({
        type: 'create',
        fromElement: gap.fromElement,
        toElement: gap.toElement,
        gap: gap,
        activeTab: 'two-way', // Set active tab to two-way
        panelMode: 'transitions', // Set panel mode to transitions
      });
    }
  };

  const handleTransitionClick = (e, transition) => {
    // Don't open panel if user actually dragged or if currently dragging
    if (isDragging || hasDraggedRef.current) {
      return;
    }

    // Check if click was on resize handle
    if (e.target.closest('[class*="resizeHandle"]')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // First, activate the fromElement (the image before the transition)
    if (transition.fromElement && store.setSelectedElement) {
      store.setSelectedElement(transition.fromElement);
    }

    // Check if TransitionPanel is already open
    const transitionPanel = document.querySelector(
      '[data-testid="transition-panel"]'
    );
    const isTransitionPanelOpen =
      transitionPanel && transitionPanel.offsetParent !== null;

    // Check current panel mode by looking at data attribute
    const currentPanelMode = transitionPanel
      ? transitionPanel.getAttribute('data-panel-mode')
      : null;
    const isInTransitionsMode = currentPanelMode === 'transitions';

    // Close DetailPanel if it's open
    window.dispatchEvent(new CustomEvent('transitionPanelClosed'));

    if (isTransitionPanelOpen && isInTransitionsMode && onOpenTransitionPanel) {
      // If TransitionPanel is open and in transitions mode, open transition selection with existing transition info
      const gapData = {
        id: `gap-${transition.fromElement.id}-${transition.toElement.id}`,
        fromElement: transition.fromElement,
        toElement: transition.toElement,
        gapStart: transition.fromElement.timeFrame.end,
        gapEnd: transition.toElement.timeFrame.start,
        gapCenter:
          (transition.fromElement.timeFrame.end +
            transition.toElement.timeFrame.start) /
          2,
        position:
          ((transition.fromElement.timeFrame.end +
            transition.toElement.timeFrame.start) /
            2 /
            store.maxTime) *
          100,
        existingTransition: transition, // Include existing transition for replacement
      };

      onOpenTransitionPanel({
        type: 'create',
        fromElement: transition.fromElement,
        toElement: transition.toElement,
        gap: gapData,
        currentTransitionType: transition.transitionType, // Pass current type for highlighting
        panelMode: 'transitions', // Set panel mode to transitions
      });
    } else {
      // If TransitionPanel is closed or not in transitions mode, open it in transitions mode
      window.dispatchEvent(
        new CustomEvent('openAnimationSidebar', {
          detail: {
            type: 'transition',
            activeTab: 'transitions',
            panelMode: 'transitions',
          },
        })
      );
    }
  };

  const handleTransitionDragStart = (e, transition) => {
    e.preventDefault();
    setDraggingTransition(transition);
    setIsDragging(true);
    hasDraggedRef.current = false;

    // Set flag to prevent selection changes during drag
    store.isDraggingVisualizer = true;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    // Store start position for drag detection
    dragStartPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeStart = (e, transition, type) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTransition(transition);
    setResizeType(type);
    hasDraggedRef.current = true; // Mark as dragged to prevent click

    // Set flag to prevent selection changes during resize
    store.isDraggingVisualizer = true;

    // Store initial data for resize
    setResizeStartData({
      startTime: transition.startTime,
      endTime: transition.endTime,
      duration: transition.duration,
      mouseX: e.clientX,
    });
  };

  const handleTransitionDrag = useCallback(
    e => {
      if (!draggingTransition || !transitionRef.current) return;

      // Check if user has moved more than 5 pixels (threshold for drag)
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragStartPosition.current.x, 2) +
          Math.pow(e.clientY - dragStartPosition.current.y, 2)
      );

      if (dragDistance > 5) {
        hasDraggedRef.current = true;
      }

      // Cancel previous animation frame if it exists
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const currentTime = Date.now();

        // Throttle updates to max 60fps
        if (currentTime - lastUpdateTime.current < 16) {
          return;
        }

        // Skip update if mouse hasn't moved enough (< 2px)
        const deltaX = Math.abs(e.clientX - lastPosition.current.x);
        const deltaY = Math.abs(e.clientY - lastPosition.current.y);
        if (deltaX < 2 && deltaY < 2) {
          return;
        }

        lastUpdateTime.current = currentTime;
        lastPosition.current = { x: e.clientX, y: e.clientY };

        const timelineRect = transitionRef.current
          .closest('[data-timeline-row]')
          .getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left - dragOffset.x;
        const timelineWidth = timelineRect.width;

        // Calculate new time position
        const newTimePosition = (relativeX / timelineWidth) * store.maxTime;

        // Update transition timing
        // Use the current visual duration, not the stored duration
        const currentVisualDuration =
          draggingTransition.visualEnd - draggingTransition.visualStart;
        const originalDuration = currentVisualDuration;

        // Get from and to elements for boundary constraints
        const fromElement = draggingTransition.fromElement;
        const toElement = draggingTransition.toElement;

        // Calculate new start time with constraints
        let newStartTime = Math.max(0, newTimePosition);
        if (fromElement) {
          // Don't let the transition start before the from element starts
          newStartTime = Math.max(newStartTime, fromElement.timeFrame.start);
          // Don't let the transition start after the from element ends
          newStartTime = Math.min(newStartTime, fromElement.timeFrame.end);
        }

        // Calculate new end time maintaining original duration
        let newEndTime = newStartTime + originalDuration;

        // Apply toElement constraints
        if (toElement) {
          // Don't let the transition end after the to element ends
          newEndTime = Math.min(newEndTime, toElement.timeFrame.end);
          // Don't let the transition end before the to element starts
          newEndTime = Math.max(newEndTime, toElement.timeFrame.start);
        }

        // Apply global constraints
        newEndTime = Math.min(store.maxTime, newEndTime);

        // If we can't maintain the original duration due to constraints,
        // prioritize preserving duration by adjusting start time
        if (newEndTime - newStartTime !== originalDuration) {
          // Try to preserve duration by moving the transition left
          newStartTime = newEndTime - originalDuration;

          // Re-apply fromElement constraints to the adjusted start time
          if (fromElement) {
            if (newStartTime < fromElement.timeFrame.start) {
              // If we can't fit the full duration, compromise by centering within constraints
              const availableSpace = Math.min(
                fromElement.timeFrame.end - fromElement.timeFrame.start,
                toElement
                  ? toElement.timeFrame.end - toElement.timeFrame.start
                  : store.maxTime
              );
              const constrainedDuration = Math.min(
                originalDuration,
                availableSpace
              );
              newStartTime = fromElement.timeFrame.start;
              newEndTime = newStartTime + constrainedDuration;
            } else {
              newStartTime = Math.min(newStartTime, fromElement.timeFrame.end);
            }
          }

          // Re-apply global constraints
          newStartTime = Math.max(0, newStartTime);

          // Recalculate end time with the adjusted start time
          newEndTime = newStartTime + originalDuration;

          // Final constraint check
          if (toElement) {
            newEndTime = Math.min(newEndTime, toElement.timeFrame.end);
          }
          newEndTime = Math.min(store.maxTime, newEndTime);
        }

        // Update the transition in store
        const transitionIndex = store.animations.findIndex(
          a => a.id === draggingTransition.id
        );
        if (transitionIndex !== -1) {
          const transition = store.animations[transitionIndex];

          // Calculate final duration based on actual positions
          const finalDuration = newEndTime - newStartTime;

          // Update all relevant fields
          transition.startTime = newStartTime;
          transition.endTime = newEndTime;
          transition.duration = finalDuration;

          // Update properties if they exist
          if (transition.properties) {
            transition.properties.startTime = newStartTime;
            transition.properties.endTime = newEndTime;
            transition.properties.duration = finalDuration;
          }

          // Update GL transition timing in the renderer
          store.updateGLTransitionTiming(transition.id, {
            startTime: newStartTime,
            endTime: newEndTime,
            duration: finalDuration,
          });

          // Debug: Log drag operation results
          if (process.env.NODE_ENV === 'development') {
          }
        }
      });
    },
    [draggingTransition, dragOffset, store.maxTime, store.animations]
  );

  const handleResizeDrag = useCallback(
    e => {
      if (!resizingTransition || !resizeStartData || !transitionRef.current)
        return;

      // Cancel previous animation frame if it exists
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const currentTime = Date.now();

        // Throttle updates to max 60fps
        if (currentTime - lastUpdateTime.current < 16) {
          return;
        }

        // Skip update if mouse hasn't moved enough (< 2px)
        const deltaX = Math.abs(e.clientX - lastPosition.current.x);
        const deltaY = Math.abs(e.clientY - lastPosition.current.y);
        if (deltaX < 2 && deltaY < 2) {
          return;
        }

        lastUpdateTime.current = currentTime;
        lastPosition.current = { x: e.clientX, y: e.clientY };

        const timelineRect = transitionRef.current
          .closest('[data-timeline-row]')
          .getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left;
        const timelineWidth = timelineRect.width;
        const newTimePosition = (relativeX / timelineWidth) * store.maxTime;

        const transitionIndex = store.animations.findIndex(
          a => a.id === resizingTransition.id
        );
        if (transitionIndex === -1) return;

        const transition = store.animations[transitionIndex];
        const minDuration = 100; // Minimum 100ms
        const maxDuration = 5000; // Maximum 5 seconds

        // Get from and to elements for boundary constraints
        const fromElement = resizingTransition.fromElement;
        const toElement = resizingTransition.toElement;

        if (resizeType === 'left') {
          // Resize from left (change start time, keep end time)
          let newStartTime = Math.max(
            0,
            Math.min(newTimePosition, resizeStartData.endTime - minDuration)
          );

          // Apply element boundary constraints
          if (fromElement) {
            newStartTime = Math.max(newStartTime, fromElement.timeFrame.start);
            newStartTime = Math.min(newStartTime, fromElement.timeFrame.end);
          }

          const newDuration = resizeStartData.endTime - newStartTime;

          if (newDuration >= minDuration && newDuration <= maxDuration) {
            // Update all relevant fields
            transition.startTime = newStartTime;
            transition.duration = newDuration;
            transition.endTime = resizeStartData.endTime; // Keep end time

            // Update properties if they exist
            if (transition.properties) {
              transition.properties.startTime = newStartTime;
              transition.properties.endTime = resizeStartData.endTime;
              transition.properties.duration = newDuration;
            }

            // Update GL transition timing in the renderer
            store.updateGLTransitionTiming(transition.id, {
              startTime: newStartTime,
              endTime: resizeStartData.endTime,
              duration: newDuration,
            });
          }
        } else if (resizeType === 'right') {
          // Resize from right (change end time, keep start time)
          let newEndTime = Math.min(
            store.maxTime,
            Math.max(newTimePosition, resizeStartData.startTime + minDuration)
          );

          // Apply element boundary constraints
          if (toElement) {
            newEndTime = Math.max(newEndTime, toElement.timeFrame.start);
            newEndTime = Math.min(newEndTime, toElement.timeFrame.end);
          }

          const newDuration = newEndTime - resizeStartData.startTime;

          if (newDuration >= minDuration && newDuration <= maxDuration) {
            // Update all relevant fields
            transition.endTime = newEndTime;
            transition.duration = newDuration;
            transition.startTime = resizeStartData.startTime; // Keep start time

            // Update properties if they exist
            if (transition.properties) {
              transition.properties.startTime = resizeStartData.startTime;
              transition.properties.endTime = newEndTime;
              transition.properties.duration = newDuration;
            }

            // Update GL transition timing in the renderer
            store.updateGLTransitionTiming(transition.id, {
              startTime: resizeStartData.startTime,
              endTime: newEndTime,
              duration: newDuration,
            });
          }
        }
      });
    },
    [
      resizingTransition,
      resizeStartData,
      resizeType,
      store.maxTime,
      store.animations,
    ]
  );

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // If we were dragging or resizing, trigger a store update
    if (draggingTransition || resizingTransition) {
      // Force MobX to trigger observers
      store.refreshAnimations();

      // Dispatch custom event to notify other components
      window.dispatchEvent(
        new CustomEvent('transitionUpdated', {
          detail: {
            transitionId: draggingTransition?.id || resizingTransition?.id,
            action: draggingTransition ? 'drag' : 'resize',
          },
        })
      );
    }

    setDraggingTransition(null);
    setResizingTransition(null);
    setResizeType(null);
    setResizeStartData(null);
    setDragOffset({ x: 0, y: 0 });

    // Reset position tracking
    lastPosition.current = { x: 0, y: 0 };
    dragStartPosition.current = { x: 0, y: 0 };

    setIsDragging(false);

    // Reset drag flag after a short delay to allow click to work
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 10);
  }, [draggingTransition, resizingTransition, store]);

  // Handle right click (context menu)
  const handleContextMenu = (e, transition) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't open menu if user is dragging
    if (isDragging || hasDraggedRef.current) {
      return;
    }

    // Close any other open menus
    if (openActionMenuId && openActionMenuId !== transition.id) {
      document.dispatchEvent(
        new CustomEvent('closeTransitionActionMenu', {
          detail: { exceptId: transition.id },
        })
      );
    }

    // Calculate menu position based on mouse position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Estimate menu dimensions
    const estimatedMenuWidth = 150;
    const estimatedMenuHeight = 120;

    // Calculate initial position
    let menuX = e.clientX;
    let menuY = e.clientY;

    // Check if menu would overflow right edge
    if (menuX + estimatedMenuWidth > viewportWidth) {
      menuX = e.clientX - estimatedMenuWidth;
    }

    // Check if menu would overflow bottom edge
    if (menuY + estimatedMenuHeight > viewportHeight) {
      menuY = e.clientY - estimatedMenuHeight;
    }

    // Check if menu would overflow top edge
    if (menuY < 0) {
      menuY = 0;
    }

    // Check if menu would overflow left edge
    if (menuX < 0) {
      menuX = 0;
    }

    setMenuCoords({
      x: menuX,
      y: menuY,
    });

    setActiveTransitionId(transition.id);
    openActionMenuId = transition.id;
    setIsActionMenuOpen(true);
  };

  // Menu handlers (based on AnimationItem.jsx)
  const handleMenuMouseEnter = transitionId => {
    isMouseOverButtonRef.current = true;

    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }

    menuTimeoutRef.current = setTimeout(() => {
      if (openActionMenuId && openActionMenuId !== transitionId) {
        document.dispatchEvent(
          new CustomEvent('closeTransitionActionMenu', {
            detail: { exceptId: transitionId },
          })
        );
      }

      const btnNode = buttonRefs.current.get(transitionId);
      if (btnNode) {
        const { top, left, height, width } = btnNode.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Estimate menu dimensions
        const estimatedMenuWidth = 150;
        const estimatedMenuHeight = 120;

        // Calculate initial position
        let menuX = width + left;
        let menuY = top - 30;

        // Check if menu would overflow right edge
        if (menuX + estimatedMenuWidth > viewportWidth) {
          menuX = left - estimatedMenuWidth; // Show menu to the left of the button
        }

        // Check if menu would overflow bottom edge
        if (menuY + estimatedMenuHeight > viewportHeight) {
          if (top - estimatedMenuHeight > 0) {
            menuY = top - estimatedMenuHeight + 30;
          } else {
            menuY = Math.max(0, viewportHeight - estimatedMenuHeight);
          }
        }

        // Check if menu would overflow top edge
        if (menuY < 0) {
          menuY = 0;
        }

        setMenuCoords({
          x: menuX,
          y: menuY,
        });
      }

      setActiveTransitionId(transitionId);
      openActionMenuId = transitionId;
      setIsActionMenuOpen(true);
    }, 200);
  };

  const handleMenuMouseLeave = () => {
    isMouseOverButtonRef.current = false;

    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }

    menuTimeoutRef.current = setTimeout(() => {
      if (
        !isMouseOverMenuRef.current &&
        !isMouseOverButtonRef.current &&
        openActionMenuId === activeTransitionId
      ) {
        openActionMenuId = null;
        setIsActionMenuOpen(false);
        setActiveTransitionId(null);
      }
    }, 300);
  };

  const handleActionMenuMouseEnter = () => {
    isMouseOverMenuRef.current = true;

    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
  };

  const handleActionMenuMouseLeave = () => {
    isMouseOverMenuRef.current = false;

    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }

    menuTimeoutRef.current = setTimeout(() => {
      if (
        !isMouseOverButtonRef.current &&
        openActionMenuId === activeTransitionId
      ) {
        openActionMenuId = null;
        setIsActionMenuOpen(false);
        setActiveTransitionId(null);
      }
    }, 300);
  };

  const handleEditTransition = () => {
    const transition = displayTransitions.find(
      t => t.id === activeTransitionId
    );
    if (transition) {
      // First, activate the fromElement (the image before the transition)
      if (transition.fromElement && store.setSelectedElement) {
        store.setSelectedElement(transition.fromElement);
      }

      // Close DetailPanel if it's open
      window.dispatchEvent(new CustomEvent('transitionPanelClosed'));

      if (onOpenTransitionPanel) {
        // Create a "gap" object like the + button does, but include existing transition info
        const gapData = {
          id: `gap-${transition.fromElement.id}-${transition.toElement.id}`,
          fromElement: transition.fromElement,
          toElement: transition.toElement,
          gapStart: transition.fromElement.timeFrame.end,
          gapEnd: transition.toElement.timeFrame.start,
          gapCenter:
            (transition.fromElement.timeFrame.end +
              transition.toElement.timeFrame.start) /
            2,
          position:
            ((transition.fromElement.timeFrame.end +
              transition.toElement.timeFrame.start) /
              2 /
              store.maxTime) *
            100,
          existingTransition: transition, // Include existing transition for replacement
        };

        onOpenTransitionPanel({
          type: 'create',
          fromElement: transition.fromElement,
          toElement: transition.toElement,
          gap: gapData,
          currentTransitionType: transition.transitionType, // Pass current type for highlighting
          panelMode: 'transitions', // Set panel mode to transitions
        });
      } else {
        // If onOpenTransitionPanel is not available, try opening with event
        window.dispatchEvent(
          new CustomEvent('openAnimationSidebar', {
            detail: {
              type: 'transition',
              activeTab: 'transitions',
              panelMode: 'transitions',
            },
          })
        );
      }
    }
    setIsActionMenuOpen(false);
    openActionMenuId = null;
    setActiveTransitionId(null);
  };

  const handleDeleteTransition = () => {
    const transition = displayTransitions.find(
      t => t.id === activeTransitionId
    );
    if (transition) {
      store.removeGLTransition(transition.id);
    }
    setIsActionMenuOpen(false);
    openActionMenuId = null;
    setActiveTransitionId(null);
  };

  useEffect(() => {
    const handleMouseMove = e => {
      if (draggingTransition) {
        handleTransitionDrag(e);
      } else if (resizingTransition) {
        handleResizeDrag(e);
      }
    };

    if (draggingTransition || resizingTransition) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Cancel any pending animation frame on cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [
    draggingTransition,
    resizingTransition,
    handleTransitionDrag,
    handleResizeDrag,
    handleMouseUp,
  ]);

  // Cleanup on unmount and menu event handlers
  useEffect(() => {
    const handleCloseMenu = e => {
      if (e.detail.exceptId !== activeTransitionId) {
        setIsActionMenuOpen(false);
        setActiveTransitionId(null);
      }
    };

    document.addEventListener('closeTransitionActionMenu', handleCloseMenu);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
      document.removeEventListener(
        'closeTransitionActionMenu',
        handleCloseMenu
      );
    };
  }, [activeTransitionId]);

  if (displayTransitions.length === 0 && transitionGaps.length === 0)
    return null;

  return (
    <div
      className={styles.transitionLayer}
      ref={transitionRef}
      data-timeline-row
    >
      {/* Render existing transitions */}
      {displayTransitions.map(transition => {
        const leftPercent = (transition.visualStart / store.maxTime) * 100;
        const widthPercent =
          ((transition.visualEnd - transition.visualStart) / store.maxTime) *
          100;

        // Debug: Log transition size calculations only during drag/resize operations (throttled)
        if (
          process.env.NODE_ENV === 'development' &&
          (draggingTransition?.id === transition.id ||
            resizingTransition?.id === transition.id) &&
          Date.now() - lastUpdateTime.current > 200
        ) {
          // Log only every 200ms
        }

        return (
          <div
            key={transition.id}
            className={`${styles.transitionVisualizer} ${
              draggingTransition?.id === transition.id ? styles.dragging : ''
            } ${
              resizingTransition?.id === transition.id ? styles.resizing : ''
            } ${store.playing ? styles.playing : ''}`}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
            }}
            data-transition-type={transition.transitionType}
            onMouseDown={
              store.playing
                ? undefined
                : e => {
                    // Don't start drag if clicking on resize handle or menu button
                    if (
                      e.target.closest('[class*="resizeHandle"]') ||
                      e.target.closest('[class*="effectActions"]')
                    ) {
                      return;
                    }
                    handleTransitionDragStart(e, transition);
                  }
            }
            onClick={
              store.playing
                ? undefined
                : e => handleTransitionClick(e, transition)
            }
            onContextMenu={
              store.playing ? undefined : e => handleContextMenu(e, transition)
            }
            onMouseEnter={() => {
              // Clear any pending close timeout when mouse enters transition area
              if (menuTimeoutRef.current) {
                clearTimeout(menuTimeoutRef.current);
              }
            }}
            onMouseLeave={() => {
              // Close menu when mouse leaves the transition area
              isMouseOverButtonRef.current = false;

              if (menuTimeoutRef.current) {
                clearTimeout(menuTimeoutRef.current);
              }

              menuTimeoutRef.current = setTimeout(() => {
                if (
                  !isMouseOverMenuRef.current &&
                  !isMouseOverButtonRef.current &&
                  openActionMenuId === transition.id
                ) {
                  openActionMenuId = null;
                  setIsActionMenuOpen(false);
                  setActiveTransitionId(null);
                }
              }, 300);
            }}
            title={`${
              transition.transitionInfo?.displayName ||
              transition.transitionType
            } (${transition.duration}ms) - Click to change type`}
          >
            {/* Transition Icon */}
            <div className={styles.transitionIcon}>
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Transition Label */}
            <div className={styles.transitionLabel}>
              {transition.transitionInfo?.displayName ||
                transition.transitionType}
            </div>

            {/* Transition Duration */}
            <div className={styles.transitionDuration}>
              {(transition.duration / 1000).toFixed(1)}s
            </div>

            {/* Three dots menu button */}
            <div
              ref={el => {
                if (el) {
                  buttonRefs.current.set(transition.id, el);
                } else {
                  buttonRefs.current.delete(transition.id);
                }
              }}
              className={effectStyles.effectActions}
              onMouseEnter={() => handleMenuMouseEnter(transition.id)}
              onMouseLeave={handleMenuMouseLeave}
            >
              <ButtonWithIcon
                icon="ThreeDotsIcon"
                size="12"
                color="#FFFFFF66"
                accentColor="#FFFFFF99"
                classNameButton={`${effectStyles.threeDotsButton} ${
                  isActionMenuOpen && activeTransitionId === transition.id
                    ? effectStyles.active
                    : ''
                }`}
              />
            </div>

            {/* Resize handles (disabled during playback) */}
            {!store.playing && (
              <>
                <div
                  className={`${styles.resizeHandle} ${styles.resizeLeft}`}
                  onMouseDown={e => handleResizeStart(e, transition, 'left')}
                  title="Resize transition start"
                />
                <div
                  className={`${styles.resizeHandle} ${styles.resizeRight}`}
                  onMouseDown={e => handleResizeStart(e, transition, 'right')}
                  title="Resize transition end"
                />
              </>
            )}

            {/* Transition type selector - hidden, use click to change type instead */}
            {/* <select
              className={styles.transitionTypeSelector}
              value={transition.transitionType}
              onChange={(e) => handleTransitionTypeChange(transition, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {availableTransitions.map(t => (
                <option key={t.name} value={t.name}>
                  {t.displayName}
                </option>
              ))}
            </select> */}
          </div>
        );
      })}

      {/* Render + buttons for transition gaps (hidden during playback) */}
      {!store.playing &&
        transitionGaps.map(gap => (
          <div
            key={gap.id}
            className={`${styles.transitionGap} ${
              hoveredGap === gap.id ? styles.hovered : ''
            }`}
            style={{
              left: `${gap.position}%`,
            }}
            onMouseEnter={() => setHoveredGap(gap.id)}
            onMouseLeave={() => setHoveredGap(null)}
          >
            <button
              className={styles.addTransitionButton}
              onClick={() => handleOpenTransitionSelection(gap)}
              title={`Add transition between images`}
            >
              +
            </button>
          </div>
        ))}
    </div>
  );
});

export default TransitionVisualizer;
