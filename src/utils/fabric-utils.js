import { fabric } from 'fabric';

// Make sure all brush types are available
if (!fabric.PencilBrush) {
  console.warn('PencilBrush not available in Fabric.js');
}

if (!fabric.CircleBrush) {
  // Define CircleBrush if not available
  fabric.CircleBrush = fabric.util.createClass(fabric.BaseBrush, {
    width: 10,
    opacity: 1,

    initialize: function (canvas) {
      this.canvas = canvas;
      this.points = [];
    },

    drawDot: function (pointer) {
      const ctx = this.canvas.contextTop;
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, this.width / 2, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
    },

    onMouseDown: function (pointer) {
      this.points = [];
      this.canvas.clearContext(this.canvas.contextTop);
      this.drawDot(pointer);
    },

    onMouseMove: function (pointer) {
      this.drawDot(pointer);
      this.points.push(pointer);
    },

    onMouseUp: function () {
      const path = this.createPath();
      this.canvas.clearContext(this.canvas.contextTop);
      this.canvas.add(path);
      this.canvas.fire('path:created', { path: path });
      this.canvas.requestRenderAll();
    },

    createPath: function () {
      const path = new fabric.Path();
      path.fill = null;
      path.stroke = this.color;
      path.strokeWidth = this.width;
      path.strokeLineCap = 'round';
      path.strokeLineJoin = 'round';
      path.strokeDashArray = null;
      path.opacity = this.opacity;

      const points = this.points;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        path.path.push(['M', point.x, point.y]);
        path.path.push(['L', point.x, point.y]);
      }

      return path;
    },
  });
}

if (!fabric.SprayBrush) {
  // Define SprayBrush if not available
  fabric.SprayBrush = fabric.util.createClass(fabric.BaseBrush, {
    width: 10,
    density: 20,
    dotWidth: 1,
    dotWidthVariance: 1,
    randomOpacity: false,
    opacity: 1,

    initialize: function (canvas) {
      this.canvas = canvas;
      this.sprayChunks = [];
    },

    onMouseDown: function (pointer) {
      this.sprayChunks = [];
      this.canvas.clearContext(this.canvas.contextTop);
      this.addSprayChunk(pointer);
      this.render(this.sprayChunks[0]);
    },

    onMouseMove: function (pointer) {
      this.addSprayChunk(pointer);
      this.render(this.sprayChunks[this.sprayChunks.length - 1]);
    },

    onMouseUp: function () {
      const path = this.createPath();
      this.canvas.clearContext(this.canvas.contextTop);
      this.canvas.add(path);
      this.canvas.fire('path:created', { path: path });
      this.canvas.requestRenderAll();
    },

    addSprayChunk: function (pointer) {
      const chunk = [];
      const radius = this.width / 2;

      for (let i = 0; i < this.density; i++) {
        const offsetX = fabric.util.getRandomInt(-radius, radius);
        const offsetY = fabric.util.getRandomInt(-radius, radius);

        if (offsetX * offsetX + offsetY * offsetY > radius * radius) {
          continue;
        }

        const point = {
          x: pointer.x + offsetX,
          y: pointer.y + offsetY,
          width:
            this.dotWidth + fabric.util.getRandomInt(0, this.dotWidthVariance),
          opacity: this.randomOpacity
            ? fabric.util.getRandomInt(0, 100) / 100
            : 1,
        };

        chunk.push(point);
      }

      this.sprayChunks.push(chunk);
    },

    render: function (sprayChunk) {
      const ctx = this.canvas.contextTop;
      ctx.fillStyle = this.color;

      for (let i = 0; i < sprayChunk.length; i++) {
        const point = sprayChunk[i];
        ctx.globalAlpha = point.opacity * this.opacity;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
      }
    },

    createPath: function () {
      const path = new fabric.Path();
      path.fill = null;
      path.stroke = this.color;
      path.strokeWidth = this.width;
      path.strokeLineCap = 'round';
      path.strokeLineJoin = 'round';
      path.strokeDashArray = null;
      path.opacity = this.opacity;

      const sprayChunks = this.sprayChunks;
      for (let i = 0; i < sprayChunks.length; i++) {
        const chunk = sprayChunks[i];
        for (let j = 0; j < chunk.length; j++) {
          const point = chunk[j];
          path.path.push(['M', point.x, point.y]);
          path.path.push(['L', point.x, point.y]);
        }
      }

      return path;
    },
  });
}

