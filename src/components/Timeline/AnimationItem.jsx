import React, { useState, useEffect, useRef,  } from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';
import effectStyles from './EffectVisualizer.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { EffectsIcon } from 'components/Icons';
import { useDrag } from 'react-dnd';
import DraggableElementView from 'components/PlayerComponent/timeline-related/DraggableElementView';

// Remove the DraggableAnimationElement - we'll handle dragging like EffectVisualizer
// Add this outside the component to track which menu is open
let openActionMenuId = null;

const AnimationItem = observer(({ item, rowHeight }) => {
  const store = React.useContext(StoreContext);
  const animationRef = useRef(null);
  const hasDraggedRef = useRef(false);

  // Add DnD drag functionality like timeline-item
  const [{ isDragging: dragMonitorState }, dragRef, preview] = useDrag({
    type: 'timeline-item',
    item: monitor => {
      // Get initial click coordinates
      const initialClientOffset = monitor.getInitialClientOffset();
      const initialSourceClientOffset = monitor.getInitialSourceClientOffset();

      // Calculate initial click offset within the element
      let initialClickOffset = 0;
      if (initialClientOffset && initialSourceClientOffset) {
        initialClickOffset =
          initialClientOffset.x - initialSourceClientOffset.x;
      }

      // Start ghost drag for animation
      store.startAnimationGhostDrag(item, initialClickOffset, 0);

      return {
        id: item.id,
        timeFrame: item.timeFrame,
        elementType: 'animation', // Specify this is an animation element
        element: item, // Pass the full element for ghost system
        initialClickOffset: initialClickOffset, // Store for later use
      };
    },
    canDrag: () => !store.playing,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // Reset ghost state when drag ends
      store.resetGhostState();
    },
  });

  // Set empty drag preview to hide default ghost
  React.useEffect(() => {
    preview(new Image(), { captureDraggingState: true });
  }, [preview]);

  // Menu states
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
  const menuTimeoutRef = useRef(null);
  const isMouseOverMenuRef = useRef(false);
  const isMouseOverButtonRef = useRef(false);
  const buttonRef = useRef(null);

  const isSelected = store?.selectedElement?.id === item?.id;

  // Check if this animation is currently being edited in DetailPanel
  const [isActiveForEditing, setIsActiveForEditing] = useState(false);

  // Check if this animation item is selected (similar to timeline-item.jsx)
  const isAnimationSelected = store?.selectedElement?.id === item?.id;

  // Check if this animation item is selected in multiselect (like timeline-item.jsx)
  let isMultiSelected = false;
  if (
    store?.selectedElements &&
    Object.keys(store.selectedElements).length > 0
  ) {
    isMultiSelected = Object.values(store.selectedElements).some(
      selectedItem => selectedItem.id === item?.id
    );
  }

  // Find the original animation in store.animations first
  const originalAnimation = store.animations.find(
    anim => anim.id === item.animationId
  );

  // Get the target elements this animation is applied to (support both old and new system)
  let targetElements = [];

  if (originalAnimation && originalAnimation.type === 'glTransition') {
    // For GL transitions, get targets from targetIds or fallback to fromElementId/toElementId
    const targetIds = originalAnimation.targetIds || [];
    if (targetIds.length > 0) {
      targetElements = store.editorElements.filter(
        el => targetIds.includes(el.id) && el.type !== 'animation'
      );
    } else {
      // Fallback to legacy fromElementId/toElementId
      const fromId = originalAnimation.fromElementId || item.fromElementId;
      const toId = originalAnimation.toElementId || item.toElementId;
      targetElements = store.editorElements.filter(
        el => (el.id === fromId || el.id === toId) && el.type !== 'animation'
      );
    }
  } else {
    // For regular animations, use targetId/targetIds
    targetElements = store.editorElements.filter(
      el =>
        (item.targetId === el.id ||
          (item.targetIds && item.targetIds.includes(el.id))) &&
        el.type !== 'animation'
    );
  }

  // For legacy compatibility, use first target as main target
  const targetElement = targetElements[0];

  // Handle animation double click (always open settings panel)
  const handleAnimationDoubleClick = () => {
    // Always open settings panel on double click, regardless of selection state
    if (originalAnimation.type === 'glTransition') {
      // For GL transitions, use the same logic as handleEditAnimation
      const fromElement = store.editorElements.find(
        el =>
          el.id === originalAnimation.fromElementId && el.type !== 'animation'
      );
      const toElement = store.editorElements.find(
        el =>
          el.id === originalAnimation.toElementId && el.type !== 'animation'
      );

      if (fromElement && toElement) {
        // First, activate the fromElement
        if (store.setSelectedElement) {
          store.setSelectedElement(fromElement);
        }

        // Create a gap object for the transition panel
        const gapData = {
          id: `gap-${fromElement.id}-${toElement.id}`,
          fromElement,
          toElement,
          gapStart: fromElement.timeFrame.end,
          gapEnd: toElement.timeFrame.start,
          gapCenter:
            (fromElement.timeFrame.end + toElement.timeFrame.start) / 2,
          position:
            ((fromElement.timeFrame.end + toElement.timeFrame.start) /
              2 /
              store.maxTime) *
            100,
          existingTransition: originalAnimation,
        };

        // Open transition panel in transitions mode
        window.dispatchEvent(
          new CustomEvent('openAnimationSidebar', {
            detail: {
              type: 'transition',
              activeTab: 'transitions',
              panelMode: 'transitions',
              pendingTransitionData: {
                type: 'create',
                fromElement,
                toElement,
                gap: gapData,
                currentTransitionType: originalAnimation.transitionType,
              },
            },
          })
        );

        // Also open detail panel for GL transition editing
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('openGLTransitionDetail', {
              detail: {
                animation: originalAnimation,
                fromElement,
                toElement,
              },
            })
          );
        }, 100);
      }
    } else {
      // For regular animations, send event to make this animation active for editing
      window.dispatchEvent(
        new CustomEvent('openTransitionPanelWithEffect', {
          detail: {
            animation: originalAnimation,
            element: targetElement,
          },
        })
      );
    }
  };

  // Handle animation click (single click - select or open settings if active)
  const handleAnimationClick = e => {
    // Don't process if user actually dragged
    if (hasDraggedRef.current) {
      return;
    }

    // Check if click was on resize handle
    if (e.target.closest('[class*="resizeHandle"]')) {
      return;
    }

    // Don't process if this was a right click (let context menu handle it)
    if (e.button === 2 || e.which === 3) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Set selected element to this animation item for visual feedback
    if (store.setSelectedElement) {
      store.setSelectedElement(item);
    }

    // Clear selectedElements to avoid showing the target image as selected
    if (store.setSelectedElements) {
      store.setSelectedElements(null);
    }

    window.dispatchEvent(
      new CustomEvent('ensureTransitionPanelOpen', {
        detail: {
          animationType: originalAnimation.type,
          panelMode:
            originalAnimation.type === 'glTransition'
              ? 'transitions'
              : 'effects',
        },
      })
    );

    // If this animation is active (selected), open settings panel
    if (isSelected) {
      // Use the same logic as handleAnimationDoubleClick for opening settings
      if (originalAnimation.type === 'glTransition') {
        // For GL transitions, use the same logic as handleEditAnimation
        const fromElement = store.editorElements.find(
          el =>
            el.id === originalAnimation.fromElementId && el.type !== 'animation'
        );
        const toElement = store.editorElements.find(
          el =>
            el.id === originalAnimation.toElementId && el.type !== 'animation'
        );

        if (fromElement && toElement) {
          // First, activate the fromElement
          if (store.setSelectedElement) {
            store.setSelectedElement(fromElement);
          }

          // Create a gap object for the transition panel
          const gapData = {
            id: `gap-${fromElement.id}-${toElement.id}`,
            fromElement,
            toElement,
            gapStart: fromElement.timeFrame.end,
            gapEnd: toElement.timeFrame.start,
            gapCenter:
              (fromElement.timeFrame.end + toElement.timeFrame.start) / 2,
            position:
              ((fromElement.timeFrame.end + toElement.timeFrame.start) /
                2 /
                store.maxTime) *
              100,
            existingTransition: originalAnimation,
          };

          // Open transition panel in transitions mode
          window.dispatchEvent(
            new CustomEvent('openAnimationSidebar', {
              detail: {
                type: 'transition',
                activeTab: 'transitions',
                panelMode: 'transitions',
                pendingTransitionData: {
                  type: 'create',
                  fromElement,
                  toElement,
                  gap: gapData,
                  currentTransitionType: originalAnimation.transitionType,
                },
              },
            })
          );

          // Also open detail panel for GL transition editing
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('openGLTransitionDetail', {
                detail: {
                  animation: originalAnimation,
                  fromElement,
                  toElement,
                },
              })
            );
          }, 100);
        }
      } else {
        // For regular animations, send event to make this animation active for editing
        window.dispatchEvent(
          new CustomEvent('openTransitionPanelWithEffect', {
            detail: {
              animation: originalAnimation,
              element: targetElement || null,
            },
          })
        );
      }
    }
  };

  // Handle right click (context menu)
  const handleContextMenu = e => {
    e.preventDefault();
    e.stopPropagation();

    // Reset drag flag to ensure context menu works
    hasDraggedRef.current = false;

    // Close any hover menus first
    if (isActionMenuOpen) {
      setIsActionMenuOpen(false);
      openActionMenuId = null;
    }

    // Clear any pending hover menu timeouts
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }

    // Close any other open menus
    if (openActionMenuId && openActionMenuId !== item.id) {
      document.dispatchEvent(
        new CustomEvent('closeAnimationActionMenu', {
          detail: { exceptId: item.id },
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

    // Set selected element to this animation item for visual feedback
    if (store.setSelectedElement) {
      store.setSelectedElement(item);
    }

    // Clear selectedElements to avoid showing the target image as selected
    if (store.setSelectedElements) {
      store.setSelectedElements(null);
    }

    openActionMenuId = item.id;
    setIsActionMenuOpen(true);
  };

  // Menu handlers (based on SceneItem.jsx)
  const handleMenuMouseEnter = () => {
    isMouseOverButtonRef.current = true;

    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }

    menuTimeoutRef.current = setTimeout(() => {
      if (openActionMenuId && openActionMenuId !== item.id) {
        document.dispatchEvent(
          new CustomEvent('closeAnimationActionMenu', {
            detail: { exceptId: item.id },
          })
        );
      }

      const btnNode = buttonRef.current;
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

      openActionMenuId = item.id;
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
        openActionMenuId === item.id
      ) {
        openActionMenuId = null;
        setIsActionMenuOpen(false);
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
      if (!isMouseOverButtonRef.current && openActionMenuId === item.id) {
        openActionMenuId = null;
        setIsActionMenuOpen(false);
      }
    }, 300);
  };

  const handleEditAnimation = () => {
    // Use the same logic as double click
    if (originalAnimation.type === 'glTransition') {
      // For GL transitions, open the transition panel in transitions mode
      const fromElement = store.editorElements.find(
        el =>
          el.id === originalAnimation.fromElementId && el.type !== 'animation'
      );
      const toElement = store.editorElements.find(
        el => el.id === originalAnimation.toElementId && el.type !== 'animation'
      );

      if (fromElement && toElement) {
        // First, activate the fromElement
        if (store.setSelectedElement) {
          store.setSelectedElement(fromElement);
        }

        // Create a gap object for the transition panel
        const gapData = {
          id: `gap-${fromElement.id}-${toElement.id}`,
          fromElement,
          toElement,
          gapStart: fromElement.timeFrame.end,
          gapEnd: toElement.timeFrame.start,
          gapCenter:
            (fromElement.timeFrame.end + toElement.timeFrame.start) / 2,
          position:
            ((fromElement.timeFrame.end + toElement.timeFrame.start) /
              2 /
              store.maxTime) *
            100,
          existingTransition: originalAnimation,
        };

        // Open transition panel in transitions mode
        window.dispatchEvent(
          new CustomEvent('openAnimationSidebar', {
            detail: {
              type: 'transition',
              activeTab: 'transitions',
              panelMode: 'transitions',
              pendingTransitionData: {
                type: 'create',
                fromElement,
                toElement,
                gap: gapData,
                currentTransitionType: originalAnimation.transitionType,
              },
            },
          })
        );

        // Also open detail panel for GL transition editing
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('openGLTransitionDetail', {
              detail: {
                animation: originalAnimation,
                fromElement,
                toElement,
              },
            })
          );
        }, 100); // Small delay to ensure transition panel is open first
      }
    } else {
      // For regular animations, check if TransitionPanel is already open
      const transitionPanel = document.querySelector(
        '[data-testid="transition-panel"]'
      );
      const isTransitionPanelOpen =
        transitionPanel && transitionPanel.offsetParent !== null;

      if (isTransitionPanelOpen) {
        // If TransitionPanel is open, send event to make this animation active for editing
        window.dispatchEvent(
          new CustomEvent('openTransitionPanelWithEffect', {
            detail: {
              animation: originalAnimation,
              element: targetElement || null,
            },
          })
        );
      } else {
        // If TransitionPanel is closed, open it first
        window.dispatchEvent(
          new CustomEvent('openAnimationSidebar', {
            detail: {
              type: 'transition',
              activeTab: 'all',
            },
          })
        );
      }
    }

    setIsActionMenuOpen(false);
    openActionMenuId = null;
  };

  const handleDeleteAnimation = () => {
    if (originalAnimation.type === 'glTransition') {
      // For GL transitions, use the specialized remove method
      store.removeGLTransition(originalAnimation.id);
    } else {
      // For regular animations, use the standard remove method
      store.removeAnimation(originalAnimation.id);

      // Also remove animation element from timeline if it exists
      const animationElements = store.editorElements.filter(
        el => el.type === 'animation' && el.animationId === originalAnimation.id
      );
      animationElements.forEach(el => {
        store.removeEditorElement(el.id);
      });
    }

    store.optimizedCleanupEmptyRows();

    setIsActionMenuOpen(false);
    openActionMenuId = null;
  };

  // Get display name
  const getDisplayName = () => {
    return item.properties?.displayName || item.displayName || 'Animation';
  };

  // Mouse events are now handled by ghost system for both drag and resize

  // Cleanup on unmount and menu event handlers
  useEffect(() => {
    const handleCloseMenu = e => {
      if (e.detail.exceptId !== item.id) {
        setIsActionMenuOpen(false);
      }
    };

    // Listen for animation being activated for editing
    const handleAnimationActivated = e => {
      if (e.detail?.animation?.id === originalAnimation?.id) {
        setIsActiveForEditing(true);
      } else {
        setIsActiveForEditing(false);
      }
    };

    // Listen for detail panel being closed
    const handleDetailPanelClosed = () => {
      setIsActiveForEditing(false);
    };

    // Listen for GL transition updates from input panel
    const handleTransitionUpdated = e => {
      if (
        e.detail?.transitionId === originalAnimation?.id &&
        e.detail?.action === 'timeRangeChange' &&
        originalAnimation?.type === 'glTransition'
      ) {
        // Force a re-render since the targets should already be updated by handleTimeRangeChange
        // This ensures the AnimationItem reflects the latest changes
        setTimeout(() => {
          // Force MobX to notify observers about the changes
          store.refreshAnimations();
        }, 10);
      }
    };

    // Handle delete key for selected animation
    const handleKeyDown = e => {
      if (
        (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') &&
        isAnimationSelected &&
        originalAnimation
      ) {
        // Don't handle delete if focused on an input, textarea, or interacting with autocomplete/dropdown
        const activeElement = document.activeElement;
        const isInputOrTextarea =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA';
        const isAutocompleteOrDropdown =
          activeElement.getAttribute('role') === 'combobox' ||
          activeElement.getAttribute('role') === 'listbox' ||
          activeElement.closest('[role="combobox"]') ||
          activeElement.closest('[role="listbox"]') ||
          activeElement.closest('.autocomplete-dropdown') ||
          activeElement.closest('.dropdown-menu');

        if (isInputOrTextarea || isAutocompleteOrDropdown) {
          return;
        }

        // Prevent the event from propagating to other handlers
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Remove the animation
        handleDeleteAnimation();
      }
    };

    document.addEventListener('closeAnimationActionMenu', handleCloseMenu);
    document.addEventListener(
      'openTransitionPanelWithEffect',
      handleAnimationActivated
    );
    document.addEventListener('transitionPanelClosed', handleDetailPanelClosed);
    // Listen for GL transition updates from input panel
    window.addEventListener('transitionUpdated', handleTransitionUpdated);
    // Add keydown listener in capture phase to ensure it runs before timeline-item handler
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
      document.removeEventListener('closeAnimationActionMenu', handleCloseMenu);
      document.removeEventListener(
        'openTransitionPanelWithEffect',
        handleAnimationActivated
      );
      document.removeEventListener(
        'transitionPanelClosed',
        handleDetailPanelClosed
      );
      // Remove GL transition update listener
      window.removeEventListener('transitionUpdated', handleTransitionUpdated);
      // Remove keydown listener with capture phase
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [item.id, originalAnimation?.id, isAnimationSelected]);

  // Additional effect to track timeFrame changes for GL transitions
  useEffect(() => {
    if (originalAnimation && originalAnimation.type === 'glTransition') {
      const animationTimeFrame = {
        start: originalAnimation.startTime || item.timeFrame.start,
        end: originalAnimation.endTime || item.timeFrame.end,
      };

      // Update the timeline element to match the animation
      if (
        item.timeFrame.start !== animationTimeFrame.start ||
        item.timeFrame.end !== animationTimeFrame.end
      ) {
        // Update item timeFrame to match animation
        item.timeFrame.start = animationTimeFrame.start;
        item.timeFrame.end = animationTimeFrame.end;

        // Force MobX to notify observers
        store.refreshAnimations();
      }
    }
  }, [
    originalAnimation?.startTime,
    originalAnimation?.endTime,
    originalAnimation?.duration,
    originalAnimation?.id,
    originalAnimation?.type,
    item.timeFrame.start,
    item.timeFrame.end,
  ]);

  if (!originalAnimation) return null;

  // Don't render textWord* animations as timeline items - they should only exist on canvas
  if (originalAnimation.type && originalAnimation.type.startsWith('textWord'))
    return null;

  // Calculate positioning like EffectVisualizer
  const leftPercent = (item.timeFrame.start / store.maxTime) * 100;
  const widthPercent =
    ((item.timeFrame.end - item.timeFrame.start) / store.maxTime) * 100;

  return (
    <div
      className={`${effectStyles.effectLayer} ${
        isAnimationSelected || isMultiSelected ? effectStyles.selectedItem : ''
      } ${dragMonitorState ? styles.dragging : ''}`}
      ref={node => {
        dragRef(node);
        animationRef.current = node;
      }}
      data-timeline-row
    >
      <div
        key={item.id}
        className={`${effectStyles.effectVisualizer} ${
          dragMonitorState && !store.ghostState.isDragging
            ? effectStyles.dragging
            : ''
        } ${
          store.ghostState.isResizing &&
          store.ghostState.draggedElement?.id === item.id
            ? effectStyles.resizing
            : ''
        } ${store.playing ? effectStyles.playing : ''} ${
          effectStyles.draggable
        } ${isActiveForEditing ? effectStyles.activeForEditing : ''} ${
          item.effectDirection === 'transition' ? effectStyles.glTransition : ''
        } ${isMultiSelected ? effectStyles.selectedItem : ''}
        `}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          height: `${rowHeight - 3}px`,
        }}
        data-overlay-id={item.id}
        data-effect-type={originalAnimation.type}
        data-effect-direction={item.properties?.effectDirection || item.effect}
        onMouseDown={
          store.playing
            ? undefined
            : e => {
                // Don't start drag if clicking on resize handle
                if (e.target.closest('[class*="resizeHandle"]')) {
                  return;
                }
                // Reset drag flag for proper click detection
                hasDraggedRef.current = false;
              }
        }
        onClick={store.playing ? undefined : handleAnimationClick}
        onDoubleClick={store.playing ? undefined : handleAnimationDoubleClick}
        onContextMenu={
          store.playing
            ? undefined
            : e => {
                // Don't show context menu if clicking on the three dots button area
                if (
                  e.target.closest('[class*="effectActions"]') ||
                  e.target.closest('[class*="threeDotsButton"]')
                ) {
                  return;
                }
                handleContextMenu(e);
              }
        }
        onMouseEnter={() => {
          // Clear any pending close timeout when mouse enters animation area
          if (menuTimeoutRef.current) {
            clearTimeout(menuTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          // Close menu when mouse leaves the animation area
          isMouseOverButtonRef.current = false;

          if (menuTimeoutRef.current) {
            clearTimeout(menuTimeoutRef.current);
          }

          menuTimeoutRef.current = setTimeout(() => {
            if (
              !isMouseOverMenuRef.current &&
              !isMouseOverButtonRef.current &&
              openActionMenuId === item.id
            ) {
              openActionMenuId = null;
              setIsActionMenuOpen(false);
            }
          }, 300);
        }}
      >
        {/* Animation Icon */}
        <div className={effectStyles.effectIcon}>
          <EffectsIcon
            size={16}
            color={
              isActiveForEditing || isAnimationSelected || isMultiSelected
                ? 'var(--accent-color)'
                : '#0D2B32'
            }
          />
        </div>

        {/* Animation Label */}
        <div className={effectStyles.effectLabel}>{getDisplayName()}</div>

        {/* Animation Duration */}
        {/* <div className={effectStyles.effectDuration}>
          {((item.timeFrame.end - item.timeFrame.start) / 1000).toFixed(1)}s
        </div> */}

        {/* Three dots menu button */}
        <div
          ref={buttonRef}
          className={effectStyles.effectActions}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <ButtonWithIcon
            icon="ThreeDotsIcon"
            size="16"
            color={
              isActiveForEditing || isAnimationSelected || isMultiSelected
                ? 'var(--accent-color)'
                : '#0D2B32'
            }
            accentColor="#FFFFFF99"
            classNameButton={`${effectStyles.threeDotsButton} ${
              isActionMenuOpen ? effectStyles.active : ''
            }`}
            onClick={e => {
              // Make element active when clicking on three dots button
              if (store.setSelectedElement) {
                store.setSelectedElement(item);
              }

              // Clear selectedElements to avoid showing the target image as selected
              if (store.setSelectedElements) {
                store.setSelectedElements(null);
              }

              // Allow the click to bubble up to parent handlers
            }}
          />
        </div>
      </div>

      {/* DraggableElementView for start resize handle */}
      <DraggableElementView
        value={item.timeFrame.start}
        total={store.maxTime}
        isSelected={isAnimationSelected}
        element={item}
        resizeType="start"
        onMouseUp={() => {
          // Reset drag flag to allow context menu to work
          hasDraggedRef.current = false;
        }}
        onMouseDown={() => {
          // Make animation element active when clicking on start resize handle
          if (store.setSelectedElement) {
            store.setSelectedElement(item);
          }
          
          // Clear selectedElements to avoid showing the target image as selected
          if (store.setSelectedElements) {
            store.setSelectedElements(null);
          }
        }}
        onDoubleClick={handleAnimationDoubleClick}
        elementType={item.type}
        data-timeline-item
        onChange={value => {
          // When resize-ghost is active, DraggableElementView drives the ghost; skip real edits
          if (store.ghostState?.isResizing) return;
        }}
      >
        <div className={effectStyles.animationResizeHandleLeft} />
      </DraggableElementView>

      {/* DraggableElementView for end resize handle */}
      <DraggableElementView
        value={item.timeFrame.end}
        total={store.maxTime}
        isSelected={isAnimationSelected}
        element={item}
        resizeType="end"
        onMouseUp={() => {
          // Reset drag flag to allow context menu to work
          hasDraggedRef.current = false;
        }}
        onMouseDown={() => {
          // Make animation element active when clicking on end resize handle
          if (store.setSelectedElement) {
            store.setSelectedElement(item);
          }
          
          // Clear selectedElements to avoid showing the target image as selected
          if (store.setSelectedElements) {
            store.setSelectedElements(null);
          }
        }}
        onDoubleClick={handleAnimationDoubleClick}
        onChange={value => {
          // When resize-ghost is active, DraggableElementView drives the ghost; skip real edits
          if (store.ghostState?.isResizing) return;
        }}
      >
        <div className={effectStyles.animationResizeHandleRight} />
      </DraggableElementView>

      
    </div>
  );
});

export default AnimationItem;
