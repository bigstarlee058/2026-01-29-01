import { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react';
import { useDispatch } from 'react-redux';
import CheckIcon from 'components/Icons/CheckIcon';
import ThreeDotsIcon from 'components/Icons/ThreeDotsIcon';
import ArrowDownIcon from 'components/Icons/ArrowDownIcon';
import EditTransitionIcon from 'components/Icons/EditTransitionIcon';
import DuplicateIcon from 'components/Icons/DuplicateIcon';
import DeleteIcon from 'components/Icons/DeleteIcon';
import { StoreContext } from '../../../../mobx';
import { DetailPanel } from '../DetailPanel/DetailPanel';
import {
  saveTimelineState,
   
} from '../../../../redux/timeline/timelineSlice';
import { isAnimationAppliedToAllScenes, removeAnimationFromAllScenes } from '../../entity/AnimationResource';
import styles from './ActiveAnimationItem.module.scss';

// Add this outside the component to track which action panel is open
let openActionPanelId = null;

const ActiveAnimationItem = ({
  animation,
  onEditAnimation,
  selectedAnimation,
  setSelectedAnimation,
  setIsActiveAnimationDetailsOpen,
  isActiveAnimationDetailsOpen,
  selectedCheckboxes,
  onCheckboxChange,
  onTransitionNameStateChange,
}) => {
  const dispatch = useDispatch();
  const store = useContext(StoreContext);

  // States for action panel
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [activePanelAnimationId, setActivePanelAnimationId] = useState(null);
  const [hoveredAnimationId, setHoveredAnimationId] = useState(null);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });

  // Refs for action panel management
  const panelRef = useRef(null);
  const actionPanelTimeoutRef = useRef(null);
  const isMouseOverActionPanelRef = useRef(false);
  const isMouseOverThreeDotsRef = useRef(false);

  const formatTime = timeMs => {
    if (timeMs === 0) return '00:00.0';
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((timeMs % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${ms}`;
  };

  // Auto-close action panel effect
  useEffect(() => {
    if (
      !isMouseOverActionPanelRef.current &&
      !isMouseOverThreeDotsRef.current
    ) {
      actionPanelTimeoutRef.current = setTimeout(() => {
        openActionPanelId = null;
        setShowActionPanel(false);
        setActivePanelAnimationId(null);
        setHoveredAnimationId(null);
      }, 500);
    }
    return () => {
      if (actionPanelTimeoutRef.current) {
        clearTimeout(actionPanelTimeoutRef.current);
      }
    };
  }, [isMouseOverActionPanelRef.current, isMouseOverThreeDotsRef.current]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        showActionPanel &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setShowActionPanel(false);
        setActivePanelAnimationId(null);
      }
    };

    const handleCloseActionPanel = event => {
      const { exceptId } = event.detail;
      if (activePanelAnimationId && activePanelAnimationId !== exceptId) {
        setShowActionPanel(false);
        setActivePanelAnimationId(null);
        setHoveredAnimationId(null);
      }
    };

    if (showActionPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    document.addEventListener('closeActionPanel', handleCloseActionPanel);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('closeActionPanel', handleCloseActionPanel);
    };
  }, [showActionPanel, activePanelAnimationId]);

  const handleCheckboxClick = (e, animationId) => {
    e.stopPropagation();
    e.preventDefault();

    // Toggle the checkbox state
    const newSet = new Set(selectedCheckboxes);
    if (newSet.has(animationId)) {
      newSet.delete(animationId);
    } else {
      newSet.add(animationId);
    }

    // Call the parent's checkbox change handler with the updated set
    onCheckboxChange(newSet);
  };

  const handleThreeDotsHover = (animationId, e) => {
    // Clear close timer on hover
    if (actionPanelTimeoutRef.current) {
      clearTimeout(actionPanelTimeoutRef.current);
    }

    isMouseOverThreeDotsRef.current = true;

    // Close other panels
    if (openActionPanelId && openActionPanelId !== animationId) {
      document.dispatchEvent(
        new CustomEvent('closeActionPanel', {
          detail: { exceptId: animationId },
        })
      );
    }

    // Calculate panel position
    const element = e.currentTarget;
    if (!element || !element.getBoundingClientRect) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Estimate panel dimensions
    const estimatedPanelWidth = 150;
    const estimatedPanelHeight = 120;

    // Calculate initial position
    let panelX = rect.right + 10;
    let panelY = rect.top + rect.height / 2;

    // Check if panel goes beyond right edge
    if (panelX + estimatedPanelWidth > viewportWidth) {
      panelX = rect.left - estimatedPanelWidth; // Show panel to the left of button
    }

    // Check if panel goes beyond bottom edge
    if (panelY + estimatedPanelHeight > viewportHeight) {
      if (rect.top - estimatedPanelHeight > 0) {
        panelY = rect.top - estimatedPanelHeight + rect.height / 2;
      } else {
        panelY = Math.max(0, viewportHeight - estimatedPanelHeight);
      }
    }

    // Check if panel goes beyond top edge
    if (panelY < 0) {
      panelY = 0;
    }

    setPanelPosition({
      x: panelX,
      y: panelY,
    });
    setActivePanelAnimationId(animationId);
    setHoveredAnimationId(animationId);
    openActionPanelId = animationId;
    setShowActionPanel(true);
  };

  const handleThreeDotsLeave = () => {
    isMouseOverThreeDotsRef.current = false;

    // Start close timer
    actionPanelTimeoutRef.current = setTimeout(() => {
      if (
        !isMouseOverActionPanelRef.current &&
        !isMouseOverThreeDotsRef.current
      ) {
        openActionPanelId = null;
        setShowActionPanel(false);
        setActivePanelAnimationId(null);
        setHoveredAnimationId(null);
      }
    }, 500);
  };

  const handleActionPanelEnter = () => {
    // Clear close timer on panel hover
    if (actionPanelTimeoutRef.current) {
      clearTimeout(actionPanelTimeoutRef.current);
    }

    isMouseOverActionPanelRef.current = true;
    setShowActionPanel(true);
  };

  const handleActionPanelLeave = () => {
    isMouseOverActionPanelRef.current = false;

    // Start close timer
    actionPanelTimeoutRef.current = setTimeout(() => {
      if (
        !isMouseOverActionPanelRef.current &&
        !isMouseOverThreeDotsRef.current
      ) {
        openActionPanelId = null;
        setShowActionPanel(false);
        setActivePanelAnimationId(null);
        setHoveredAnimationId(null);
      }
    }, 500);
  };

  const handleActionButtonClick = buttonId => {
    if (buttonId === 'edit') {
      onEditAnimation(animation);
    } else if (buttonId === 'duplicate') {
      // TODO: Implement duplicate functionality
    } else if (buttonId === 'remove') {
      if (activePanelAnimationId) {
        let animationToRemove = store.animations.find(
          anim => anim.id === activePanelAnimationId
        );

        if (!animationToRemove) {
          animationToRemove = store.animations.find(
            anim => anim.type === activePanelAnimationId
          );
        }

        if (animationToRemove) {
          store.removeAnimation(animationToRemove.id);
        } else {
          const glTransition = store.animations.find(
            a =>
              a.type === 'glTransition' &&
              (a.fromElementId === store.selectedElement?.id ||
                a.toElementId === store.selectedElement?.id)
          );
          if (glTransition) {
            // Check if this transition is applied to all gaps and should be removed from all
            const isAppliedToAll = isAnimationAppliedToAllScenes(glTransition, store, store.selectedElement);
            
            if (isAppliedToAll) {
              // Remove from all gaps
removeAnimationFromAllScenes(glTransition, store, store.selectedElement);
            } else {
              // Remove only current transition
              store.removeGLTransition(glTransition.id);
            }
          }
        }
      }

       
       
    }

    setShowActionPanel(false);
    setActivePanelAnimationId(null);
  };

  const handleAnimationClick = () => {
    setSelectedAnimation(animation);
    const currentAnimationId = animation.id || animation.type;
    setIsActiveAnimationDetailsOpen(
      isActiveAnimationDetailsOpen === currentAnimationId
        ? null
        : currentAnimationId
    );
  };

  const actionButtons = [
    {
      id: 'edit',
      text: 'Edit transition',
      icon: <EditTransitionIcon size="14" fill="white" fillOpacity="0.4" />,
    },
    {
      id: 'duplicate',
      text: 'Duplicate',
      icon: <DuplicateIcon size="14" fill="white" fillOpacity="0.4" />,
    },
    {
      id: 'remove',
      text: 'Remove from Scene',
      icon: <DeleteIcon size="14" fill="white" fillOpacity="0.4" />,
    },
  ];

  return (
    <>
      <div
        className={`${styles.activeTransitionContainer} ${
          isActiveAnimationDetailsOpen === (animation.id || animation.type)
            ? styles.active
            : ''
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={`${styles.activeTransitionWrapper} ${
            hoveredAnimationId === (animation.id || animation.type) &&
            showActionPanel
              ? styles.hoverActive
              : ''
          }`}
          onClick={handleAnimationClick}
        >
          <div
            className={styles.activeTransitionCheckbox}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              handleCheckboxClick(e, animation.id || animation.type);
            }}
          >
            {selectedCheckboxes.has(animation.id || animation.type) && (
              <CheckIcon size="8" color="rgba(255, 255, 255, 0.9)" />
            )}
          </div>
          <div className={styles.activeTransitionContent}>
            <div className={styles.activeTransitionInfo}>
              <div className={styles.activeTransitionIcon}>
                {(animation.image ||
                  animation.selectedElement?.properties?.src) && (
                  <img
                    src={
                      animation.image ||
                      animation.selectedElement?.properties?.src
                    }
                    alt={animation.name}
                    className={styles.activeTransitionPreviewImage}
                  />
                )}
              </div>
              <div className={styles.activeTransitionDetails}>
                <span className={styles.activeTransitionName}>
                  {animation.name}
                </span>
                <span className={styles.activeTransitionScene}>
                  {animation.scene ||
                    `Scene ${(store.selectedElement?.row || 0) + 1}`}
                </span>
              </div>
            </div>
            {animation.startTime !== undefined && (
              <div
                className={styles.activeTransitionTiming}
                onClick={e => e.stopPropagation()}
              >
                <span>{`${formatTime(animation.startTime)}-${formatTime(
                  animation.endTime
                )}`}</span>
              </div>
            )}
            <div
              className={styles.activeTransitionActions}
              onMouseEnter={e => {
                e.stopPropagation();
                handleThreeDotsHover(animation.type, e);
              }}
              onMouseLeave={handleThreeDotsLeave}
              onClick={e => e.stopPropagation()}
            >
              <ThreeDotsIcon size="14" color="rgba(255, 255, 255, 0.6)" />
            </div>
            <div
              className={styles.activeTransitionHoverIcon}
              onClick={e => e.stopPropagation()}
            >
              <ArrowDownIcon size="12" color="rgba(255, 255, 255, 0.6)" />
            </div>
          </div>
        </div>
        {isActiveAnimationDetailsOpen === (animation.id || animation.type) && (
          <div className={styles.activeAnimationDetailsPanel}>
            <DetailPanel
              animation={animation}
              isOpen={
                isActiveAnimationDetailsOpen ===
                (animation.id || animation.type)
              }
              selectedAnimation={selectedAnimation}
              currentAnimation={selectedAnimation}
              isActiveAnimationDetails={true}
            />
          </div>
        )}
      </div>

      {showActionPanel &&
        createPortal(
          <div
            ref={panelRef}
            className={`${styles.actionPanelPortal} ${styles.actionPanelPortalFixed}`}
            style={{
              left: panelPosition.x,
              top: panelPosition.y,
            }}
            onMouseEnter={handleActionPanelEnter}
            onMouseLeave={handleActionPanelLeave}
          >
            {actionButtons.map(button => (
              <button
                key={button.id}
                className={styles.actionButton}
                onClick={() => handleActionButtonClick(button.id)}
              >
                {button.icon}
                {button.text}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default observer(ActiveAnimationItem);
