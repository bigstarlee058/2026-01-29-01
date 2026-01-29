import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { TagDropdown } from 'components/reusableComponents/TagDropdown/TagDropdown';
import React, { useEffect, useRef, useState } from 'react';
import styles from './SceneContextPicker.module.scss';

const TagPicker = ({
  title,
  tags,
  onSelect,
  multiSelect = false,
  description,
  selectedTag = null,
  maxVisibleTags = 7, // Maximum number of tags to show before the "..." button
  onAddNew = null,
  allowCustomTags = false, // Whether to show the "+" button
}) => {
  const [selectedTags, setSelectedTags] = useState(
    multiSelect ? [] : selectedTag ? [selectedTag] : tags[0] ? [tags[0]] : []
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const tagInputRef = useRef(null);

  const moreButtonRef = useRef(null);

  const isObject = value => {
    return value && typeof value === 'object' && !Array.isArray(value);
  };

  const areTagsEqual = (tag1, tag2) => {
    if (!tag1 || !tag2) return false;
    if (isObject(tag1) && isObject(tag2)) {
      return tag1.id === tag2.id;
    }
    return tag1 === tag2;
  };

  const getTagLabel = tag => {
    if (isObject(tag)) {
      return tag.label || tag.id || '';
    }
    return tag;
  };

  const getTagDescription = tag => {
    if (isObject(tag)) {
      return tag.description || '';
    }
    return '';
  };

  const handleTagClick = tag => {
    if (multiSelect) {
      if (selectedTags.some(t => areTagsEqual(t, tag))) {
        const newTags = selectedTags.filter(t => !areTagsEqual(t, tag));
        setSelectedTags(newTags);
        onSelect(newTags);
      } else {
        const newTags = [...selectedTags, tag];
        setSelectedTags(newTags);
        onSelect(newTags);
      }
    } else {
      // Single select mode
      const newTags = [tag];
      setSelectedTags(newTags);
      onSelect(tag); // For single select, just pass the tag itself
    }
  };

  const handleAddNew = () => {
    if (onAddNew && typeof onAddNew === 'function') {
      onAddNew();
    }
  };

  // Transform hidden tags for TagDropdown component
  const transformTagsForTagDropdown = () => {
    // Return all hidden tags (unselected tags that don't fit in visible area)
    return hiddenTags;
  };

  // Get selected options for TagDropdown
  const getSelectedOptionsForTagDropdown = () => {
    const selectedOptions = {};

    // Find selected tags that appear in the dropdown (hidden tags)
    const selectedDropdownTags = selectedTags.filter(tag =>
      hiddenTags.some(hiddenTag => areTagsEqual(hiddenTag, tag))
    );

    if (selectedDropdownTags.length > 0) {
      selectedOptions['hidden-tags'] = multiSelect
        ? selectedDropdownTags.map(tag => getTagLabel(tag))
        : getTagLabel(selectedDropdownTags[0]);
    }

    return selectedOptions;
  };

  // Handle TagDropdown selection changes
  const handleTagDropdownSelectionChange = newSelections => {
    const selectedHiddenTagLabels = newSelections['hidden-tags'] || [];

    // Find the actual tag objects that were selected in the dropdown
    const selectedDropdownTags = hiddenTags.filter(tag => {
      const tagLabel = getTagLabel(tag);
      if (multiSelect) {
        return (
          Array.isArray(selectedHiddenTagLabels) &&
          selectedHiddenTagLabels.includes(tagLabel)
        );
      } else {
        return selectedHiddenTagLabels === tagLabel;
      }
    });

    // Get currently selected tags that are NOT in the dropdown
    const otherSelectedTags = selectedTags.filter(
      tag => !hiddenTags.some(hiddenTag => areTagsEqual(hiddenTag, tag))
    );

    // Combine other selected tags with newly selected dropdown tags
    const newSelectedTags = [...otherSelectedTags, ...selectedDropdownTags];

    setSelectedTags(newSelectedTags);
    if (multiSelect) {
      onSelect(newSelectedTags);
    } else {
      onSelect(selectedDropdownTags[0] || null);
    }
  };

  const calculateDropdownPosition = () => {
    if (!moreButtonRef.current) return { top: 0, left: 0 };

    const rect = moreButtonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = 300; // max-height from CSS
    const dropdownWidth = 150; // approximate width

    let top, left;

    // Check if there's enough space below
    if (rect.bottom + dropdownHeight + 20 < viewportHeight) {
      top = rect.bottom + 8;
    } else {
      // Position above the button
      top = rect.top - dropdownHeight - 8;
    }

    // Center horizontally, but ensure it doesn't go off-screen
    left = Math.max(
      8,
      Math.min(
        viewportWidth - dropdownWidth - 8,
        rect.left + rect.width / 2 - dropdownWidth / 2
      )
    );

    return { top, left };
  };

  const handleContainerMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setShowDropdown(true);
    }, 300); // Delay before opening
    setHoverTimeout(timeout);
  };

  const handleContainerMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setShowDropdown(false);
    }, 200); // Delay before closing
    setHoverTimeout(timeout);
  };

  // Update selectedTags when selectedTag prop changes (for controlled component behavior)
  React.useEffect(() => {
    if (!multiSelect && selectedTag) {
      setSelectedTags([selectedTag]);
    }
  }, [selectedTag, multiSelect]);

  // Auto-select newly added custom tags and remove deleted tags
  useEffect(() => {
    if (multiSelect && tags.length >= 0) {
      // Find new custom tags that are not currently selected
      const newCustomTags = tags.filter(tag => {
        const isCustom = isObject(tag) && tag.isCustom;
        const isNotSelected = !selectedTags.some(selectedTag =>
          areTagsEqual(selectedTag, tag)
        );
        return isCustom && isNotSelected;
      });

      // Find selected tags that no longer exist in the tags prop (removed tags)
      const removedTags = selectedTags.filter(selectedTag => {
        return !tags.some(tag => areTagsEqual(tag, selectedTag));
      });

      // Remove deleted tags from selectedTags and promotedTags
      if (removedTags.length > 0) {
        const newSelectedTags = selectedTags.filter(selectedTag => {
          return !removedTags.some(removedTag =>
            areTagsEqual(removedTag, selectedTag)
          );
        });
        setSelectedTags(newSelectedTags);

        onSelect(newSelectedTags);
      }

      // Auto-select new custom tags
      if (newCustomTags.length > 0) {
        const newSelectedTags = [...selectedTags, ...newCustomTags];
        setSelectedTags(newSelectedTags);

        onSelect(newSelectedTags);
      }
    }
  }, [tags, multiSelect, selectedTags, onSelect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Calculate which tags to show and which to hide
  const effectiveMaxVisibleTags = tagInputOpen ? 6 : maxVisibleTags;

  // Priority 1: Show ALL selected tags first (regardless of their original position)
  const allSelectedTags = selectedTags.filter(selectedTag => {
    return tags.some(tag => areTagsEqual(tag, selectedTag));
  });

  // Priority 2: Fill remaining slots with unselected tags (starting from the beginning)
  const unselectedTags = tags.filter(tag => {
    if (multiSelect) {
      return !selectedTags.some(selectedTag => areTagsEqual(selectedTag, tag));
    } else {
      return selectedTags.length === 0 || !areTagsEqual(selectedTags[0], tag);
    }
  });

  // Create visible tags list: selected tags first, then unselected tags
  let visibleTags = [];

  // Add all selected tags first (no limit on selected tags)
  visibleTags = [...allSelectedTags];

  // If we have space, add unselected tags (only if we haven't exceeded the normal limit)
  if (visibleTags.length < effectiveMaxVisibleTags) {
    const remainingSlots = effectiveMaxVisibleTags - visibleTags.length;
    const unselectedToAdd = unselectedTags.slice(0, remainingSlots);
    visibleTags = [...visibleTags, ...unselectedToAdd];
  }

  // Note: We don't limit visibleTags here because we want to show ALL selected tags

  // Create hidden tags list with remaining tags (excluding all visible tags)
  const hiddenTags = tags.filter(tag => {
    return !visibleTags.some(visibleTag => areTagsEqual(visibleTag, tag));
  });

  const handleAddNewTag = () => {
    setTagInputOpen(true);
  };

  const handleTagInputChange = e => {
    setTagInputValue(e.target.value);
  };

  const handleTagInputKeyPress = e => {
    if (e.key === 'Enter' && tagInputValue.trim()) {
      // Same logic as handleClickOutside
      if (onAddNew && typeof onAddNew === 'function') {
        onAddNew(tagInputValue);
      }
      setTagInputValue('');
      setTagInputOpen(false);
    }
  };

  const handleClickOutside = e => {
    if (tagInputRef.current && !tagInputRef.current.contains(e.target)) {
      if (tagInputValue.length > 0) {
        // If value length > 0, call onAddNew and then close
        if (onAddNew) {
          onAddNew(tagInputValue);
        }
      }
      // Always close the input regardless of value length
      setTagInputValue('');
      setTagInputOpen(false);
    }
  };

  // Add click outside listener
  useEffect(() => {
    if (tagInputOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [tagInputOpen, tagInputValue]);

  const handleRemoveCustomTag = (tagToRemove, e) => {
    e.stopPropagation();

    if (onAddNew && typeof onAddNew === 'function') {
      // Pass a special object to indicate tag removal
      onAddNew({ action: 'remove', tag: tagToRemove });
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        {title}{' '}
        {description && (
          <span className={styles.description}>{description}</span>
        )}
      </h3>
      <div className={styles.tagContainer}>
        {visibleTags.map((tag, index) => {
          const tagDescription = getTagDescription(tag);
          const isCustom = isObject(tag) && tag.isCustom;
          return (
            <div
              key={isObject(tag) ? tag.id : index}
              className={`${styles.tag} ${
                selectedTags.some(t => areTagsEqual(t, tag))
                  ? styles.selected
                  : ''
              } ${isCustom ? styles.customTag : ''}`}
              onClick={() => handleTagClick(tag)}
              title={tagDescription}
            >
              {getTagLabel(tag)}
              {tagDescription && (
                <span className={styles.tagDescription}>{tagDescription}</span>
              )}
              {isCustom && (
                <ButtonWithIcon
                  icon="CloseIcon"
                  size="6"
                  color="var(--accent-color)"
                  accentColor="black"
                  activeColor="black"
                  onClick={e => handleRemoveCustomTag(tag, e)}
                  title="Remove tag"
                  classNameButton={styles.closeButton}
                />
              )}
            </div>
          );
        })}

        {tagInputOpen && (
          <div className={styles.tagInputContainer}>
            <input
              type="text"
              placeholder="Add your keyword "
              value={tagInputValue}
              onChange={handleTagInputChange}
              onKeyPress={handleTagInputKeyPress}
              ref={tagInputRef}
            />
          </div>
        )}

        {hiddenTags.length > 0 && (
          <div
            className={styles.moreButtonContainer}
            onMouseEnter={handleContainerMouseEnter}
            onMouseLeave={handleContainerMouseLeave}
          >
            <div ref={moreButtonRef}>
              <ButtonWithIcon
                icon="ThreeDotsIcon"
                size="14"
                color="#FFFFFF99"
                accentColor="white"
                classNameButton={styles.moreButton}
                tooltipText="More options"
              />
            </div>

            <TagDropdown
              options={transformTagsForTagDropdown()}
              selectedOptions={getSelectedOptionsForTagDropdown()}
              onSelectionChange={handleTagDropdownSelectionChange}
              isMultiselect={multiSelect}
              isOpen={showDropdown}
              onClose={multiSelect ? undefined : () => setShowDropdown(false)}
              optionId="hidden-tags"
              triggerRef={moreButtonRef}
              className={styles.tagDropdown}
              onRemoveCustomTag={handleRemoveCustomTag}
              hoverDelay={0}
              closeDelay={0}
            />
          </div>
        )}

        {allowCustomTags && onAddNew && !tagInputOpen && (
          <ButtonWithIcon
            icon="PlusIcon"
            size="14"
            color="#66737A"
            accentColor="#BABABA"
            classNameButton={styles.addButton}
            tooltipText="Add Tag"
            onClick={handleAddNewTag}
          />
        )}
      </div>
    </div>
  );
};

export { TagPicker };
