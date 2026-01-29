import React, { useContext, useState, useEffect, useRef } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import styles from '../Player.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { RangeInput } from 'components/reusableComponents/RangeInput/RangeInput';
import { CustomCheckbox } from 'components/reusableComponents/CustomCheckbox/CustomCheckbox';
import { ButtonWithDropdown } from 'components/ButtonWithDropdown/ButtonWithDropdown';
import { applyPixiFilter, applyGlitchFilter, removePixiFilters } from '../../../utils/pixi-filters';
import { getFilterFromEffectType } from '../../../utils/fabric-utils';

// Default filter values
const DEFAULT_FILTER_VALUES = {
  glitch: {
    slices: 5,
    offset: 100,
    direction: 0,
    fillMode: 'transparent',
    seed: 0,
    average: false,
    minSize: 8,
    sampleSize: 512,
    red: { x: 0, y: 0 },
    green: { x: 0, y: 0 },
    blue: { x: 0, y: 0 },
  },
  adjustment: {
    gamma: 1.2,
    saturation: 1.5,
    contrast: 1.3,
    brightness: 1.1,
    red: 1,
    green: 1,
    blue: 1,
    alpha: 1,
  },
  advancedBloom: {
    threshold: 0.3,
    bloomScale: 2.0,
    brightness: 1.5,
    blur: 8,
    quality: 4,
  },
  bloom: {
    blur: 8,
    quality: 4,
    threshold: 0.3,
  },
  colorOverlay: {
    color: 0xff0080,
    alpha: 0.3,
  },
  glow: {
    distance: 15,
    outerStrength: 8,
    innerStrength: 0,
    color: 0xff0000,
    quality: 0.5,
  },
  ascii: {
    size: 8,
  },
  pixelate: {
    size: 10,
  },
  twist: {
    radius: 0.5,
    angle: 5,
    padding: 20,
  },
  zoomBlur: {
    strength: 0.1,
    center: [0.5, 0.5],
    innerRadius: 0,
    radius: -1,
  },
  rgbSplit: {
    red: [-10, 0],
    green: [0, 10],
    blue: [0, 0],
  },
  oldFilm: {
    sepia: 0.3,
    noise: 0.3,
    noiseSize: 1.0,
    scratch: 0.5,
    scratchDensity: 0.3,
  },
  crt: {
    curvature: 1.0,
    lineWidth: 1.0,
    lineContrast: 0.25,
  },
  bulgePinch: {
    center: [0.5, 0.5],
    radius: 0.5,
    strength: 0.5,
  },
  outline: {
    thickness: 1,
    color: 0x000000,
    quality: 0.1,
    alpha: 1.0,
    knockout: false,
  },
  dropShadow: {
    rotation: 45,
    distance: 5,
    color: 0x000000,
    alpha: 0.5,
    shadowOnly: false,
    blur: 2,
    quality: 3,
  },
};

