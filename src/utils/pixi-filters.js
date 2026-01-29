import { fabric } from 'fabric';
import {
  AdjustmentFilter,
  AdvancedBloomFilter,
  AsciiFilter,
  BackdropBlurFilter,
  BevelFilter,
  BloomFilter,
  BulgePinchFilter,
  ColorGradientFilter,
  ColorMapFilter,
  ColorOverlayFilter,
  ColorReplaceFilter,
  ConvolutionFilter,
  CrossHatchFilter,
  CRTFilter,
  DotFilter,
  DropShadowFilter,
  EmbossFilter,
  GlitchFilter,
  GlowFilter,
  GodrayFilter,
  GrayscaleFilter,
  HslAdjustmentFilter,
  KawaseBlurFilter,
  MotionBlurFilter,
  MultiColorReplaceFilter,
  OldFilmFilter,
  OutlineFilter,
  PixelateFilter,
  RadialBlurFilter,
  ReflectionFilter,
  RGBSplitFilter,
  ShockwaveFilter,
  SimpleLightmapFilter,
  SimplexNoiseFilter,
  TiltShiftAxisFilter,
  TiltShiftFilter,
  TwistFilter,
  ZoomBlurFilter,
} from 'pixi-filters';
import * as PIXI from 'pixi.js';
import { AlphaFilter, BlurFilter, ColorMatrixFilter, DisplacementFilter } from 'pixi.js';

/**
 * PIXI Filter utilities for applying advanced filters to canvas elements
 */

/**
 * Log all available PIXI filters and their properties for development
 */
export const logAllPixiFilters = () => {
  // Import the JSON file content for logging
  import('../data/pixiFilters.json')
    .then(pixiFiltersData => {
      // console.log(JSON.stringify(pixiFiltersData.default || pixiFiltersData, null, 2));
    })
    .catch(() => {
      // Fallback: create filters and log their properties
      const filters = {
        AdjustmentFilter,
        AdvancedBloomFilter,
        AsciiFilter,
        BackdropBlurFilter,
        BevelFilter,
        BloomFilter,
        BulgePinchFilter,
        ColorGradientFilter,
        ColorMapFilter,
        ColorOverlayFilter,
        ColorReplaceFilter,
        ConvolutionFilter,
        CrossHatchFilter,
        CRTFilter,
        DotFilter,
        DropShadowFilter,
        EmbossFilter,
        GlitchFilter,
        GlowFilter,
        GodrayFilter,
        GrayscaleFilter,
        HslAdjustmentFilter,
        KawaseBlurFilter,
        MotionBlurFilter,
        MultiColorReplaceFilter,
        OldFilmFilter,
        OutlineFilter,
        PixelateFilter,
        RadialBlurFilter,
        ReflectionFilter,
        RGBSplitFilter,
        ShockwaveFilter,
        SimpleLightmapFilter,
        SimplexNoiseFilter,
        TiltShiftAxisFilter,
        TiltShiftFilter,
        TwistFilter,
        ZoomBlurFilter,
      };

      const filtersJson = {};
      Object.entries(filters).forEach(([name, FilterClass]) => {
        try {
          const filter = new FilterClass();
          const properties = {};
          for (const key in filter) {
            if (
              typeof filter[key] !== 'function' &&
              key !== 'texture' &&
              key !== 'uniforms' &&
              key !== 'program' &&
              key !== 'state' &&
              !key.startsWith('_')
            ) {
              properties[key] = filter[key];
            }
          }

          filtersJson[name.replace('Filter', '').toLowerCase() + 'Filter'] = {
            name: name
              .replace('Filter', '')
              .replace(/([A-Z])/g, ' $1')
              .trim(),
            type: 'pixi-' + name.replace('Filter', '').toLowerCase(),
            properties: properties,
          };

          if (filter.destroy) filter.destroy();
        } catch (error) {
          console.error(`Failed to create ${name}:`, error.message);
        }
      });

      // console.log(JSON.stringify(filtersJson, null, 2));
    });
};

// Create PIXI application for filter processing
let pixiApp = null;
let filterContainer = null;