export const CoverImage = fabric.util.createClass(fabric.Image, {
  type: 'coverImage',

  customFilter: 'none',
  disableCrop: false,
  cropWidth: 0,
  cropHeight: 0,

  initialize(element, options) {
    options = options || {};

    options = Object.assign(
      {
        cropHeight: this.height,
        cropWidth: this.width,
      },
      options
    );
    this.callSuper('initialize', element, options);
  },

  getCrop(image, size) {
    const width = size.width;
    const height = size.height;
    const aspectRatio = width / height;

    let newWidth;
    let newHeight;

    const imageRatio = image.width / image.height;

    if (aspectRatio >= imageRatio) {
      newWidth = image.width;
      newHeight = image.width / aspectRatio;
    } else {
      newWidth = image.height * aspectRatio;
      newHeight = image.height;
    }
    const x = (image.width - newWidth) / 2;
    const y = (image.height - newHeight) / 2;
    return {
      cropX: x,
      cropY: y,
      cropWidth: newWidth,
      cropHeight: newHeight,
    };
  },

  _render(ctx) {
    if (
      this.cropX !== undefined &&
      this.cropY !== undefined &&
      !this.disableCrop
    ) {
      const originalWidth = this.getOriginalSize().width;
      const originalHeight = this.getOriginalSize().height;

      ctx.save();
      const customFilter = this.customFilter;
      if (customFilter !== 'none') {
        ctx.filter = getFilterFromEffectType(customFilter);
      }

      ctx.drawImage(
        this._element,
        Math.max(this.cropX, 0),
        Math.max(this.cropY, 0),
        Math.max(1, this.width),
        Math.max(1, this.height),
        -this.width / 2,
        -this.height / 2,
        Math.max(0, this.width),
        Math.max(0, this.height)
      );

      if (customFilter !== 'none') {
        ctx.filter = 'none';
      }
      ctx.restore();
      return;
    }

    if (this.disableCrop) {
      this.callSuper('_render', ctx);
      return;
    }
    const width = this.width;
    const height = this.height;
    const crop = this.getCrop(this.getOriginalSize(), {
      width: this.getScaledWidth(),
      height: this.getScaledHeight(),
    });
    const { cropX, cropY, cropWidth, cropHeight } = crop;
    ctx.save();
    const customFilter = this.customFilter;
    ctx.filter = getFilterFromEffectType(customFilter);
    ctx.drawImage(
      this._element,
      Math.max(cropX, 0),
      Math.max(cropY, 0),
      Math.max(1, cropWidth),
      Math.max(1, cropHeight),
      -width / 2,
      -height / 2,
      Math.max(0, width),
      Math.max(0, height)
    );
    ctx.filter = 'none';
    ctx.restore();
  },
});

export const CoverVideo = fabric.util.createClass(fabric.Image, {
  type: 'coverVideo',
  customFilter: 'none',
  disableCrop: false,
  cropWidth: 0,
  cropHeight: 0,

  initialize(element, options) {
    options = options || {};

    options = Object.assign(
      {
        cropHeight: this.height,
        cropWidth: this.width,
      },
      options
    );
    this.callSuper('initialize', element, options);
  },

  getCrop(image, size) {
    const width = size.width;
    const height = size.height;
    const aspectRatio = width / height;
    let newWidth;
    let newHeight;

    const imageRatio = image.width / image.height;

    if (aspectRatio >= imageRatio) {
      newWidth = image.width;
      newHeight = image.width / aspectRatio;
    } else {
      newWidth = image.height * aspectRatio;
      newHeight = image.height;
    }
    const x = (image.width - newWidth) / 2;
    const y = (image.height - newHeight) / 2;
    return {
      cropX: x,
      cropY: y,
      cropWidth: newWidth,
      cropHeight: newHeight,
    };
  },

  _render(ctx) {
    if (this.disableCrop) {
      this.callSuper('_render', ctx);
      return;
    }
    const width = this.width;
    const height = this.height;
    const crop = this.getCrop(this.getOriginalSize(), {
      width: this.getScaledWidth(),
      height: this.getScaledHeight(),
    });
    const { cropX, cropY, cropWidth, cropHeight } = crop;

    const video = this._element;
    const videoScaledX = video.width / video.videoWidth;
    const videoScaledY = video.height / video.videoHeight;

    ctx.save();
    const customFilter = this.customFilter;
    ctx.filter = getFilterFromEffectType(customFilter);
    ctx.drawImage(
      this._element,
      Math.max(cropX, 0) / videoScaledX,
      Math.max(cropY, 0) / videoScaledY,
      Math.max(1, cropWidth) / videoScaledX,
      Math.max(1, cropHeight) / videoScaledY,
      -width / 2,
      -height / 2,
      Math.max(0, width),
      Math.max(0, height)
    );
    ctx.filter = 'none';
    ctx.restore();
  },
});

