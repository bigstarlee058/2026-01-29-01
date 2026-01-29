import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { runInAction } from 'mobx';
import { HexColorPicker } from 'react-colorful';
import CloseIcon from 'components/Icons/CloseIcon';
import InformationIcon from 'components/Icons/InformationIcon';
import FontWeightItalic from 'components/Icons/FontWeightItalic';
import FontWeightBold from 'components/Icons/FontWeightBold';
import PlusIcon from 'components/Icons/PlusIcon';
import SquareShadow from 'components/Icons/SquareShadow';
import SlashIcon from 'components/Icons/SlashIcon';
import CheckIcon from 'components/Icons/CheckIcon';
import { StoreContext } from '../../../../mobx';
import styles from './ColorPicker.module.scss';
import { ChromePicker } from 'react-color';
import { throttle } from 'throttle-debounce';
import PipetteIcon from 'components/Icons/PipetteIcon';
import { useDispatch } from 'react-redux';
import {
  saveTimelineState,
  saveTimelineData,
} from '../../../../redux/timeline/timelineSlice';

const INITIAL_BUTTON_COLORS = {
  Font: '#ffffff',
  Fill: '#000000',
  Shadow: '#808080',
  Outline: '#ffffff',
  Motion: '#ff0000',
  'Auto HL': '#ffff00',
};

const OPTIONS = ['Font', 'Fill', 'Shadow', 'Outline', 'Motion', 'Auto HL'];

const HexColorIndicator = ({ hexColor }) => {
  const handleClick = () => {
    navigator.clipboard
      .writeText(hexColor)
      .then(() => {})
      .catch(err => {
        console.error('Failed to copy color:', err);
      });
  };

  const hexValue = hexColor.substring(1); // Remove # symbol

  return (
    <div
      className={styles.hexColorIndicator}
      onClick={handleClick}
      title="Click to copy"
    >
      <span className={styles.hexHash}>#</span>
      <span className={styles.hexValue}>{hexValue}</span>
    </div>
  );
};