const initializePIXI = async () => {
  if (pixiApp) {
    // Verify the app is still valid
    if (pixiApp.stage && pixiApp.renderer) {
      return pixiApp;
    } else {
      // Reset if corrupted
      pixiApp = null;
      filterContainer = null;
    }
  }

  try {
    // Create PIXI application for v8
    pixiApp = new PIXI.Application();

    // Initialize with proper configuration for v8
    await pixiApp.init({
      width: 1080,
      height: 1920,
      backgroundAlpha: 0, // transparent background
      antialias: true,
      preserveDrawingBuffer: true,
    });

    // Verify initialization was successful
    if (!pixiApp.stage || !pixiApp.renderer) {
      throw new Error('PIXI application failed to initialize properly');
    }

    // Create container for filtered elements
    filterContainer = new PIXI.Container();
    pixiApp.stage.addChild(filterContainer);

    return pixiApp;
  } catch (error) {
    console.error('Failed to initialize PIXI application:', error);
    pixiApp = null;
    filterContainer = null;
    return null;
  }
};

/**
 * Apply PIXI GlitchFilter to a fabric object
 */
export const applyGlitchFilter = async (fabricObject, options = {}) => {
  try {
    const app = await initializePIXI();
    if (!app) throw new Error('PIXI application not available');

    // Default glitch options
    const glitchOptions = {
      slices: options.slices || 5,
      offset: options.offset || 100,
      direction: options.direction || 0,
      fillMode: options.fillMode || 'transparent', // Changed from PIXI.FILL_MODES.TRANSPARENT
      seed: options.seed || Math.random() * 100,
      average: options.average || false,
      minSize: options.minSize || 8,
      sampleSize: options.sampleSize || 512,
      red: options.red || { x: 0, y: 0 },
      green: options.green || { x: 0, y: 0 },
      blue: options.blue || { x: 0, y: 0 },
    };

    // Create PIXI GlitchFilter
    const glitchFilter = new GlitchFilter(glitchOptions);

    // Store reference to filter for later manipulation
    fabricObject._pixiGlitchFilter = glitchFilter;
    fabricObject._glitchOptions = glitchOptions;
    fabricObject._pixiFilterType = 'glitch';

    // Store original render method before replacing
    if (!fabricObject._originalRender) {
      fabricObject._originalRender = fabricObject._render;
    }

    // Apply filter by rendering with PIXI and converting back to canvas
    await applyPixiFilterToFabricObject(fabricObject, glitchFilter, 'glitch');
  } catch (error) {
    if (error.message === 'CORS_ERROR' || error.message === 'PIXI_RENDER_ERROR') {
      console.warn(`PIXI GlitchFilter failed (${error.message}), falling back to CSS filter`);
    } else {
      console.error('Error applying PIXI GlitchFilter:', error);
    }
    // Fallback to CSS filter
    const glitchFilters = [
      'hue-rotate(90deg)',
      'contrast(150%)',
      'saturate(200%)',
      'brightness(120%)',
      'sepia(30%)',
    ].join(' ');

    fabricObject.set('customFilter', glitchFilters);
  }
};

/**
 * Apply other PIXI filters
 */