export function getFilterFromEffectType(effectType) {
  switch (effectType) {
    case 'glitch':
      // For glitch, use PIXI filter - but for CSS fallback use this
      return 'hue-rotate(90deg) contrast(150%) saturate(200%) brightness(120%) sepia(30%)';
    // PIXI filter types - return special marker for PIXI processing
    case 'pixi-glitch':
    case 'pixi-adjustment':
    case 'pixi-advancedBloom':
    case 'pixi-ascii':
    case 'pixi-backdropBlur':
    case 'pixi-bevel':
    case 'pixi-bloom':
    case 'pixi-bulgePinch':
    case 'pixi-colorGradient':
    case 'pixi-colorMap':
    case 'pixi-colorOverlay':
    case 'pixi-colorReplace':
    case 'pixi-convolution':
    case 'pixi-crossHatch':
    case 'pixi-crt':
    case 'pixi-dot':
    case 'pixi-dropShadow':
    case 'pixi-emboss':
    case 'pixi-glow':
    case 'pixi-godray':
    case 'pixi-grayscale':
    case 'pixi-hslAdjustment':
    case 'pixi-kawaseBlur':
    case 'pixi-motionBlur':
    case 'pixi-multiColorReplace':
    case 'pixi-oldFilm':
    case 'pixi-outline':
    case 'pixi-pixelate':
    case 'pixi-radialBlur':
    case 'pixi-reflection':
    case 'pixi-rgbSplit':
    case 'pixi-shockwave':
    case 'pixi-simplexNoise':
    case 'pixi-tiltShift':
    case 'pixi-twist':
    case 'pixi-zoomBlur':
    case 'pixi-alpha':
    case 'pixi-blur':
    case 'pixi-colorMatrix':
    case 'pixi-noise':
    // Simple PIXI filters (replacements for CSS filters)
    case 'blackAndWhite':
    case 'sepia':
    case 'invert':
    case 'saturate':
      return 'pixi-filter'; // Special marker that PIXI filter is active
    case 'none':
    case null:
    case undefined:
      return 'none'; // Explicitly handle none/null/undefined
    default:
      // Check if it's already a complex filter string (contains multiple filter functions)
      if (typeof effectType === 'string' && effectType.includes(' ')) {
        return effectType;
      }
      return 'none';
  }
}

fabric.CoverImage = CoverImage;
fabric.CoverVideo = CoverVideo;

/**
 * Captures the current rendered state of a fabric object as an image
 * This includes all applied transformations like scale, opacity, filters, etc.
 * @param {fabric.Object} fabricObject - The fabric object to capture
 * @param {number} [width] - Optional width for the output canvas
 * @param {number} [height] - Optional height for the output canvas
 * @returns {HTMLCanvasElement} Canvas containing the rendered object
 */
