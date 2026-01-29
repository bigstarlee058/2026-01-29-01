import React, { useEffect, useRef, useState } from 'react';
import { StoreContext } from '../../../mobx';
import styles from '../Player.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { SeparatorIcon } from 'components/Icons';
import { TransitionPanel } from 'components/PlayerComponent/TransitionPanel/TransitionPanel';

export const AnimationPreviewFrames = ({
  animation,
  animationName,
  isInDetailPanel = false,
}) => {
  const store = React.useContext(StoreContext);
  const firstFrameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const [activeFrame, setActiveFrame] = useState(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  useEffect(() => {
    const handleTabChange = event => {
      setActiveFrame(event.detail.activeTab);
    };

    const handlePanelOpen = event => {
      setActiveFrame(event.detail.activeTab || 'start');
    };

    const handlePanelClose = () => {
      setActiveFrame(null);
    };

    window.addEventListener('frameEditingTabChange', handleTabChange);
    window.addEventListener('openFrameEditingPanel', handlePanelOpen);
    window.addEventListener('openFrameEditingPanelFromDetail', handlePanelOpen);
    window.addEventListener('closeFrameEditingPanel', handlePanelClose);

    return () => {
      window.removeEventListener('frameEditingTabChange', handleTabChange);
      window.removeEventListener('openFrameEditingPanel', handlePanelOpen);
      window.removeEventListener(
        'openFrameEditingPanelFromDetail',
        handlePanelOpen
      );
      window.removeEventListener('closeFrameEditingPanel', handlePanelClose);
    };
  }, []);

  useEffect(() => {
    if (!store.canvas || !store.selectedElement || !animation) return;

    const renderFrame = async (canvasRef, params, timeMs) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create a clone of the main canvas
      const mainCanvas = store.canvas;

      // Set canvas internal dimensions to match CSS dimensions for proper scaling
      const canvasStyle = window.getComputedStyle(canvas);
      const displayWidth = parseInt(canvasStyle.width);
      const displayHeight = parseInt(canvasStyle.height);

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Get context and clear
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save current state
      const currentTime = store.currentTimeInMs;
      const currentKeyFrame = store.currentKeyFrame;
      const currentStates = new Map();

      // Store current states of all objects
      mainCanvas.getObjects().forEach(obj => {
        currentStates.set(obj, {
          opacity: obj.opacity,
          visible: obj.visible,
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          width: obj.width,
          height: obj.height,
        });
      });

      // Set time to render frame
      store.updateTimeTo(timeMs);
      const keyFrameAtTime = Math.floor((timeMs / 1000) * store.fps);

      // Update visibility of all objects based on their timeframes
      mainCanvas.getObjects().forEach(obj => {
        if (obj.timeFrame) {
          const isInTimeFrame =
            keyFrameAtTime >=
              Math.floor((obj.timeFrame.start / 1000) * store.fps) &&
            keyFrameAtTime <=
              Math.floor((obj.timeFrame.end / 1000) * store.fps);
          obj.visible = isInTimeFrame;
        }
      });

      // Apply animation effect to selected element
      const fabricObject = mainCanvas
        .getObjects()
        .find(obj => obj === store.selectedElement.fabricObject);

      if (fabricObject) {
        const originalState = currentStates.get(fabricObject);

        // Apply base opacity from animation properties if set (except for drop animations)
        const baseOpacity =
          animation.properties?.opacity !== undefined
            ? animation.properties.opacity
            : 1;
        // Apply base scale from animation properties if set (for static scaling)
        const baseScale =
          animation.properties?.scaleFactor !== undefined
            ? animation.properties.scaleFactor
            : 1;

        // Apply different effects based on animation type
        switch (animation.type) {
          case 'fadeIn':
          case 'fadeOut':
          case 'fadeEffect':
            const effectOpacity =
              params.opacity !== undefined ? params.opacity : 1;
            const fadeTargetScaleX = originalState.scaleX * baseScale;
            const fadeTargetScaleY = originalState.scaleY * baseScale;

            // Calculate position adjustments for center-based scaling
            const fadeAdjustLeft =
              originalState.left -
              (fabricObject.width * (fadeTargetScaleX - originalState.scaleX)) /
                2;
            const fadeAdjustTop =
              originalState.top -
              (fabricObject.height *
                (fadeTargetScaleY - originalState.scaleY)) /
                2;

            fabricObject.set({
              opacity: effectOpacity, // Only effect opacity, no base opacity multiplication for fade
              scaleX: fadeTargetScaleX,
              scaleY: fadeTargetScaleY,
              left: fadeAdjustLeft,
              top: fadeAdjustTop,
            });
            break;
          case 'slideIn':
          case 'slideOut': {
            const direction = animation.properties?.direction || 'right';
            const offset = params.offset || 0;

            switch (direction) {
              case 'right':
                fabricObject.set(
                  'left',
                  originalState.left + offset * fabricObject.width
                );
                break;
              case 'left':
                fabricObject.set(
                  'left',
                  originalState.left - offset * fabricObject.width
                );
                break;
              case 'up':
                fabricObject.set(
                  'top',
                  originalState.top - offset * fabricObject.height
                );
                break;
              case 'down':
                fabricObject.set(
                  'top',
                  originalState.top + offset * fabricObject.height
                );
                break;
            }
            // Apply static base opacity and scale with center-based scaling
            const slideTargetScaleX = originalState.scaleX * baseScale;
            const slideTargetScaleY = originalState.scaleY * baseScale;

            // Calculate position adjustments for center-based scaling
            const slideAdjustLeft =
              fabricObject.left -
              (fabricObject.width *
                (slideTargetScaleX - originalState.scaleX)) /
                2;
            const slideAdjustTop =
              fabricObject.top -
              (fabricObject.height *
                (slideTargetScaleY - originalState.scaleY)) /
                2;

            fabricObject.set({
              opacity: baseOpacity,
              scaleX: slideTargetScaleX,
              scaleY: slideTargetScaleY,
              left: slideAdjustLeft,
              top: slideAdjustTop,
            });
            break;
          }
          case 'slideEffect': {
            const direction = animation.properties?.direction || 'left';
            const offset = params.offset || 0;

            switch (direction) {
              case 'right':
                fabricObject.set(
                  'left',
                  originalState.left + offset * fabricObject.width
                );
                break;
              case 'left':
                fabricObject.set(
                  'left',
                  originalState.left - offset * fabricObject.width
                );
                break;
              case 'up':
                fabricObject.set(
                  'top',
                  originalState.top - offset * fabricObject.height
                );
                break;
              case 'down':
                fabricObject.set(
                  'top',
                  originalState.top + offset * fabricObject.height
                );
                break;
            }
            // Apply static base opacity and scale with center-based scaling
            const slideEffectTargetScaleX = originalState.scaleX * baseScale;
            const slideEffectTargetScaleY = originalState.scaleY * baseScale;

            // Calculate position adjustments for center-based scaling
            const slideEffectAdjustLeft =
              fabricObject.left -
              (fabricObject.width *
                (slideEffectTargetScaleX - originalState.scaleX)) /
                2;
            const slideEffectAdjustTop =
              fabricObject.top -
              (fabricObject.height *
                (slideEffectTargetScaleY - originalState.scaleY)) /
                2;

            fabricObject.set({
              opacity: baseOpacity,
              scaleX: slideEffectTargetScaleX,
              scaleY: slideEffectTargetScaleY,
              left: slideEffectAdjustLeft,
              top: slideEffectAdjustTop,
            });
            break;
          }
          case 'zoomIn':
          case 'zoomOut': {
            const scale = params.scale || 1;
            fabricObject.set({
              scaleX: scale,
              scaleY: scale,
              opacity: baseOpacity, // Apply static base opacity
            });
            break;
          }
          case 'zoomInEffect':
          case 'zoomOutEffect': {
            const scale = params.scale || 1;
            // Apply base scale to the effect scale
            const effectScale = scale * baseScale;
            fabricObject.set({
              scaleX: effectScale,
              scaleY: effectScale,
              opacity: baseOpacity, // Apply static base opacity
            });
            break;
          }
          case 'drop':
          case 'dropIn':
          case 'dropOut': {
            const scale = params.scale || 1;
            const effectOpacity =
              params.opacity !== undefined ? params.opacity : 1;
            const finalOpacity = effectOpacity * baseOpacity;
            const origin = animation.properties?.origin || 'center';
// Встановлюємо базові параметри
            fabricObject.set({
              scaleX: scale,
              scaleY: scale,
              opacity: finalOpacity,
              visible: true,
            });

            // Обчислюємо позицію на основі origin як в store.js
            let adjustLeft = originalState.left;
            let adjustTop = originalState.top;

            if (scale !== 1) {
              const targetScaleX = originalState.scaleX * scale;
              const targetScaleY = originalState.scaleY * scale;

              switch (origin) {
                case 'center':
                  adjustLeft =
                    originalState.left -
                    (fabricObject.width *
                      (targetScaleX - originalState.scaleX)) /
                      2;
                  adjustTop =
                    originalState.top -
                    (fabricObject.height *
                      (targetScaleY - originalState.scaleY)) /
                      2;
                  break;
                case 'top-left':
                  // Без змін
                  break;
                case 'top-right':
                  adjustLeft =
                    originalState.left - fabricObject.width * (scale - 1);
                  break;
                case 'bottom-left':
                  adjustTop =
                    originalState.top - fabricObject.height * (scale - 1);
                  break;
                case 'bottom-right':
                  adjustLeft =
                    originalState.left - fabricObject.width * (scale - 1);
                  adjustTop =
                    originalState.top - fabricObject.height * (scale - 1);
                  break;
                case 'top':
                  adjustLeft =
                    originalState.left -
                    (fabricObject.width *
                      (targetScaleX - originalState.scaleX)) /
                      2;
                  break;
                case 'bottom':
                  adjustLeft =
                    originalState.left -
                    (fabricObject.width *
                      (targetScaleX - originalState.scaleX)) /
                      2;
                  adjustTop =
                    originalState.top - fabricObject.height * (scale - 1);
                  break;
                case 'left':
                  adjustTop =
                    originalState.top -
                    (fabricObject.height *
                      (targetScaleY - originalState.scaleY)) /
                      2;
                  break;
                case 'right':
                  adjustLeft =
                    originalState.left - fabricObject.width * (scale - 1);
                  adjustTop =
                    originalState.top -
                    (fabricObject.height *
                      (targetScaleY - originalState.scaleY)) /
                      2;
                  break;
              }
            }

            fabricObject.set({
              left: adjustLeft,
              top: adjustTop,
            });

            fabricObject.setCoords();
            break;
          }
        }

        fabricObject.visible = true;
        mainCanvas.renderAll();
      }

      // Copy the canvas state with proper scaling
      const sourceCanvas = mainCanvas.lowerCanvasEl;
      const sourceAspectRatio = sourceCanvas.width / sourceCanvas.height;
      const targetAspectRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight, drawX, drawY;

      if (sourceAspectRatio > targetAspectRatio) {
        // Source is wider, fit to width
        drawWidth = canvas.width;
        drawHeight = canvas.width / sourceAspectRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        // Source is taller, fit to height
        drawHeight = canvas.height;
        drawWidth = canvas.height * sourceAspectRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      ctx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);

      // Restore previous state
      store.updateTimeTo(currentTime);
      store.setCurrentKeyFrame(currentKeyFrame);

      mainCanvas.getObjects().forEach(obj => {
        const originalState = currentStates.get(obj);
        if (originalState) {
          obj.set(originalState);
        }
      });

      mainCanvas.renderAll();
    };

    // Render both frames based on animation type
    const renderPreviewFrames = () => {
      switch (animation.type) {
        case 'fadeIn':
          renderFrame(
            firstFrameRef,
            { opacity: 0 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { opacity: 1 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'fadeOut':
          renderFrame(
            firstFrameRef,
            { opacity: 1 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { opacity: 0 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'fadeEffect': {
          const animationType = animation.properties?.animationType || 'fadeIn';
          const originalOpacity = animation.properties?.opacity || 1;
          const targetOpacity = animation.properties?.targetOpacity || 0.3;

          if (animationType === 'fadeIn') {
            renderFrame(
              firstFrameRef,
              { opacity: originalOpacity },
              store.selectedElement.timeFrame.start + 10
            );
            renderFrame(
              lastFrameRef,
              { opacity: targetOpacity },
              store.selectedElement.timeFrame.end - 10
            );
          } else {
            // fadeOut
            renderFrame(
              firstFrameRef,
              { opacity: originalOpacity },
              store.selectedElement.timeFrame.start + 10
            );
            renderFrame(
              lastFrameRef,
              { opacity: targetOpacity },
              store.selectedElement.timeFrame.end - 10
            );
          }
          break;
        }
        case 'slideIn':
        case 'slideOut': {
          const startOffset = animation.type === 'slideIn' ? 2 : 0;
          const endOffset = animation.type === 'slideOut' ? 2 : 0;

          renderFrame(
            firstFrameRef,
            { offset: startOffset },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { offset: endOffset },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        }
        case 'slideEffect': {
          renderFrame(
            firstFrameRef,
            { offset: 1.5 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { offset: 0 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        }
        case 'zoomIn':
          renderFrame(
            firstFrameRef,
            { scale: 0.5 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: 1 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'zoomOut':
          renderFrame(
            firstFrameRef,
            { scale: 1 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: 0.5 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'zoomInEffect':
          renderFrame(
            firstFrameRef,
            { scale: 1 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: animation.properties?.scaleFactor || 2 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'zoomOutEffect':
          renderFrame(
            firstFrameRef,
            { scale: animation.properties?.scaleFactor || 1.5 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: 1 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'zoomEffect': {
          const animationType = animation.properties?.animationType || 'zoomIn';
          const scaleFactor = animation.properties?.scaleFactor || 1.0;
          const targetScale = animation.properties?.targetScale || 2.0;

          // Show transition from initial scale to target scale
          renderFrame(
            firstFrameRef,
            { scale: scaleFactor },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: targetScale },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        }
        case 'drop':
        case 'dropIn':
renderFrame(
            firstFrameRef,
            { scale: animation.properties?.scaleFactor || 1.5, opacity: 0 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: 1, opacity: 1 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
        case 'dropOut':
renderFrame(
            firstFrameRef,
            { scale: 1, opacity: 1 },
            store.selectedElement.timeFrame.start + 10
          );
          renderFrame(
            lastFrameRef,
            { scale: animation.properties?.scaleFactor || 1.5, opacity: 0 },
            store.selectedElement.timeFrame.end - 10
          );
          break;
      }
    };

    renderPreviewFrames();
  }, [
    store.canvas,
    store.selectedElement,
    animation,
    store.fps,
  ]);

  const handleFrameClick = frameType => {
if (frameType === 'end') {
      store.updateTimeTo(store.selectedElement.timeFrame.end - 10);
    } else {
      store.updateTimeTo(store.selectedElement.timeFrame.start + 10);
    }

    const eventDetail = {
      animation: animation,
      activeTab: frameType,
    };
if (isInDetailPanel) {
      // If we're in the detail panel, dispatch a different event that won't interfere with the panel state
      window.dispatchEvent(
        new CustomEvent('openFrameEditingPanelFromDetail', {
          detail: eventDetail,
        })
      );
    } else {
      // Original event for when we're not in the detail panel
      window.dispatchEvent(
        new CustomEvent('openFrameEditingPanel', {
          detail: eventDetail,
        })
      );
    }
  };

  const getActionsList = () => {
    if (!animation || !animation.properties) {
      return [];
    }

    const actions = [];

    // Add opacity action if it exists and is not a fade animation
    if (
      animation.properties.opacity !== undefined &&
      !['fadeIn', 'fadeOut', 'fadeEffect'].includes(animation.type)
    ) {
      actions.push(
        `Opacity: ${Math.round(animation.properties.opacity * 100)}%`
      );
    }

    // Add fadeEffect specific actions
    if (animation.type === 'fadeEffect') {
      const originalOpacity = animation.properties.opacity || 1;
      const targetOpacity = animation.properties.targetOpacity || 0.3;
      const animationType = animation.properties.animationType || 'fadeIn';

      actions.push(`From: ${Math.round(originalOpacity * 100)}%`);
      actions.push(`To: ${Math.round(targetOpacity * 100)}%`);
      actions.push(`Type: ${animationType}`);
    }

    // Add zoom/scale action if it exists
    if (animation.properties.scaleFactor !== undefined) {
      actions.push(
        `Zoom: ${Math.round(animation.properties.scaleFactor * 100)}%`
      );
    }

    // Add zoomEffect specific actions
    if (animation.type === 'zoomEffect') {
      const scaleFactor = animation.properties.scaleFactor || 1.0;
      const targetScale = animation.properties.targetScale || 2.0;
      const animationType = animation.properties.animationType || 'zoomIn';

      actions.push(`Initial: ${Math.round(scaleFactor * 100)}%`);
      actions.push(`Target: ${Math.round(targetScale * 100)}%`);
      actions.push(`Type: ${animationType}`);
    }

    // Add background color and opacity if they exist
    if (animation.properties.background) {
      if (animation.properties.background.color) {
        actions.push(
          `Background Color: ${animation.properties.background.color}`
        );
      }
      if (animation.properties.background.opacity !== undefined) {
        actions.push(
          `Background Opacity: ${Math.round(
            animation.properties.background.opacity * 100
          )}%`
        );
      }
    }

    return actions;
  };

  const getTooltipText = () => {
    const actions = getActionsList();
    if (actions.length === 0) {
      return 'No actions applied';
    }
    return actions.join('\n');
  };

  if (!store.selectedElement) return null;

  const handleSeparatorClick = () => {
    setIsDetailsPanelOpen(!isDetailsPanelOpen);
  };

  return (
    <div className={styles.previewFramesWrapper}>
      <div className={styles.previewFramesContainer}>
        <div
          className={`${styles.previewFrame} ${
            activeFrame === 'start' ? styles.activeFrame : ''
          }`}
          onClick={() => handleFrameClick('start')}
        >
          <div className={styles.frameLabelContainer}>
            <div className={styles.frameLabel}>Start frame</div>
            <ButtonWithIcon
              icon="EditSceneIcon"
              size="12"
              color="#9CA1A5"
              onClick={() => handleFrameClick('start')}
              classNameButton={styles.pencilIcon}
            />
          </div>
          <div className={styles.previewCanvasContainer}>
            <canvas
              ref={firstFrameRef}
              className={`${styles.previewCanvas} ${styles.first}`}
            />
            <canvas ref={firstFrameRef} className={styles.previewCanvas} />
            <canvas
              ref={firstFrameRef}
              className={`${styles.previewCanvas} ${styles.last}`}
            />
          </div>
        </div>
        <div
          className={`${styles.previewFrame} ${
            activeFrame === 'end' ? styles.activeFrame : ''
          }`}
          onClick={() => handleFrameClick('end')}
        >
          <div className={styles.frameLabelContainer}>
            <div className={styles.frameLabel}>End frame</div>
            <ButtonWithIcon
              icon="EditSceneIcon"
              size="12"
              color="#9CA1A5"
              onClick={() => handleFrameClick('end')}
              classNameButton={styles.pencilIcon}
            />
          </div>
          <div className={styles.previewCanvasContainer}>
            <canvas
              ref={lastFrameRef}
              className={`${styles.previewCanvas} ${styles.first}`}
            />
            <canvas ref={lastFrameRef} className={styles.previewCanvas} />
            <canvas
              ref={lastFrameRef}
              className={`${styles.previewCanvas} ${styles.last}`}
            />
          </div>
        </div>
        <div
          className={styles.previewFramesSeparator}
          onClick={handleSeparatorClick}
        >
          <SeparatorIcon
            color={isDetailsPanelOpen ? 'var(--accent-color)' : '#FFFFFF99'}
          />
          <ButtonWithIcon
            icon="ArrowDownIcon"
            size="14"
            marginLeft="0px"
            text={animationName}
            color={isDetailsPanelOpen ? 'var(--accent-color)' : '#FFFFFF33'}
            accentColor={isDetailsPanelOpen ? 'var(--accent-color)' : 'white'}
            textColor={isDetailsPanelOpen ? 'var(--accent-color)' : '#FFFFFF99'}
            classNameButton={styles.animationName}
            classNameIcon={`${styles.animationNameIcon} ${
              isDetailsPanelOpen ? styles.open : ''
            }`}
            iconPosition="after"
            onClick={handleSeparatorClick}
          />
        </div>
      </div>
      {isDetailsPanelOpen && (
        <div className={styles.detailsPanel}>
          <div className={styles.detailsPanelContent}>
            <TransitionPanel isPreview={true} activeAnimation={animation} />
          </div>
        </div>
      )}
    </div>
  );
};