export const applyPixiFilter = async (
  fabricObject,
  filterType,
  options = {}
) => {
  try {
    const app = await initializePIXI();
    if (!app) throw new Error('PIXI application not available');

    let filter = null;

    switch (filterType) {
      case 'adjustment':
        filter = new AdjustmentFilter({
          gamma: options.gamma || 1.2,
          saturation: options.saturation || 1.5,
          contrast: options.contrast || 1.3,
          brightness: options.brightness || 1.1,
          red: options.red || 1,
          green: options.green || 1,
          blue: options.blue || 1,
          alpha: options.alpha || 1,
          ...options,
        });
        break;
      case 'advancedBloom':
        filter = new AdvancedBloomFilter({
          threshold: options.threshold || 0.3,
          bloomScale: options.bloomScale || 2.0,
          brightness: options.brightness || 1.5,
          blur: options.blur || 8,
          quality: options.quality || 4,
          ...options,
        });
        break;
      case 'ascii':
        filter = new AsciiFilter(options.size || 8);
        break;
      case 'backdropBlur':
        filter = new BackdropBlurFilter({
          strength: options.strength || 8,
          quality: options.quality || 4,
          kernelSize: options.kernelSize || 5,
          ...options,
        });
        break;
      case 'bevel':
        filter = new BevelFilter({
          rotation: options.rotation || 45,
          thickness: options.thickness || 2,
          lightColor: options.lightColor || 0xffffff,
          lightAlpha: options.lightAlpha || 0.7,
          shadowColor: options.shadowColor || 0x000000,
          shadowAlpha: options.shadowAlpha || 0.7,
          ...options,
        });
        break;
      case 'bloom':
        filter = new BloomFilter({
          blur: options.blur || 8,
          quality: options.quality || 4,
          threshold: options.threshold || 0.3,
          ...options,
        });
        break;
      case 'bulgePinch':
        filter = new BulgePinchFilter({
          center: options.center || [0.5, 0.5],
          radius: options.radius || 100,
          strength: options.strength || 1,
          ...options,
        });
        break;
      case 'colorGradient':
        filter = new ColorGradientFilter({
          type: options.type || 0,
          stops: options.stops || [
            { offset: 0, color: [1, 0, 0, 1] },
            { offset: 1, color: [0, 1, 0, 1] },
          ],
          ...options,
        });
        break;
      case 'colorMap':
        // ColorMapFilter requires a colorMap texture
        if (!options.colorMap) {
          console.warn(
            'ColorMapFilter requires a colorMap texture. Skipping filter.'
          );
          return null;
        }
        filter = new ColorMapFilter({
          colorMap: options.colorMap,
          nearest: options.nearest || false,
          mix: options.mix || 1,
          ...options,
        });
        break;
      case 'colorOverlay':
        filter = new ColorOverlayFilter(
          options.color || 0xff0080,
          options.alpha || 0.3
        );
        break;
      case 'colorReplace':
        filter = new ColorReplaceFilter({
          originalColor: options.originalColor || 0xff0000,
          newColor: options.newColor || 0x00ff00,
          epsilon: options.epsilon || 0.4,
          ...options,
        });
        break;
      case 'convolution':
        filter = new ConvolutionFilter({
          matrix: options.matrix || [0, -1, 0, -1, 5, -1, 0, -1, 0],
          width: options.width || 200,
          height: options.height || 200,
          ...options,
        });
        break;
      case 'crossHatch':
        filter = new CrossHatchFilter();
        break;
      case 'crt':
        filter = new CRTFilter({
          curvature: options.curvature || 1.0,
          lineWidth: options.lineWidth || 1.0,
          lineContrast: options.lineContrast || 0.25,
          ...options,
        });
        break;
      case 'dot':
        filter = new DotFilter(options.scale || 1, options.angle || 5);
        break;
      case 'dropShadow':
        filter = new DropShadowFilter({
          rotation: options.rotation || 45,
          distance: options.distance || 5,
          color: options.color || 0x000000,
          alpha: options.alpha || 0.5,
          shadowOnly: options.shadowOnly || false,
          blur: options.blur || 2,
          quality: options.quality || 3,
          ...options,
        });
        break;
      case 'emboss':
        filter = new EmbossFilter(options.strength || 5);
        break;
      case 'glitch':
        filter = new GlitchFilter({
          slices: options.slices || 5,
          offset: options.offset || 100,
          direction: options.direction || 0,
          fillMode: options.fillMode || 0,
          seed: options.seed || 0,
          average: options.average || false,
          minSize: options.minSize || 8,
          sampleSize: options.sampleSize || 512,
          red: options.red || { x: 0, y: 0 },
          green: options.green || { x: 0, y: 0 },
          blue: options.blue || { x: 0, y: 0 },
          ...options,
        });
        break;
      case 'glow':
        filter = new GlowFilter({
          distance: options.distance || 10,
          outerStrength: options.outerStrength || 4,
          innerStrength: options.innerStrength || 0,
          color: options.color || 0xffffff,
          quality: options.quality || 0.1,
          ...options,
        });
        break;
      case 'godray':
        filter = new GodrayFilter({
          angle: options.angle || 30,
          gain: options.gain || 0.5,
          lacunarity: options.lacunarity || 2.5,
          parallel: options.parallel || true,
          time: options.time || 1000,
          ...options,
        });
        break;
      case 'grayscale':
        filter = new GrayscaleFilter();
        break;
      case 'hslAdjustment':
        filter = new HslAdjustmentFilter({
          hue: options.hue || 0,
          saturation: options.saturation || 0,
          lightness: options.lightness || 0,
          colorize: options.colorize || false,
          alpha: options.alpha || 1,
          ...options,
        });
        break;
      case 'kawaseBlur':
        filter = new KawaseBlurFilter({
          blur: options.blur || 4,
          quality: options.quality || 3,
          clamp: options.clamp || false,
          ...options,
        });
        break;
      case 'motionBlur':
        filter = new MotionBlurFilter({
          velocity: options.velocity || [0, 0],
          kernelSize: options.kernelSize || 5,
          offset: options.offset || 0,
          ...options,
        });
        break;
      case 'multiColorReplace':
        filter = new MultiColorReplaceFilter({
          replacements: options.replacements || [
            [0xff0000, 0x00ff00, 0.05],
            [0x0000ff, 0xffff00, 0.05],
          ],
          epsilon: options.epsilon || 0.05,
          maxColors: options.maxColors || 0,
          ...options,
        });
        break;
      case 'oldFilm':
        filter = new OldFilmFilter({
          sepia: options.sepia || 0.3,
          noise: options.noise || 0.3,
          noiseSize: options.noiseSize || 1.0,
          scratch: options.scratch || 0.5,
          scratchDensity: options.scratchDensity || 0.3,
          ...options,
        });
        break;
      case 'outline':
        filter = new OutlineFilter({
          thickness: options.thickness || 1,
          color: options.color || 0x000000,
          quality: options.quality || 0.1,
          alpha: options.alpha || 1.0,
          knockout: options.knockout || false,
          ...options,
        });
        break;
      case 'pixelate':
        const pixelateSize = options.size || { x: 10, y: 10 };
        // PixelateFilter expects either a number or [x, y] array
        const sizeParam =
          typeof pixelateSize === 'object' && pixelateSize.x !== undefined
            ? [pixelateSize.x, pixelateSize.y]
            : pixelateSize;
        filter = new PixelateFilter(sizeParam);
        break;
      case 'radialBlur':
        filter = new RadialBlurFilter({
          angle: options.angle || 0,
          center: options.center || [0, 0],
          kernelSize: options.kernelSize || 5,
          radius: options.radius || -1,
          ...options,
        });
        break;
      case 'reflection':
        filter = new ReflectionFilter({
          mirror: options.mirror || true,
          boundary: options.boundary || 0.5,
          amplitude: options.amplitude || [0, 20],
          waveLength: options.waveLength || [30, 100],
          alpha: options.alpha || [1, 1],
          time: options.time || 1000,
          ...options,
        });
        break;
      case 'rgbSplit':
        filter = new RGBSplitFilter(
          options.red || [-10, 0],
          options.green || [0, 10],
          options.blue || [0, 0]
        );
        break;
      case 'shockwave':
        filter = new ShockwaveFilter({
          center: options.center || [0.5, 0.5],
          params: options.params || [10, 0.8, 0.1],
          time: options.time || 1000,
          ...options,
        });
        break;
      case 'simpleLightmap':
        // SimpleLightmapFilter requires a lightMap texture
        if (!options.lightMap) {
          console.warn(
            'SimpleLightmapFilter requires a lightMap texture. Skipping filter.'
          );
          return null;
        }
        filter = new SimpleLightmapFilter({
          lightMap: options.lightMap,
          color: options.color || [1, 1, 1],
          alpha: options.alpha || 1,
          ...options,
        });
        break;
      case 'simplexNoise':
        filter = new SimplexNoiseFilter({
          scale: options.scale || 1,
          alpha: options.alpha || 1,
          ...options,
        });
        break;
      case 'tiltShiftAxis':
        filter = new TiltShiftAxisFilter({
          blur: options.blur || 100,
          gradientBlur: options.gradientBlur || 600,
          start: options.start || { x: 0, y: 0 },
          end: options.end || { x: 600, y: 0 },
          ...options,
        });
        break;
      case 'tiltShift':
        filter = new TiltShiftFilter({
          blur: options.blur || 100,
          gradientBlur: options.gradientBlur || 600,
          start: options.start || [0, 200],
          end: options.end || [600, 200],
          ...options,
        });
        break;
      case 'twist':
        filter = new TwistFilter({
          radius: options.radius || 0.5,
          angle: options.angle || 5,
          padding: options.padding || 20,
          offset: options.offset || { x: 0, y: 0 },
          ...options,
        });
        break;
      case 'zoomBlur':
        try {
          filter = new ZoomBlurFilter({
            strength: options.strength || 0.1,
            center: options.center || [0.5, 0.5],
            innerRadius: options.innerRadius || 0,
            radius: options.radius || 100,
            ...options,
          });
        } catch (error) {
          console.warn('ZoomBlurFilter failed to initialize:', error);
          return null;
        }
        break;

      // Simple PIXI filters (replacements for CSS filters)
      case 'blackAndWhite':
        filter = new ColorMatrixFilter();
        filter.desaturate();
        break;
      case 'sepia':
        filter = new ColorMatrixFilter();
        filter.sepia(true);
        break;
      case 'invert':
        filter = new ColorMatrixFilter();
        filter.negative(true);
        break;
      case 'saturate':
        filter = new ColorMatrixFilter();
        filter.saturate(options.saturation || 2, true);
        break;

      // Built-in PIXI filters
      case 'alpha':
        filter = new AlphaFilter(options.alpha || 0.5);
        break;
      case 'blur':
        filter = new BlurFilter(
          options.strength || 8,
          options.quality || 4,
          options.kernelSize || 5
        );
        break;
      case 'colorMatrix':
        filter = new ColorMatrixFilter();
        if (options.mode === 'contrast')
          filter.contrast(options.amount || 2, true);
        else if (options.mode === 'desaturate') filter.desaturate();
        else if (options.mode === 'kodachrome') filter.kodachrome(true);
        else if (options.mode === 'lsd') filter.lsd(true);
        else if (options.mode === 'negative') filter.negative(true);
        else if (options.mode === 'polaroid') filter.polaroid(true);
        else if (options.mode === 'predator')
          filter.predator(options.amount || 1, true);
        else if (options.mode === 'saturate')
          filter.saturate(options.amount || 2, true);
        else if (options.mode === 'sepia') filter.sepia(true);
        break;
      case 'displacement':
        filter = new DisplacementFilter(
          options.sprite,
          options.scale || 20
        );
        break;

      default:
        throw new Error(`Unknown filter type: ${filterType}`);
    }

    if (!filter) {
      throw new Error(`Failed to create ${filterType} filter`);
    }

    // Store filter reference
    fabricObject._pixiFilter = filter;
    fabricObject._pixiFilterType = filterType;
    fabricObject._pixiFilterOptions = options;

    // Apply filter by rendering with PIXI and converting back to canvas
    await applyPixiFilterToFabricObject(fabricObject, filter, filterType);

    // Log filter properties for debugging
    if (filter) {
      const filterProps = {};
      for (const key in filter) {
        if (
          typeof filter[key] !== 'function' &&
          key !== 'texture' &&
          key !== 'uniforms'
        ) {
          filterProps[key] = filter[key];
        }
      }
    }
  } catch (error) {
    if (error.message === 'CORS_ERROR' || error.message === 'PIXI_RENDER_ERROR') {
      console.warn(`PIXI ${filterType} filter failed (${error.message}), falling back to CSS filter`);
    } else {
      console.error(`Error applying PIXI ${filterType} filter:`, error);
    }
    // Fallback to CSS filter
    fabricObject.set('customFilter', getFilterCSSFallback(filterType, options));
  }
};

