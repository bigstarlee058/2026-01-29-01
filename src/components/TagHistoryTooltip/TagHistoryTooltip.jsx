import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './TagHistoryTooltip.module.scss';
import {
  useClearTagHistoryMutation,
  useRegeneratePromptsFromHistoryMutation,
} from '../../redux/stories/storyApi';

const TagHistoryTooltip = ({
  tooltipId,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  afterShow,
  storyId,
  sceneId,
  onClose,
  isLoading,
  setIsLoading,
}) => {
  const [clearTagHistory] = useClearTagHistoryMutation();
  const [regeneratePrompts] = useRegeneratePromptsFromHistoryMutation();


  const handleDecline = async e => {
    e.preventDefault();
    e.stopPropagation();

    // Close the tooltip immediately
    if (onClose) onClose();

    try {
      await clearTagHistory({
        storyId,
        sceneId,
      });
    } catch (error) {
      console.error('Failed to clear tag history:', error);
    }
  };

  const handleAccept = async e => {
    e.preventDefault();
    e.stopPropagation();

    // Close the tooltip immediately
    if (onClose) onClose();

    setIsLoading(true);
    try {
      // Apply all changes (no specific selections in tooltip mode)
      await regeneratePrompts(
        {
          storyId,
          sceneId,
          selectedHistoryIds: [], // Empty array means apply all changes
        },
        {
          // Add these options to control how RTK Query updates the cache
          skip: false,
          track: false,
        }
      ).unwrap();

      // Add a small delay before hiding the loader
      // to ensure UI has time to update
      setTimeout(() => {
        setIsLoading(false);
      }, 1500); // 1 second delay
    } catch (error) {
      console.error('Failed to regenerate prompts:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Tooltip
        id={tooltipId}
        place="top"
        isOpen={isOpen && !isLoading}
        clickable={true}
        noArrow={false}
        border="1px solid #FF3B59"
        positionStrategy="absolute"
        className={styles.custom_tooltip}
        style={{
          backgroundColor: '#131A25',
          color: 'white',
          padding: '8px',
          borderRadius: '12px',
          zIndex: 100000,
          width: '238px',
          height: '90.75px',
        }}
        afterShow={afterShow}
      >
        <div
          className={styles.tooltip_content}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <p>Tags have changed. Update the prompt?</p>
          <div className={styles.tooltip_buttons}>
            <button
              className={styles.decline_btn}
              onClick={handleDecline}
              type="button"
            >
              No
            </button>
            <button
              className={styles.accept_btn}
              onClick={handleAccept}
              type="button"
            >
              Yes
            </button>
          </div>
        </div>
      </Tooltip>
    </>
  );
};

export { TagHistoryTooltip };