const hexToRgba = (hex, opacity = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const rgbaToHex = rgba => {
  if (!rgba || typeof rgba !== 'string') return '#ffffff';

  if (rgba.startsWith('#')) {
    return rgba;
  }

  const rgbaMatch = rgba.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return '#ffffff';
};

const updateStyleByButton = (
  store,
  isSubtitlesPanel,
  buttonType,
  color,
  params
) => {
  if (!store) return;

  const updateMethod = isSubtitlesPanel
    ? 'updateSubtitlesStyle'
    : 'updateTextStyle';

  const opacity = params.opacity / 100;

  switch (buttonType) {
    case 'Font':
      store[updateMethod]('color', hexToRgba(color, opacity));
      break;
    case 'Fill':
      store[updateMethod]('backgroundColor', hexToRgba(color, opacity));
      store[updateMethod]('backgroundRadius', params.backgroundRadius);
      break;
    case 'Shadow':
      // Ensure angle is in the correct range (0-360 degrees)
      const normalizedAngle = ((params.agle % 360) + 360) % 360;
      const shadowOffsetX =
        Math.cos((normalizedAngle * Math.PI) / 180) * params.shadowDistance;
      const shadowOffsetY =
        Math.sin((normalizedAngle * Math.PI) / 180) * params.shadowDistance;

      store[updateMethod]('shadowColor', hexToRgba(color, opacity));
      store[updateMethod]('shadowBlur', params.shadowBlur);
      store[updateMethod]('shadowOffsetX', shadowOffsetX);
      store[updateMethod]('shadowOffsetY', shadowOffsetY);
      store[updateMethod]('shadowOpacity', opacity);
      break;
    case 'Outline':
      store[updateMethod]('strokeColor', hexToRgba(color, opacity));
      store[updateMethod]('strokeOpacity', opacity);
      store[updateMethod]('stroke', params.strokeWidth);
      break;
    case 'Auto HL':
      store[updateMethod]('highlightColor', hexToRgba(color, opacity));
      break;
    case 'Motion':
      // Motion color could be used for animations or other effects
      store[updateMethod]('motionColor', hexToRgba(color, opacity));
      break;
  }
};

export const ColorPicker = ({
  color,
  onChange,
  onClose,
  isSubtitlesPanel = false,
  defaultActiveButton = null,
  backgroundRadius: propsBackgroundRadius,
}) => {
  const store = useContext(StoreContext);
  const dispatch = useDispatch();
  const [hexColor, setHexColor] = useState(rgbaToHex(color));
  const [buttonColors, setButtonColors] = useState(
    store.colorPickerState.buttonColors
  );
  const [activeButton, setActiveButton] = useState(defaultActiveButton);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [opacities, setOpacities] = useState(store.colorPickerState.opacities);
  const [shadowDistance, setShadowDistance] = useState(
    store.colorPickerState.shadowSettings.distance
  );
  const [shadowBlur, setShadowBlur] = useState(
    store.colorPickerState.shadowSettings.blur
  );
  const [agle, setAgle] = useState(store.colorPickerState.shadowSettings.angle);
  const [backgroundRadius, setBackgroundRadius] = useState(
    store.colorPickerState.backgroundRadius
  );

  // Initialize backgroundRadius from store (only if not already set)
  useEffect(() => {
    if (isSubtitlesPanel && store.selectedElement && backgroundRadius === 0) {
      const currentRadius =
        store.selectedElement.properties?.backgroundRadius || 0;
      setBackgroundRadius(currentRadius);
      store.updateColorPickerBackgroundRadius(currentRadius);
    }
  }, [isSubtitlesPanel, store.selectedElement, backgroundRadius]);
  
  // Round corners editing states
  const [isBorderRadiusEditing, setIsBorderRadiusEditing] = useState(false);
  const [borderRadiusInputValue, setBorderRadiusInputValue] = useState('');
  
  // Refs for round corners inputs
  const borderRadiusInputRef = useRef(null);
  const borderRadiusRangeRef = useRef(null);
  
  const [strokeWidth, setStrokeWidth] = useState(
    store.colorPickerState.strokeWidth
  );
  const [isCustomPanelOpen, setIsCustomPanelOpen] = useState(false);
  const [isCustomColorPanelOpen, setIsCustomColorPanelOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [customColors, setCustomColors] = useState([
    '#3afcea',
    '#d3f85a',
    '#ff0004',
    '#bf71ff',
    '#ffcc00',
    '#00a529',
  ]);
  const [opacity, setOpacity] = useState(100);
  const [outlineWidth, setOutlineWidth] = useState(12);
  const [sliderValue, setSliderValue] = useState(
    store.colorPickerState.shadowSettings.sliderValue
  );
  const [isTransparent, setIsTransparent] = useState(false);
  const [isDraggingShadow, setIsDraggingShadow] = useState(false);
  const labelRefs = useRef({});
  const [labelWidths, setLabelWidths] = useState({});

  // State for storing initial values when custom panel opens
  const [initialState, setInitialState] = useState(null);

  // Refs for wheel scrolling on number inputs
  const percentageValueRefs = useRef({});
  const numberInputRefs = useRef({});
  const opacityInputRefs = useRef({});
  const colorInputRefs = useRef({});
  const shadowSliderRef = useRef(null);
  const shadowRangeRefs = useRef({});
  const opacityRangeRefs = useRef({});

  const throttledUpdateStore = useCallback(
    throttle(500, (updateMethod, updates) => {
      // Batch all updates in a single requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        Object.entries(updates).forEach(([key, value]) => {
          store[updateMethod](key, value);
        });
      });
    }),
    [store]
  );

  // Convert color string to color object for ChromePicker
  const parseColor = colorStr => {
    // If color is not defined or not a string
    if (!colorStr || typeof colorStr !== 'string') {
      return { r: 255, g: 255, b: 255, a: 1 };
    }

    try {
      // Check if it's rgba
      const rgbaMatch = colorStr.match(
        /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
      );
      if (rgbaMatch) {
        return {
          r: parseInt(rgbaMatch[1]),
          g: parseInt(rgbaMatch[2]),
          b: parseInt(rgbaMatch[3]),
          a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
        };
      }

      // Check if it's hex with alpha
      if (colorStr.startsWith('#')) {
        if (colorStr.length === 9) {
          const r = parseInt(colorStr.slice(1, 3), 16);
          const g = parseInt(colorStr.slice(3, 5), 16);
          const b = parseInt(colorStr.slice(5, 7), 16);
          const a = parseInt(colorStr.slice(7, 9), 16) / 255;
          return { r, g, b, a };
        } else if (colorStr.length === 7) {
          // Regular hex without alpha
          const r = parseInt(colorStr.slice(1, 3), 16);
          const g = parseInt(colorStr.slice(3, 5), 16);
          const b = parseInt(colorStr.slice(5, 7), 16);
          return { r, g, b, a: 1 };
        }
      }

      return { r: 255, g: 255, b: 255, a: 1 };
    } catch (error) {
      console.error('Error parsing color:', error);
      return { r: 255, g: 255, b: 255, a: 1 };
    }
  };

  const handleHexInputChange = useCallback(
    e => {
      const value = e.target.value;
      if (/^#[0-9A-Fa-f]*$/.test(value) && value.length <= 7) {
        if (activeButton) {
          setButtonColors(prev => ({
            ...prev,
            [activeButton]: value,
          }));
        } else {
          setHexColor(value);
        }
      }
    },
    [activeButton]
  );

  const handleColorChange = useCallback(
    throttle(100, newColor => {
      const colorValue = typeof newColor === 'object' ? newColor.hex : newColor;

      // Only update hexColor if no active button (for general color picker)
      if (!activeButton) {
        setHexColor(colorValue);
      }

      if (activeButton) {
        setButtonColors(prev => ({
          ...prev,
          [activeButton]: colorValue,
        }));
        // Update store
        store.updateColorPickerButtonColor(activeButton, colorValue);
        // Update selectedColor to match the current button's new color
        setSelectedColor(colorValue);

        const params = {
          opacity: opacities[activeButton],
          shadowDistance,
          shadowBlur,
          backgroundRadius,
          strokeWidth,
          agle,
        };

        if (activeButton === 'Font') {
          const updateMethod = isSubtitlesPanel
            ? 'updateSubtitlesStyle'
            : 'updateTextStyle';
          store[updateMethod](
            'color',
            hexToRgba(colorValue, opacities[activeButton] / 100)
          );
        } else {
          updateStyleByButton(
            store,
            isSubtitlesPanel,
            activeButton,
            colorValue,
            params
          );
        }
      } else {
        onChange?.(colorValue);
      }
    }),
    [
      activeButton,
      onChange,
      store,
      isSubtitlesPanel,
      opacities,
      shadowDistance,
      shadowBlur,
      backgroundRadius,
      strokeWidth,
      agle,
    ]
  );

  // Get current color for display
  const getCurrentColor = () => {
    const result = activeButton ? buttonColors[activeButton] || hexColor : hexColor;
    return result;
  };

  const handleHexInputBlur = useCallback(() => {
    const currentColor = getCurrentColor();
    if (/^#[0-9A-Fa-f]{6}$/.test(currentColor)) {
      handleColorChange(currentColor);
    } else {
      if (activeButton) {
        setButtonColors(prev => ({
          ...prev,
          [activeButton]: buttonColors[activeButton] || '#ffffff',
        }));
      } else {
        setHexColor('#ffffff');
      }
    }
  }, [activeButton, buttonColors, handleColorChange]);

  const handleButtonClick = useCallback(
    buttonType => {
      setActiveButton(buttonType);
      setHexColor(buttonColors[buttonType]);
      setOpacity(opacities[buttonType]);
      // Update selectedColor to match the current button's color
      setSelectedColor(buttonColors[buttonType]);

      if (activeButton === buttonType) {
        return;
      }

      if (buttonType === 'Font') {
        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        store[updateMethod](
          'color',
          hexToRgba(buttonColors[buttonType], opacities[buttonType] / 100)
        );
      } else if (buttonType === 'Fill') {
        updateStyleByButton(
          store,
          isSubtitlesPanel,
          buttonType,
          buttonColors[buttonType],
          {
            opacity: opacities[buttonType],
            shadowDistance,
            shadowBlur,
            backgroundRadius,
            strokeWidth,
            agle,
          }
        );
      } else if (buttonType === 'Outline') {
        updateStyleByButton(
          store,
          isSubtitlesPanel,
          buttonType,
          buttonColors[buttonType],
          {
            opacity: opacities[buttonType],
            shadowDistance,
            shadowBlur,
            backgroundRadius,
            strokeWidth,
            agle,
          }
        );
      }
    },
    [
      buttonColors,
      store,
      isSubtitlesPanel,
      opacities,
      shadowDistance,
      shadowBlur,
      backgroundRadius,
      strokeWidth,
      agle,
      activeButton,
    ]
  );

  const handleStrokeWidthChange = useCallback(
    e => {
      const value = parseInt(e.target.value) || 0;
      const clampedValue = Math.max(1, Math.min(100, value));
      setStrokeWidth(clampedValue);
      setOutlineWidth(clampedValue);
      store.updateColorPickerStrokeWidth(clampedValue);

      if (activeButton === 'Outline') {
        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        store[updateMethod]('stroke', clampedValue);

        const params = {
          opacity: opacities[activeButton],
          shadowDistance,
          shadowBlur,
          backgroundRadius,
          strokeWidth: clampedValue,
          agle,
        };
        updateStyleByButton(
          store,
          isSubtitlesPanel,
          'Outline',
          buttonColors.Outline,
          params
        );
      }
    },
    [
      activeButton,
      store,
      isSubtitlesPanel,
      buttonColors,
      opacities,
      shadowDistance,
      shadowBlur,
      backgroundRadius,
      agle,
    ]
  );

  const validateAndSetValue = useCallback((value, min, max, setter) => {
    if (value === '' || value === '-') {
      setter(value);
      return value;
    }

    const isValidFormat = /^-?\d{1,3}$/.test(value);
    if (!isValidFormat) {
      setter(0);
      return 0;
    }

    let numValue = parseInt(value);

    if (isNaN(numValue)) {
      numValue = 0;
    }

    if (numValue < min) numValue = min;
    if (numValue > max) numValue = max;

    setter(numValue);
    return numValue;
  }, []);

  const handleShadowDistanceChange = useCallback(
    e => {
      const rawValue = e.target.value;
      const cleanValue = rawValue.replace(/^0+(?=\d)/, '');
      if (/^0\d+$/.test(rawValue)) {
        setShadowDistance(0);
        if (activeButton === 'Shadow') {
          const updateMethod = isSubtitlesPanel
            ? 'updateSubtitlesStyle'
            : 'updateTextStyle';
          store[updateMethod]('shadowOffsetX', 0);
          store[updateMethod]('shadowOffsetY', 0);
        }
        return;
      }
      const value = validateAndSetValue(cleanValue, 0, 100, val => {
        setShadowDistance(val);
        store.updateColorPickerShadowSettings({ distance: val });
      });

      if (activeButton === 'Shadow') {
        const calcAngle = agle < 0 ? agle + 360 : agle;
        const shadowOffsetX = Math.cos((calcAngle * Math.PI) / 180) * value;
        const shadowOffsetY = Math.sin((calcAngle * Math.PI) / 180) * value;

        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        throttledUpdateStore(updateMethod, {
          shadowOffsetX,
          shadowOffsetY,
        });
      }
    },
    [
      activeButton,
      agle,
      store,
      isSubtitlesPanel,
      validateAndSetValue,
      throttledUpdateStore,
    ]
  );

  const handleShadowBlurChange = useCallback(
    e => {
      const rawValue = e.target.value;
      if (/^0\d+$/.test(rawValue)) {
        setShadowBlur(0);
        if (activeButton === 'Shadow') {
          const updateMethod = isSubtitlesPanel
            ? 'updateSubtitlesStyle'
            : 'updateTextStyle';
          store[updateMethod]('shadowBlur', 0);
        }
        return;
      }
      const cleanValue = rawValue.replace(/^0+(?=\d)/, '');
      const value = validateAndSetValue(cleanValue, 0, 200, val => {
        setShadowBlur(val);
        store.updateColorPickerShadowSettings({ blur: val });
      });

      if (activeButton === 'Shadow') {
        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        throttledUpdateStore(updateMethod, {
          shadowBlur: value,
        });
      }
    },
    [
      activeButton,
      store,
      isSubtitlesPanel,
      validateAndSetValue,
      throttledUpdateStore,
    ]
  );

  const handleShadowDragStart = useCallback(
    e => {
      setIsDraggingShadow(true);

      const handleMouseMove = e => {
        if (!isDraggingShadow) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percentage = Math.max(
          0,
          Math.min(100, ((clientX - rect.left) / rect.width) * 100)
        );

        const newValue = Math.round(percentage);
        setSliderValue(newValue);

        const newDistance = Math.max(0, Math.min(100, newValue));
        const newBlur = Math.max(0, Math.min(200, newValue * 2));

        setShadowDistance(newDistance);
        setShadowBlur(newBlur);
        store.updateColorPickerShadowSettings({
          distance: newDistance,
          blur: newBlur,
          sliderValue: newValue,
        });

        if (activeButton === 'Shadow') {
          const updateMethod = isSubtitlesPanel
            ? 'updateSubtitlesStyle'
            : 'updateTextStyle';
          const normalizedAngle = ((agle % 360) + 360) % 360;
          const shadowOffsetX =
            Math.cos((normalizedAngle * Math.PI) / 180) * newDistance;
          const shadowOffsetY =
            Math.sin((normalizedAngle * Math.PI) / 180) * newDistance;

          throttledUpdateStore(updateMethod, {
            shadowOffsetX,
            shadowOffsetY,
            shadowBlur: newBlur,
          });
        }
      };

      const handleMouseUp = () => {
        setIsDraggingShadow(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
    },
    [
      isDraggingShadow,
      activeButton,
      isSubtitlesPanel,
      agle,
      throttledUpdateStore,
    ]
  );

  const handleSliderChange = useCallback(
    e => {
      const value = validateAndSetValue(e.target.value, 0, 100, val => {
        setSliderValue(val);
        store.updateColorPickerShadowSettings({ sliderValue: val });
      });

      const newDistance = Math.max(0, Math.min(100, value));
      const newBlur = Math.max(0, Math.min(200, value * 2)); 

      setShadowDistance(newDistance);
      setShadowBlur(newBlur);
      store.updateColorPickerShadowSettings({
        distance: newDistance,
        blur: newBlur,
        sliderValue: value,
      });

      // Update shadow in store
      if (activeButton === 'Shadow') {
        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        const normalizedAngle = ((agle % 360) + 360) % 360;
        const shadowOffsetX =
          Math.cos((normalizedAngle * Math.PI) / 180) * newDistance;
        const shadowOffsetY =
          Math.sin((normalizedAngle * Math.PI) / 180) * newDistance;

        throttledUpdateStore(updateMethod, {
          shadowOffsetX,
          shadowOffsetY,
          shadowBlur: newBlur,
        });
      }
    },
    [
      activeButton,
      isSubtitlesPanel,
      agle,
      throttledUpdateStore,
      validateAndSetValue,
    ]
  );

  const handleAgleChange = useCallback(
    e => {
      const rawValue = e.target.value;

      if (/^-?0\d+$/.test(rawValue)) {
        setAgle(0);
        if (activeButton === 'Shadow') {
          const updateMethod = isSubtitlesPanel
            ? 'updateSubtitlesStyle'
            : 'updateTextStyle';
          store[updateMethod]('shadowOffsetX', 0);
          store[updateMethod]('shadowOffsetY', 0);
        }
        return;
      }
      const cleanValue = rawValue
        .replace(/^-0+(?=\d)/, '-')
        .replace(/^0+(?=\d)/, '');
      if (cleanValue === '-') {
        setAgle(cleanValue);
        return;
      }
      const value = validateAndSetValue(cleanValue, -180, 180, val => {
        setAgle(val);
        store.updateColorPickerShadowSettings({ angle: val });
      });

      if (activeButton === 'Shadow') {
        const calcAngle = value < 0 ? value + 360 : value;
        const shadowOffsetX =
          Math.cos((calcAngle * Math.PI) / 180) * shadowDistance;
        const shadowOffsetY =
          Math.sin((calcAngle * Math.PI) / 180) * shadowDistance;

        const updateMethod = isSubtitlesPanel
          ? 'updateSubtitlesStyle'
          : 'updateTextStyle';
        store[updateMethod]('shadowOffsetX', shadowOffsetX);
        store[updateMethod]('shadowOffsetY', shadowOffsetY);
      }
    },
    [activeButton, shadowDistance, store, isSubtitlesPanel, validateAndSetValue]
  );

  const handleOpacityChange = useCallback(
    throttle(100, (e, buttonType) => {
      const rawValue = e.target.value;
      const cleanValue = rawValue.replace(/^0+(?=\d)/, '');
      const value = validateAndSetValue(
        cleanValue,
        0,
        100,
        buttonType
          ? val => {
              setOpacities(prev => ({ ...prev, [buttonType]: val }));
              store.updateColorPickerOpacity(buttonType, val);
            }
          : setOpacity
      );

      const updateMethod = isSubtitlesPanel
        ? 'updateSubtitlesStyle'
        : 'updateTextStyle';

      if (buttonType) {
        switch (buttonType) {
          case 'Shadow':
            store[updateMethod]('shadowOpacity', value / 100);
            store[updateMethod](
              'shadowColor',
              hexToRgba(buttonColors.Shadow, value / 100)
            );
            break;
          case 'Outline':
            store[updateMethod]('strokeOpacity', value / 100);
            store[updateMethod](
              'strokeColor',
              hexToRgba(buttonColors.Outline, value / 100)
            );
            break;
          case 'Font':
            store[updateMethod](
              'color',
              hexToRgba(buttonColors.Font, value / 100)
            );
            break;
          case 'Fill':
            store[updateMethod](
              'backgroundColor',
              hexToRgba(buttonColors.Fill, value / 100)
            );
            break;
          case 'Motion':
            store[updateMethod](
              'motionColor',
              hexToRgba(buttonColors.Motion, value / 100)
            );
            break;
          case 'Auto HL':
            store[updateMethod](
              'highlightColor',
              hexToRgba(buttonColors['Auto HL'], value / 100)
            );
            break;
        }
      } else {
        if (activeButton) {
          const color = buttonColors[activeButton];
          switch (activeButton) {
            case 'Shadow':
              store[updateMethod]('shadowOpacity', value / 100);
              store[updateMethod]('shadowColor', hexToRgba(color, value / 100));
              break;
            case 'Outline':
              store[updateMethod]('strokeOpacity', value / 100);
              store[updateMethod]('strokeColor', hexToRgba(color, value / 100));
              break;
            case 'Font':
              store[updateMethod]('color', hexToRgba(color, value / 100));
              break;
            case 'Fill':
              store[updateMethod](
                'backgroundColor',
                hexToRgba(color, value / 100)
              );
              break;
            case 'Motion':
              store[updateMethod]('motionColor', hexToRgba(color, value / 100));
              break;
            case 'Auto HL':
              store[updateMethod](
                'highlightColor',
                hexToRgba(color, value / 100)
              );
              break;
          }
        } else if (isSubtitlesPanel) {
          store[updateMethod]('shadowOpacity', value / 100);
          store[updateMethod]('shadowColor', hexToRgba(hexColor, value / 100));
        }
        const colorObj = parseColor(hexColor);
        const { r, g, b } = colorObj;
        onChange?.(`rgba(${r}, ${g}, ${b}, ${value / 100})`);
      }
    }),
    [
      store,
      isSubtitlesPanel,
      validateAndSetValue,
      hexColor,
      onChange,
      activeButton,
      buttonColors,
    ]
  );

  const handleBackgroundRadiusChange = useCallback(
    e => {
      const value = parseInt(e.target.value) || 0;
      const clampedValue = Math.max(0, Math.min(100, value));
      setBackgroundRadius(clampedValue);
      store.updateColorPickerBackgroundRadius(clampedValue);

      // Always apply background radius changes
      const updateMethod = isSubtitlesPanel
        ? 'updateSubtitlesStyle'
        : 'updateTextStyle';

      throttledUpdateStore(updateMethod, {
        backgroundRadius: clampedValue,
      });
    },
    [isSubtitlesPanel, throttledUpdateStore]
  );

  // Round corners input handlers with px logic
  const handleBorderRadiusNumberChange = e => {
    const value = e.target.value;
    // Remove 'px' from input for processing
    const cleanValue = value.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(0, Math.min(100, numericValue));
      setBorderRadiusInputValue(clampedValue.toString());
      handleBackgroundRadiusChange({ target: { value: clampedValue.toString() } });
    } else {
      // Allow partial input
      setBorderRadiusInputValue(cleanValue);
    }
  };

  const handleBorderRadiusInputBlur = () => {
    const cleanValue = borderRadiusInputValue.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(0, Math.min(100, numericValue));
      setBorderRadiusInputValue(clampedValue.toString());
      handleBackgroundRadiusChange({ target: { value: clampedValue.toString() } });
    } else {
      // Reset to current value if invalid
      setBorderRadiusInputValue(backgroundRadius.toString());
    }
    setIsBorderRadiusEditing(false);
  };

  const handleBorderRadiusInputClick = () => {
    setIsBorderRadiusEditing(true);
    setBorderRadiusInputValue(backgroundRadius.toString());
  };

  useEffect(() => {
    if (color) {
      setHexColor(color);
    }
  }, [color]);

  useEffect(() => {
    if (
      isSubtitlesPanel &&
      strokeWidth === store.colorPickerState.strokeWidth
    ) {
      const firstTextElement = store.editorElements.find(
        element => element.type === 'text' || element.subType === 'subtitles'
      );
      if (firstTextElement) {
        const width = firstTextElement.properties?.stroke || 12;
        setStrokeWidth(width);
        setOutlineWidth(width);
        store.updateColorPickerStrokeWidth(width);
      }
    }
  }, [isSubtitlesPanel, store, strokeWidth]);

  useEffect(() => {
    if (defaultActiveButton && !activeButton) {
      setActiveButton(defaultActiveButton);
      handleButtonClick(defaultActiveButton);
    }
  }, [defaultActiveButton]);

  useEffect(() => {
    if (activeButton && buttonColors[activeButton]) {
      setSelectedColor(buttonColors[activeButton]);
    } else if (!activeButton) {
      setSelectedColor(hexColor);
    }
  }, [activeButton, buttonColors, hexColor]);

  const [syncedElementId, setSyncedElementId] = useState(null);

  useEffect(() => {
    setIsDraggingShadow(false);
  }, [activeButton]);

  useEffect(() => {
    if (store && store.editorElements) {
      const currentElement = store.editorElements.find(
        element => element.type === 'text' || element.subType === 'subtitles'
      );

      if (
        currentElement &&
        (currentElement.id !== syncedElementId || syncedElementId === null)
      ) {
        setSyncedElementId(currentElement.id);

        const props = currentElement.properties;

        const updatedColors = { ...store.colorPickerState.buttonColors };
        const updatedOpacities = { ...store.colorPickerState.opacities };

        const extractColorAndOpacity = colorStr => {
          if (!colorStr) return { color: '#ffffff', opacity: 100 };

          if (colorStr.startsWith('#')) {
            return { color: colorStr, opacity: 100 };
          } else if (colorStr.startsWith('rgba')) {
            const rgbaMatch = colorStr.match(
              /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
            );
            if (rgbaMatch) {
              const r = parseInt(rgbaMatch[1]);
              const g = parseInt(rgbaMatch[2]);
              const b = parseInt(rgbaMatch[3]);
              const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
              const hexColor = `#${r.toString(16).padStart(2, '0')}${g
                .toString(16)
                .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
              return { color: hexColor, opacity: Math.round(a * 100) };
            }
          }
          return { color: colorStr, opacity: 100 };
        };

        if (
          store.colorPickerState.buttonColors.Font !== '#ffffff' ||
          store.colorPickerState.opacities.Font !== 100
        ) {

          updatedColors.Font = store.colorPickerState.buttonColors.Font;
          updatedOpacities.Font = store.colorPickerState.opacities.Font;
        } else if (props.color) {

          const { color, opacity } = extractColorAndOpacity(props.color);
          updatedColors.Font = color;
          updatedOpacities.Font = opacity;
        }

        if (
          store.colorPickerState.buttonColors.Fill !== '#000000' ||
          store.colorPickerState.opacities.Fill !== 100
        ) {
          updatedColors.Fill = store.colorPickerState.buttonColors.Fill;
          updatedOpacities.Fill = store.colorPickerState.opacities.Fill;
        } else if (props.backgroundColor) {
          const { color, opacity } = extractColorAndOpacity(
            props.backgroundColor
          );
          updatedColors.Fill = color;
          updatedOpacities.Fill = opacity;
        }

        if (
          store.colorPickerState.buttonColors.Outline !== '#ffffff' ||
          store.colorPickerState.opacities.Outline !== 100
        ) {
          updatedColors.Outline = store.colorPickerState.buttonColors.Outline;
          updatedOpacities.Outline = store.colorPickerState.opacities.Outline;
        } else if (props.strokeColor) {
          const { color, opacity } = extractColorAndOpacity(props.strokeColor);
          updatedColors.Outline = color;
          updatedOpacities.Outline = props.strokeOpacity
            ? Math.round(props.strokeOpacity * 100)
            : opacity;
        }

        if (
          store.colorPickerState.buttonColors.Shadow !== '#808080' ||
          store.colorPickerState.opacities.Shadow !== 100
        ) {
          updatedColors.Shadow = store.colorPickerState.buttonColors.Shadow;
          updatedOpacities.Shadow = store.colorPickerState.opacities.Shadow;
        } else if (props.shadowColor) {
          const { color, opacity } = extractColorAndOpacity(props.shadowColor);
          updatedColors.Shadow = color;
          updatedOpacities.Shadow = props.shadowOpacity
            ? Math.round(props.shadowOpacity * 100)
            : opacity;
        }

        if (
          store.colorPickerState.buttonColors['Auto HL'] !== '#ffff00' ||
          store.colorPickerState.opacities['Auto HL'] !== 100
        ) {
          updatedColors['Auto HL'] =
            store.colorPickerState.buttonColors['Auto HL'];
          updatedOpacities['Auto HL'] =
            store.colorPickerState.opacities['Auto HL'];
        } else if (props.highlightColor) {
          const { color, opacity } = extractColorAndOpacity(
            props.highlightColor
          );
          updatedColors['Auto HL'] = color;
          updatedOpacities['Auto HL'] = opacity;
        }

        if (
          store.colorPickerState.buttonColors.Motion !== '#ff0000' ||
          store.colorPickerState.opacities.Motion !== 100
        ) {
          updatedColors.Motion = store.colorPickerState.buttonColors.Motion;
          updatedOpacities.Motion = store.colorPickerState.opacities.Motion;
        } else if (props.motionColor) {
          const { color, opacity } = extractColorAndOpacity(props.motionColor);
          updatedColors.Motion = color;
          updatedOpacities.Motion = opacity;
        }

        setButtonColors(updatedColors);
        setOpacities(updatedOpacities);


        if (activeButton && updatedColors[activeButton]) {
          setSelectedColor(updatedColors[activeButton]);
        }

        setBackgroundRadius(store.colorPickerState.backgroundRadius);
        setStrokeWidth(store.colorPickerState.strokeWidth);
        setOutlineWidth(store.colorPickerState.strokeWidth);
        setShadowBlur(store.colorPickerState.shadowSettings.blur);
        setShadowDistance(store.colorPickerState.shadowSettings.distance);
        setAgle(store.colorPickerState.shadowSettings.angle);
        setSliderValue(store.colorPickerState.shadowSettings.sliderValue);

        // Update backgroundRadius from props if provided
        if (propsBackgroundRadius !== undefined) {
          setBackgroundRadius(propsBackgroundRadius);
          store.updateColorPickerBackgroundRadius(propsBackgroundRadius);
        }

        if (defaultActiveButton && updatedColors[defaultActiveButton]) {
          setHexColor(updatedColors[defaultActiveButton]);
          setOpacity(updatedOpacities[defaultActiveButton]);
        }
      } else if (!currentElement && syncedElementId !== null) {

        setSyncedElementId(null);
      }
    }
  }, [store.editorElements, defaultActiveButton, syncedElementId, propsBackgroundRadius]);

  const saveCurrentState = useCallback(() => {

    const currentElementColors = {};
    
    if (store && store.editorElements) {
      const currentElement = store.editorElements.find(
        element => element.type === 'text' || element.subType === 'subtitles'
      );
      
      if (currentElement && currentElement.properties) {
        const props = currentElement.properties;
        
        currentElementColors.Font = props.color ? rgbaToHex(props.color) : buttonColors.Font;
        currentElementColors.Fill = props.backgroundColor ? rgbaToHex(props.backgroundColor) : buttonColors.Fill;
        currentElementColors.Outline = props.strokeColor ? rgbaToHex(props.strokeColor) : buttonColors.Outline;
        currentElementColors.Shadow = props.shadowColor ? rgbaToHex(props.shadowColor) : buttonColors.Shadow;
        currentElementColors['Auto HL'] = props.highlightColor ? rgbaToHex(props.highlightColor) : buttonColors['Auto HL'];
        currentElementColors.Motion = props.motionColor ? rgbaToHex(props.motionColor) : buttonColors.Motion;
      }
    }
    
    const state = {
      buttonColors: currentElementColors,
      opacities: { ...opacities },
      hexColor,
      opacity
    };
    return state;
  }, [buttonColors, opacities, hexColor, opacity, store]);

  const restoreState = useCallback((state) => {
    if (!state) {
      return;
    }

    setButtonColors(state.buttonColors);
    setOpacities(state.opacities);
    setHexColor(state.hexColor);
    setOpacity(state.opacity);

    // Also restore MobX store values so syncing effects don't override UI
    try {
      OPTIONS.forEach(option => {
        const restoredColor = state.buttonColors[option];
        const restoredOpacity = state.opacities[option];
        if (restoredColor) {
          store.updateColorPickerButtonColor(option, restoredColor);
        }
        if (typeof restoredOpacity === 'number') {
          store.updateColorPickerOpacity(option, restoredOpacity);
        }
      });
    } catch (e) {
      // noop safeguard
    }
    
    let newSelectedColor;
    if (activeButton && state.buttonColors[activeButton]) {
      newSelectedColor = state.buttonColors[activeButton];
      setSelectedColor(newSelectedColor);
    } else {
      newSelectedColor = state.hexColor;
      setSelectedColor(newSelectedColor);
    }
    
    if (activeButton) {
      const buttonColor = state.buttonColors[activeButton];
      const params = {
        opacity: state.opacities[activeButton],
        shadowDistance,
        shadowBlur,
        backgroundRadius,
        strokeWidth,
        agle,
      };
      updateStyleByButton(store, isSubtitlesPanel, activeButton, buttonColor, params);
    }
  }, [activeButton, store, isSubtitlesPanel, shadowDistance, shadowBlur, backgroundRadius, strokeWidth, agle, buttonColors, opacities, hexColor, opacity]);

  const handleClose = useCallback(() => {
    if (isCustomColorPanelOpen) {
      restoreState(initialState);
      setIsCustomColorPanelOpen(false);
    }
    
    setActiveButton(null);
    setSelectedColor(null); // Reset selected color when closing
    onClose?.();
  }, [onClose, isCustomColorPanelOpen, initialState, restoreState]);

  const handleCancelClick = useCallback(() => {
    restoreState(initialState);
    setIsCustomColorPanelOpen(false);
  }, [initialState, restoreState]);

  const handleClickOutside = useCallback((event) => {

    if (isCustomColorPanelOpen) {
      const isOnColorPicker = event.target.closest('.react-colorful');
      const isOnInputs = event.target.closest('input');
      const isOnOkCancelButtons = event.target.closest('button');
      const isOnColorPickerPortal = event.target.closest('#colorPickerPortal');
      const isOnColorPickerContainer = event.target.closest('[class*="ColorPicker"]');
      
      if (!isOnColorPicker && !isOnInputs && !isOnOkCancelButtons && !isOnColorPickerPortal && !isOnColorPickerContainer) {
        if (isCustomColorPanelOpen) {
          restoreState(initialState);        
          setIsCustomColorPanelOpen(false);  
        }
      }
    }
  }, [isCustomColorPanelOpen, initialState, restoreState]);
  
  const handleOkClick = useCallback(() => {
    const currentColor = getCurrentColor();
    
    if (currentColor && !customColors.includes(currentColor)) {
      setCustomColors(prev => [currentColor, ...prev.slice(0, 5)]); 
    }


    if (activeButton) {
      store.updateColorPickerButtonColor(
        activeButton,
        buttonColors[activeButton]
      );
    }


    if (activeButton) {
      const buttonColor = buttonColors[activeButton];
      const params = {
        opacity: opacities[activeButton],
        shadowDistance,
        shadowBlur,
        backgroundRadius,
        strokeWidth,
        agle,
      };
      updateStyleByButton(
        store,
        isSubtitlesPanel,
        activeButton,
        buttonColor,
        params
      );
    } else {
      const colorObj = parseColor(hexColor);
      const { r, g, b } = colorObj;
      onChange?.(`rgba(${r}, ${g}, ${b}, ${opacity / 100})`);
    }

    dispatch(saveTimelineState(store));
    setIsCustomColorPanelOpen(false);
  }, [
    activeButton,
    buttonColors,
    opacities,
    shadowDistance,
    shadowBlur,
    backgroundRadius,
    strokeWidth,
    agle,
    store,
    isSubtitlesPanel,
    hexColor,
    opacity,
    onChange,
    getCurrentColor,
    customColors,
    dispatch,
  ]);

  const toggleItalic = useCallback(() => {
    const newItalicState = !isItalicActive;
    setIsItalicActive(newItalicState);
    const newStyle = newItalicState ? 'italic' : 'normal';

    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('fontStyle', newStyle);
    } else {
      store.updateTextStyle('fontStyle', newStyle);
    }
  }, [isItalicActive, isSubtitlesPanel, store]);

  const toggleBold = useCallback(() => {
    const newBoldState = !isBoldActive;
    setIsBoldActive(newBoldState);


    const currentWeight = '400'; 
    const currentWeightNum = parseInt(currentWeight, 10);

    let newWeight;
    if (newBoldState) {
      newWeight = currentWeightNum >= 700 ? currentWeight : '700';
    } else {
      newWeight = currentWeightNum >= 700 ? '400' : currentWeight;
    }

    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('fontWeight', newWeight);
    } else {
      store.updateTextStyle('fontWeight', newWeight);
    }
  }, [isBoldActive, isSubtitlesPanel, store]);

  const handlePipetteClick = useCallback(async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();

        if (result && result.sRGBHex) {
          const selectedColor = result.sRGBHex;

          setHexColor(selectedColor);
          setSelectedColor(selectedColor);

          if (activeButton) {
            setButtonColors(prev => ({
              ...prev,
              [activeButton]: selectedColor,
            }));
            store.updateColorPickerButtonColor(activeButton, selectedColor);
            updateStyleByButton(
              store,
              isSubtitlesPanel,
              activeButton,
              selectedColor,
              {
                opacity: opacities[activeButton],
                shadowDistance,
                shadowBlur,
                backgroundRadius,
                strokeWidth,
                agle,
              }
            );
          } else {
            onChange?.(selectedColor);
          }
        }
      } catch (error) {}
    } else {
      console.warn('EyeDropper API is not supported in this browser');
    }
  }, [
    activeButton,
    onChange,
    store,
    isSubtitlesPanel,
    opacities,
    shadowDistance,
    shadowBlur,
    backgroundRadius,
    strokeWidth,
    agle,
  ]);

  const calculateLabelWidth = (labelId, text) => {
    if (labelRefs.current[labelId]) {
      const element = labelRefs.current[labelId];
      const width = element.offsetWidth;
      setLabelWidths(prev => ({
        ...prev,
        [labelId]: width,
      }));
    }
  };

  const getLabelClipPath = labelId => {
    const labelWidth = labelWidths[labelId] || 0;
    const padding = 4; 
    const gapWidth = labelWidth + padding * 2;

    const clipPath = `polygon(
      0 0,
      8px 0,
      8px 1px,
      ${8 + gapWidth}px 1px,
      ${8 + gapWidth}px 0,
      100% 0,
      100% 100%,
      0 100%
    )`;
    return clipPath;
  };

  const handleCustomPanelClick = useCallback(() => {
    setIsCustomPanelOpen(!isCustomPanelOpen);
  }, [isCustomPanelOpen]);

  const handleCustomColorPanelClick = useCallback(() => {
    if (!isCustomColorPanelOpen) {
      setInitialState(saveCurrentState());
    }
    setIsCustomColorPanelOpen(!isCustomColorPanelOpen);
  }, [isCustomColorPanelOpen, saveCurrentState]);

  const handleColorButtonClick = useCallback(
    color => {

      const normalizedColor =
        color.length === 4
          ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
          : color;

      setSelectedColor(normalizedColor);
      setHexColor(normalizedColor);

      if (activeButton) {
        setButtonColors(prev => ({
          ...prev,
          [activeButton]: normalizedColor,
        }));
        store.updateColorPickerButtonColor(activeButton, normalizedColor);
        updateStyleByButton(
          store,
          isSubtitlesPanel,
          activeButton,
          normalizedColor,
          {
            opacity: opacities[activeButton],
            shadowDistance,
            shadowBlur,
            backgroundRadius,
            strokeWidth,
            agle,
          }
        );
      } else {
        onChange?.(normalizedColor);
      }
    },
    [
      activeButton,
      onChange,
      store,
      isSubtitlesPanel,
      opacities,
      shadowDistance,
      shadowBlur,
      backgroundRadius,
      strokeWidth,
      agle,
    ]
  );

  const handleRgbChange = useCallback(
    throttle(100, (channel, value) => {
      const numValue = parseInt(value) || 0;
      const clampedValue = Math.max(0, Math.min(255, numValue));

      const currentColor = getCurrentColor();

      if (
        !currentColor ||
        currentColor.length !== 7 ||
        !currentColor.startsWith('#')
      ) {
        return;
      }

      const r = parseInt(currentColor.slice(1, 3), 16) || 0;
      const g = parseInt(currentColor.slice(3, 5), 16) || 0;
      const b = parseInt(currentColor.slice(5, 7), 16) || 0;

      let newR = r,
        newG = g,
        newB = b;
      if (channel === 'r') newR = clampedValue;
      if (channel === 'g') newG = clampedValue;
      if (channel === 'b') newB = clampedValue;

      const newHex = `#${newR.toString(16).padStart(2, '0')}${newG
        .toString(16)
        .padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;

      if (activeButton) {
        setButtonColors(prev => ({
          ...prev,
          [activeButton]: newHex,
        }));
        store.updateColorPickerButtonColor(activeButton, newHex);
      } else {
        setHexColor(newHex);
      }

      if (activeButton) {
        updateStyleByButton(store, isSubtitlesPanel, activeButton, newHex, {
          opacity: opacities[activeButton],
          shadowDistance,
          shadowBlur,
          backgroundRadius,
          strokeWidth,
          agle,
        });
      } else {
        onChange?.(newHex);
      }
    }),
    [
      activeButton,
      onChange,
      store,
      isSubtitlesPanel,
      opacities,
      shadowDistance,
      shadowBlur,
      backgroundRadius,
      strokeWidth,
      agle,
    ]
  );

  const handleMakeTransparent = useCallback(() => {
    const newTransparentState = !isTransparent;
    setIsTransparent(newTransparentState);
    if (activeButton) {
      // Set opacity to 0 or 100 based on new transparent state
      handleOpacityChange(
        { target: { value: String(newTransparentState ? 0 : 100) } },
        activeButton
      );
    } else if (isSubtitlesPanel) {
      const newOpacity = newTransparentState ? 0 : 100;
      const updateMethod = 'updateSubtitlesStyle';
      store[updateMethod]('shadowOpacity', newOpacity / 100);
      store[updateMethod]('shadowColor', hexToRgba(hexColor, newOpacity / 100));
    } else {

      const newOpacity = newTransparentState ? 0 : 100;
      setOpacity(newOpacity);
      const colorObj = parseColor(hexColor);
      const { r, g, b } = colorObj;
      onChange?.(`rgba(${r}, ${g}, ${b}, ${newOpacity / 100})`);
    }
  }, [
    activeButton,
    hexColor,
    onChange,
    handleOpacityChange,
    isTransparent,
    isSubtitlesPanel,
    store,
  ]);

  useEffect(() => {

    if (activeButton) {
      setIsTransparent(opacities[activeButton] === 0);
    } else {
      setIsTransparent(opacity === 0);
    }
  }, [activeButton, opacities, opacity]);

  useEffect(() => {
    const labels = ['R', 'G', 'B', 'Hex'];
    labels.forEach(label => {
      const labelId = `label-${label}`;
      setTimeout(() => calculateLabelWidth(labelId, label), 0);
    });
  }, []);

  useEffect(() => {
    if (color) {
      setHexColor(rgbaToHex(color));
    }
  }, [color]);

  const getCurrentSubtitleAnimation = useCallback(() => {
    if (!isSubtitlesPanel) return null;

    const subtitleElement = store.editorElements.find(
      el => el?.type === 'text' && el?.subType === 'subtitles'
    );

    if (!subtitleElement) return null;

    return store.animations.find(a => a.targetId === subtitleElement.id);
  }, [store.editorElements, store.animations, isSubtitlesPanel]);

  const currentSubtitleAnimation = getCurrentSubtitleAnimation();


  const isButtonDisabled = useCallback(
    option => {
      if (!isSubtitlesPanel) return false;

      const currentAnimation = currentSubtitleAnimation;

      if (option === 'Motion') {
        return !currentAnimation || currentAnimation.type !== 'textWordMotion';
      }

      if (option === 'Auto HL') {
        return (
          !currentAnimation || currentAnimation.type !== 'textWordHighlight'
        );
      }

      return false;
    },
    [isSubtitlesPanel, currentSubtitleAnimation]
  );

  const renderColorOption = useCallback(
    option => {
      const isDisabled = isButtonDisabled(option);

       const getCurrentButtonColor = () => {
        if (store && store.editorElements) {
          const currentElement = store.editorElements.find(
            element => element.type === 'text' || element.subType === 'subtitles'
          );
          
          if (currentElement && currentElement.properties) {
            const props = currentElement.properties;
            

            
            switch (option) {
              case 'Font':
                return props.color ? rgbaToHex(props.color) : buttonColors[option];
              case 'Fill':
                return props.backgroundColor ? rgbaToHex(props.backgroundColor) : buttonColors[option];
              case 'Outline':
                return props.strokeColor ? rgbaToHex(props.strokeColor) : buttonColors[option];
              case 'Shadow':
                // Для Shadow пріоритет має обраний користувачем колір
                return buttonColors[option] || (props.shadowColor ? rgbaToHex(props.shadowColor) : '#808080');
              case 'Auto HL':
                return props.highlightColor ? rgbaToHex(props.highlightColor) : buttonColors[option];
              case 'Motion':
                return props.motionColor ? rgbaToHex(props.motionColor) : buttonColors[option];
              default:
                return buttonColors[option];
            }
          }
        }
        return buttonColors[option];
      };

      return (
        <div
          key={option}
          className={`${styles.colorOption} ${
            activeButton === option ? styles.active : ''
          }`}
          onClick={() => handleButtonClick(option)}
        >
          <h4 className={styles.optionTitle}>
            {option}
            <InformationIcon size="6" color="rgba(255, 255, 255, 0.25)" />
          </h4>
          <div className={styles.buttonInputGroup}>
            <button
              className={`${styles.colorButton} ${
                activeButton === option ? styles.activeColorButton : ''
              } ${isDisabled ? styles.disabledButton : ''}`}
              onClick={e => {
                e.stopPropagation();
                handleButtonClick(option);
              }}
              style={{
                backgroundColor: getCurrentButtonColor(),
                border: 'none',
                cursor: 'pointer',
              }}
            />
            <div className={styles.inputWrapper}>
              <input
                ref={el => (percentageValueRefs.current[option] = el)}
                type="number"
                min="0"
                max="100"
                value={opacities[option]}
                onChange={e => !isDisabled && handleOpacityChange(e, option)}
                className={`${styles.percentageValue} ${
                  isDisabled ? styles.disabledInput : ''
                }`}
                onClick={e => e.stopPropagation()}
                data-button-type={option}
                style={{
                  cursor: 'text',
                }}
              />
              <span
                className={`${styles.percentageSymbol} ${
                  isDisabled ? styles.disabledSymbol : ''
                }`}
                style={{
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                %
              </span>
            </div>
          </div>
        </div>
      );
    },
    [
      buttonColors,
      handleButtonClick,
      activeButton,
      opacities,
      handleOpacityChange,
      store,
    ]
  );

  useEffect(() => {
    if (
      activeButton === 'Outline' &&
      outlineWidth === store.colorPickerState.strokeWidth
    ) {
      const firstTextElement = store.editorElements.find(
        element => element.type === 'text' || element.subType === 'subtitles'
      );
      if (firstTextElement) {
        const width = firstTextElement.properties?.stroke || strokeWidth;
        setOutlineWidth(width);
        store.updateColorPickerStrokeWidth(width);
      }
    }
  }, [activeButton, store, strokeWidth, outlineWidth]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (!activeButton) {
        const colorObj = parseColor(hexColor);
        const { r, g, b } = colorObj;
        const a = opacity / 100;
        onChange?.(`rgba(${r}, ${g}, ${b}, ${a})`);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hexColor, opacity, onChange, activeButton]);

  // Wheel event handlers for number inputs
  useEffect(() => {
    // Handle percentage value inputs (opacity inputs in color options)
    Object.values(percentageValueRefs.current).forEach(input => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(0, Math.min(100, newValue));


        const buttonType = input.dataset.buttonType;
        if (buttonType) {
          setOpacities(prev => ({ ...prev, [buttonType]: newValue }));
          handleOpacityChange({ target: { value: newValue } }, buttonType);
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        input.removeEventListener('wheel', handleWheel);
      };
    });
  }, [opacities, handleOpacityChange]);

  useEffect(() => {

    const cleanupFunctions = [];

    Object.entries(numberInputRefs.current).forEach(([label, input]) => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 100;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(min, Math.min(max, newValue));
    // Find the appropriate handler based on label
        const syntheticEvent = { target: { value: newValue.toString() } };

        switch (label) {
          case 'Distance':
            handleShadowDistanceChange(syntheticEvent);
            break;
          case 'Blur':
            handleShadowBlurChange(syntheticEvent);
            break;
          case 'Angle':
            handleAgleChange(syntheticEvent);
            break;
          case 'outlineWidth':
            handleStrokeWidthChange(syntheticEvent);
            break;
          default:
            break;
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() =>
        input.removeEventListener('wheel', handleWheel)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    shadowDistance,
    shadowBlur,
    agle,
    outlineWidth,
    handleShadowDistanceChange,
    handleShadowBlurChange,
    handleAgleChange,
    handleStrokeWidthChange,
  ]);

  useEffect(() => {

    Object.values(opacityInputRefs.current).forEach(input => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(0, Math.min(100, newValue));

        // Find which context this input belongs to
        const context = input.dataset.context;
        if (context === 'activeButton' && activeButton) {
          setOpacities(prev => ({ ...prev, [activeButton]: newValue }));
          handleOpacityChange({ target: { value: newValue } }, activeButton);
        } else if (context === 'main') {
          setOpacity(newValue);
          handleOpacityChange({ target: { value: newValue } });
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        input.removeEventListener('wheel', handleWheel);
      };
    });
  }, [activeButton, opacities, opacity, handleOpacityChange]);

  useEffect(() => {

    Object.values(colorInputRefs.current).forEach(input => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 255;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(min, Math.min(max, newValue));

        // Find which color channel this input belongs to
        const channel = input.dataset.channel;
        if (channel) {
          handleRgbChange(channel, newValue.toString());
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        input.removeEventListener('wheel', handleWheel);
      };
    });
  }, [hexColor]);

  useEffect(() => {
    const shadowSlider = shadowSliderRef.current;
    if (!shadowSlider) return;

    const handleShadowSliderWheel = e => {
      e.preventDefault();

      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = sliderValue;
      const stepVal = 1;

      let newValue = currentVal + direction * stepVal;
      newValue = Math.max(0, Math.min(100, newValue));

      setSliderValue(newValue);
      handleSliderChange({ target: { value: newValue } });
    };

    shadowSlider.addEventListener('wheel', handleShadowSliderWheel, {
      passive: false,
    });

    return () => {
      shadowSlider.removeEventListener('wheel', handleShadowSliderWheel);
    };
  }, [sliderValue, handleSliderChange]);

  // Wheel event handlers for shadow range inputs
  useEffect(() => {
    const cleanupFunctions = [];

    Object.entries(shadowRangeRefs.current).forEach(([label, input]) => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 100;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(min, Math.min(max, newValue));

        const syntheticEvent = { target: { value: newValue.toString() } };

        switch (label) {
          case 'Distance':
            handleShadowDistanceChange(syntheticEvent);
            break;
          case 'Blur':
            handleShadowBlurChange(syntheticEvent);
            break;
          case 'Angle':
            handleAgleChange(syntheticEvent);
            break;
          default:
            break;
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() =>
        input.removeEventListener('wheel', handleWheel)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    shadowDistance,
    shadowBlur,
    agle,
    handleShadowDistanceChange,
    handleShadowBlurChange,
    handleAgleChange,
  ]);


  useEffect(() => {
    const cleanupFunctions = [];

    Object.entries(opacityRangeRefs.current).forEach(([key, input]) => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(0, Math.min(100, newValue));

        const syntheticEvent = { target: { value: newValue.toString() } };

        if (key === 'main') {
          setOpacity(newValue);
          handleOpacityChange(syntheticEvent);
        } else if (key === 'activeButton' && activeButton) {
          setOpacities(prev => ({ ...prev, [activeButton]: newValue }));
          handleOpacityChange(syntheticEvent, activeButton);
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() =>
        input.removeEventListener('wheel', handleWheel)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [activeButton, opacities, opacity, handleOpacityChange]);

  // Wheel event handlers for round corners inputs
  useEffect(() => {
    const borderRadiusRange = borderRadiusRangeRef.current;
    if (!borderRadiusRange) return;

    const handleBorderRadiusRangeWheel = e => {
      e.preventDefault();
      
      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = backgroundRadius;
      const stepVal = 1;
      
      let newValue = currentVal + direction * stepVal;
      newValue = Math.max(0, Math.min(100, newValue));
      
      handleBackgroundRadiusChange({ target: { value: newValue.toString() } });
    };

    borderRadiusRange.addEventListener('wheel', handleBorderRadiusRangeWheel, { passive: false });
    
    return () => {
      borderRadiusRange.removeEventListener('wheel', handleBorderRadiusRangeWheel);
    };
  }, [backgroundRadius, handleBackgroundRadiusChange]);

  useEffect(() => {
    const borderRadiusInput = borderRadiusInputRef.current;
    if (!borderRadiusInput) return;

    const handleBorderRadiusInputWheel = e => {
      e.preventDefault();
      
      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = backgroundRadius;
      const stepVal = 1;
      
      let newValue = currentVal + direction * stepVal;
      newValue = Math.max(0, Math.min(100, newValue));
      
      handleBackgroundRadiusChange({ target: { value: newValue.toString() } });
    };

    borderRadiusInput.addEventListener('wheel', handleBorderRadiusInputWheel, { passive: false });
    
    return () => {
      borderRadiusInput.removeEventListener('wheel', handleBorderRadiusInputWheel);
    };
  }, [backgroundRadius, handleBackgroundRadiusChange]);

  useEffect(() => {
    // Handle opacity inputs in main opacity slider
    const cleanupFunctions = [];
    
    Object.values(opacityInputRefs.current).forEach(input => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(0, Math.min(100, newValue));

        // Find which context this input belongs to
        const context = input.dataset.context;
        if (context === 'activeButton' && activeButton) {
          setOpacities(prev => ({ ...prev, [activeButton]: newValue }));
          handleOpacityChange({ target: { value: newValue } }, activeButton);
        } else if (context === 'main') {
          setOpacity(newValue);
          handleOpacityChange({ target: { value: newValue } });
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() => {
        input.removeEventListener('wheel', handleWheel);
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [activeButton, opacities, opacity, handleOpacityChange]);

  useEffect(() => {
    // Handle color inputs (RGB values)
    const cleanupFunctions = [];
    
    Object.values(colorInputRefs.current).forEach(input => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 255;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(min, Math.min(max, newValue));

        // Find which color channel this input belongs to
        const channel = input.dataset.channel;
        if (channel) {
          handleRgbChange(channel, newValue.toString());
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() => {
        input.removeEventListener('wheel', handleWheel);
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [hexColor]);

  // Wheel event handler for shadow slider
  useEffect(() => {
    const shadowSlider = shadowSliderRef.current;
    if (!shadowSlider) return;

    const handleShadowSliderWheel = e => {
      e.preventDefault();

      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = sliderValue;
      const stepVal = 1;

      let newValue = currentVal + direction * stepVal;
      newValue = Math.max(0, Math.min(100, newValue));

      setSliderValue(newValue);
      handleSliderChange({ target: { value: newValue } });
    };

    shadowSlider.addEventListener('wheel', handleShadowSliderWheel, {
      passive: false,
    });

    return () => {
      shadowSlider.removeEventListener('wheel', handleShadowSliderWheel);
    };
  }, [sliderValue, handleSliderChange]);

  // Wheel event handlers for shadow range inputs
  useEffect(() => {
    const cleanupFunctions = [];

    Object.entries(shadowRangeRefs.current).forEach(([label, input]) => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 100;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(min, Math.min(max, newValue));

        // Find the appropriate handler based on label
        const syntheticEvent = { target: { value: newValue.toString() } };

        switch (label) {
          case 'Distance':
            handleShadowDistanceChange(syntheticEvent);
            break;
          case 'Blur':
            handleShadowBlurChange(syntheticEvent);
            break;
          case 'Angle':
            handleAgleChange(syntheticEvent);
            break;
          default:
            break;
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() =>
        input.removeEventListener('wheel', handleWheel)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    shadowDistance,
    shadowBlur,
    agle,
    handleShadowDistanceChange,
    handleShadowBlurChange,
    handleAgleChange,
  ]);

  // Wheel event handlers for opacity range inputs
  useEffect(() => {
    const cleanupFunctions = [];

    Object.entries(opacityRangeRefs.current).forEach(([key, input]) => {
      if (!input) return;

      const handleWheel = e => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const currentVal = parseInt(input.value) || 0;
        const stepVal = 1;

        let newValue = currentVal + direction * stepVal;
        newValue = Math.max(0, Math.min(100, newValue));

        const syntheticEvent = { target: { value: newValue.toString() } };

        if (key === 'main') {
          setOpacity(newValue);
          handleOpacityChange(syntheticEvent);
        } else if (key === 'activeButton' && activeButton) {
          setOpacities(prev => ({ ...prev, [activeButton]: newValue }));
          handleOpacityChange(syntheticEvent, activeButton);
        }
      };

      input.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFunctions.push(() =>
        input.removeEventListener('wheel', handleWheel)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [activeButton, opacities, opacity, handleOpacityChange]);
  // Sync shadow parameters when ColorPicker opens
  useEffect(() => {
    if (store && store.editorElements) {
      const currentElement = store.editorElements.find(
        element => element.type === 'text' || element.subType === 'subtitles'
      );
      
      if (currentElement && currentElement.properties) {
        const props = currentElement.properties;
        
        // Sync shadow parameters
        if (props.shadowBlur !== undefined) {
          setShadowBlur(props.shadowBlur);
        }
        if (props.shadowOffsetX !== undefined && props.shadowOffsetY !== undefined) {
          const distance = Math.sqrt(props.shadowOffsetX ** 2 + props.shadowOffsetY ** 2);
          setShadowDistance(Math.round(distance));
          
          if (distance > 0) {
            let angle = Math.atan2(props.shadowOffsetY, props.shadowOffsetX) * 180 / Math.PI;
            angle = ((angle % 360) + 360) % 360;
            setAgle(Math.round(angle));
          }
        }
        
        if (props.shadowBlur !== undefined && props.shadowOffsetX !== undefined && props.shadowOffsetY !== undefined) {
          const distance = Math.sqrt(props.shadowOffsetX ** 2 + props.shadowOffsetY ** 2);
          const normalizedBlur = props.shadowBlur / 2;
          const averageValue = Math.round((distance + normalizedBlur) / 2);
          setSliderValue(averageValue);
        }
      }
    }
  }, [store.editorElements]);

  useEffect(() => {


    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isCustomColorPanelOpen) {
        restoreState(initialState);
        setIsCustomColorPanelOpen(false);
      }
    };

    const handleGlobalClick = (event) => {
      
      if (isCustomColorPanelOpen) {
        const colorPickerPortal = event.target.closest('#colorPickerPortal');
        const isOnColorPicker = event.target.closest('.react-colorful') ||
          event.target.closest('[class*="ColorPicker"]') ||
          event.target.closest('[class*="colorPicker"]') ||
          event.target.closest('[class*="ChromePicker"]');
        
        if (!colorPickerPortal && !isOnColorPicker) {
          setTimeout(() => {
            if (isCustomColorPanelOpen) {
              restoreState(initialState);
              setIsCustomColorPanelOpen(false);
            }
          }, 0);
        }
      }
    };

    if (isCustomColorPanelOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('mousedown', handleGlobalClick, true); 
      document.addEventListener('touchstart', handleGlobalClick, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleGlobalClick, true);
      document.removeEventListener('touchstart', handleGlobalClick, true);
    };
  }, [isCustomColorPanelOpen, initialState, restoreState, handleClickOutside]);

  const newLocal = null;
  return (
    <div className={styles.container} data-testid="color-picker">
      <div className={styles.header}>
        <h3 className={styles.title}>
          {activeButton === 'Auto HL'
            ? 'Auto highlight'
            : activeButton || 'Auto highlight'}
        </h3>
        <button className={styles.closeButton} onClick={handleClose}>
          <CloseIcon size="14px" color="#C7CED1" hoverColor="#FFFFFF" />
        </button>
      </div>
      <div className={styles.contentWrapper}>
        <div
          className={`${styles.bottomSection} ${
            activeButton === 'Font' || activeButton === 'Motion'
              ? styles.noBorder
              : ''
          }`}
        >
          {OPTIONS.filter(option => {
            if (!isSubtitlesPanel) return true;
            return !isButtonDisabled(option);
          }).map(renderColorOption)}
        </div>
        {activeButton === 'Shadow' && (
          <div className={`${styles.shadowControls} ${styles.shadowPanel}`}>
            <div className={styles.shadowControlsCheckbox}>
              <div className={styles.checkbox} />
              <input
                ref={shadowSliderRef}
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                onMouseDown={handleShadowDragStart}
                onTouchStart={handleShadowDragStart}
                className={`${styles.slider} ${
                  isDraggingShadow ? styles.dragging : ''
                }`}
                style={{ '--value': `${sliderValue}%` }}
                title="Drag to adjust Distance and Blur simultaneously"
              />
              <div className={styles.squareShadowIcon}>
                <SquareShadow size="16px" color="#fff" />
              </div>
            </div>
            {[
              {
                label: 'Distance',
                min: 0,
                max: 100,
                value: shadowDistance,
                onChange: handleShadowDistanceChange,
                valueStyle: shadowDistance,
              },
              {
                label: 'Blur',
                min: 0,
                max: 200,
                value: shadowBlur,
                onChange: handleShadowBlurChange,
                valueStyle: (shadowBlur / 200) * 100,
              },
              {
                label: 'Angle',
                min: -180,
                max: 180,
                value: agle,
                onChange: handleAgleChange,
                valueStyle: ((agle + 180) / 360) * 100,
              },
            ].map(({ label, min, max, value, onChange, valueStyle }) => (
              <div key={label} className={styles.shadowControl}>
                <label>{label}</label>
                <div className={styles.inputsContainer}>
                  <input
                    ref={el => (shadowRangeRefs.current[label] = el)}
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={onChange}
                    className={styles.rangeInput}
                    style={{ '--value': `${valueStyle}%` }}
                  />
                  <input
                    ref={el => (numberInputRefs.current[label] = el)}
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={onChange}
                    className={styles.numberInput}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeButton === 'Fill' && (
          <>
            <div className={styles.fillContainer}>
              <div className={styles.fillSegment}>
                <button
                  className={styles.fillButtonLarge}
                  onClick={() => {
                    setBackgroundRadius(0);
                    store.updateColorPickerBackgroundRadius(0);
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('backgroundRadius', 0);
                    }
                  }}
                ></button>
                <button
                  className={styles.fillButtonSmall}
                  onClick={() => {
                    setBackgroundRadius(30);
                    store.updateColorPickerBackgroundRadius(30);
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('backgroundRadius', 30);
                    }
                  }}
                ></button>
              </div>
              <div className={styles.fillDivider}></div>
              <div className={styles.fillSegment}>
                <button
                  className={styles.fillButtonLargeRounded}
                  onClick={() => {
                    setBackgroundRadius(15);
                    store.updateColorPickerBackgroundRadius(15);
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('backgroundRadius', 15);
                    }
                  }}
                ></button>
                <button
                  className={styles.fillButtonSmallRounded}
                  onClick={() => {
                    setBackgroundRadius(20);
                    store.updateColorPickerBackgroundRadius(20);
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('backgroundRadius', 20);
                    }
                  }}
                ></button>
              </div>
              <div className={styles.fillDivider}></div>
              <div className={styles.fillSegment}>
                <button
                  className={styles.fillButtonTallRounded}
                  onClick={() => {
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('fillMode', 'words');
                    }
                  }}
                ></button>
              </div>
              <div className={styles.fillDivider}></div>
              <div className={styles.fillSegment}>
                <button
                  className={styles.fillButtonTall}
                  onClick={() => {
                    if (isSubtitlesPanel) {
                      store.updateSubtitlesStyle('fillMode', 'block');
                    }
                  }}
                ></button>
              </div>
            </div>
            
            {/* Round corners controls - visible only when Fill is active */}
            <div className={styles.shadowControls}>
              <div className={styles.shadowControl}>
                <label className={styles.roundCornersLabel}>Round corners</label>
                                 <input
                   ref={borderRadiusRangeRef}
                   type="range"
                   min="0"
                   max="100"
                   step="1"
                   value={backgroundRadius}
                   onChange={handleBackgroundRadiusChange}
                   className={`${styles.rangeInput} ${styles.roundCornersRangeInput}`}
                   style={{
                     '--value': `${backgroundRadius}%`,
                   }}
                 />
                <input
                  ref={borderRadiusInputRef}
                  type="text"
                  value={isBorderRadiusEditing ? borderRadiusInputValue : `${backgroundRadius}px`}
                  onChange={handleBorderRadiusNumberChange}
                  onBlur={handleBorderRadiusInputBlur}
                  onClick={handleBorderRadiusInputClick}
                  className={`${styles.numberInput} ${isBorderRadiusEditing ? styles.editing : ''}`}
                />
              </div>
            </div>
            
            {newLocal}
          </>
        )}
        {activeButton === 'Outline' && (
          <div className={styles.shadowControls}>
            <div className={styles.shadowControl}>
              <label className={styles.outlineTitle}>/</label>
              <input
                type="range"
                min="0"
                max="100"
                value={outlineWidth}
                onChange={handleStrokeWidthChange}
                className={styles.rangeInput}
                style={{
                  '--value': `${outlineWidth}%`,
                }}
              />
              <SlashIcon size="12px" color="#fff" />

              <input
                ref={el => (numberInputRefs.current['outlineWidth'] = el)}
                type="number"
                min="0"
                max="100"
                value={outlineWidth}
                onChange={handleStrokeWidthChange}
                className={styles.numberInput}
              />
            </div>
          </div>
        )}
        

        
        {/* {activeButton === 'Font' && (
          <div className={styles.shadowControls}>
            <div className={styles.shadowControl}>
              <label>Opacity</label>
              <input
                type="range"
                min="0"
                max="100"
                value={opacities.Font}
                onChange={e => handleOpacityChange(e, activeButton || 'Font')}
                className={styles.rangeInput}
                style={{
                  '--value': `${opacities.Font}%`,
                }}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={opacities.Font}
                onChange={handleOpacityChange}
                className={styles.numberInput}
              />
            </div>
          </div>
        )} */}
        {activeButton !== 'Shadow' &&
          activeButton !== 'Fill' &&
          activeButton !== 'Outline' &&
          activeButton !== 'Motion' &&
          activeButton !== 'Font' && (
            <div className={styles.highlightStyleSection}>
              <h4 className={styles.highlightStyleTitle}>Highlight style</h4>
              <div className={styles.fontStyleBox}>
                <div
                  className={`${styles.styleBtn} ${
                    isItalicActive ? styles.active : ''
                  }`}
                  role="button"
                  aria-label="Italic"
                  onClick={toggleItalic}
                >
                  <FontWeightItalic size="8px" color="#F1F1F1" />
                </div>
                <div
                  className={`${styles.styleBtn} ${
                    isBoldActive ? styles.active : ''
                  }`}
                  role="button"
                  aria-label="Bold"
                  onClick={toggleBold}
                >
                  <FontWeightBold size="8px" color="#F1F1F1" />
                </div>
              </div>
            </div>
          )}
        <div className={styles.transparentContainer}>
          <div
            className={styles.transparentTextContainer}
            onClick={handleMakeTransparent}
            style={{ cursor: 'pointer' }}
          >
            <div
              className={`${styles.transparentButton} ${
                isTransparent ? styles.checked : ''
              }`}
            >
              {isTransparent && (
                <CheckIcon size="10" color="rgba(255, 255, 255, 0.9)" />
              )}
            </div>
            <h5 className={styles.transparentText}>Make it transparent</h5>
          </div>
          <div className={styles.buttonsContainer}>
            {Array.from({ length: 32 }, (_, index) => {
              const firstRowColors = [
                '#0a0d11',
                '#522500',
                '#641220',
                '#cc5803',
                '#a47e1b',
                '#155d27',
                '#03045e',
                '#ffffff',
              ];

              const secondRowColors = [
                '#3b4350',
                '#8f3e00',
                '#a11d33',
                '#ff9505',
                '#c9a227',
                '#25a244',
                '#023e8a',
                '#e9ecef',
              ];

              const thirdRowColors = [
                '#8b929f',
                '#da7e37',
                '#f38375',
                '#ffb627',
                '#fad643',
                '#6ede8a',
                '#48cae4',
                '#dee2e6',
              ];

              const fourthRowColors = [
                '#ffffff',
                '#ffd1ad',
                '#ffe0dc',
                '#ffc971',
                '#fee998',
                '#b7efc5',
                '#caf0f8',
                '#adb5bd',
              ];

              let backgroundColor = '#0a0d11';
              if (index < 8) {
                backgroundColor = firstRowColors[index];
              } else if (index < 16) {
                backgroundColor = secondRowColors[index - 8];
              } else if (index < 24) {
                backgroundColor = thirdRowColors[index - 16];
              } else if (index < 32) {
                backgroundColor = fourthRowColors[index - 24];
              }

              return (
                <button
                  key={index}
                  className={styles.colorButton}
                  style={{
                    borderRadius: '24px',
                    padding: '5px',
                    width: '16px',
                    height: '16px',
                    backgroundColor: backgroundColor,
                    position: 'relative',
                  }}
                  onClick={() => handleColorButtonClick(backgroundColor)}
                >
                  {selectedColor === backgroundColor && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                      }}
                    >
                      <CheckIcon size="8px" color="#F1F1F1" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className={styles.customSection}>
            <h5 className={styles.customTitle}>Custom</h5>
            <div className={styles.customButtonsContainer}>
              {customColors.map((color, index) => (
                <button
                  key={index}
                  className={styles.customColorButton}
                  style={{
                    borderRadius: '24px',
                    padding: '5px',
                    width: '16px',
                    height: '16px',
                    backgroundColor: color,
                    position: 'relative',
                  }}
                  onClick={() => handleColorButtonClick(color)}
                >
                  {selectedColor === color && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                      }}
                    >
                      <CheckIcon size="8px" color="#F1F1F1" />
                    </div>
                  )}
                </button>
              ))}
              <button
                className={`${styles.customColorButton} ${styles.plusButton}`}
                onClick={handleCustomColorPanelClick}
              >
                <PlusIcon size="30px" color="rgba(255, 255, 255, 0.4)" />
              </button>
            </div>
          </div>
          <div className={styles.opacityContainer}>
            <div
              className={`${styles.styleBtn} ${styles.pipetteBtn}`}
              role="button"
              aria-label="Color Picker"
              onClick={handlePipetteClick}
            >
              <PipetteIcon size="12px" color="rgba(255, 255, 255, 0.6)" />
            </div>
          </div>
        </div>
        <div className={styles.opacitySliderWrapper}>
          {activeButton && (
            <div className={styles.opacitySliderControls}>
              <div className={styles.opacityInputWrapper}>
                <input
                  ref={el => (opacityInputRefs.current['activeButton'] = el)}
                  type="text"
                  value={`${opacities[activeButton]}%`}
                  onChange={e => {
                    const value = e.target.value.replace('%', '');
                    const numValue = parseInt(value) || 0;
                    if (numValue >= 0 && numValue <= 100) {
                      handleOpacityChange({ target: { value: numValue } }, activeButton);
                    }
                  }}
                  className={styles.opacityInput}
                  placeholder="100%"
                  data-context="activeButton"
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacities[activeButton]}
                onChange={e => handleOpacityChange(e, activeButton)}
                className={styles.opacityRangeInput}
                style={{
                  '--value': `${opacities[activeButton]}%`,
                  '--current-color': buttonColors[activeButton],
                }}
                ref={el => (opacityRangeRefs.current['activeButton'] = el)}
                data-button-type={activeButton}
              />
            </div>
          )}
        </div>
      </div>

      {isCustomColorPanelOpen && (
        <div className={styles.customPanel}>
          <div className={styles.colorPickerContainer}>
            <HexColorPicker
              color={getCurrentColor()}
              onChange={handleColorChange}
              className={styles.hexColorPicker}
            />
            <div className={styles.colorInputs}>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label ref={el => (labelRefs.current['label-Hex'] = el)}>
                    Hex
                  </label>
                  <input
                    type="text"
                    value={getCurrentColor()}
                    onChange={handleHexInputChange}
                    onBlur={handleHexInputBlur}
                    className={styles.colorInput}
                    maxLength={7}
                    style={{
                      '--clip-path': getLabelClipPath('label-Hex'),
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label ref={el => (labelRefs.current['label-R'] = el)}>
                    R
                  </label>
                  <input
                    ref={el => (colorInputRefs.current['r'] = el)}
                    type="number"
                    min="0"
                    max="255"
                    value={
                      getCurrentColor() && getCurrentColor().length === 7
                        ? Math.round(
                            parseInt(getCurrentColor().slice(1, 3), 16) || 0
                          )
                        : 0
                    }
                    onChange={e => handleRgbChange('r', e.target.value)}
                    className={styles.colorInput}
                    style={{
                      '--clip-path': getLabelClipPath('label-R'),
                    }}
                    data-channel="r"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label ref={el => (labelRefs.current['label-G'] = el)}>
                    G
                  </label>
                  <input
                    ref={el => (colorInputRefs.current['g'] = el)}
                    type="number"
                    min="0"
                    max="255"
                    value={
                      getCurrentColor() && getCurrentColor().length === 7
                        ? Math.round(
                            parseInt(getCurrentColor().slice(3, 5), 16) || 0
                          )
                        : 0
                    }
                    onChange={e => handleRgbChange('g', e.target.value)}
                    className={styles.colorInput}
                    style={{
                      '--clip-path': getLabelClipPath('label-G'),
                    }}
                    data-channel="g"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label ref={el => (labelRefs.current['label-B'] = el)}>
                    B
                  </label>
                  <input
                    ref={el => (colorInputRefs.current['b'] = el)}
                    type="number"
                    min="0"
                    max="255"
                    value={
                      getCurrentColor() && getCurrentColor().length === 7
                        ? Math.round(
                            parseInt(getCurrentColor().slice(5, 7), 16) || 0
                          )
                        : 0
                    }
                    onChange={e => handleRgbChange('b', e.target.value)}
                    className={styles.colorInput}
                    style={{
                      '--clip-path': getLabelClipPath('label-B'),
                    }}
                    data-channel="b"
                  />
                </div>
              </div>
            </div>

            <div className={styles.opacitySlider}>
              <div className={styles.opacitySliderControls}>
                <div className={styles.opacityInputWrapper}>
                  <input
                    ref={el => (opacityInputRefs.current['main'] = el)}
                    type="text"
                    value={`${opacity}%`}
                    onChange={e => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseInt(value) || 0;
                      if (numValue >= 0 && numValue <= 100) {
                        handleOpacityChange({ target: { value: numValue } });
                      }
                    }}
                    className={styles.opacityInput}
                    placeholder="100%"
                    data-context="main"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={e => handleOpacityChange(e)}
                  className={styles.opacityRangeInput}
                  style={{
                    '--value': `${opacity}%`,
                    '--current-color': hexColor,
                  }}
                  ref={el => (opacityRangeRefs.current['main'] = el)}
                  data-context="main"
                />
              </div>
            </div>
            <div className={styles.customPanelButtons}>
              <button
                className={styles.customPanelButton}
                onClick={handleCancelClick}
              >
                Cancel
              </button>
              <button
                className={`${styles.customPanelButton} ${styles.okButton}`}
                onClick={handleOkClick}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