/**
 * Create a CORS-safe canvas from image element
 */
const createCORSSafeCanvas = async (imageElement) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    // Create a new image with CORS headers
    const corsImage = new Image();
    corsImage.crossOrigin = 'anonymous';
    
    corsImage.onload = () => {
      try {
        // Draw the image to canvas
        ctx.drawImage(corsImage, 0, 0);
        resolve(canvas);
      } catch (error) {
        console.warn('Failed to draw CORS image to canvas:', error);
        // Fallback: try with original image
        try {
          ctx.drawImage(imageElement, 0, 0);
          resolve(canvas);
        } catch (fallbackError) {
          reject(fallbackError);
        }
      }
    };
    
    corsImage.onerror = () => {
      // Fallback: try with original image
      try {
        ctx.drawImage(imageElement, 0, 0);
        resolve(canvas);
      } catch (error) {
        reject(new Error('Failed to create CORS-safe canvas: ' + error.message));
      }
    };

    // Use the original image src
    const src = imageElement.src || imageElement.getAttribute('src');
    if (src) {
      corsImage.src = src;
    } else {
      // If no src, try to use the original image directly
      try {
        ctx.drawImage(imageElement, 0, 0);
        resolve(canvas);
      } catch (error) {
        reject(new Error('No image source available'));
      }
    }
  });
};

