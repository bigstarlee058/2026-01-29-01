import React, { useState, useCallback, useEffect } from 'react';
import { StoreContext } from '../../mobx';
import TimelineGrid from './timeline-grid';
import { useSelector } from 'react-redux';
import { selectScenes } from '../../redux/scene/sceneSlice';
import styles from './Timeline.module.scss';

const Timeline = ({
  overlays,
  toggleAnimations,
  animationsPanelRow,
  isAnimationsVisible,
  handleActiveScene,
  storyData,
  scale,
  defaultButton,
  isCutMode,
  setIsCutMode,
  onOpenTransitionPanel,
  onOpenEffectPanel,
}) => {
  const store = React.useContext(StoreContext);
  const scenesData = useSelector(selectScenes);

  // Multiple selection box
  useEffect(() => {
    const timelineElement = document.querySelector('[data-timeline="true"]');
    if (timelineElement) {
      const handleMouseDown = e => {
        // Only allow selection box on left mouse button click
        if (e.button !== 0) {
          return;
        }
        // Don't start selection if dragging or moving item
        if (
          // timeline controls & scrollbar
          e.target.closest('[data-timeline-controls-root]') ||
          // timline tooltip/player thumb
          e.target.tagName.toLowerCase() === 'canvas' ||
          // imeline item text
          e.target.tagName.toLowerCase() === 'input' ||
          // timline item elements (but not empty row areas)
          e.target.hasAttribute('data-overlay-id') ||
          e.target.closest('[data-overlay-id]') ||
          // timline item left/right drag handle
          e.target.closest('[data-timeline-item]') ||
          // timeline row resize handle
          e.target.closest('.react-resizable-handle') ||
          // animation/effect resize handles
          e.target.closest('[class*="resizeHandle"]') ||
          // timeline element specific drag handles
          e.target.closest('[class*="dragImageHandle"]') ||
          // animation/effect elements
          e.target.closest('[class*="effectVisualizer"]') ||
          e.target.closest('[class*="effectLayer"]') ||
          e.target.hasAttribute('data-effect-type') ||
          e.target.closest('[data-effect-type]') ||
          // row drag handles
          e.target.hasAttribute('data-row-drag-handle') ||
          e.target.closest('[data-row-drag-handle]')
        ) {
          return;
        }
        // Prevent input text from being highlighted
        e.preventDefault();
        // Clear selected elements to highlight new elements
        store.setSelectedElements(null);
        store.setSelectedElement(null);

        const container = e.currentTarget;
        const startX = e.clientX;
        const startY = e.clientY;
        const selectionBox = document.createElement('div');
        selectionBox.style.position = 'absolute';
        selectionBox.style.border = '1px dashed #fff';
        selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        selectionBox.style.pointerEvents = 'none';
        selectionBox.style.zIndex = 1000;
        container.appendChild(selectionBox);

        const onMouseMove = moveEvent => {
          const currentX = moveEvent.clientX;
          const currentY = moveEvent.clientY;
          const rect = container.getBoundingClientRect();

          const left = Math.min(startX, currentX) - rect.left;
          const top = Math.min(startY, currentY) - rect.top;
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);

          selectionBox.style.left = `${left}px`;
          selectionBox.style.top = `${top}px`;
          selectionBox.style.width = `${width}px`;
          selectionBox.style.height = `${height}px`;

          const selectionRect = selectionBox.getBoundingClientRect();
          const selectedItems = Array.from(
            container.querySelectorAll('[data-overlay-id]')
          ).filter(item => {
            const itemRect = item.getBoundingClientRect();
            // More precise intersection check
            const hasHorizontalOverlap =
              itemRect.left < selectionRect.right &&
              itemRect.right > selectionRect.left;
            const hasVerticalOverlap =
              itemRect.top < selectionRect.bottom &&
              itemRect.bottom > selectionRect.top;
            return hasHorizontalOverlap && hasVerticalOverlap;
          });

          // Get all items that currently have the selectingItem class
          const currentHighlightedItems = Array.from(
            container.querySelectorAll('.selectingItem')
          );
          // Remove 'selectingItem' from items no longer in the selection box
          currentHighlightedItems.forEach(item => {
            if (!selectedItems.includes(item)) {
              item.classList.remove('selectingItem');
            }
          });

          // Add selectingItem class to all items in selection box
          selectedItems.forEach(item => {
            item.classList.add('selectingItem');
          });
        };

        const onMouseUp = () => {
          const selectionRect = selectionBox.getBoundingClientRect();
          const selectedItems = Array.from(
            container.querySelectorAll('[data-overlay-id]')
          ).filter(item => {
            const itemRect = item.getBoundingClientRect();
            // More precise intersection check
            const hasHorizontalOverlap =
              itemRect.left < selectionRect.right &&
              itemRect.right > selectionRect.left;
            const hasVerticalOverlap =
              itemRect.top < selectionRect.bottom &&
              itemRect.bottom > selectionRect.top;
            return hasHorizontalOverlap && hasVerticalOverlap;
          });

          // Remove selectingItem class from all items
          container
            .querySelectorAll('[data-overlay-id]')
            .forEach(item => item.classList.remove('selectingItem'));

          const overlayIds = selectedItems?.map(item =>
            item.getAttribute('data-overlay-id')
          );
          const matchingOverlays = overlays?.filter(overlay =>
            overlayIds.includes(overlay.id)
          );

          if (matchingOverlays?.length > 0) {
            store.setSelectedElements({
              ...matchingOverlays,
              effect: matchingOverlays.effect || 'in',
            });
          }
          container.removeChild(selectionBox);

          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      timelineElement.addEventListener('mousedown', handleMouseDown);
      return () => {
        timelineElement.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [overlays, store]);

  useEffect(() => {
    const handleKeyDown = e => {
      // Don't handle delete/backspace if focused on an input, textarea, or interacting with autocomplete/dropdown
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

      if (
        (e.key === 'Delete' ||
          e.key === 'Del' ||
          e.key === 'Backspace' ||
          e.code === 'Delete' ||
          e.code === 'Backspace') &&
        store.selectedElements
      ) {
        e.preventDefault();
        const elements = Object.values(store.selectedElements).filter(
          val => val && typeof val === 'object' && val.id
        );
        store.removeEditorElements(elements.map(el => el.id));
        store.setSelectedElements(null);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.code === 'KeyC') &&
        store.selectedElements
      ) {
        // Ensure store.setCoppiedElements exists and is a function
        store.setCoppiedElements(store.selectedElements);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'v' || e.code === 'KeyV') &&
        store.coppiedElements
      ) {
        const coppiedElements = store?.coppiedElements
          ? Object.values(store.coppiedElements).filter(el => el && el.id)
          : [];
        store.pasteCoppiedElementsToNewRows(coppiedElements);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [store.selectedElements]);

  return (
    <div
      className={styles.timelineGridWrapper}
      style={{ height: 'calc(100% - 50px)' }}
    >
      <TimelineGrid
        overlays={overlays}
        toggleAnimations={toggleAnimations}
        moveElementBetweenRows={(elementId, newRow) =>
          store.moveElementBetweenRows(elementId, newRow)
        }
        isAnimationsVisible={isAnimationsVisible}
        animationsPanelRow={animationsPanelRow}
        handleActiveScene={handleActiveScene}
        storyData={storyData}
        scale={scale}
        defaultButton={defaultButton}
        isCutMode={isCutMode}
        setIsCutMode={data => setIsCutMode(data)}
        scenes={scenesData}
        onOpenTransitionPanel={onOpenTransitionPanel}
        onOpenEffectPanel={onOpenEffectPanel}
      />
    </div>
  );
};

export default Timeline;
