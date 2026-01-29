import React, { useState, useContext, useEffect, useRef } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { fabric } from 'fabric';
import styles from './DrawingPanel.module.scss';

export const DrawingPanel = observer(({ onClose }) => {
  const store = useContext(StoreContext);
  const [isDrawingMode, setIsDrawingMode] = useState(true); // Set to true by default
  const [brushType, setBrushType] = useState('PencilBrush'); // PencilBrush only
  const [brushColor, setBrushColor] = useState('#FFFFFF'); // Default white color
  const [brushWidth, setBrushWidth] = useState(30);
  const [opacity, setOpacity] = useState(1);
  const panelRef = useRef(null);

  // Available colors for quick selection
  const colors = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
    '#000000', // Black
  ];

  // Add click outside handler to close panel
  useEffect(() => {
    const handleClickOutside = event => {
      // Перевіряємо, чи клік був на канвасі або на елементі, що містить канвас
      const canvasContainer = document.getElementById('grid-canvas-container');
      const canvas = document.getElementById('canvas');

      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        !event.target.closest('.timeline-item') &&
        event.target !== canvas &&
        !canvas?.contains(event.target) &&
        event.target !== canvasContainer &&
        !canvasContainer?.contains(event.target)
      ) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Enable drawing mode when panel opens, disable when it closes
  useEffect(() => {
    if (!store.canvas) return;

    // Enable drawing mode by default when panel opens
    store.canvas.isDrawingMode = isDrawingMode;

    // Update brush settings when they change
    if (isDrawingMode) {
      updateBrushSettings();
    }

    // Make drawn paths non-selectable
    const makePathsNonSelectable = () => {
      if (store.canvas) {
        const paths = store.canvas
          .getObjects()
          .filter(obj => obj.type === 'path');
        paths.forEach(path => {
          path.selectable = false;
          path.evented = false;
        });
        store.canvas.renderAll();
      }
    };

    makePathsNonSelectable();

    // Cleanup function to disable drawing mode when panel closes
    return () => {
      if (store.canvas) {
        store.canvas.isDrawingMode = false;
        makePathsNonSelectable();

        // Використовуємо метод disableDrawingMode для гарантованого вимкнення режиму малювання
        if (store.disableDrawingMode) {
          store.disableDrawingMode();
        }
      }
    };
  }, [brushType, brushColor, brushWidth, opacity, isDrawingMode, store.canvas]);

  // Listen for path:created event to make new paths non-selectable
  useEffect(() => {
    if (!store.canvas) return;

    const handlePathCreated = e => {
      if (e.path) {
        e.path.selectable = false;
        e.path.evented = false;
      }
    };

    store.canvas.on('path:created', handlePathCreated);

    return () => {
      store.canvas.off('path:created', handlePathCreated);
    };
  }, [store.canvas]);

  const toggleDrawingMode = () => {
    if (!store.canvas) return;

    const newMode = !isDrawingMode;
    setIsDrawingMode(newMode);

    store.canvas.isDrawingMode = newMode;

    if (newMode) {
      updateBrushSettings();
    }
  };

  const updateBrushSettings = () => {
    if (!store.canvas) return;

    // Set canvas to drawing mode
    store.canvas.isDrawingMode = true;

    // Use method to update brush settings
    if (store.updateBrushSettings) {
      store.updateBrushSettings({
        color: brushColor,
        width: brushWidth,
        type: brushType,
        opacity: opacity,
      });
    }

    // Force rendering to update settings
    store.canvas.renderAll();
  };

  const handleBrushTypeChange = type => {
    setBrushType(type);
  };

  const handleColorChange = color => {
    setBrushColor(color);
  };

  const handleWidthChange = e => {
    setBrushWidth(parseInt(e.target.value, 10));
  };

  const handleOpacityChange = e => {
    setOpacity(parseFloat(e.target.value));
  };

  const clearCanvas = () => {
    if (!store.canvas) return;

    // Use the store method to clear drawn paths
    store.clearDrawnPaths();
  };

  // Function to export drawing as a mask (white lines on black background)
  const exportAsMask = () => {
    if (!store.canvas) return;

    // Create a copy of the canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    // Set export canvas dimensions
    exportCanvas.width = store.canvas.width;
    exportCanvas.height = store.canvas.height;

    // Fill background with black color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Find all lines on the canvas
    const lineObjects = store.canvas
      .getObjects()
      .filter(obj => obj.type === 'line' || obj.type === 'path');

    // Draw all lines with white color and increased thickness for better visibility
    lineObjects.forEach(line => {
      // Save current context state
      ctx.save();

      // Set drawing parameters
      ctx.strokeStyle = '#FFFFFF'; // White color for all lines
      ctx.lineWidth = line.strokeWidth * 1.5; // Increase thickness for better visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.type === 'path' && line.path) {
        // Draw path
        ctx.beginPath();

        for (let i = 0; i < line.path.length; i++) {
          const point = line.path[i];
          const command = point[0];
          const x = point[1];
          const y = point[2];

          if (command === 'M') {
            ctx.moveTo(x, y);
          } else if (command === 'L') {
            ctx.lineTo(x, y);
          } else if (command === 'Q') {
            const x2 = point[3];
            const y2 = point[4];
            ctx.quadraticCurveTo(x, y, x2, y2);
          } else if (command === 'C') {
            const x2 = point[3];
            const y2 = point[4];
            const x3 = point[5];
            const y3 = point[6];
            ctx.bezierCurveTo(x, y, x2, y2, x3, y3);
          }
        }

        ctx.stroke();
      } else if (line.type === 'line') {
        // Get line coordinates considering canvas scaling and offset
        const x1 = line.x1;
        const y1 = line.y1;
        const x2 = line.x2;
        const y2 = line.y2;

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Restore context state
      ctx.restore();
    });

    // Add blur for edge smoothing (optional)
    try {
      ctx.filter = 'blur(1px)';
      ctx.drawImage(exportCanvas, 0, 0);
      ctx.filter = 'none';
    } catch (e) {
}

    // Create URL for download
    const dataURL = exportCanvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download =
      'mask_' + new Date().toISOString().replace(/:/g, '-') + '.png';

    // Add link to document, click it and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export drawing as an inverted mask (black lines on white background)
  const exportAsInvertedMask = () => {
    if (!store.canvas) return;

    // Create a copy of the canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    // Set export canvas dimensions
    exportCanvas.width = store.canvas.width;
    exportCanvas.height = store.canvas.height;

    // Fill background with white color
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Find all lines on the canvas
    const lineObjects = store.canvas
      .getObjects()
      .filter(obj => obj.type === 'line' || obj.type === 'path');

    // Draw all lines with black color
    lineObjects.forEach(line => {
      // Save current context state
      ctx.save();

      // Set drawing parameters
      ctx.strokeStyle = '#000000'; // Black color for all lines
      ctx.lineWidth = line.strokeWidth * 1.5; // Increase thickness for better visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.type === 'path' && line.path) {
        // Draw path
        ctx.beginPath();

        for (let i = 0; i < line.path.length; i++) {
          const point = line.path[i];
          const command = point[0];
          const x = point[1];
          const y = point[2];

          if (command === 'M') {
            ctx.moveTo(x, y);
          } else if (command === 'L') {
            ctx.lineTo(x, y);
          } else if (command === 'Q') {
            const x2 = point[3];
            const y2 = point[4];
            ctx.quadraticCurveTo(x, y, x2, y2);
          } else if (command === 'C') {
            const x2 = point[3];
            const y2 = point[4];
            const x3 = point[5];
            const y3 = point[6];
            ctx.bezierCurveTo(x, y, x2, y2, x3, y3);
          }
        }

        ctx.stroke();
      } else if (line.type === 'line') {
        // Get line coordinates
        const x1 = line.x1;
        const y1 = line.y1;
        const x2 = line.x2;
        const y2 = line.y2;

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Restore context state
      ctx.restore();
    });

    // Add blur for edge smoothing (optional)
    try {
      ctx.filter = 'blur(1px)';
      ctx.drawImage(exportCanvas, 0, 0);
      ctx.filter = 'none';
    } catch (e) {
}

    // Create URL for download
    const dataURL = exportCanvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download =
      'inverted_mask_' + new Date().toISOString().replace(/:/g, '-') + '.png';

    // Add link to document, click it and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export drawing as a transparent mask
  const exportAsTransparentMask = () => {
    if (!store.canvas) return;

    // Create a copy of the canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    // Set export canvas dimensions
    exportCanvas.width = store.canvas.width;
    exportCanvas.height = store.canvas.height;

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Find all lines on the canvas
    const lineObjects = store.canvas
      .getObjects()
      .filter(obj => obj.type === 'line' || obj.type === 'path');

    // Draw all lines with white color
    lineObjects.forEach(line => {
      // Save current context state
      ctx.save();

      // Set drawing parameters
      ctx.strokeStyle = '#FFFFFF'; // White color for all lines
      ctx.lineWidth = line.strokeWidth * 1.5; // Increase thickness for better visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.type === 'path' && line.path) {
        // Draw path
        ctx.beginPath();

        for (let i = 0; i < line.path.length; i++) {
          const point = line.path[i];
          const command = point[0];
          const x = point[1];
          const y = point[2];

          if (command === 'M') {
            ctx.moveTo(x, y);
          } else if (command === 'L') {
            ctx.lineTo(x, y);
          } else if (command === 'Q') {
            const x2 = point[3];
            const y2 = point[4];
            ctx.quadraticCurveTo(x, y, x2, y2);
          } else if (command === 'C') {
            const x2 = point[3];
            const y2 = point[4];
            const x3 = point[5];
            const y3 = point[6];
            ctx.bezierCurveTo(x, y, x2, y2, x3, y3);
          }
        }

        ctx.stroke();
      } else if (line.type === 'line') {
        // Get line coordinates
        const x1 = line.x1;
        const y1 = line.y1;
        const x2 = line.x2;
        const y2 = line.y2;

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Restore context state
      ctx.restore();
    });

    // Create URL for download (PNG with transparency)
    const dataURL = exportCanvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download =
      'transparent_mask_' +
      new Date().toISOString().replace(/:/g, '-') +
      '.png';

    // Add link to document, click it and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Функція для закриття панелі
  const handleClose = () => {
    // Вимикаємо режим малювання перед закриттям
    if (store.canvas) {
      store.canvas.isDrawingMode = false;

      if (store.disableDrawingMode) {
        store.disableDrawingMode();
      }
    }

    // Викликаємо функцію закриття, передану через props
    onClose?.();
  };

  return (
    <div className={styles.drawingPanel} ref={panelRef}>
      <div className={styles.panelHeader}>
        <h3>Drawing Tools</h3>
        {onClose && (
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.drawingControls}>
        <div className={styles.controlGroup}>
          <label>Color:</label>
          <div className={styles.colorPicker}>
            <input
              type="color"
              value={brushColor}
              onChange={e => handleColorChange(e.target.value)}
            />
            {/* <div className={styles.colorPresets}>
              {colors.map(color => (
                <div
                  key={color}
                  className={`${styles.colorSwatch} ${
                    brushColor === color ? styles.active : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div> */}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label>Thickness: {brushWidth}px</label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushWidth}
            onChange={handleWidthChange}
          />
        </div>

        <div className={styles.controlGroup}>
          <label>Opacity: {Math.round(opacity * 100)}%</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={handleOpacityChange}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button className={styles.clearButton} onClick={clearCanvas}>
            Clear Drawing
          </button>

          <button className={styles.exportButton} onClick={exportAsMask}>
            Export as Mask
          </button>

          <button
            className={styles.exportButton}
            onClick={exportAsInvertedMask}
          >
            Export as Inverted Mask
          </button>

          <button
            className={styles.exportButton}
            onClick={exportAsTransparentMask}
          >
            Export as Transparent Mask
          </button>
        </div>
      </div>
    </div>
  );
});