/**
 * Apply PIXI filter to Fabric object by rendering through PIXI
 */
const applyPixiFilterToFabricObject = async (
  fabricObject,
  filter,
  filterType
) => {
  try {
    const app = await initializePIXI();
    if (!app) throw new Error('PIXI application not available');

    // Get image source from fabric object
    let imageElement = null;
    if (fabricObject._element) {
      imageElement = fabricObject._element;
    } else if (fabricObject.getSrc) {
      imageElement = new Image();
      imageElement.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        imageElement.onload = resolve;
        imageElement.onerror = reject;
        imageElement.src = fabricObject.getSrc();
      });
    } else {
      throw new Error('Could not get image source from fabric object');
    }

    // Store original fabric object dimensions
    const originalWidth = fabricObject.width * fabricObject.scaleX;
    const originalHeight = fabricObject.height * fabricObject.scaleY;

    // Create CORS-safe canvas to avoid WebGL security errors
    let sourceElement;
    try {
      sourceElement = await createCORSSafeCanvas(imageElement);
    } catch (corsError) {
      console.warn('CORS canvas creation failed, trying original image:', corsError);
      sourceElement = imageElement;
    }

    // Create PIXI texture from CORS-safe source
    let texture, sprite, canvas;
    try {
      texture = PIXI.Texture.from(sourceElement);

      // Resize app to match the original dimensions
      app.renderer.resize(imageElement.width, imageElement.height);

      // Create PIXI sprite
      sprite = new PIXI.Sprite(texture);
      sprite.filters = [filter];

      // Clear previous content
      app.stage.removeChildren();
      app.stage.addChild(sprite);

      // Render to get filtered result - this is where CORS errors typically occur
      if (app.renderer && app.renderer.render) {
        app.renderer.render(app.stage);
      } else {
        throw new Error('PIXI renderer not available');
      }
      
      // Extract canvas data
      canvas = app.canvas || app.view;
      
      // Validate canvas availability
      if (!canvas) {
        throw new Error('No canvas available from PIXI renderer');
      }
      
      // Test if we can actually read the canvas (this will throw SecurityError if CORS failed)
      // Only test if it's a 2D canvas, WebGL canvases might not support getContext('2d')
      if (canvas.getContext) {
        const testCtx = canvas.getContext('2d');
        if (testCtx && typeof testCtx.getImageData === 'function') {
          try {
            testCtx.getImageData(0, 0, 1, 1);
          } catch (imageDataError) {
            // This could be CORS or other security restrictions
            if (imageDataError.name === 'SecurityError' || imageDataError.message.includes('cross-origin')) {
              throw imageDataError; // Re-throw to be caught by outer catch block
            }
            // For other getImageData errors, just log warning but continue
            console.warn('Could not test canvas readability:', imageDataError.message);
          }
        }
      }
      
    } catch (error) {
      // Handle various types of errors that should fallback to CSS
      if (
        error.name === 'SecurityError' || 
        error.message.includes('cross-origin') || 
        error.message.includes('tainted') ||
        error.message.includes('No canvas available') ||
        error.message.includes('Cannot read properties of null')
      ) {
        const errorType = error.name === 'SecurityError' ? 'CORS/Security' : 'Canvas/WebGL';
        console.warn(`${errorType} error applying PIXI ${filterType} filter:`, error.message);
        throw new Error('PIXI_RENDER_ERROR'); // Special error type for fallback handling
      }
      // Re-throw other errors
      throw error;
    }

    // Store original render method if not already stored
    if (!fabricObject._originalRender) {
      fabricObject._originalRender = fabricObject._render;
    }

    // Store original dimensions to prevent size changes
    const originalObjectWidth = fabricObject.width;
    const originalObjectHeight = fabricObject.height;
    const originalScaleX = fabricObject.scaleX;
    const originalScaleY = fabricObject.scaleY;

    // Create custom render that draws the filtered image
    fabricObject._render = function (ctx) {
      ctx.save();

      // Ensure object dimensions haven't changed
      if (
        this.width !== originalObjectWidth ||
        this.height !== originalObjectHeight
      ) {
        this.set({
          width: originalObjectWidth,
          height: originalObjectHeight,
          scaleX: originalScaleX,
          scaleY: originalScaleY,
        });
      }

      // Draw the filtered result maintaining exact original size
      try {
        ctx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          -originalObjectWidth / 2,
          -originalObjectHeight / 2,
          originalObjectWidth,
          originalObjectHeight
        );
      } catch (error) {
        console.warn(
          'Failed to draw filtered image, falling back to original:',
          error
        );
        fabricObject._originalRender.call(this, ctx);
      }

      ctx.restore();
    };

    // Mark as having PIXI filter
    fabricObject.set('customFilter', `pixi-${filterType}`);
  } catch (error) {
    console.error('Error applying PIXI filter to fabric object:', error);
    throw error;
  }
};

