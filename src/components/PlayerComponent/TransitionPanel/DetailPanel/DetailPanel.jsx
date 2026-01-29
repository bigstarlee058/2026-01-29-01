import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './DetailPanel.module.scss';
import { AnimationResource, applyAnimationToAllScenesWithProportionalTiming, applyGLTransitionToAllGaps, calculateGLTransitionDuration } from 'components/PlayerComponent/entity/AnimationResource';
import { FilterResource } from 'components/PlayerComponent/entity/FilterResource';
import React, { useContext } from 'react';
import { StoreContext } from '../../../../mobx';


// Helper function to format animation type names
const formatAnimationType = type => {
  if (!type) return '';
  // Add space before capital letters and trim
  return type.replace(/([A-Z])/g, ' $1').trim();
};

// Helper function to get animation display name
const getAnimationDisplayName = animation => {
  // Handle GL transitions specifically
  if (animation?.type === 'glTransition') {
    return animation?.transitionType 
      ? `${animation.transitionType} Transition`
      : 'GL Transition';
  }
  
  return (
    animation?.config?.name ||
    animation?.name ||
    formatAnimationType(animation?.type) ||
    'Animation'
  );
};

// Helper function to get filter display name
const getFilterDisplayName = filter => {
  return filter?.name || formatAnimationType(filter?.type) || 'Filter';
};

const DetailPanel = ({
  selectedAnimation,
  currentAnimation,
  selectedFilter,
  currentFilter,
  activeCanvasImage,
  onBackToMain,
  isActiveAnimationDetails = false,
  isFilterPanel = false,
}) => {
  const store = useContext(StoreContext);
  // Handle back button click
  const handleBackClick = () => {
    // Dispatch event to notify that detail panel is closing
    window.dispatchEvent(new CustomEvent('transitionPanelClosed'));
    onBackToMain();
  };

  const handleApplyToAll = async () => {
    if (isFilterPanel || !currentAnimation || !store) return;

    const selectedElement =
      selectedAnimation?.targetElement ||
      (() => {
        // Handle both old targetId and new targetIds systems
        if (currentAnimation?.targetId) {
          return store.editorElements.find(el => el.id === currentAnimation.targetId);
        } else if (currentAnimation?.targetIds && currentAnimation.targetIds.length > 0) {
          // Use first target from targetIds array
          return store.editorElements.find(el => el.id === currentAnimation.targetIds[0]);
        }
        return store.selectedElement;
      })();

    if (!selectedElement) return;

    // Special handling for GL transitions - use the same logic as TransitionPanel
    if (currentAnimation.type === 'glTransition') {
      const currentRow = selectedElement.row;
      
      // Get all visual elements in the same row, sorted by start time
      const elementsInRow = store.editorElements
        .filter(
          el =>
            el.row === currentRow &&
            (el.type === 'imageUrl' || el.type === 'video')
        )
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

      // Apply this transition type to all consecutive pairs in the row
      for (let i = 0; i < elementsInRow.length - 1; i++) {
        const fromElement = elementsInRow[i];
        const toElement = elementsInRow[i + 1];

        // Check if there's a gap between elements (not overlapping)
        if (fromElement.timeFrame.end <= toElement.timeFrame.start) {
          // Remove existing transition if any
          const existingTransition = store.animations.find(
            anim =>
              anim.type === 'glTransition' &&
              anim.fromElementId === fromElement.id &&
              anim.toElementId === toElement.id
          );

          if (existingTransition) {
            store.removeGLTransition(existingTransition.id);
          }

          // Calculate gap duration and proportional transition duration
          const gapDuration =
                  toElement.timeFrame.start - fromElement.timeFrame.end;
                const durationFromTimeframe =
                  (currentAnimation.endTime ?? 0) -
                  (currentAnimation.startTime ?? 0);
                const finalDuration = Math.max(
                  100,
                  durationFromTimeframe > 0
                    ? durationFromTimeframe
                    : (currentAnimation.duration ?? 1000)
                );

          try {
            // Create new transition with same type and properties
            const transitionId = await store.addGLTransition(
              fromElement.id,
              toElement.id,
              currentAnimation.transitionType,
              finalDuration
            );

            if (transitionId) {
              // Copy custom parameters if they exist in the original animation
              if (currentAnimation.properties && currentAnimation.properties.customParams) {
                store.updateGLTransitionProperties(transitionId, {
                  customParams: currentAnimation.properties.customParams,
                });
              } else {
                // Ensure transition is marked as manually adjusted to preserve exact timing/duration
                store.updateGLTransitionProperties(transitionId, {});
              }
              
              // Add small delay between transitions to prevent race conditions
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
          } catch (error) {
            console.error(`Error creating GL transition:`, error);
          }
        }
      }
    } else {
      // Use the existing system for regular animations
      await store.applyAnimationToAllOnSameRow(selectedElement.id, currentAnimation.type);
    }

    if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(store);
    }
  };

  return (
    <div
      className={`${styles.detailPanel} ${
        isActiveAnimationDetails ? styles.small : ''
      } ${styles.transparent}`}
    >
      {!isActiveAnimationDetails && (
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderLeft}>
            <ButtonWithIcon
              icon="TransitionBackIcon"
              size="16"
              color="#FFFFFFB2"
              activeColor="#FFFFFF"
              onClick={handleBackClick}
              classNameButton={styles.backButton}
            />
            <span className={styles.detailTitle}>
              {isFilterPanel 
                ? getFilterDisplayName(selectedFilter)
                : getAnimationDisplayName(selectedAnimation)
              }
            </span>
          </div>
          {!isFilterPanel && currentAnimation && (
            <div className={styles.detailHeaderRight}>
              <button
                className={styles.applyToAllButton}
                onClick={handleApplyToAll}
                title="Apply this animation to all matching elements with proportional timing"
              >
                Apply to All
              </button>
            </div>
          )}
        </div>
      )}
      {/* Removed scene selection - working with visible canvas images now */}
      <div className={styles.detailContent}>
        {isFilterPanel ? (
          <FilterResource
            filterConfig={currentFilter}
            activeCanvasImage={activeCanvasImage}
            onClose={onBackToMain}
          />
        ) : (
          <AnimationResource
            animation={currentAnimation}
            isSidebar={true}
            onClose={onBackToMain}
            animationName={selectedAnimation?.config?.name}
          />
        )}
      </div>
    </div>
  );
};

export { DetailPanel };