export function captureFabricObjectState(fabricObject, width, height, options) {
  if (!fabricObject || !fabricObject.canvas) {
    console.warn('captureFabricObjectState: Invalid fabric object or no canvas');
    return null;
  }

     try {
     // Create a temporary canvas to render just this object with alpha support
     const tempCanvas = document.createElement('canvas');
     tempCanvas.width = width || fabricObject.canvas.width;
     tempCanvas.height = height || fabricObject.canvas.height;
     
     // Get context with alpha enabled
     const tempCtx = tempCanvas.getContext('2d', { alpha: true });
     
     // Capturing fabric object with current transformations
     
     // Clear with fully transparent background (not just clearRect)
     tempCtx.globalCompositeOperation = 'source-over';
     tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
     
     // Fill with transparent pixels to ensure alpha channel is properly initialized
     tempCtx.fillStyle = 'rgba(0, 0, 0, 0)';
     tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Check if object has a valid element
    if (!fabricObject._element) {
      console.warn('Fabric object has no _element property');
      return null;
    }
    
    // Save context state
    tempCtx.save();
    
         try {
      // Move to desired draw origin: either provided target position or canvas center
      if (options && typeof options.translateToX === 'number' && typeof options.translateToY === 'number') {
        tempCtx.translate(options.translateToX, options.translateToY);
      } else {
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      }
       
       // Apply object transformations manually
       tempCtx.scale(fabricObject.scaleX || 1, fabricObject.scaleY || 1);
       tempCtx.rotate((fabricObject.angle || 0) * Math.PI / 180);
       
       // Get current opacity
       const currentOpacity = fabricObject.opacity !== undefined ? fabricObject.opacity : 1;
       
       // Debug only significant opacity changes for GL transitions
       if (currentOpacity < 0.95) {
       }
       
       // Apply opacity
       tempCtx.globalAlpha = currentOpacity;
       
       // Check if this is an image object and render it
       if ((fabricObject.type === 'image' || fabricObject.type === 'coverImage') && fabricObject._element) {
         const element = fabricObject._element;
         const w = fabricObject.width || element.width;
         const h = fabricObject.height || element.height;
         
         if (w > 0 && h > 0) {
           // Draw the image with current transformations and opacity
           tempCtx.drawImage(element, -w/2, -h/2, w, h);
           
           // Debug only significant opacity changes
           if (currentOpacity < 0.95) {
           }
         } else {
           console.warn('Invalid image dimensions:', { w, h });
           return null;
         }
       } else {
         console.warn('Unsupported fabric object type for capture:', fabricObject.type);
         return null;
       }
     } catch (drawError) {
       console.error('Error drawing to temp canvas:', drawError);
       return null;
     }
    
    // Restore context state
    tempCtx.restore();
    
    // Validate that we actually drew something
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const hasContent = imageData.data.some((value, index) => index % 4 === 3 && value > 0); // Check alpha channel
    
    if (!hasContent) {
      console.warn('Captured canvas appears to be empty');
      return null;
    }
    
    // Successfully captured fabric object with transformations
    return tempCanvas;
    
  } catch (error) {
    console.error('Error capturing fabric object state:', error);
    return null;
  }
}

/**
 * Fallback method: Capture object by cropping from main canvas
 */
function captureFabricObjectFromMainCanvas(fabricObject, originalCanvas, width, height) {
  try {
    // Get object bounds in canvas coordinates
    const bounds = fabricObject.getBoundingRect();
    
    // Create temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width || bounds.width;
    tempCanvas.height = height || bounds.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Clear with transparent background
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Get the main canvas as image data in the object's bounds
    const imageData = originalCanvas.getContext('2d').getImageData(
      bounds.left, 
      bounds.top, 
      bounds.width, 
      bounds.height
    );
    
    // Create temporary canvas for the cropped area
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bounds.width;
    cropCanvas.height = bounds.height;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.putImageData(imageData, 0, 0);
    
    // Scale and draw to final canvas
    const scaleX = tempCanvas.width / bounds.width;
    const scaleY = tempCanvas.height / bounds.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const x = (tempCanvas.width - scaledWidth) / 2;
    const y = (tempCanvas.height - scaledHeight) / 2;
    
    tempCtx.drawImage(cropCanvas, x, y, scaledWidth, scaledHeight);
    
    return tempCanvas;
  } catch (error) {
    console.error('Fallback capture method failed:', error);
    return null;
  }
}

/**
 * Captures fabric object state and returns as data URL
 * @param {fabric.Object} fabricObject - The fabric object to capture
 * @param {string} [format='image/png'] - Output format
 * @param {number} [quality=1] - Image quality (0-1)
 * @param {number} [width] - Optional width for the output
 * @param {number} [height] - Optional height for the output
 * @returns {string|null} Data URL of the captured object
 */
export function captureFabricObjectAsDataURL(fabricObject, format = 'image/png', quality = 1, width, height) {
  const canvas = captureFabricObjectState(fabricObject, width, height);
  if (!canvas) {
    return null;
  }
  
  try {
    return canvas.toDataURL(format, quality);
  } catch (error) {
    console.error('Error converting fabric object to data URL:', error);
    return null;
  }
}

export class FabricUitls {
  static getClipMaskRect(editorElement, extraOffset) {
    const extraOffsetX = extraOffset / editorElement.placement.scaleX;
    const extraOffsetY = extraOffsetX / editorElement.placement.scaleY;
    const clipRectangle = new fabric.Rect({
      left: editorElement.placement.x - extraOffsetX,
      top: editorElement.placement.y - extraOffsetY,
      width: editorElement.placement.width + extraOffsetX * 2,
      height: editorElement.placement.height + extraOffsetY * 2,
      scaleX: editorElement.placement.scaleX,
      scaleY: editorElement.placement.scaleY,
      absolutePositioned: true,
      fill: 'transparent',
      stroke: 'transparent',
      opacity: 0.5,
      strokeWidth: 0,
    });
    return clipRectangle;
  }
}