/**
 * CSS fallback filters for when PIXI is not available
 */
const getFilterCSSFallback = (filterType, options) => {
  switch (filterType) {
    case 'ascii':
      return 'contrast(200%) brightness(150%)';
    case 'bloom':
      return 'brightness(120%) contrast(110%) saturate(130%)';
    case 'colorOverlay':
      return `sepia(100%) hue-rotate(${options.hue || 0}deg)`;
    case 'crt':
      return 'contrast(120%) brightness(95%) sepia(10%)';
    case 'dot':
      return 'contrast(150%) brightness(110%)';
    case 'emboss':
      return 'contrast(200%) brightness(150%) grayscale(50%)';
    case 'glitch':
      return 'hue-rotate(90deg) contrast(150%) saturate(200%) brightness(120%)';
    case 'glow':
      return 'brightness(130%) contrast(120%) saturate(120%)';
    case 'godray':
      return 'brightness(140%) contrast(130%) saturate(110%) sepia(10%)';
    case 'oldFilm':
      return 'sepia(80%) contrast(120%) brightness(90%)';
    case 'pixelate':
      return 'contrast(120%) brightness(110%)';
    case 'rgbSplit':
      return 'hue-rotate(10deg) contrast(120%) saturate(150%)';
    case 'simpleLightmap':
      return 'brightness(80%) contrast(110%) sepia(20%)';
    case 'tiltShiftAxis':
      return 'blur(3px) contrast(105%) saturate(110%)';
    case 'twist':
      return 'hue-rotate(180deg) contrast(130%)';
    case 'zoomBlur':
      return 'blur(2px) brightness(110%)';
    // Simple filters
    case 'blackAndWhite':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(100%)';
    case 'invert':
      return 'invert(100%)';
    case 'saturate':
      return `saturate(${options.saturation || 2})`;
    // Advanced PIXI filters fallbacks
    case 'adjustment':
      return 'brightness(110%) contrast(120%) saturate(150%)';
    case 'advancedBloom':
      return 'brightness(150%) contrast(120%) saturate(140%)';
    case 'bevel':
      return 'contrast(130%) brightness(105%) drop-shadow(1px 1px 2px rgba(0,0,0,0.5))';
    case 'bulgePinch':
      return 'contrast(110%) brightness(105%)';
    case 'colorGradient':
      return 'hue-rotate(45deg) saturate(120%)';
    case 'colorReplace':
      return 'hue-rotate(60deg) saturate(130%)';
    case 'convolution':
      return 'contrast(150%) brightness(110%)';
    case 'crossHatch':
      return 'contrast(140%) brightness(105%) sepia(20%)';
    case 'dropShadow':
      return 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))';
    case 'kawaseBlur':
      return 'blur(4px)';
    case 'motionBlur':
      return 'blur(2px)';
    case 'multiColorReplace':
      return 'hue-rotate(90deg) saturate(140%)';
    case 'outline':
      return 'drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #000)';
    case 'radialBlur':
      return 'blur(3px)';
    case 'reflection':
      return 'contrast(105%) brightness(110%)';
    case 'shockwave':
      return 'contrast(130%) brightness(105%)';
    case 'simplexNoise':
      return 'contrast(115%) brightness(105%) saturate(110%)';
    case 'tiltShift':
      return 'blur(4px) contrast(105%) saturate(110%)';
    default:
      return 'none';
  }
};

