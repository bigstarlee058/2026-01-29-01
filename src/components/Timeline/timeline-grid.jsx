import React, { useState, useEffect, useRef } from 'react';
import { StoreContext } from '../../mobx';
import styles from './Timeline.module.scss';
import TimelineRow from './TimelineRow';
import { AnimationsPanel } from 'components/PlayerComponent/panels/AnimationsPanel';
import { observer } from 'mobx-react';
import TimelineGhostElement from './TimelineGhostElement';
import AlignmentLines from './AlignmentLines';
import GhostMarker from './GhostMarker';
import InterRowDropZone from './InterRowDropZone';

const TimelineGrid = observer(
  ({
    overlays,
    toggleAnimations,
    moveElementBetweenRows,
    isAnimationsVisible,
    handleActiveScene,
    animationsPanelRow,
    storyData,
    scale,
    defaultButton,
    isCutMode,
    setIsCutMode,
    scenes,
    onOpenTransitionPanel,
    onOpenEffectPanel,
  }) => {
    const store = React.useContext(StoreContext);
    const gridRef = useRef(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const rows = Array.from({ length: store.maxRows });

    const getAudioDuration = file => {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.preload = 'metadata';

        const audioUrl = URL.createObjectURL(file);
        audio.src = audioUrl;

        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(audio.duration);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio file upload error'));
        };

        setTimeout(() => {
          if (!audio.duration) {
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio duration determination timeout'));
          }
        }, 5000);
      });
    };

    const handleDragOver = e => {
      e.preventDefault();

      if (
        e.dataTransfer?.items?.[0]?.kind === 'file' &&
        e.dataTransfer.items[0].type.startsWith('audio/')
      ) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = e => {
      e.preventDefault();
      setIsDraggingOver(false);
    };

    const handleDrop = async e => {
      e.preventDefault();
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files || []).filter(file =>
        file.type.startsWith('audio/')
      );

      if (!files.length) return;

      try {
        const gridRect = gridRef.current.getBoundingClientRect();
        const dropPositionX = (e.clientX - gridRect.left) / gridRect.width;
        const timePosition = store.maxTime * dropPositionX;

        const allElements = store.editorElements;

        const findTargetRow = () => {
          const voiceoverElements = allElements.filter(
            el => el.type === 'audio' && el.audioType === 'voiceover'
          );

          if (voiceoverElements.length > 0) {
            const voiceoverRows = new Set(voiceoverElements.map(el => el.row));
            return Math.max(...Array.from(voiceoverRows)) + 1;
          }

          const usedRows =
            allElements.length > 0
              ? new Set(allElements.map(el => el.row))
              : new Set();

          return usedRows.size > 0 ? Math.max(...Array.from(usedRows)) + 1 : 0;
        };

        let targetRow = findTargetRow();

        while (allElements.some(el => el.row === targetRow)) {
          targetRow++;
        }

        for (const file of files) {
        }
      } catch (error) {
        console.error('Drag and drop processing error:', error);
      }
    };

    useEffect(() => {
      const grid = gridRef.current;
      if (!grid) return;

      grid.addEventListener('dragover', handleDragOver);
      grid.addEventListener('dragleave', handleDragLeave);
      grid.addEventListener('drop', handleDrop);

      return () => {
        grid.removeEventListener('dragover', handleDragOver);
        grid.removeEventListener('dragleave', handleDragLeave);
        grid.removeEventListener('drop', handleDrop);
      };
    }, [store, storyData]);

    // Global mouse tracking for all ghost types
    useEffect(() => {
      const handleGlobalMouseMove = e => {
        // Check if mouse is over the timeline grid for timeline element ghosts
        const timelineGrid = gridRef.current;
        if (!timelineGrid) return;

        const gridRect = timelineGrid.getBoundingClientRect();
        const isOverGrid =
          e.clientX >= gridRect.left &&
          e.clientX <= gridRect.right &&
          e.clientY >= gridRect.top &&
          e.clientY <= gridRect.bottom;

        // Hide timeline element ghosts if mouse is outside the timeline grid
        if (!isOverGrid) {
          // For file/gallery drags, fully reset to avoid stuck states
          if (
            store.ghostState.isFileDragging ||
            store.ghostState.isGalleryDragging
          ) {
            store.resetGhostState();
          } else {
            if (store.ghostState.isDragging) {
              store.ghostState.ghostElement = null;
            }
            if (store.ghostState.isMultiDragging) {
              store.ghostState.multiGhostElements = [];
            }
          }
        }
      };

      const handleGlobalDragOver = e => {
        // Check if mouse is over the timeline grid
        const timelineGrid = gridRef.current;
        if (!timelineGrid) return;

        const gridRect = timelineGrid.getBoundingClientRect();
        const isOverGrid =
          e.clientX >= gridRect.left &&
          e.clientX <= gridRect.right &&
          e.clientY >= gridRect.top &&
          e.clientY <= gridRect.bottom;

        // Hide all ghosts if mouse is outside the timeline grid
        if (!isOverGrid) {
          // For file/gallery drags, fully reset to avoid stuck states
          if (
            store.ghostState.isFileDragging ||
            store.ghostState.isGalleryDragging
          ) {
            store.resetGhostState();
          } else {
            if (store.ghostState.isDragging) {
              store.ghostState.ghostElement = null;
            }
            if (store.ghostState.isMultiDragging) {
              store.ghostState.multiGhostElements = [];
            }
          }
          return;
        }

        if (
          store.ghostState.isFileDragging &&
          e.dataTransfer?.types.includes('Files')
        ) {
          // Only handle if not over a specific timeline row (let row handlers take priority)
          const timelineRow = e.target.closest('[data-testid="timeline-row"]');
          if (timelineRow) {
            return; // Let TimelineRow handler deal with it
          }

          e.preventDefault();

          const mouseX = e.clientX - gridRect.left;
          const newPosition = (mouseX / gridRect.width) * store.maxTime;

          // Find which row we're hovering over
          const rowContainers =
            timelineGrid.querySelectorAll('[data-row-index]');
          let targetRow = 0;

          for (let i = 0; i < rowContainers.length; i++) {
            const rowRect = rowContainers[i].getBoundingClientRect();
            if (e.clientY >= rowRect.top && e.clientY <= rowRect.bottom) {
              targetRow = parseInt(
                rowContainers[i].getAttribute('data-row-index')
              );
              break;
            }
          }

          // Determine file type and compatibility
          const fileType = e.dataTransfer.items?.[0]?.type;
          let targetElementType = 'imageUrl';
          if (fileType?.startsWith('audio/')) {
            targetElementType = 'audio';
          } else if (fileType?.startsWith('video/')) {
            targetElementType = 'video';
          }

          // Check compatibility with target row
          const rowOverlays = overlays.filter(
            overlay => overlay.row === targetRow
          );
          const rowType = rowOverlays[0]?.type;
          const isIncompatible =
            rowType && !areTypesCompatible(rowType, targetElementType);

          store.updateFileGhost(newPosition, targetRow, isIncompatible);
        }
      };

      const handleGlobalDragLeave = e => {
        // Only reset if leaving the entire document
        if (!e.relatedTarget) {
          if (store.ghostState.isFileDragging) {
            store.resetGhostState();
          }
        }
      };

      const handleGlobalDrop = () => {
        if (
          store.ghostState.isFileDragging ||
          store.ghostState.isGalleryDragging
        ) {
          store.resetGhostState();
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('dragover', handleGlobalDragOver);
      document.addEventListener('dragleave', handleGlobalDragLeave);
      document.addEventListener('drop', handleGlobalDrop);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('dragover', handleGlobalDragOver);
        document.removeEventListener('dragleave', handleGlobalDragLeave);
        document.removeEventListener('drop', handleGlobalDrop);
      };
    }, [store, overlays]);

    // Helper function for type compatibility (same as in TimelineRow)
    const areTypesCompatible = (type1, type2) => {
      // Subtitles can only be with subtitles
      const isType1Subtitle = type1 === 'text';
      const isType2Subtitle = type2 === 'text';

      if (isType1Subtitle || isType2Subtitle) {
        return isType1Subtitle && isType2Subtitle;
      }

      // Animation can go anywhere (except with subtitles, handled above)
      if (type1 === 'animation' || type2 === 'animation') {
        return true;
      }

      // All other types (audio, video, imageUrl, image) can mix together
      const mixableTypes = ['audio', 'video', 'imageUrl', 'image'];
      return mixableTypes.includes(type1) && mixableTypes.includes(type2);
    };

    return (
      <div
        className={styles.timelineRowContainer}
        style={{ width: `${99.95 * scale}%` }}
        ref={gridRef}
      >
        {rows.map((_, rowIndex) => {
          const rowOverlays = overlays.filter(
            overlay => overlay.row === rowIndex
          );

          return (
            <React.Fragment key={rowIndex}>
              {/* Drop zone above first row */}
              {rowIndex === 0 && (
                <div style={{ position: 'relative', height: '4px' }}>
                  <InterRowDropZone rowIndex={rowIndex} position="top" />
                </div>
              )}

              <div style={{ position: 'relative' }} data-row-index={rowIndex}>
                <TimelineRow
                  key={rowIndex}
                  rowIndex={rowIndex}
                  rowId={rowIndex}
                  overlays={rowOverlays}
                  moveElementBetweenRows={moveElementBetweenRows}
                  toggleAnimations={toggleAnimations}
                  isAnimationsVisible={isAnimationsVisible}
                  handleActiveScene={handleActiveScene}
                  storyData={storyData}
                  isCutMode={isCutMode}
                  defaultButton={defaultButton}
                  setIsCutMode={data => setIsCutMode(data)}
                  scenes={scenes}
                  onOpenTransitionPanel={onOpenTransitionPanel}
                  onOpenEffectPanel={onOpenEffectPanel}
                />

                {/* Drop zone below each row */}
                <InterRowDropZone rowIndex={rowIndex} position="bottom" />
              </div>

              {isAnimationsVisible && rowIndex === animationsPanelRow && (
                <AnimationsPanel onCloseAnimations={toggleAnimations} />
              )}
            </React.Fragment>
          );
        })}

        {/* Ghost Elements and Alignment Lines - render above all timeline rows */}
        {store.ghostState.isDragging && store.ghostState.ghostElement && (
          <TimelineGhostElement
            left={store.ghostState.ghostElement.left}
            width={store.ghostState.ghostElement.width}
            row={store.ghostState.ghostElement.row}
            elementType={store.ghostState.ghostElement.elementType}
            totalRows={store.maxRows}
            isIncompatible={store.ghostState.isIncompatibleRow}
          />
        )}

        {/* Resize Ghost */}
        {store.ghostState.isResizing && store.ghostState.resizeGhostElement && (
          <TimelineGhostElement
            left={store.ghostState.resizeGhostElement.left}
            width={store.ghostState.resizeGhostElement.width}
            row={store.ghostState.resizeGhostElement.row}
            elementType={store.ghostState.resizeGhostElement.elementType}
            totalRows={store.maxRows}
            isIncompatible={!store.ghostState.resizeGhostElement.canPush}
          />
        )}

        {/* Alignment Lines */}
        <AlignmentLines alignmentLines={store.ghostState.alignmentLines} />

        {/* Multi-ghost elements for multi-select dragging */}
        {store.ghostState.isMultiDragging &&
          store.ghostState.multiGhostElements.map(ghost => (
            <TimelineGhostElement
              key={`multi-ghost-${ghost.id}`}
              left={ghost.left}
              width={ghost.width}
              row={ghost.row}
              elementType={ghost.elementType}
              totalRows={store.maxRows}
              isIncompatible={false}
            />
          ))}

        {/* Gallery Ghost */}
        {store.ghostState.isGalleryDragging &&
          store.ghostState.galleryGhostElement && (
            <TimelineGhostElement
              left={store.ghostState.galleryGhostElement.left}
              width={store.ghostState.galleryGhostElement.width}
              row={store.ghostState.galleryGhostElement.row}
              elementType={store.ghostState.galleryGhostElement.elementType}
              totalRows={store.maxRows}
              isIncompatible={
                store.ghostState.galleryGhostElement.isIncompatible
              }
            />
          )}

        {/* File Ghost */}
        {store.ghostState.isFileDragging &&
          store.ghostState.fileGhostElement && (
            <TimelineGhostElement
              left={store.ghostState.fileGhostElement.left}
              width={store.ghostState.fileGhostElement.width}
              row={store.ghostState.fileGhostElement.row}
              elementType={store.ghostState.fileGhostElement.elementType}
              totalRows={store.maxRows}
              isIncompatible={store.ghostState.fileGhostElement.isIncompatible}
            />
          )}

        {/* Ghost Marker for hover preview */}
        <GhostMarker position={store.ghostState.ghostMarkerPosition} />
      </div>
    );
  }
);

export default TimelineGrid;
