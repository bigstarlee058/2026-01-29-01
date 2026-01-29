import { useEffect } from 'react';
import { fabric } from 'fabric';
import { AlignGuidelines } from 'fabric-guideline-plugin';

// Import filter utility
import { getFilterFromEffectType } from '../utils/fabric-utils';

if (!fabric.VideoImage) {
  fabric.VideoImage = fabric.util.createClass(fabric.Image, {
    type: 'videoImage',
    customFilter: 'none',

    initialize: function (videoElement, options) {
      this.callSuper('initialize', videoElement, options);
      this.set('videoElement', videoElement);

      const loop = () => {
        if (!this.videoElement.paused && !this.videoElement.ended) {
          this.setElement(this.videoElement);
          this.canvas && this.canvas.requestRenderAll();
        }
        requestAnimationFrame(loop);
      };
      loop();
    },

    _render: function (ctx) {
      try {
        ctx.save();
        
        // Apply custom filter if set
        const customFilter = this.customFilter;
        if (customFilter && customFilter !== 'none' && customFilter !== null && customFilter !== undefined) {
          const filterCSS = getFilterFromEffectType(customFilter);
          if (filterCSS && filterCSS !== 'none' && filterCSS !== 'pixi-filter') {
            ctx.filter = filterCSS;
          }
        }
        
        ctx.drawImage(
          this.videoElement,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
        
        // Reset filter
        if (customFilter && customFilter !== 'none' && customFilter !== null && customFilter !== undefined) {
          const filterCSS = getFilterFromEffectType(customFilter);
          if (filterCSS && filterCSS !== 'none' && filterCSS !== 'pixi-filter') {
            ctx.filter = 'none';
          }
        }
        
        ctx.restore();
      } catch (err) {
        console.warn('Video render error:', err);
      }
    },

    toObject: function () {
      return fabric.util.object.extend(this.callSuper('toObject'), {
        src: this.videoElement.src,
        customFilter: this.customFilter,
      });
    },
  });
}

// Extend fabric.Image to support customFilter only if not already done
if (!fabric.Image.prototype._customFilterSupport) {
  const originalImageRender = fabric.Image.prototype._render;
  
  fabric.Image.prototype._render = function(ctx) {
    // Apply custom filter if set
    const customFilter = this.customFilter;
    
    if (customFilter && customFilter !== 'none' && customFilter !== null && customFilter !== undefined) {
      const filterCSS = getFilterFromEffectType(customFilter);
      if (filterCSS && filterCSS !== 'none' && filterCSS !== 'pixi-filter') {
        ctx.save();
        ctx.filter = filterCSS;
        originalImageRender.call(this, ctx);
        ctx.filter = 'none';
        ctx.restore();
      } else {
        // For 'pixi-filter' or other cases, just use original render
        originalImageRender.call(this, ctx);
      }
    } else {
      // No filter or 'none' - use original render
      originalImageRender.call(this, ctx);
    }
  };

  // Add customFilter property to fabric.Image prototype
  fabric.Image.prototype.customFilter = 'none';
  
  // Mark that custom filter support has been added
  fabric.Image.prototype._customFilterSupport = true;
}

export const useCanvasInitialization = (videoPanelRef, store) => {
  useEffect(() => {
    if (!videoPanelRef.current || !videoPanelRef.current.clientWidth) {
      return;
    }

    store.cleanup();

    const containerWidth = videoPanelRef.current.clientWidth;
    const containerHeight = videoPanelRef.current.clientHeight;
    const aspectRatio = store.getAspectRatioValue() || (9 / 16);

    let newWidth = containerWidth;
    let newHeight = containerWidth / aspectRatio;

    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-color')
      .trim();

    if (newHeight > containerHeight) {
      newHeight = containerHeight;
      newWidth = containerHeight * aspectRatio;
    }

    const updateControlsVisibility = visible => {
      if (!canvas) return;

      const isOtherPanelVisible = () => {
        const panels = [
          '[data-testid="gallery-panel"]',
          '[data-testid="prompt-panel"]',
          '[data-testid="settings-panel"]',
        ];

        return panels.some(selector => {
          const panel = document.querySelector(selector);
          return (
            panel &&
            window.getComputedStyle(panel).display !== 'none' &&
            panel.offsetParent !== null
          );
        });
      };

      const shouldShowControls = visible && !isOtherPanelVisible();

      if (selectionLayer) {
        selectionLayer.style.display = shouldShowControls ? 'block' : 'none';
      }

      const objects = canvas.getObjects();
      objects.forEach(obj => {
        // Always enable controls and borders for video objects when they're selectable
        if (obj.type === 'videoImage' || obj.type === 'CoverVideo') {
          obj.set({
            hasControls: shouldShowControls || obj.selectable,
            hasBorders: shouldShowControls || obj.selectable,
          });
        } else {
          obj.set({
            hasControls: shouldShowControls,
            hasBorders: shouldShowControls,
          });
        }
      });
      canvas.renderAll();
    };

    store.setControlsVisibility = updateControlsVisibility;

    const handlePanelVisibility = () => {
      if (store.setControlsVisibility) {
        const videoPanel = document.querySelector(
          '[data-testid="video-panel"]'
        );
        const isVideoPanelVisible =
          videoPanel &&
          window.getComputedStyle(videoPanel).display !== 'none' &&
          videoPanel.offsetParent !== null;

        store.setControlsVisibility(isVideoPanelVisible);
      }
    };

    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: 'transparent',
      cornerStyle: 'circle',
      cornerStrokeColor: 'transparent',
      cornerSize: 20,
      cornerStrokeWidth: 2,
      padding: 0,
      borderColor: 'transparent',
      borderScaleFactor: 2.5,
      borderOpacityWhenMoving: 0,
      hasControls: false,
      hasBorders: false,
    });

    // Calculate canvas dimensions based on aspect ratio
    const canvasAspectRatio = store.getAspectRatioValue() || (9 / 16);
    const baseWidth = 1080;
    const canvasHeight = Math.round(baseWidth / canvasAspectRatio);
    
    const canvas = new fabric.Canvas('canvas', {
      width: baseWidth,
      height: canvasHeight,
      backgroundColor: '#5B4754',
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
      isDrawingMode: false,
      renderOnAddRemove: true,
    });

    // (debug logs removed)

    let isDrawing = false;
    let currentLine = null;
    let points = [];
    let currentBrushSettings = {
      color: '#FF0000',
      width: 5,
      opacity: 1,
      type: 'PencilBrush',
    };

    let isCtrlKeyPressed = false;
    let isDraggingClone = false;
    let originalObject = null;

    const handleKeyDown = function (e) {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlKeyPressed = true;

        if (canvas.getActiveObject()) {
          document.body.style.cursor = 'copy';
        }
      }
    };

    const handleKeyUp = function (e) {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlKeyPressed = false;
        document.body.style.cursor = 'default';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Global click handler to clear canvas selection when clicking outside canvas
    const handleGlobalClick = (e) => {
      // Check if click is inside canvas or canvas-related elements
      const canvasElement = canvas.getElement();
      const selectionLayer = document.getElementById('selection-layer');
      const canvasContainer = document.getElementById('grid-canvas-container');
      
      if (!canvasElement) return;
      
      // Check if the click target is within canvas area or related UI
      const isInsideCanvas = canvasElement.contains(e.target) || canvasElement === e.target;
      const isInsideSelectionLayer = selectionLayer && (selectionLayer.contains(e.target) || selectionLayer === e.target);
      const isInsideCanvasContainer = canvasContainer && (canvasContainer.contains(e.target) || canvasContainer === e.target);
      const isControlPoint = e.target.hasAttribute && e.target.hasAttribute('data-control-point');
      const isHandleAction = e.target.hasAttribute && e.target.hasAttribute('data-handle-action');
      
      // If click is outside canvas area and not on control elements, clear selection
      if (!isInsideCanvas && !isInsideSelectionLayer && !isInsideCanvasContainer && !isControlPoint && !isHandleAction) {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.discardActiveObject();
          canvas.renderAll();
          store.setSelectedElement(null);
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);

    const startDrawing = pointer => {
      if (!canvas.isDrawingMode) return;

      isDrawing = true;
      points = [pointer.x, pointer.y, pointer.x, pointer.y];

      currentLine = new fabric.Line(points, {
        stroke: currentBrushSettings.color,
        strokeWidth: currentBrushSettings.width,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        opacity: currentBrushSettings.opacity,
        selectable: false,
        evented: false,
      });

      canvas.add(currentLine);
      canvas.renderAll();
    };

    const continueDrawing = pointer => {
      if (!isDrawing || !canvas.isDrawingMode) return;

      points[2] = pointer.x;
      points[3] = pointer.y;

      if (currentLine) {
        canvas.remove(currentLine);
      }

      currentLine = new fabric.Line(points, {
        stroke: currentBrushSettings.color,
        strokeWidth: currentBrushSettings.width,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        opacity: currentBrushSettings.opacity,
        selectable: false,
        evented: false,
      });

      canvas.add(currentLine);

      const permanentLine = new fabric.Line(
        [points[0], points[1], pointer.x, pointer.y],
        {
          stroke: currentBrushSettings.color,
          strokeWidth: currentBrushSettings.width,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          opacity: currentBrushSettings.opacity,
          selectable: true,
          evented: true,
        }
      );

      canvas.add(permanentLine);

      points[0] = pointer.x;
      points[1] = pointer.y;

      canvas.renderAll();
    };

    const endDrawing = () => {
      if (!isDrawing) return;

      isDrawing = false;

      if (currentLine) {
        canvas.remove(currentLine);
        currentLine = null;
      }

      canvas.renderAll();
    };

    canvas.on('mouse:down', function (options) {
      if (options.target && isCtrlKeyPressed && !canvas.isDrawingMode) {
        const activeObject = options.target;
        isDraggingClone = true;
        originalObject = activeObject;

        activeObject.clone(function (cloned) {
          cloned.set({
            left: activeObject.left,
            top: activeObject.top,
            evented: true,
          });

          canvas.add(cloned);

          canvas.setActiveObject(cloned);

          cloned.set('opacity', 0.7);

          canvas.renderAll();
        });
      } else if (canvas.isDrawingMode) {
        startDrawing(options.pointer);
      } else if (!options.target) {
        store.setSelectedElement(null);
        // Clear guidelines when clicking on empty space
        store.clearGuidelines();
      }
    });

    canvas.on('mouse:move', function (options) {
      if (isDrawing && canvas.isDrawingMode) {
        continueDrawing(options.pointer);
      }
    });

    canvas.on('mouse:up', function (options) {
      if (isDraggingClone && originalObject) {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          activeObject.set('opacity', 1);
          canvas.renderAll();
        }

        isDraggingClone = false;
        originalObject = null;
      }

      if (canvas.isDrawingMode) {
        endDrawing();
      }
    });

    store.updateBrushSettings = settings => {
      currentBrushSettings = { ...currentBrushSettings, ...settings };
    };

    store.disableDrawingMode = () => {
      if (canvas && canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        canvas.renderAll();
      }
    };

    canvas.set({
      selectionColor: 'rgba(211, 248, 90, 0.15)',
      selectionBorderColor: accentColor,
      selectionLineWidth: 2,
    });

    const guideline = new AlignGuidelines({
      canvas: canvas,
      aligningOptions: {
        lineColor: accentColor,
        lineWidth: 6,
        lineMargin: 2,
      },
    });

    guideline.init();
    
    // Store guideline reference for later use
    store.guideline = guideline;

    // Set CSS dimensions dynamically based on aspect ratio
    const cssAspectRatio = store.getAspectRatioValue() || (9 / 16);
    canvas.setDimensions(
      {
        width: `calc((100vh - 360px) * ${cssAspectRatio})`,
        height: 'calc(100vh - 360px)',
      },
      {
        cssOnly: true,
      }
    );

    canvas.on('path:created', function (e) {
      e.path.selectable = true;
      e.path.strokeLineCap = 'round';
      e.path.strokeLineJoin = 'round';
      store.addDrawnPath(e.path);
    });

    store.setCanvas(canvas);

    fabric.util.requestAnimFrame(function render() {
      canvas.renderAll();
      fabric.util.requestAnimFrame(render);
    });

    let selectionLayer;
    let canvasContainer;
    let isResizing = false;
    let permanentOutline = null;
    let lastActiveObject = null;
    let forceKeepSelection = false;
    let handleElements = [];
    let skipNextClear = false;
    let activeControlPoint = null;

    function snapshotHandles() {
      if (!selectionLayer) return;

      handleElements = [];

      const handles = selectionLayer.querySelectorAll('[data-handle-action]');
      handles.forEach(handle => {
        const clone = handle.cloneNode(true);
        handleElements.push(clone);
      });

      const controlPoints = selectionLayer.querySelectorAll(
        '[data-control-point]'
      );
      controlPoints.forEach(controlPoint => {
        const clone = controlPoint.cloneNode(true);
        if (controlPoint._mousedownHandler) {
          clone._mousedownHandler = controlPoint._mousedownHandler;
          clone.addEventListener('mousedown', controlPoint._mousedownHandler);
        }
        handleElements.push(clone);
      });
    }

    function restoreHandles() {
      if (!selectionLayer || handleElements.length === 0) return;

      const existingControlPoints = selectionLayer.querySelectorAll(
        '[data-control-point]'
      );
      const existingHandles = selectionLayer.querySelectorAll(
        '[data-handle-action]'
      );

      if (existingControlPoints.length > 0 || existingHandles.length > 0) {
        return;
      }

      if (permanentOutline && !selectionLayer.querySelector('svg')) {
        selectionLayer.appendChild(permanentOutline.cloneNode(true));
      }

      handleElements.forEach(handle => {
        selectionLayer.appendChild(handle);
      });
    }

    function clearSelectionLayer() {
      if (!selectionLayer) return;

      if (isResizing || forceKeepSelection || skipNextClear) {
        skipNextClear = false;
        return;
      }

      while (selectionLayer.firstChild) {
        selectionLayer.removeChild(selectionLayer.firstChild);
      }

      handleElements = [];
      
      const hoverBox = document.querySelector('[data-testid*="hover-box"]');
      if (hoverBox) {
        hoverBox.style.display = 'none';
      }
    }

    setTimeout(() => {
      selectionLayer = document.getElementById('selection-layer');

      if (!selectionLayer) {
        console.error('Selection layer not found');
        return;
      }

      let contentBoxEl = null;

      contentBoxEl = document.querySelector('.VideoCreationPage_content_box');

      if (!contentBoxEl) {
        contentBoxEl = document.querySelector(
          '[class*="VideoCreationPage_content_box"]'
        );
      }

      if (!contentBoxEl) {
        console.warn('Cannot find VideoCreationPage_content_box element');
        return;
      }

      const contentBoxRect = contentBoxEl.getBoundingClientRect();

      const selectionContainer = document.createElement('div');
      selectionContainer.id = 'selection-container';
      selectionContainer.style.position = 'fixed';
      selectionContainer.style.width = `${contentBoxRect.width}px`;
      selectionContainer.style.height = `${contentBoxRect.height}px`;
      selectionContainer.style.top = `${contentBoxRect.top}px`;
      selectionContainer.style.left = `${contentBoxRect.left}px`;
      selectionContainer.style.overflow = 'hidden';
      selectionContainer.style.pointerEvents = 'none';
      selectionContainer.style.zIndex = '10000';

      document.body.appendChild(selectionContainer);

      selectionLayer.parentNode.removeChild(selectionLayer);
      selectionContainer.appendChild(selectionLayer);

      selectionLayer.style.position = 'absolute';
      selectionLayer.style.top = '0';
      selectionLayer.style.left = '0';
      selectionLayer.style.width = '100%';
      selectionLayer.style.height = '100%';
      selectionLayer.style.overflow = 'visible';
      selectionLayer.style.pointerEvents = 'none';

      store.selectionContainer = selectionContainer;
      store.contentBoxEl = contentBoxEl;
      store.originalSelectionLayerParent = contentBoxEl.querySelector(
        '.Player_canvasWrapper'
      );

      const updateContainerPosition = () => {
        if (!contentBoxEl) return;

        const updatedRect = contentBoxEl.getBoundingClientRect();
        selectionContainer.style.width = `${updatedRect.width}px`;
        selectionContainer.style.height = `${updatedRect.height}px`;
        selectionContainer.style.top = `${updatedRect.top}px`;
        selectionContainer.style.left = `${updatedRect.left}px`;

        if (canvas.getActiveObject()) {
          requestAnimationFrame(() => createCustomSelectionOutline());
        }
      };

      window.addEventListener('resize', updateContainerPosition);
      window.addEventListener('scroll', updateContainerPosition);
      window.addEventListener('orientationchange', updateContainerPosition);

      store.updateContainerPosition = updateContainerPosition;

      const observer = new MutationObserver(mutations => {
        updateContainerPosition();
      });

      observer.observe(contentBoxEl, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: false,
      });

      store.containerObserver = observer;

      canvas.on('selection:created', function(e) {
        // Enable controls for video objects when selected
        if (e.selected && e.selected.length > 0) {
          e.selected.forEach(obj => {
            if (obj.type === 'videoImage' || obj.type === 'CoverVideo') {
              obj.set({
                hasControls: true,
                hasBorders: true,
              });
            }
          });
        }
        createCustomSelectionOutline();
      });
      canvas.on('selection:updated', function(e) {
        // Enable controls for video objects when selected
        if (e.selected && e.selected.length > 0) {
          e.selected.forEach(obj => {
            if (obj.type === 'videoImage' || obj.type === 'CoverVideo') {
              obj.set({
                hasControls: true,
                hasBorders: true,
              });
            }
          });
        }
        createCustomSelectionOutline();
      });
      canvas.on('selection:cleared', e => {
        if (forceKeepSelection && lastActiveObject) {
          setTimeout(() => {
            canvas.setActiveObject(lastActiveObject);
            canvas.renderAll();
          }, 0);
          return;
        }

        if (!isResizing && !activeControlPoint) {
          clearSelectionLayer();
          // Clear guidelines when selection is cleared
          store.clearGuidelines();
        }
      });
      canvas.on('object:moving', function (e) {
        if (e.target && selectionLayer) {
          lastActiveObject = e.target;
          updateControlPointsPositions(e.target);
        }
      });
      
      canvas.on('object:moved', function (e) {
        // Clear guidelines after moving is complete
        setTimeout(() => {
          if (!canvas.getActiveObject()) {
            store.clearGuidelines();
          }
        }, 100);
      });
      
      canvas.on('object:modified', function (e) {
        if (e.target && selectionLayer) {
          createCustomSelectionOutline();
        }
        // Clear guidelines after object modification is complete
        setTimeout(() => {
          if (!canvas.getActiveObject()) {
            store.clearGuidelines();
          }
        }, 100);
      });
      canvas.on('object:scaling', function (e) {
        if (e.target && selectionLayer) {
          lastActiveObject = e.target;
          updateControlPointsPositions(e.target);
        }
      });
      
      canvas.on('object:scaled', function (e) {
        // Clear guidelines after scaling is complete
        setTimeout(() => {
          if (!canvas.getActiveObject()) {
            store.clearGuidelines();
          }
        }, 100);
      });
      canvas.on('object:rotating', function (e) {
        if (e.target && selectionLayer) {
          lastActiveObject = e.target;
          updateControlPointsPositions(e.target);
        }
      });
      
      canvas.on('object:rotated', function (e) {
        // Clear guidelines after rotation is complete
        setTimeout(() => {
          if (!canvas.getActiveObject()) {
            store.clearGuidelines();
          }
        }, 100);
      });
      canvas.on('object:modified', function (e) {
        if (e.target && selectionLayer) {
          createCustomSelectionOutline();
        }
        // Clear guidelines after object modification is complete
        setTimeout(() => {
          if (!canvas.getActiveObject()) {
            store.clearGuidelines();
          }
        }, 100);
      });
      canvas.on('mouse:up', e => {
        if (canvas.getActiveObject()) {
          lastActiveObject = canvas.getActiveObject();
        }

        if (!isResizing && !activeControlPoint) {
          createCustomSelectionOutline();
        }
      });
      canvas.on('mouse:wheel', createCustomSelectionOutline);
      canvas.on('mouse:move', function (e) {
        if (canvas.getActiveObject() && selectionLayer) {
          updateControlPointsPositions(canvas.getActiveObject());
        }
      });
    }, 100);

    function getCanvasRelativePosition(e) {
      const canvasEl = canvas.getElement();
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    }

    function updateControlPointsPositions(activeObject) {
      if (!selectionLayer || !activeObject || !activeObject.oCoords) return;

      const canvasEl = canvas.getElement();
      const displayWidth = canvasEl.clientWidth;
      const displayHeight = canvasEl.clientHeight;

      const scaleFactorX = displayWidth / canvas.width;
      const scaleFactorY = displayHeight / canvas.height;

      const canvasRect = canvasEl.getBoundingClientRect();

      const oCoords = activeObject.oCoords;

      const domCoords = {
        tl: {
          x:
            oCoords.tl.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.tl.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        tr: {
          x:
            oCoords.tr.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.tr.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        bl: {
          x:
            oCoords.bl.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.bl.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        br: {
          x:
            oCoords.br.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.br.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
      };

      const width = Math.sqrt(
        Math.pow(domCoords.tr.x - domCoords.tl.x, 2) +
        Math.pow(domCoords.tr.y - domCoords.tl.y, 2)
      );
      const height = Math.sqrt(
        Math.pow(domCoords.bl.x - domCoords.tl.x, 2) +
        Math.pow(domCoords.bl.y - domCoords.tl.y, 2)
      );
      const left = domCoords.tl.x;
      const top = domCoords.tl.y;
      const rotation = activeObject.angle || 0;

      let hoverBox = document.querySelector('[data-testid*="hover-box"]');
      if (!hoverBox) {
        hoverBox = document.createElement('div');
        hoverBox.setAttribute('data-testid', '@editor/video-canvas/hover-box/default');
        hoverBox.style.position = 'absolute';
        hoverBox.style.pointerEvents = 'none';
        hoverBox.style.zIndex = '1000';
        
       const canvasContainer = canvasEl.parentElement;
        if (canvasContainer) {
          canvasContainer.appendChild(hoverBox);
        }
      }

      hoverBox.style.display = 'block';
      hoverBox.style.width = `${width.toFixed(3)}px`;
      hoverBox.style.height = `${height.toFixed(3)}px`;
      hoverBox.style.transform = `rotate(${rotation.toFixed(0)}deg)`;
      hoverBox.style.left = `${left.toFixed(4)}px`;
      hoverBox.style.top = `${top.toFixed(4)}px`;
      hoverBox.style.zIndex = '0';

      const polygon = selectionLayer.querySelector('polygon');
      if (polygon) {
        const points = [
          domCoords.tl.x + ',' + domCoords.tl.y,
          domCoords.tr.x + ',' + domCoords.tr.y,
          domCoords.br.x + ',' + domCoords.br.y,
          domCoords.bl.x + ',' + domCoords.bl.y,
        ].join(' ');

        polygon.setAttribute('points', points);
      }

      const controlPoints = [
        { selector: '[data-control-point="tl"]', coords: domCoords.tl },
        { selector: '[data-control-point="tr"]', coords: domCoords.tr },
        { selector: '[data-control-point="bl"]', coords: domCoords.bl },
        { selector: '[data-control-point="br"]', coords: domCoords.br },
        {
          selector: '[data-control-point="mt"]',
          coords: {
            x: (domCoords.tl.x + domCoords.tr.x) / 2,
            y: (domCoords.tl.y + domCoords.tr.y) / 2,
          },
        },
        {
          selector: '[data-control-point="mb"]',
          coords: {
            x: (domCoords.bl.x + domCoords.br.x) / 2,
            y: (domCoords.bl.y + domCoords.br.y) / 2,
          },
        },
        {
          selector: '[data-control-point="ml"]',
          coords: {
            x: (domCoords.tl.x + domCoords.bl.x) / 2,
            y: (domCoords.tl.y + domCoords.bl.y) / 2,
          },
        },
        {
          selector: '[data-control-point="mr"]',
          coords: {
            x: (domCoords.tr.x + domCoords.br.x) / 2,
            y: (domCoords.tr.y + domCoords.br.y) / 2,
          },
        },
      ];

      controlPoints.forEach(point => {
        const handles = selectionLayer.querySelectorAll(point.selector);
        handles.forEach(handle => {
          handle.style.left = `${point.coords.x}px`;
          handle.style.top = `${point.coords.y}px`;
        });

        const markerSelector = `[data-handle-action="${
          point.selector.match(/["']([^"']+)["']/)[1]
        }"]`;
        const markers = selectionLayer.querySelectorAll(markerSelector);
        markers.forEach(marker => {
          marker.style.left = `${point.coords.x}px`;
          marker.style.top = `${point.coords.y}px`;
        });
      });
    }

    function createCustomSelectionOutline() {
      if (!selectionLayer) return;

      if (isResizing || activeControlPoint) return;

      while (selectionLayer.firstChild) {
        selectionLayer.removeChild(selectionLayer.firstChild);
      }

      handleElements = [];

      const activeObject = canvas.getActiveObject();
      if (!activeObject) return;

      lastActiveObject = activeObject;

      const contentBoxEl = store.contentBoxEl;
      if (!contentBoxEl) {
        console.warn('Cannot find VideoCreationPage_content_box element');
        return;
      }

      const canvasEl = canvas.getElement();
      const displayWidth = canvasEl.clientWidth;
      const displayHeight = canvasEl.clientHeight;

      const scaleFactorX = displayWidth / canvas.width;
      const scaleFactorY = displayHeight / canvas.height;

      const oCoords = activeObject.oCoords;
      if (!oCoords) return;

      const canvasRect = canvasEl.getBoundingClientRect();

      const domCoords = {
        tl: {
          x:
            oCoords.tl.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.tl.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        tr: {
          x:
            oCoords.tr.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.tr.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        bl: {
          x:
            oCoords.bl.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.bl.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
        br: {
          x:
            oCoords.br.x * scaleFactorX +
            canvasRect.left -
            store.selectionContainer.offsetLeft,
          y:
            oCoords.br.y * scaleFactorY +
            canvasRect.top -
            store.selectionContainer.offsetTop,
        },
      };

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';
      svg.style.overflow = 'visible';

      const polygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );

      const points = [
        domCoords.tl.x + ',' + domCoords.tl.y,
        domCoords.tr.x + ',' + domCoords.tr.y,
        domCoords.br.x + ',' + domCoords.br.y,
        domCoords.bl.x + ',' + domCoords.bl.y,
      ].join(' ');

      polygon.setAttribute('points', points);
      polygon.setAttribute('fill', 'none');
      polygon.setAttribute('stroke', `${accentColor}80`);
      polygon.setAttribute('stroke-width', '2');

      svg.appendChild(polygon);
      selectionLayer.appendChild(svg);

      const contentBoxRect = contentBoxEl.getBoundingClientRect();

      const HANDLE_SIZE = 6;

      const handleConfigs = [
        {
          type: 'tl',
          coords: domCoords.tl,
          cursor: 'nwse-resize',
          isCorner: true,
          proportional: true,
        },
        {
          type: 'tr',
          coords: domCoords.tr,
          cursor: 'nesw-resize',
          isCorner: true,
          proportional: true,
        },
        {
          type: 'bl',
          coords: domCoords.bl,
          cursor: 'nesw-resize',
          isCorner: true,
          proportional: true,
        },
        {
          type: 'br',
          coords: domCoords.br,
          cursor: 'nwse-resize',
          isCorner: true,
          proportional: true,
        },
        {
          type: 'mt',
          coords: {
            x: (domCoords.tl.x + domCoords.tr.x) / 2,
            y: (domCoords.tl.y + domCoords.tr.y) / 2,
          },
          cursor: 'ns-resize',
          isCorner: false,
          proportional: false,
        },
        {
          type: 'mb',
          coords: {
            x: (domCoords.bl.x + domCoords.br.x) / 2,
            y: (domCoords.bl.y + domCoords.br.y) / 2,
          },
          cursor: 'ns-resize',
          isCorner: false,
          proportional: false,
        },
        {
          type: 'ml',
          coords: {
            x: (domCoords.tl.x + domCoords.bl.x) / 2,
            y: (domCoords.tl.y + domCoords.bl.y) / 2,
          },
          cursor: 'ew-resize',
          isCorner: false,
          proportional: false,
        },
        {
          type: 'mr',
          coords: {
            x: (domCoords.tr.x + domCoords.br.x) / 2,
            y: (domCoords.tr.y + domCoords.br.y) / 2,
          },
          cursor: 'ew-resize',
          isCorner: false,
          proportional: false,
        },
      ];

      handleConfigs.forEach(config => {
        const handleElement = document.createElement('div');
        handleElement.style.position = 'absolute';
        handleElement.style.width = `${HANDLE_SIZE}px`;
        handleElement.style.height = `${HANDLE_SIZE}px`;
        handleElement.style.backgroundColor = `${accentColor}`;
        handleElement.style.border = `1px solid ${accentColor}`;
        handleElement.style.borderRadius = config.isCorner ? '50%' : '0px';
        handleElement.style.cursor = config.cursor;
        handleElement.style.zIndex = '20000';
        handleElement.style.transform = 'translate(-50%, -50%)';
        handleElement.style.left = `${config.coords.x}px`;
        handleElement.style.top = `${config.coords.y}px`;
        handleElement.style.pointerEvents = 'all';
        handleElement.dataset.controlPoint = config.type;

        handleElement.addEventListener('pointerdown', function (e) {
          e.stopPropagation();
          if (e.button !== 0) return;

          activeControlPoint = handleElement;
          isResizing = true;
          forceKeepSelection = true;
          store.setIsResizing(true);

          const initialX = e.clientX;
          const initialY = e.clientY;

          const original = {
            scaleX: activeObject.scaleX,
            scaleY: activeObject.scaleY,
            left: activeObject.left,
            top: activeObject.top,
            width: activeObject.width,
            height: activeObject.height,
            angle: activeObject.angle || 0,
          };

          const isLeft =
            config.type === 'tl' ||
            config.type === 'bl' ||
            config.type === 'ml';
          const isTop =
            config.type === 'tl' ||
            config.type === 'tr' ||
            config.type === 'mt';

          const pointerMoveHandler = function (moveEvent) {
            const offsetX = (moveEvent.clientX - initialX) / scaleFactorX;
            const offsetY = (moveEvent.clientY - initialY) / scaleFactorY;

            if (config.isCorner) {
              const newWidth =
                original.width * original.scaleX +
                (isLeft ? -offsetX : offsetX);
              const newHeight =
                original.height * original.scaleY +
                (isTop ? -offsetY : offsetY);

              if (config.proportional) {
                // For video objects, maintain aspect ratio properly
                const isVideoObject = activeObject.type === 'videoImage' || activeObject.type === 'CoverVideo';
                
                let scaleRatio;
                if (isVideoObject) {
                  // For video, use the dominant direction to maintain aspect ratio
                  const widthChange = Math.abs(offsetX);
                  const heightChange = Math.abs(offsetY);
                  
                  if (widthChange > heightChange) {
                    scaleRatio = Math.max(0.1, newWidth / original.width);
                  } else {
                    scaleRatio = Math.max(0.1, newHeight / original.height);
                  }
                } else {
                  scaleRatio = Math.max(
                    Math.max(0.1, newWidth / original.width),
                    Math.max(0.1, newHeight / original.height)
                  );
                }

                if (config.type === 'tr') {
                  const left = original.left;
                  const bottom =
                    original.top + original.height * original.scaleY;
                  activeObject.set({
                    scaleX: scaleRatio,
                    scaleY: scaleRatio,
                    left: left,
                    top: bottom - original.height * scaleRatio,
                  });
                } else if (config.type === 'tl') {
                  const right =
                    original.left + original.width * original.scaleX;
                  const bottom =
                    original.top + original.height * original.scaleY;
                  activeObject.set({
                    scaleX: scaleRatio,
                    scaleY: scaleRatio,
                    left: right - original.width * scaleRatio,
                    top: bottom - original.height * scaleRatio,
                  });
                } else if (config.type === 'bl') {
                  const right =
                    original.left + original.width * original.scaleX;
                  activeObject.set({
                    scaleX: scaleRatio,
                    scaleY: scaleRatio,
                    left: right - original.width * scaleRatio,
                    top: original.top,
                  });
                } else {
                  activeObject.set({
                    scaleX: scaleRatio,
                    scaleY: scaleRatio,
                    left: isLeft
                      ? original.left + original.width * (1 - scaleRatio)
                      : original.left,
                    top: isTop
                      ? original.top + original.height * (1 - scaleRatio)
                      : original.top,
                  });
                }
              }
            } else {
              if (config.type === 'ml' || config.type === 'mr') {
                const newWidth =
                  original.width * original.scaleX +
                  (config.type === 'ml' ? -offsetX : offsetX);
                const scaleX = Math.max(0.1, newWidth / original.width);

                if (config.type === 'ml') {
                  const right =
                    original.left + original.width * original.scaleX;
                  activeObject.set({
                    scaleX: scaleX,
                    left: right - original.width * scaleX,
                  });
                } else {
                  activeObject.set({
                    scaleX: scaleX,
                    left: original.left,
                  });
                }
              } else if (config.type === 'mt' || config.type === 'mb') {
                const newHeight =
                  original.height * original.scaleY +
                  (config.type === 'mt' ? -offsetY : offsetY);
                const scaleY = Math.max(0.1, newHeight / original.height);

                if (config.type === 'mt') {
                  const bottom =
                    original.top + original.height * original.scaleY;
                  activeObject.set({
                    scaleY: scaleY,
                    top: bottom - original.height * scaleY,
                  });
                } else {
                  activeObject.set({
                    scaleY: scaleY,
                    top: original.top,
                  });
                }
              }
            }

            activeObject.setCoords();
            canvas.renderAll();
            updateControlPointsPositions(activeObject);
          };

          const pointerUpHandler = function () {
            document.removeEventListener('pointermove', pointerMoveHandler);
            document.removeEventListener('pointerup', pointerUpHandler);

            activeControlPoint = null;
            isResizing = false;
            forceKeepSelection = false;
            store.setIsResizing(false);

            createCustomSelectionOutline();
          };

          document.addEventListener('pointermove', pointerMoveHandler, {
            passive: true,
          });
          document.addEventListener('pointerup', pointerUpHandler, {
            once: true,
          });
        });

        selectionLayer.appendChild(handleElement);
      });
    }

    // Setup MutationObserver to watch for panel visibility changes
    const observer = new MutationObserver(handlePanelVisibility);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      if (store.updateContainerPosition) {
        window.removeEventListener('resize', store.updateContainerPosition);
        window.removeEventListener('scroll', store.updateContainerPosition);
        window.removeEventListener(
          'orientationchange',
          store.updateContainerPosition
        );
        delete store.updateContainerPosition;
      }

      if (store.containerObserver) {
        store.containerObserver.disconnect();
        delete store.containerObserver;
      }

      if (store.selectionContainer && selectionLayer) {
        selectionLayer.parentNode.removeChild(selectionLayer);
        if (store.originalSelectionLayerParent) {
          store.originalSelectionLayerParent.appendChild(selectionLayer);
        }
        document.body.removeChild(store.selectionContainer);
      }

      observer.disconnect();

      delete store.selectionContainer;
      delete store.contentBoxEl;
      delete store.originalSelectionLayerParent;
      delete store.setControlsVisibility;
      delete store.guideline;

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('click', handleGlobalClick, true);

      store.cleanup();
    };
  }, [store]);
};
