import { fabric } from 'fabric';
import { isHtmlVideoElement, isHtmlImageElement } from '../../utils';

export const refreshElementsUtil = async store => 
      {
        if (!store.canvas) return;
    
        // Prevent multiple simultaneous refresh operations
        if (store.isRefreshingElements) {
          return;
        }
        store.isRefreshingElements = true;
    
        try {
        // Cleanup existing event listeners to prevent memory leaks
        store.canvas.off('object:modified');
        store.canvas.off('object:added');
    
        // Remove all objects at once instead of one by one
        store.canvas.clear();
    
        // Add custom padding logic for fabric.Text
        fabric.Text.prototype.set({
          _getNonTransformedDimensions() {
            return new fabric.Point(this.width, this.height).scalarAdd(
              this.padding * 2
            );
          },
          _calculateCurrentDimensions() {
            return fabric.util.transformPoint(
              this._getTransformedDimensions(),
              this.getViewportTransform(),
              true
            );
          },
        });
    
        // Sort elements by row in ascending order (higher row = higher z-index)
        const sortedElements = [...store.editorElements].sort((a, b) => {
          if (a.type === 'text' && b.type !== 'text') return 1;
          if (b.type === 'text' && a.type !== 'text') return -1;
          return b.row - a.row;
        });
    
        const imagePromises = [];
        let batchUpdateTimeout;
    
        // Add global object:modified handler
        store.canvas.on('object:modified', e => {
          if (!e.target) return;
          const element = store.editorElements.find(
            el => el.fabricObject === e.target
          );
          if (element) {
            store.handleObjectModified(e.target, element);
          }
        });
    
        // Update global frame fill based on current elements
        store.updateCanvasFrameFill();
    
        // Process elements
        for (let index = 0; index < sortedElements.length; index++) {
          const element = sortedElements[index];
    
          if (!element) continue;
    
          switch (element.type) {
            case 'video':
              if (!document.getElementById(element.properties.elementId)) {
                continue;
              }
              const videoElement = document.getElementById(
                element.properties.elementId
              );
              if (!isHtmlVideoElement(videoElement)) {
                continue;
              }
              const videoObject = new fabric.CoverVideo(videoElement, {
                name: element.id,
                left: element.placement.x,
                top: element.placement.y,
                width: element.placement.width,
                height: element.placement.height,
                scaleX: element.placement.scaleX,
                scaleY: element.placement.scaleY,
                angle: element.placement.rotation,
                objectCaching: true, // Enable object caching for better performance
                selectable: true,
                lockUniScaling: false, // Allow resizing for video elements
                hasControls: true, // Enable resize controls for video
                hasBorders: true, // Enable borders for video
                customFilter: element.properties.effect.type,
              });
    
              element.fabricObject = videoObject;
              element.properties.imageObject = videoObject;
              videoElement.width = 100;
              videoElement.height =
                (videoElement.videoHeight * 100) / videoElement.videoWidth;
              store.canvas.add(videoObject);
              break;
    
            case 'image':
            case 'imageUrl':
              // Skip if element is marked to be hidden in canvas
              if (element.properties.hideInCanvas) {
                break;
              }
    
              if (element.fabricObject) {
                // Preserve original dimensions to avoid scaling issues
                const originalWidth = element.fabricObject.width || element.placement.width;
                const originalHeight = element.fabricObject.height || element.placement.height;
                
                element.fabricObject.set({
                  left: element.placement.x,
                  top: element.placement.y,
                  angle: element.placement.rotation,
                  scaleX: element.placement.scaleX,
                  scaleY: element.placement.scaleY,
                  objectCaching: true,
    
                  cropX:
                    element.placement.cropX !== undefined
                      ? element.placement.cropX
                      : element.fabricObject.cropX,
                  cropY:
                    element.placement.cropY !== undefined
                      ? element.placement.cropY
                      : element.fabricObject.cropY,
                  // Use original dimensions without dividing by scale to prevent shrinking
                  width: originalWidth,
                  height: originalHeight,
                });
                store.canvas.add(element.fabricObject);
              } else if (element.type === 'image') {
                const imageElement = document.getElementById(
                  element.properties.elementId
                );
                if (!imageElement || !isHtmlImageElement(imageElement)) continue;
    
                const imageObject = new fabric.CoverImage(imageElement, {
                  name: element.id,
                  left: element.placement.x,
                  top: element.placement.y,
                  angle: element.placement.rotation,
                  objectCaching: true,
                  selectable: true,
                  lockUniScaling: true,
                  customFilter: element.properties.effect.type,
                });
    
                element.fabricObject = imageObject;
                element.properties.imageObject = imageObject;
    
                const image = {
                  w: imageElement.naturalWidth,
                  h: imageElement.naturalHeight,
                };
    
                imageObject.width = image.w;
                imageObject.height = image.h;
                imageElement.width = image.w;
                imageElement.height = image.h;
    
                const toScale = {
                  x: element.placement.width / image.w,
                  y: element.placement.height / image.h,
                };
    
                imageObject.scaleX = toScale.x * element.placement.scaleX;
                imageObject.scaleY = toScale.y * element.placement.scaleY;
    
                store.canvas.add(imageObject);
              } else if (element.type === 'imageUrl' && element.properties.src) {
                // Handle imageUrl case, only if it has a src (not a placeholder)
    
                const imagePromise = new Promise((resolve, reject) => {
                  // Add cache busting to prevent tainted canvas
                  const cacheBustUrl =
                    element.properties.src +
                    (element.properties.src.includes('?') ? '&' : '?') +
                    '_cb=' +
                    Date.now();
                  fabric.Image.fromURL(
                    cacheBustUrl,
                    imageObjectDefault => {
                      imageObjectDefault.set({
                        name: element.id,
                        left: element.placement.x,
                        top: element.placement.y,
                        angle: element.placement.rotation,
                        scaleX: element.placement.scaleX,
                        scaleY: element.placement.scaleY,
                        selectable: true,
                        lockUniScaling: true,
                        objectCaching: true,
                        cropX:
                          element.placement.cropX !== undefined
                            ? element.placement.cropX
                            : 0,
                        cropY:
                          element.placement.cropY !== undefined
                            ? element.placement.cropY
                            : 0,
                        width: element.placement.width / element.placement.scaleX,
                        height: element.placement.height / element.placement.scaleY,
                      });
    
                      element.fabricObject = imageObjectDefault;
                      store.canvas.add(imageObjectDefault);
                      store.canvas.moveTo(imageObjectDefault, index);
    
                      resolve();
                    },
                    { crossOrigin: 'anonymous' }
                  );
                });
                imagePromises.push(imagePromise);
              }
              break;
    
            case 'text':
              // Skip adding to canvas if timelineOnly is true
              if (element.properties.timelineOnly) {
                break;
              }
              const TextClass = fabric.Textbox;
              const backgroundColor = element.properties.backgroundColor.startsWith(
                '#'
              )
                ? `${element.properties.backgroundColor}${Math.floor(
                    element.properties.backgroundOpacity * 255
                  )
                    .toString(16)
                    .padStart(2, '0')}`
                : element.properties.backgroundColor;
    
              const textColor = element.properties.color.startsWith('#')
                ? `${element.properties.color}${Math.floor(
                    (element.properties.opacity || 1) * 255
                  )
                    .toString(16)
                    .padStart(2, '0')}`
                : element.properties.color;
    
              const strokeColor = element.properties.strokeColor.startsWith('#')
                ? `${element.properties.strokeColor}${Math.floor(
                    (element.properties.strokeOpacity || 1) * 255
                  )
                    .toString(16)
                    .padStart(2, '0')}`
                : element.properties.strokeColor;
    
              const textObject = new TextClass(element.properties.text, {
                name: element.id,
                left: element.placement.x,
                top: element.placement.y,
                width: element.placement.width || 900,
                height: element.placement.height || 100,
                scaleX: element.placement.scaleX,
                scaleY: element.placement.scaleY,
                angle: element.placement.rotation,
                fontSize: element.properties.fontSize,
                fontWeight: element.properties.fontWeight,
                fontFamily: element.properties.font,
                fontStyle: element.properties.fontStyle || 'normal',
                backgroundColor,
                fill: textColor,
                stroke: strokeColor,
                strokeWidth: element.properties.stroke,
                strokeMiterLimit: 2,
                strokeDashArray: null,
                strokeDashOffset: 0,
                strokeLineCap: 'butt',
                strokeLineJoin: 'miter',
                shadow:
                  element.properties.shadow &&
                  (element.properties.shadow.blur > 0 ||
                    element.properties.shadow.offsetX !== 0 ||
                    element.properties.shadow.offsetY !== 0)
                    ? (() => {
                        const shadowObj = new fabric.Shadow({
                          color: element.properties.shadow.color || '#000000',
                          blur: element.properties.shadow.blur || 0,
                          offsetX: element.properties.shadow.offsetX || 0,
                          offsetY: element.properties.shadow.offsetY || 0,
                          opacity: element.properties.shadow.opacity || 1,
                        });
                        return shadowObj;
                      })()
                    : null,
                textAlign: element.properties.textAlign,
                originX: 'center',
                originY: element.properties.verticalAlign,
                padding: 6,
                paintFirst: 'stroke',
                objectCaching: true,
                selectable: true,
                editable: true,
                lockUniScaling: true,
              });
    
              // Add click handler to set current time
              textObject.on('mousedown', () => {
                if (!textObject.isEditing) {
                  store.setCurrentTimeInMs(element.timeFrame.end);
                }
              });
    
              element.fabricObject = textObject;
              store.canvas.add(textObject);
              store.canvas.moveTo(textObject, index);
              textObject.bringToFront();
    
              // Create background rectangle for subtitles if needed
              if (element.subType === 'subtitles') {
                store.createSubtitleBackground(element, textObject);
              }
    
              // Handle word animations for subtitles
              if (element.properties.words?.length > 0) {
                // If word objects don't exist yet, create them
                if (
                  !element.properties.wordObjects ||
                  element.properties.wordObjects.length === 0
                ) {
                  store.initializeWordAnimations(element);
                } else {
                  // Update existing word objects
                  store.updateWordObjects(element, textObject);
                }
              }
    
              // Add text-specific event handlers
              textObject.on('editing:entered', () => {
                if (element.subType === 'subtitles') {
                  // Remove word objects during editing
                  if (element.properties.wordObjects?.length > 0) {
                    element.properties.wordObjects.forEach(obj => {
                      if (obj && store.canvas.contains(obj)) {
                        store.canvas.remove(obj);
                      }
                    });
                    element.properties.wordObjects = [];
                  }
    
                  // Show the main text object with proper styling
                  textObject.set({
                    opacity: 1,
                    fill: element.properties.color,
                    stroke: element.properties.strokeColor,
                    backgroundColor: 'transparent',
                  });
                } else {
                  textObject.set({ backgroundColor: 'transparent' });
                }
                store.canvas.requestRenderAll();
              });
    
              textObject.on('editing:exited', () => {
                if (element.subType === 'subtitles') {
                  // Save current text state
                  const currentText = textObject.text;
                  element.properties.text = currentText;
    
                  // ГАРАНТОВАНО видаляю всі старі wordObjects з канвасу
                  if (element.properties.wordObjects?.length > 0) {
                    element.properties.wordObjects.forEach(obj => {
                      if (obj && store.canvas.contains(obj)) {
                        store.canvas.remove(obj);
                      }
                    });
                    element.properties.wordObjects = [];
                  }
    
                  // Reinitialize word animations (оновлення wordObjects)
                  store.initializeWordAnimations(element);
    
                  // Hide main text object as animations take over
                  textObject.set('opacity', 0);
                }
                textObject.set({ backgroundColor });
                store.handleObjectModified(textObject, element);
                store.canvas.requestRenderAll();
              });
    
              textObject.on('changed', () => {
                if (element.subType === 'subtitles' && textObject.isEditing) {
                  // Оновлюємо лише текст і words у properties, не чіпаємо wordObjects
                  const newText = textObject.text;
                  const segmentDuration =
                    element.timeFrame.end - element.timeFrame.start;
                  const oldText = element.properties.text;
                  const oldWords = oldText.trim().split(/\s+/);
                  const newWords = newText.trim().split(/\s+/);
    
                  // Create a map of existing word timings
                  const wordTimings = new Map();
                  (element.properties.words || []).forEach((word, index) => {
                    wordTimings.set(oldWords[index], word);
                  });
    
                  // Calculate total characters for proportional timing
                  const totalChars = newWords.reduce((sum, w) => sum + w.length, 0);
    
                  const updatedWords = newWords.map((word, index) => {
                    const existingTiming = wordTimings.get(word);
                    if (existingTiming) {
                      return {
                        ...existingTiming,
                        word,
                      };
                    }
                    // Нові слова — розподіляємо рівномірно
                    const wordStart =
                      element.timeFrame.start +
                      (segmentDuration *
                        newWords
                          .slice(0, index)
                          .reduce((sum, w) => sum + w.length, 0)) /
                        (totalChars || 1);
                    return {
                      word,
                      start: Math.round(wordStart),
                      end: element.timeFrame.end,
                    };
                  });
    
                  element.properties.text = newText;
                  element.properties.words = updatedWords;
                  // НЕ чіпаємо wordObjects тут!
                }
              });
    
              break;
    
            case 'audio':
              // For audio elements, ensure the HTML audio element exists
              if (!document.getElementById(element.properties.elementId)) {
                // If audio element doesn't exist, recreate it
                const audioElement = document.createElement('audio');
                audioElement.id = element.properties.elementId;
                audioElement.src = element.properties.src;
                audioElement.preload = 'metadata';
                audioElement.volume = store.volume;
                audioElement.style.display = 'none';
                document.body.appendChild(audioElement);
              }
              break;
    
            default:
              continue;
          }
    
          // Add selection handler
          if (element.fabricObject) {
            element.fabricObject.on('selected', () => {
              store.setSelectedElement(element);
            });
            store.canvas.moveTo(element.fabricObject, index);
          }
        }
    
        // Wait for all image promises to resolve
        if (imagePromises.length > 0) {
          await Promise.all(imagePromises);
        }
    
        // Set selected element if exists
        const selectedEditorElement = store.selectedElement;
        if (selectedEditorElement?.fabricObject) {
          store.canvas.setActiveObject(selectedEditorElement.fabricObject);
        }
    
        // Final updates
        store.refreshAnimations();
        store.updateTimeTo(store.currentTimeInMs);
    
        // Update word z-index for all text elements with word animations
        store.editorElements.forEach(element => {
          if (element.type === 'text' && element.properties.wordObjects) {
            store.updateWordZIndex(element);
          }
        });
    
        // Request a single render at the end
        store.canvas.requestRenderAll();
        
        } catch (error) {
          console.error('Error in refreshElements:', error);
        } finally {
          store.isRefreshingElements = false;
        }
      }  