/**
 * Remove PIXI filters and restore original image
 */
export const removePixiFilters = fabricObject => {
  try {
    // Clean up PIXI filter properties
    if (fabricObject._pixiGlitchFilter) {
      delete fabricObject._pixiGlitchFilter;
      delete fabricObject._glitchOptions;
    }

    if (fabricObject._pixiFilter) {
      delete fabricObject._pixiFilter;
      delete fabricObject._pixiFilterType;
      delete fabricObject._pixiFilterOptions;
    }

    // Restore original render method if it was modified
    if (fabricObject._originalRender) {
      fabricObject._render = fabricObject._originalRender;
      delete fabricObject._originalRender;
    } else {
      // Force reset to default render if needed
      if (
        fabricObject.type === 'image' &&
        typeof fabric !== 'undefined' &&
        fabric.Image
      ) {
        const tempImage = new fabric.Image();
        fabricObject._render = tempImage._render;
      }
    }

    // Clear all filter-related properties completely
    fabricObject.customFilter = 'none';
    fabricObject.set('customFilter', 'none');

    // Clear Fabric.js filters array
    if (fabricObject.filters) {
      fabricObject.filters.length = 0;
      fabricObject.filters = [];
    }

    // Clear any other filter-related properties
    delete fabricObject._pixiFilterCanvas;
    delete fabricObject._filterImageData;

    // Clear any remaining PIXI-related properties
    const pixiProps = Object.keys(fabricObject).filter(key =>
      key.startsWith('_pixi')
    );
    pixiProps.forEach(prop => {
      delete fabricObject[prop];
    });

    // Force complete object reset
    fabricObject.dirty = true;
    fabricObject.setCoords();

    // Clear the object's cache if it exists
    if (fabricObject._cacheCanvas) {
      fabricObject._cacheCanvas = null;
    }
    if (fabricObject._cacheContext) {
      fabricObject._cacheContext = null;
    }

    // Force immediate re-render
    if (fabricObject.canvas) {
      fabricObject.canvas.renderAll();

      // Force a second render to ensure changes take effect
      setTimeout(() => {
        fabricObject.canvas.renderAll();
        fabricObject.canvas.requestRenderAll();
      }, 0);
    }
  } catch (error) {
    console.error('Error removing filters:', error);
  }
};