export const FilterResource = observer(props => {
  const store = useContext(StoreContext);
  const { filterConfig, activeCanvasImage, onClose } = props;
  const [inputValues, setInputValues] = useState({});
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const debounceRef = useRef(null);

  // Initialize input values
  useEffect(() => {
    if (filterConfig && filterConfig.properties) {
      const defaultValues = DEFAULT_FILTER_VALUES[filterConfig.type] || {};
      setInputValues({
        ...defaultValues,
        ...filterConfig.properties,
      });
    }
  }, [filterConfig]);

  // Debounced filter application
  const applyFilterDebounced = (filterType, properties) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!activeCanvasImage) {
        console.warn('No active canvas image for filter application');
        return;
      }

      try {
        if (filterType === 'glitch') {
          await applyGlitchFilter(activeCanvasImage, properties);
        } else if (filterConfig.isPixiFilter) {
          await applyPixiFilter(activeCanvasImage, filterType, properties);
        } else {
          // Apply CSS filter
          const cssFilter = getFilterFromEffectType(filterType);
          activeCanvasImage.set('customFilter', cssFilter);
        }

        store.canvas.renderAll();

        // Trigger Redux sync
        if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
          window.dispatchSaveTimelineState(store);
        }
      } catch (error) {
        console.error(`Error applying ${filterType} filter:`, error);
      }
    }, 150);
  };

  const handleParameterChange = (paramName, value) => {
    const newInputValues = {
      ...inputValues,
      [paramName]: value,
    };
    setInputValues(newInputValues);
    applyFilterDebounced(filterConfig.type, newInputValues);
  };

  const handleReset = () => {
    const defaultValues = DEFAULT_FILTER_VALUES[filterConfig.type] || {};
    setInputValues(defaultValues);
    applyFilterDebounced(filterConfig.type, defaultValues);
  };

  const handleRemoveFilter = async () => {
    if (!activeCanvasImage) return;

    try {
      if (filterConfig.isPixiFilter) {
        removePixiFilters(activeCanvasImage);
      } else {
        activeCanvasImage.set('customFilter', 'none');
      }

      store.canvas.renderAll();

      // Trigger Redux sync
      if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(store);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error removing filter:', error);
    }
  };

  const handlePreview = () => {
    if (activeCanvasImage && store.canvas) {
      // Simple preview - just re-render the canvas
      store.canvas.renderAll();
    }
  };

  const renderFilterControls = () => {
    if (!filterConfig) return null;

    switch (filterConfig.type) {
      case 'glitch':
        return (
          <>
            <RangeInput
              label="Slices"
              currentValue={inputValues.slices || 5}
              onValueChange={(e) => handleParameterChange('slices', parseInt(e.target.value))}
              step={1}
              min={1}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Offset"
              currentValue={inputValues.offset || 100}
              onValueChange={(e) => handleParameterChange('offset', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={500}
              measure={'px'}
            />
            <RangeInput
              label="Direction"
              currentValue={inputValues.direction || 0}
              onValueChange={(e) => handleParameterChange('direction', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={360}
              measure={'°'}
            />
            <RangeInput
              label="Seed"
              currentValue={inputValues.seed || 0}
              onValueChange={(e) => handleParameterChange('seed', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={100}
              measure={''}
            />
            <RangeInput
              label="Fill Mode"
              currentValue={inputValues.fillMode || 0}
              onValueChange={(e) => handleParameterChange('fillMode', parseInt(e.target.value))}
              step={1}
              min={0}
              max={3}
              measure={''}
            />
            <RangeInput
              label="Min Size"
              currentValue={inputValues.minSize || 8}
              onValueChange={(e) => handleParameterChange('minSize', parseInt(e.target.value))}
              step={1}
              min={1}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Sample Size"
              currentValue={inputValues.sampleSize || 512}
              onValueChange={(e) => handleParameterChange('sampleSize', parseInt(e.target.value))}
              step={16}
              min={64}
              max={1024}
              measure={''}
            />
            <RangeInput
              label="Red X"
              currentValue={inputValues.red?.x || 0}
              onValueChange={(e) => handleParameterChange('red', { x: parseFloat(e.target.value), y: inputValues.red?.y || 0 })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Red Y"
              currentValue={inputValues.red?.y || 0}
              onValueChange={(e) => handleParameterChange('red', { x: inputValues.red?.x || 0, y: parseFloat(e.target.value) })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Green X"
              currentValue={inputValues.green?.x || 0}
              onValueChange={(e) => handleParameterChange('green', { x: parseFloat(e.target.value), y: inputValues.green?.y || 0 })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Green Y"
              currentValue={inputValues.green?.y || 0}
              onValueChange={(e) => handleParameterChange('green', { x: inputValues.green?.x || 0, y: parseFloat(e.target.value) })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Blue X"
              currentValue={inputValues.blue?.x || 0}
              onValueChange={(e) => handleParameterChange('blue', { x: parseFloat(e.target.value), y: inputValues.blue?.y || 0 })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Blue Y"
              currentValue={inputValues.blue?.y || 0}
              onValueChange={(e) => handleParameterChange('blue', { x: inputValues.blue?.x || 0, y: parseFloat(e.target.value) })}
              step={0.1}
              min={-10}
              max={10}
              measure={''}
            />
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>Average</div>
              <CustomCheckbox
                checked={inputValues.average || false}
                onChange={() => handleParameterChange('average', !inputValues.average)}
              />
            </div>
          </>
        );

      case 'adjustment':
        return (
          <>
            <RangeInput
              label="Gamma"
              currentValue={inputValues.gamma || 1}
              onValueChange={(e) => handleParameterChange('gamma', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Saturation"
              currentValue={inputValues.saturation || 1}
              onValueChange={(e) => handleParameterChange('saturation', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Contrast"
              currentValue={inputValues.contrast || 1}
              onValueChange={(e) => handleParameterChange('contrast', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Brightness"
              currentValue={inputValues.brightness || 1}
              onValueChange={(e) => handleParameterChange('brightness', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Red"
              currentValue={inputValues.red || 1}
              onValueChange={(e) => handleParameterChange('red', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Green"
              currentValue={inputValues.green || 1}
              onValueChange={(e) => handleParameterChange('green', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Blue"
              currentValue={inputValues.blue || 1}
              onValueChange={(e) => handleParameterChange('blue', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 1}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'bloom':
        return (
          <>
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 2}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={0.5}
              min={0.0}
              max={20.0}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 4}
              onValueChange={(e) => handleParameterChange('quality', parseInt(e.target.value))}
              step={1}
              min={1}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Resolution"
              currentValue={inputValues.resolution || 1}
              onValueChange={(e) => handleParameterChange('resolution', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={2}
              measure={''}
            />
            <RangeInput
              label="Kernel Size"
              currentValue={inputValues.kernelSize || 5}
              onValueChange={(e) => handleParameterChange('kernelSize', parseInt(e.target.value))}
              step={2}
              min={3}
              max={15}
              measure={''}
            />
          </>
        );

      case 'advancedBloom':
        return (
          <>
            <RangeInput
              label="Threshold"
              currentValue={inputValues.threshold || 0.5}
              onValueChange={(e) => handleParameterChange('threshold', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Bloom Scale"
              currentValue={inputValues.bloomScale || 1}
              onValueChange={(e) => handleParameterChange('bloomScale', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5.0}
              measure={''}
            />
            <RangeInput
              label="Brightness"
              currentValue={inputValues.brightness || 1}
              onValueChange={(e) => handleParameterChange('brightness', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 8}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={0.5}
              min={0.0}
              max={20.0}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 4}
              onValueChange={(e) => handleParameterChange('quality', parseInt(e.target.value))}
              step={1}
              min={1}
              max={10}
              measure={''}
            />
          </>
        );

      case 'glow':
        return (
          <>
            <RangeInput
              label="Distance"
              currentValue={inputValues.distance || 10}
              onValueChange={(e) => handleParameterChange('distance', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={50}
              measure={'px'}
            />
            <RangeInput
              label="Outer Strength"
              currentValue={inputValues.outerStrength || 4}
              onValueChange={(e) => handleParameterChange('outerStrength', parseFloat(e.target.value))}
              step={0.5}
              min={0}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Inner Strength"
              currentValue={inputValues.innerStrength || 0}
              onValueChange={(e) => handleParameterChange('innerStrength', parseFloat(e.target.value))}
              step={0.5}
              min={0}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 0.1}
              onValueChange={(e) => handleParameterChange('quality', parseFloat(e.target.value))}
              step={0.01}
              min={0.01}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Knockout"
              currentValue={inputValues.knockout ? 1 : 0}
              onValueChange={(e) => handleParameterChange('knockout', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 0.5}
              onValueChange={(e) => handleParameterChange('quality', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={1.0}
              measure={''}
            />
          </>
        );

      case 'ascii':
        return (
          <RangeInput
            label="Size"
            currentValue={inputValues.size || 8}
            onValueChange={(e) => handleParameterChange('size', parseInt(e.target.value))}
            step={1}
            min={2}
            max={20}
            measure={'px'}
          />
        );

      case 'pixelate':
        return (
          <>
            <RangeInput
              label="Size X"
              currentValue={inputValues.size?.x || 10}
              onValueChange={(e) => handleParameterChange('size', { x: parseInt(e.target.value), y: inputValues.size?.y || 10 })}
              step={1}
              min={1}
              max={50}
              measure={'px'}
            />
            <RangeInput
              label="Size Y"
              currentValue={inputValues.size?.y || 10}
              onValueChange={(e) => handleParameterChange('size', { x: inputValues.size?.x || 10, y: parseInt(e.target.value) })}
              step={1}
              min={1}
              max={50}
              measure={'px'}
            />
          </>
        );

      case 'twist':
        return (
          <>
            <RangeInput
              label="Radius"
              currentValue={inputValues.radius || 0.5}
              onValueChange={(e) => handleParameterChange('radius', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Angle"
              currentValue={inputValues.angle || 5}
              onValueChange={(e) => handleParameterChange('angle', parseFloat(e.target.value))}
              step={0.5}
              min={-20}
              max={20}
              measure={'°'}
            />
            <RangeInput
              label="Padding"
              currentValue={inputValues.padding || 20}
              onValueChange={(e) => handleParameterChange('padding', parseInt(e.target.value))}
              step={1}
              min={0}
              max={50}
              measure={'px'}
            />
            <RangeInput
              label="Offset X"
              currentValue={inputValues.offset?.x || 0}
              onValueChange={(e) => handleParameterChange('offset', { x: parseFloat(e.target.value), y: inputValues.offset?.y || 0 })}
              step={0.01}
              min={-1}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Offset Y"
              currentValue={inputValues.offset?.y || 0}
              onValueChange={(e) => handleParameterChange('offset', { x: inputValues.offset?.x || 0, y: parseFloat(e.target.value) })}
              step={0.01}
              min={-1}
              max={1}
              measure={''}
            />
          </>
        );

      case 'zoomBlur':
        return (
          <>
            <RangeInput
              label="Strength"
              currentValue={inputValues.strength || 0.1}
              onValueChange={(e) => handleParameterChange('strength', parseFloat(e.target.value))}
              step={0.05}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Center X"
              currentValue={inputValues.center?.[0] || 0.5}
              onValueChange={(e) => handleParameterChange('center', [parseFloat(e.target.value), inputValues.center?.[1] || 0.5])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Center Y"
              currentValue={inputValues.center?.[1] || 0.5}
              onValueChange={(e) => handleParameterChange('center', [inputValues.center?.[0] || 0.5, parseFloat(e.target.value)])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Inner Radius"
              currentValue={inputValues.innerRadius || 0}
              onValueChange={(e) => handleParameterChange('innerRadius', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={100}
              measure={''}
            />
            <RangeInput
              label="Radius"
              currentValue={inputValues.radius || 100}
              onValueChange={(e) => handleParameterChange('radius', parseFloat(e.target.value))}
              step={1}
              min={10}
              max={500}
              measure={''}
            />
          </>
        );

      case 'oldFilm':
        return (
          <>
            <RangeInput
              label="Sepia"
              currentValue={inputValues.sepia || 0.3}
              onValueChange={(e) => handleParameterChange('sepia', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Noise"
              currentValue={inputValues.noise || 0.3}
              onValueChange={(e) => handleParameterChange('noise', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Noise Size"
              currentValue={inputValues.noiseSize || 1}
              onValueChange={(e) => handleParameterChange('noiseSize', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Scratch"
              currentValue={inputValues.scratch || 0.5}
              onValueChange={(e) => handleParameterChange('scratch', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Scratch Density"
              currentValue={inputValues.scratchDensity || 0.3}
              onValueChange={(e) => handleParameterChange('scratchDensity', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Scratch Width"
              currentValue={inputValues.scratchWidth || 1}
              onValueChange={(e) => handleParameterChange('scratchWidth', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Vignetting"
              currentValue={inputValues.vignetting || 0.3}
              onValueChange={(e) => handleParameterChange('vignetting', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Vignetting Alpha"
              currentValue={inputValues.vignettingAlpha || 1}
              onValueChange={(e) => handleParameterChange('vignettingAlpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Vignetting Blur"
              currentValue={inputValues.vignettingBlur || 0.3}
              onValueChange={(e) => handleParameterChange('vignettingBlur', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Seed"
              currentValue={inputValues.seed || 0}
              onValueChange={(e) => handleParameterChange('seed', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={100}
              measure={''}
            />
          </>
        );

      case 'crt':
        return (
          <>
            <RangeInput
              label="Curvature"
              currentValue={inputValues.curvature || 1.0}
              onValueChange={(e) => handleParameterChange('curvature', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={3.0}
              measure={''}
            />
            <RangeInput
              label="Line Width"
              currentValue={inputValues.lineWidth || 1.0}
              onValueChange={(e) => handleParameterChange('lineWidth', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5.0}
              measure={''}
            />
            <RangeInput
              label="Line Contrast"
              currentValue={inputValues.lineContrast || 0.25}
              onValueChange={(e) => handleParameterChange('lineContrast', parseFloat(e.target.value))}
              step={0.05}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Vertical Line"
              currentValue={inputValues.verticalLine ? 1 : 0}
              onValueChange={(e) => handleParameterChange('verticalLine', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Noise"
              currentValue={inputValues.noise || 0.3}
              onValueChange={(e) => handleParameterChange('noise', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Noise Size"
              currentValue={inputValues.noiseSize || 1}
              onValueChange={(e) => handleParameterChange('noiseSize', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Seed"
              currentValue={inputValues.seed || 0}
              onValueChange={(e) => handleParameterChange('seed', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={100}
              measure={''}
            />
            <RangeInput
              label="Vignetting"
              currentValue={inputValues.vignetting || 0.3}
              onValueChange={(e) => handleParameterChange('vignetting', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Vignetting Alpha"
              currentValue={inputValues.vignettingAlpha || 1}
              onValueChange={(e) => handleParameterChange('vignettingAlpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Vignetting Blur"
              currentValue={inputValues.vignettingBlur || 0.3}
              onValueChange={(e) => handleParameterChange('vignettingBlur', parseFloat(e.target.value))}
              step={0.1}
              min={0.0}
              max={1.0}
              measure={''}
            />
            <RangeInput
              label="Time"
              currentValue={inputValues.time || 0}
              onValueChange={(e) => handleParameterChange('time', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'backdropBlur':
        return (
          <>
            <RangeInput
              label="Strength"
              currentValue={inputValues.strength || 8}
              onValueChange={(e) => handleParameterChange('strength', parseFloat(e.target.value))}
              step={0.5}
              min={0}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 4}
              onValueChange={(e) => handleParameterChange('quality', parseInt(e.target.value))}
              step={1}
              min={1}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Kernel Size"
              currentValue={inputValues.kernelSize || 5}
              onValueChange={(e) => handleParameterChange('kernelSize', parseInt(e.target.value))}
              step={2}
              min={3}
              max={15}
              measure={''}
            />
          </>
        );

      case 'bevel':
        return (
          <>
            <RangeInput
              label="Rotation"
              currentValue={inputValues.rotation || 45}
              onValueChange={(e) => handleParameterChange('rotation', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={360}
              measure={'°'}
            />
            <RangeInput
              label="Thickness"
              currentValue={inputValues.thickness || 2}
              onValueChange={(e) => handleParameterChange('thickness', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Light Alpha"
              currentValue={inputValues.lightAlpha || 0.7}
              onValueChange={(e) => handleParameterChange('lightAlpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Shadow Alpha"
              currentValue={inputValues.shadowAlpha || 0.7}
              onValueChange={(e) => handleParameterChange('shadowAlpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'bulgePinch':
        return (
          <>
            <RangeInput
              label="Radius"
              currentValue={inputValues.radius || 100}
              onValueChange={(e) => handleParameterChange('radius', parseFloat(e.target.value))}
              step={5}
              min={10}
              max={500}
              measure={'px'}
            />
            <RangeInput
              label="Strength"
              currentValue={inputValues.strength || 1}
              onValueChange={(e) => handleParameterChange('strength', parseFloat(e.target.value))}
              step={0.1}
              min={-5}
              max={5}
              measure={''}
            />
          </>
        );

      case 'colorReplace':
        return (
          <>
            <RangeInput
              label="Epsilon"
              currentValue={inputValues.epsilon || 0.4}
              onValueChange={(e) => handleParameterChange('epsilon', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'convolution':
        return (
          <>
            <RangeInput
              label="Width"
              currentValue={inputValues.width || 200}
              onValueChange={(e) => handleParameterChange('width', parseFloat(e.target.value))}
              step={10}
              min={50}
              max={500}
              measure={'px'}
            />
            <RangeInput
              label="Height"
              currentValue={inputValues.height || 200}
              onValueChange={(e) => handleParameterChange('height', parseFloat(e.target.value))}
              step={10}
              min={50}
              max={500}
              measure={'px'}
            />
          </>
        );

      case 'dot':
        return (
          <>
            <RangeInput
              label="Scale"
              currentValue={inputValues.scale || 1}
              onValueChange={(e) => handleParameterChange('scale', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Angle"
              currentValue={inputValues.angle || 5}
              onValueChange={(e) => handleParameterChange('angle', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'dropShadow':
        return (
          <>
            <RangeInput
              label="Rotation"
              currentValue={inputValues.rotation || 45}
              onValueChange={(e) => handleParameterChange('rotation', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={360}
              measure={'°'}
            />
            <RangeInput
              label="Distance"
              currentValue={inputValues.distance || 5}
              onValueChange={(e) => handleParameterChange('distance', parseFloat(e.target.value))}
              step={0.5}
              min={0}
              max={50}
              measure={'px'}
            />
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 2}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 3}
              onValueChange={(e) => handleParameterChange('quality', parseInt(e.target.value))}
              step={1}
              min={1}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 0.5}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Shadow Only"
              currentValue={inputValues.shadowOnly ? 1 : 0}
              onValueChange={(e) => handleParameterChange('shadowOnly', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Kernel Size"
              currentValue={inputValues.kernelSize || 5}
              onValueChange={(e) => handleParameterChange('kernelSize', parseInt(e.target.value))}
              step={2}
              min={3}
              max={15}
              measure={''}
            />
            <RangeInput
              label="Resolution"
              currentValue={inputValues.resolution || 1}
              onValueChange={(e) => handleParameterChange('resolution', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={2}
              measure={''}
            />
          </>
        );

      case 'godray':
        return (
          <>
            <RangeInput
              label="Angle"
              currentValue={inputValues.angle || 30}
              onValueChange={(e) => handleParameterChange('angle', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={360}
              measure={'°'}
            />
            <RangeInput
              label="Gain"
              currentValue={inputValues.gain || 0.5}
              onValueChange={(e) => handleParameterChange('gain', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Lacunarity"
              currentValue={inputValues.lacunarity || 2.5}
              onValueChange={(e) => handleParameterChange('lacunarity', parseFloat(e.target.value))}
              step={0.1}
              min={1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Time"
              currentValue={inputValues.time || 0}
              onValueChange={(e) => handleParameterChange('time', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Parallel"
              currentValue={inputValues.parallel ? 1 : 0}
              onValueChange={(e) => handleParameterChange('parallel', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Center X"
              currentValue={inputValues.center?.[0] || 0}
              onValueChange={(e) => handleParameterChange('center', [parseFloat(e.target.value), inputValues.center?.[1] || 0])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Center Y"
              currentValue={inputValues.center?.[1] || 0}
              onValueChange={(e) => handleParameterChange('center', [inputValues.center?.[0] || 0, parseFloat(e.target.value)])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'hslAdjustment':
        return (
          <>
            <RangeInput
              label="Hue"
              currentValue={inputValues.hue || 0}
              onValueChange={(e) => handleParameterChange('hue', parseFloat(e.target.value))}
              step={1}
              min={-180}
              max={180}
              measure={'°'}
            />
            <RangeInput
              label="Saturation"
              currentValue={inputValues.saturation || 0}
              onValueChange={(e) => handleParameterChange('saturation', parseFloat(e.target.value))}
              step={0.01}
              min={-1}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Lightness"
              currentValue={inputValues.lightness || 0}
              onValueChange={(e) => handleParameterChange('lightness', parseFloat(e.target.value))}
              step={0.01}
              min={-1}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Colorize"
              currentValue={inputValues.colorize ? 1 : 0}
              onValueChange={(e) => handleParameterChange('colorize', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 1}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'kawaseBlur':
        return (
          <>
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 4}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={0.5}
              min={0}
              max={20}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 3}
              onValueChange={(e) => handleParameterChange('quality', parseInt(e.target.value))}
              step={1}
              min={1}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Clamp"
              currentValue={inputValues.clamp ? 1 : 0}
              onValueChange={(e) => handleParameterChange('clamp', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'motionBlur':
        return (
          <>
            <RangeInput
              label="Velocity X"
              currentValue={inputValues.velocity?.x || 0}
              onValueChange={(e) => handleParameterChange('velocity', { x: parseFloat(e.target.value), y: inputValues.velocity?.y || 0 })}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Velocity Y"
              currentValue={inputValues.velocity?.y || 0}
              onValueChange={(e) => handleParameterChange('velocity', { x: inputValues.velocity?.x || 0, y: parseFloat(e.target.value) })}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Kernel Size"
              currentValue={inputValues.kernelSize || 5}
              onValueChange={(e) => handleParameterChange('kernelSize', parseInt(e.target.value))}
              step={2}
              min={3}
              max={15}
              measure={''}
            />
            <RangeInput
              label="Offset"
              currentValue={inputValues.offset || 0}
              onValueChange={(e) => handleParameterChange('offset', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'outline':
        return (
          <>
            <RangeInput
              label="Thickness"
              currentValue={inputValues.thickness || 1}
              onValueChange={(e) => handleParameterChange('thickness', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
            <RangeInput
              label="Quality"
              currentValue={inputValues.quality || 0.1}
              onValueChange={(e) => handleParameterChange('quality', parseFloat(e.target.value))}
              step={0.01}
              min={0.01}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 1}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'radialBlur':
        return (
          <>
            <RangeInput
              label="Angle"
              currentValue={inputValues.angle || 0}
              onValueChange={(e) => handleParameterChange('angle', parseFloat(e.target.value))}
              step={1}
              min={0}
              max={360}
              measure={'°'}
            />
            <RangeInput
              label="Center X"
              currentValue={inputValues.center?.x || 0}
              onValueChange={(e) => handleParameterChange('center', { x: parseFloat(e.target.value), y: inputValues.center?.y || 0 })}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Center Y"
              currentValue={inputValues.center?.y || 0}
              onValueChange={(e) => handleParameterChange('center', { x: inputValues.center?.x || 0, y: parseFloat(e.target.value) })}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Kernel Size"
              currentValue={inputValues.kernelSize || 5}
              onValueChange={(e) => handleParameterChange('kernelSize', parseInt(e.target.value))}
              step={2}
              min={3}
              max={15}
              measure={''}
            />
            <RangeInput
              label="Radius"
              currentValue={inputValues.radius || -1}
              onValueChange={(e) => handleParameterChange('radius', parseFloat(e.target.value))}
              step={1}
              min={-1}
              max={100}
              measure={''}
            />
          </>
        );

      case 'reflection':
        return (
          <>
            <RangeInput
              label="Mirror"
              currentValue={inputValues.mirror ? 1 : 0}
              onValueChange={(e) => handleParameterChange('mirror', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Boundary"
              currentValue={inputValues.boundary || 0.5}
              onValueChange={(e) => handleParameterChange('boundary', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Alpha Start"
              currentValue={inputValues.alpha?.[0] || 1}
              onValueChange={(e) => handleParameterChange('alpha', [parseFloat(e.target.value), inputValues.alpha?.[1] || 1])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Alpha End"
              currentValue={inputValues.alpha?.[1] || 0}
              onValueChange={(e) => handleParameterChange('alpha', [inputValues.alpha?.[0] || 1, parseFloat(e.target.value)])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Amplitude Start"
              currentValue={inputValues.amplitude?.[0] || 0}
              onValueChange={(e) => handleParameterChange('amplitude', [parseFloat(e.target.value), inputValues.amplitude?.[1] || 20])}
              step={1}
              min={0}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Amplitude End"
              currentValue={inputValues.amplitude?.[1] || 20}
              onValueChange={(e) => handleParameterChange('amplitude', [inputValues.amplitude?.[0] || 0, parseFloat(e.target.value)])}
              step={1}
              min={0}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Wave Length Start"
              currentValue={inputValues.waveLength?.[0] || 30}
              onValueChange={(e) => handleParameterChange('waveLength', [parseFloat(e.target.value), inputValues.waveLength?.[1] || 100])}
              step={1}
              min={10}
              max={200}
              measure={''}
            />
            <RangeInput
              label="Wave Length End"
              currentValue={inputValues.waveLength?.[1] || 100}
              onValueChange={(e) => handleParameterChange('waveLength', [inputValues.waveLength?.[0] || 30, parseFloat(e.target.value)])}
              step={1}
              min={10}
              max={200}
              measure={''}
            />
            <RangeInput
              label="Time"
              currentValue={inputValues.time || 0}
              onValueChange={(e) => handleParameterChange('time', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'rgbSplit':
        return (
          <>
            <RangeInput
              label="Red X"
              currentValue={inputValues.red?.[0] || -10}
              onValueChange={(e) => handleParameterChange('red', [parseFloat(e.target.value), inputValues.red?.[1] || 0])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Red Y"
              currentValue={inputValues.red?.[1] || 0}
              onValueChange={(e) => handleParameterChange('red', [inputValues.red?.[0] || -10, parseFloat(e.target.value)])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Green X"
              currentValue={inputValues.green?.[0] || 0}
              onValueChange={(e) => handleParameterChange('green', [parseFloat(e.target.value), inputValues.green?.[1] || 10])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Green Y"
              currentValue={inputValues.green?.[1] || 0}
              onValueChange={(e) => handleParameterChange('green', [inputValues.green?.[0] || 0, parseFloat(e.target.value)])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Blue X"
              currentValue={inputValues.blue?.[0] || 10}
              onValueChange={(e) => handleParameterChange('blue', [parseFloat(e.target.value), inputValues.blue?.[1] || 0])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
            <RangeInput
              label="Blue Y"
              currentValue={inputValues.blue?.[1] || 0}
              onValueChange={(e) => handleParameterChange('blue', [inputValues.blue?.[0] || 10, parseFloat(e.target.value)])}
              step={0.5}
              min={-50}
              max={50}
              measure={''}
            />
          </>
        );

      case 'shockwave':
        return (
          <>
            <RangeInput
              label="Center X"
              currentValue={inputValues.center?.x || 0.5}
              onValueChange={(e) => handleParameterChange('center', { x: parseFloat(e.target.value), y: inputValues.center?.y || 0.5 })}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Center Y"
              currentValue={inputValues.center?.y || 0.5}
              onValueChange={(e) => handleParameterChange('center', { x: inputValues.center?.x || 0.5, y: parseFloat(e.target.value) })}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Amplitude"
              currentValue={inputValues.params?.amplitude || 30}
              onValueChange={(e) => handleParameterChange('params', { ...inputValues.params, amplitude: parseFloat(e.target.value) })}
              step={1}
              min={0}
              max={100}
              measure={''}
            />
            <RangeInput
              label="Wavelength"
              currentValue={inputValues.params?.wavelength || 160}
              onValueChange={(e) => handleParameterChange('params', { ...inputValues.params, wavelength: parseFloat(e.target.value) })}
              step={5}
              min={50}
              max={500}
              measure={''}
            />
            <RangeInput
              label="Brightness"
              currentValue={inputValues.params?.brightness || 1}
              onValueChange={(e) => handleParameterChange('params', { ...inputValues.params, brightness: parseFloat(e.target.value) })}
              step={0.1}
              min={0.1}
              max={3}
              measure={''}
            />
            <RangeInput
              label="Speed"
              currentValue={inputValues.params?.speed || 500}
              onValueChange={(e) => handleParameterChange('params', { ...inputValues.params, speed: parseFloat(e.target.value) })}
              step={10}
              min={100}
              max={1000}
              measure={''}
            />
            <RangeInput
              label="Radius"
              currentValue={inputValues.params?.radius || -1}
              onValueChange={(e) => handleParameterChange('params', { ...inputValues.params, radius: parseFloat(e.target.value) })}
              step={1}
              min={-1}
              max={500}
              measure={''}
            />
            <RangeInput
              label="Time"
              currentValue={inputValues.time || 0}
              onValueChange={(e) => handleParameterChange('time', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'simplexNoise':
        return (
          <>
            <RangeInput
              label="Scale"
              currentValue={inputValues.scale || 1}
              onValueChange={(e) => handleParameterChange('scale', parseFloat(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              measure={''}
            />
            <RangeInput
              label="Animation Speed"
              currentValue={inputValues.animationSpeed || 1}
              onValueChange={(e) => handleParameterChange('animationSpeed', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={5}
              measure={''}
            />
          </>
        );

      case 'tiltShiftAxis':
        return (
          <>
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 100}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={5}
              min={0}
              max={200}
              measure={''}
            />
            <RangeInput
              label="Gradient Blur"
              currentValue={inputValues.gradientBlur || 600}
              onValueChange={(e) => handleParameterChange('gradientBlur', parseFloat(e.target.value))}
              step={10}
              min={100}
              max={1000}
              measure={''}
            />
            <RangeInput
              label="Start X"
              currentValue={inputValues.start?.x || 0}
              onValueChange={(e) => handleParameterChange('start', { x: parseFloat(e.target.value), y: inputValues.start?.y || 0 })}
              step={10}
              min={0}
              max={800}
              measure={'px'}
            />
            <RangeInput
              label="Start Y"
              currentValue={inputValues.start?.y || 0}
              onValueChange={(e) => handleParameterChange('start', { x: inputValues.start?.x || 0, y: parseFloat(e.target.value) })}
              step={10}
              min={0}
              max={600}
              measure={'px'}
            />
            <RangeInput
              label="End X"
              currentValue={inputValues.end?.x || 600}
              onValueChange={(e) => handleParameterChange('end', { x: parseFloat(e.target.value), y: inputValues.end?.y || 0 })}
              step={10}
              min={0}
              max={800}
              measure={'px'}
            />
            <RangeInput
              label="End Y"
              currentValue={inputValues.end?.y || 0}
              onValueChange={(e) => handleParameterChange('end', { x: inputValues.end?.x || 600, y: parseFloat(e.target.value) })}
              step={10}
              min={0}
              max={600}
              measure={'px'}
            />
          </>
        );

      case 'colorGradient':
        return (
          <>
            <RangeInput
              label="Type"
              currentValue={inputValues.type || 0}
              onValueChange={(e) => handleParameterChange('type', parseInt(e.target.value))}
              step={1}
              min={0}
              max={3}
              measure={''}
            />
          </>
        );

      case 'colorMap':
        return (
          <>
            <RangeInput
              label="Mix"
              currentValue={inputValues.mix || 1}
              onValueChange={(e) => handleParameterChange('mix', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Nearest"
              currentValue={inputValues.nearest ? 1 : 0}
              onValueChange={(e) => handleParameterChange('nearest', parseFloat(e.target.value) > 0.5)}
              step={1}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'crossHatch':
        return (
          <>
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>
                No adjustable parameters for Cross Hatch filter
              </div>
            </div>
          </>
        );

      case 'emboss':
        return (
          <>
            <RangeInput
              label="Strength"
              currentValue={inputValues.strength || 5}
              onValueChange={(e) => handleParameterChange('strength', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={20}
              measure={''}
            />
          </>
        );

      case 'grayscale':
        return (
          <>
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>
                No adjustable parameters for Grayscale filter
              </div>
            </div>
          </>
        );

      case 'multiColorReplace':
        return (
          <>
            <RangeInput
              label="Epsilon"
              currentValue={inputValues.epsilon || 0.05}
              onValueChange={(e) => handleParameterChange('epsilon', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Max Colors"
              currentValue={inputValues.maxColors || 0}
              onValueChange={(e) => handleParameterChange('maxColors', parseInt(e.target.value))}
              step={1}
              min={0}
              max={10}
              measure={''}
            />
          </>
        );

      case 'simpleLightmap':
        return (
          <>
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 1}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'colorOverlay':
        return (
          <>
            <RangeInput
              label="Red"
              currentValue={inputValues.color?.[0] || 1}
              onValueChange={(e) => handleParameterChange('color', [parseFloat(e.target.value), inputValues.color?.[1] || 0, inputValues.color?.[2] || 0])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Green"
              currentValue={inputValues.color?.[1] || 0}
              onValueChange={(e) => handleParameterChange('color', [inputValues.color?.[0] || 1, parseFloat(e.target.value), inputValues.color?.[2] || 0])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Blue"
              currentValue={inputValues.color?.[2] || 0}
              onValueChange={(e) => handleParameterChange('color', [inputValues.color?.[0] || 1, inputValues.color?.[1] || 0, parseFloat(e.target.value)])}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
            <RangeInput
              label="Alpha"
              currentValue={inputValues.alpha || 1}
              onValueChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
              step={0.01}
              min={0}
              max={1}
              measure={''}
            />
          </>
        );

      case 'tiltShift':
        return (
          <>
            <RangeInput
              label="Blur"
              currentValue={inputValues.blur || 100}
              onValueChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
              step={5}
              min={0}
              max={200}
              measure={''}
            />
            <RangeInput
              label="Gradient Blur"
              currentValue={inputValues.gradientBlur || 600}
              onValueChange={(e) => handleParameterChange('gradientBlur', parseFloat(e.target.value))}
              step={10}
              min={100}
              max={1000}
              measure={''}
            />
            <RangeInput
              label="Start X"
              currentValue={inputValues.start?.x || 0}
              onValueChange={(e) => handleParameterChange('start', { x: parseFloat(e.target.value), y: inputValues.start?.y || 0 })}
              step={10}
              min={0}
              max={800}
              measure={'px'}
            />
            <RangeInput
              label="Start Y"
              currentValue={inputValues.start?.y || 0}
              onValueChange={(e) => handleParameterChange('start', { x: inputValues.start?.x || 0, y: parseFloat(e.target.value) })}
              step={10}
              min={0}
              max={600}
              measure={'px'}
            />
            <RangeInput
              label="End X"
              currentValue={inputValues.end?.x || 600}
              onValueChange={(e) => handleParameterChange('end', { x: parseFloat(e.target.value), y: inputValues.end?.y || 0 })}
              step={10}
              min={0}
              max={800}
              measure={'px'}
            />
            <RangeInput
              label="End Y"
              currentValue={inputValues.end?.y || 0}
              onValueChange={(e) => handleParameterChange('end', { x: inputValues.end?.x || 600, y: parseFloat(e.target.value) })}
              step={10}
              min={0}
              max={600}
              measure={'px'}
            />
          </>
        );

      // Simple PIXI filters (replacements for CSS filters)
      case 'blackAndWhite':
        return (
          <>
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>
                No adjustable parameters for Black & White filter
              </div>
            </div>
          </>
        );

      case 'sepia':
        return (
          <>
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>
                No adjustable parameters for Sepia filter
              </div>
            </div>
          </>
        );

      case 'invert':
        return (
          <>
            <div className={styles.sidebarAnimationInputRow}>
              <div className={styles.sidebarInputLabel}>
                No adjustable parameters for Invert filter
              </div>
            </div>
          </>
        );

      case 'saturate':
        return (
          <>
            <RangeInput
              label="Saturation"
              currentValue={inputValues.saturation || 2}
              onValueChange={(e) => handleParameterChange('saturation', parseFloat(e.target.value))}
              step={0.1}
              min={0}
              max={5}
              measure={''}
            />
          </>
        );

      default:
        return (
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              No specific controls for this filter
            </div>
          </div>
        );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!filterConfig) {
    return (
      <div className={styles.sidebarAnimationResource}>
        <div className={styles.sidebarInputLabel}>No filter selected</div>
      </div>
    );
  }

  return (
    <div className={styles.sidebarAnimationResource} data-interactive={true}>
      {/* Filter Header */}
      <div className={styles.animationControls} data-interactive={true}>
        <div className={styles.sidebarAnimationInputRow}>
          <div className={styles.sidebarInputLabel}>
            Filter: {filterConfig.name}
          </div>
        </div>

        {/* Filter Controls */}
        {renderFilterControls()}

        {/* Advanced Controls */}
        <div
          className={`${styles.curveEditorSection} ${
            !isMoreOpen ? styles.hidden : ''
          }`}
        >
          <div className={styles.sidebarAnimationInputRow}>
            <div className={styles.sidebarInputLabel}>
              Advanced filter options would go here
            </div>
          </div>
        </div>
      </div>

      {/* More Button */}
      <div className={styles.moreButtonContainer}>
        <ButtonWithIcon
          icon="ArrowDownIcon"
          size="12px"
          color="#FFFFFF66"
          textColor="rgba(255, 255, 255, 0.6)"
          accentColor="white"
          text={isMoreOpen ? 'Hide' : 'More'}
          classNameButton={`${styles.moreButton} ${
            isMoreOpen ? styles.open : ''
          }`}
          classNameIcon={`${styles.moreIcon} ${isMoreOpen ? styles.open : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          marginLeft="0px"
        />
      </div>

      {/* Control Buttons */}
      <div className={styles.controlsHeader}>
        <ButtonWithIcon
          icon="RegenerateIcon"
          size="16px"
          color="#FFFFFFB2"
          accentColor="white"
          textColor="white"
          tooltipText="Reset to default values"
          tooltipPosition="top"
          onClick={handleReset}
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="AiStarsIcon"
          text="Preview"
          size="14px"
          color="#FFFFFFB2"
          accentColor="white"
          marginLeft="0px"
          onClick={handlePreview}
          tooltipText="Preview the filter"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
        <ButtonWithIcon
          icon="TrashIcon"
          text="Remove"
          size="14px"
          color="#ff4444"
          accentColor="#ff6666"
          textColor="#ff4444"
          marginLeft="0px"
          onClick={handleRemoveFilter}
          tooltipText="Remove filter"
          tooltipPosition="top"
          classNameButton={styles.resetButton}
        />
      </div>
    </div>
  );
});