/**
 * Update GlitchFilter parameters
 */
export const updateGlitchFilter = (fabricObject, newOptions) => {
  if (fabricObject._pixiGlitchFilter || fabricObject._glitchOptions) {
    // Re-apply with updated options
    const mergedOptions = { ...fabricObject._glitchOptions, ...newOptions };
    applyGlitchFilter(fabricObject, mergedOptions);
  }
};

/**
 * Update any PIXI filter parameters
 */
export const updatePixiFilter = (fabricObject, newOptions) => {
  if (fabricObject._pixiFilter && fabricObject._pixiFilterType) {
    // Re-apply with updated options
    const mergedOptions = { ...fabricObject._pixiFilterOptions, ...newOptions };
    applyPixiFilter(fabricObject, fabricObject._pixiFilterType, mergedOptions);
  }
};

/**
 * Cleanup PIXI resources
 */
export const cleanupPIXI = () => {
  if (pixiApp) {
    pixiApp.destroy(true);
    pixiApp = null;
    filterContainer = null;
  }
};

// Available filter types
export const FILTER_TYPES = {
  GLITCH: 'glitch',
  ASCII: 'ascii',
  BLOOM: 'bloom',
  COLOR_OVERLAY: 'colorOverlay',
  CRT: 'crt',
  DOT: 'dot',
  EMBOSS: 'emboss',
  GLOW: 'glow',
  OLD_FILM: 'oldFilm',
  PIXELATE: 'pixelate',
  RGB_SPLIT: 'rgbSplit',
  TWIST: 'twist',
  ZOOM_BLUR: 'zoomBlur',
  NONE: 'none',
};

// Filter configurations for UI
export const FILTER_CONFIGS = {
  [FILTER_TYPES.GLITCH]: {
    name: 'Glitch',
    options: {
      slices: { min: 1, max: 20, default: 5 },
      offset: { min: 0, max: 500, default: 100 },
      direction: { min: 0, max: 360, default: 0 },
      seed: { min: 0, max: 100, default: 0 },
    },
  },
  [FILTER_TYPES.ASCII]: {
    name: 'ASCII',
    options: {
      size: { min: 2, max: 20, default: 8 },
    },
  },
  [FILTER_TYPES.BLOOM]: {
    name: 'Bloom',
    options: {
      blur: { min: 0, max: 10, default: 2 },
      threshold: { min: 0, max: 1, default: 0.5 },
    },
  },
  [FILTER_TYPES.GLOW]: {
    name: 'Glow',
    options: {
      distance: { min: 0, max: 50, default: 10 },
      outerStrength: { min: 0, max: 10, default: 4 },
    },
  },
  [FILTER_TYPES.OLD_FILM]: {
    name: 'Old Film',
    options: {
      sepia: { min: 0, max: 1, default: 0.3 },
      noise: { min: 0, max: 1, default: 0.3 },
    },
  },
  [FILTER_TYPES.PIXELATE]: {
    name: 'Pixelate',
    options: {
      size: { min: 1, max: 50, default: 10 },
    },
  },
  [FILTER_TYPES.RGB_SPLIT]: {
    name: 'RGB Split',
    options: {
      redOffset: { min: -50, max: 50, default: -10 },
      greenOffset: { min: -50, max: 50, default: 10 },
    },
  },
  [FILTER_TYPES.TWIST]: {
    name: 'Twist',
    options: {
      radius: { min: 0, max: 1, default: 0.5 },
      angle: { min: -10, max: 10, default: 5 },
    },
  },
  [FILTER_TYPES.ZOOM_BLUR]: {
    name: 'Zoom Blur',
    options: {
      strength: { min: 0, max: 1, default: 0.1 },
    },
  },
};
