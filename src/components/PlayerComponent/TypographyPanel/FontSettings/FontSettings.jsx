import styles from './FontSettings.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { ButtonWithDropdown } from 'components/ButtonWithDropdown/ButtonWithDropdown';
import { ArrowDownIcon } from 'components/Icons';
import FontWeightBold from 'components/Icons/FontWeightBold';
import FontWeightItalic from 'components/Icons/FontWeightItalic';
import DropDownIcon from 'components/Icons/DropDownIcon';
import UppercaseIcon from 'components/Icons/UppercaseIcon';
import CapitalizeIcon from 'components/Icons/CapitalizeIcon';
import LowercaseIcon from 'components/Icons/LowercaseIcon';
import { InputWithSections } from 'components/PlayerComponent/TypographyPanel/InputWithSections/InputWithSections';
import { useState, useContext, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from '../../../../mobx';
import { useGoogleFontsList } from '../../../../hooks/useGoogleFontsList';
import WebFont from 'webfontloader';
import Select from 'react-select';
import { useInputScroll } from '../../../../hooks/useInputScroll';
import { runInAction } from 'mobx';

const textPosition = [
  { type: 'right', icon: 'LeftTextIcon' },
  { type: 'center', icon: 'CenterTextIcon' },
  { type: 'left', icon: 'RightTextIcon' },
];

const textAlign = [
  { type: 'top', icon: 'BottomTextIcon' },
  { type: 'center', icon: 'CenterAlignTextIcon' },
  { type: 'bottom', icon: 'TopTextIcon' },
];

const fontWeightOptions = [
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
];

const fontSizes = [
  '8',
  '10',
  '12',
  '14',
  '16',
  '18',
  '20',
  '24',
  '28',
  '32',
  '36',
  '40',
  '48',
  '56',
  '64',
  '72',
  '80',
  '96',
  '106',
  '128',
];
const fonts = ['Bangers', 'Arial', 'Helvetica', 'Times New Roman', 'Verdana'];

const options = ['1', '2', '3'];

const getFirstTextElement = store => {
  return store.editorElements.find(
    element => element.type === 'text' || element.subType === 'subtitles'
  );
};

const TextCaseSettings = observer(() => {
  const store = useContext(StoreContext);
  const caseOptions = [
    { label: 'Normal', value: 'none' },
    { label: 'UPPERCASE', value: 'uppercase' },
    { label: 'lowercase', value: 'lowercase' },
    { label: 'Capitalize', value: 'capitalize' },
  ];

  const currentValue = store.subtitlesPanelState.textCase || 'none';
  const currentOption =
    caseOptions.find(option => option.value === currentValue) || caseOptions[0];

  const handleCaseChange = async value => {
    await store.setTextCase(value);
  };

  return (
    <div className={styles.caseSettings}>
      <ButtonWithDropdown
        list={caseOptions.map(option => option.label)}
        currentItem={currentOption.label}
        onSelect={label => {
          const option = caseOptions.find(opt => opt.label === label);
          handleCaseChange(option.value);
        }}
        classNameButton={styles.list_btn}
        classNameDropdownItem={styles.list_item}
        dataTestid="text-case-dropdown"
      >
        <ArrowDownIcon
          size="12px"
          color="rgba(255, 255, 255, 0.4)"
          className={styles.arrow_icon}
        />
      </ButtonWithDropdown>
    </div>
  );
});

const WordSpacingSettings = observer(() => {
  const store = useContext(StoreContext);
  const spacingOptions = [
    { label: 'Extra Small', value: -2 },
    { label: 'Small', value: 0 },
    { label: 'Medium', value: 3 },
    { label: 'Large', value: 5 },
    { label: 'Extra Large', value: 7 },
  ];

  const currentValue = store.subtitlesPanelState.wordSpacingFactor;
  const currentOption =
    spacingOptions.find(option => option.value === currentValue) ||
    spacingOptions[2];

  const handleSpacingChange = async value => {
    await store.setWordSpacing(Number(value));
  };

  return (
    <div className={styles.spacingSettings}>
      <ButtonWithDropdown
        list={spacingOptions.map(option => option.label)}
        currentItem={currentOption.label}
        onSelect={label => {
          const option = spacingOptions.find(opt => opt.label === label);
          handleSpacingChange(option.value);
        }}
        classNameButton={styles.list_btn}
        classNameDropdownItem={styles.list_item}
        dataTestid="word-spacing-dropdown"
      >
        <ArrowDownIcon
          size="12px"
          color="rgba(255, 255, 255, 0.4)"
          className={styles.arrow_icon}
        />
      </ButtonWithDropdown>
    </div>
  );
});

const FontSettings = observer(({ item, isSubtitlesPanel }) => {
  const store = useContext(StoreContext);
  const [activeItem, setActiveItem] = useState(null);
  const [selectedFont, setSelectedFont] = useState('');
  const [selectedFontWeight, setSelectedFontWeight] = useState('');
  const [selectedFontSize, setSelectedFontSize] = useState('');
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [activeHorizontalAlign, setActiveHorizontalAlign] = useState(null);
  const [activeVerticalAlign, setActiveVerticalAlign] = useState(null);
  const [selectedOption, setSelectedOption] = useState('1');
  const [isFontSizeInputMode, setIsFontSizeInputMode] = useState(false);
  const [customFontSize, setCustomFontSize] = useState('');
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isSpacingPanelOpen, setIsSpacingPanelOpen] = useState(false);
  const [wordSpacingValue, setWordSpacingValue] = useState(0);
  const [lineHeightValue, setLineHeightValue] = useState(100); 
  const [letterSpacingValue, setLetterSpacingValue] = useState(0);
  const fontSizeInputRef = useRef(null);
  const loaded = useRef(new Set());

  const { fonts, loading, error } = useGoogleFontsList();

  const fontOptions = fonts.map(f => {
    const [family] = f.split(':');
    return { value: f, label: family };
  });

  const getFontSupport = fontFamily => {
    const selectedFontOption = fontOptions.find(
      option => option.label === fontFamily
    );
    if (!selectedFontOption)
      return { supportsBold: true, supportsItalic: true };

    const variants = selectedFontOption.value.split(':')[1]?.split(',') || [];

    const supportsBold = variants.some(
      variant =>
        variant.includes('700') ||
        variant.includes('bold') ||
        variant.includes('800') ||
        variant.includes('900')
    );

    const supportsItalic = variants.some(
      variant =>
        variant.includes('italic') ||
        variant.includes('i') ||
        variant.includes('300i') ||
        variant.includes('400i') ||
        variant.includes('500i') ||
        variant.includes('600i') ||
        variant.includes('700i') ||
        variant.includes('800i') ||
        variant.includes('900i')
    );

    return { supportsBold, supportsItalic };
  };

  const { supportsBold, supportsItalic } = getFontSupport(selectedFont);

  const getTextCaseIcon = () => {
    const currentTextCase = store.subtitlesPanelState.textCase || 'none';

    switch (currentTextCase) {
      case 'uppercase':
        return <UppercaseIcon size="14px" color="var(--accent-color)" />;
      case 'lowercase':
        return <LowercaseIcon size="14px" color="var(--accent-color)" />;
      case 'capitalize':
        return <CapitalizeIcon size="14px" color="var(--accent-color)" />;

        case 'none':
      default:
        return <div style={{ width: '14px', height: '2px', backgroundColor: 'var(--accent-color)' }} />;
    }
  };

  // Word spacing handlers
  const handleWordSpacingChange = async value => {
    // Clamp value between -40 and 40
    const numericValue = Math.max(-40, Math.min(40, Number(value)));
    setWordSpacingValue(numericValue);

    try {
      await store.setWordSpacing(numericValue);
    } catch (error) {
      console.error('Error setting word spacing:', error);
    }
  };

  const handleWordSpacingRangeChange = e => {
    const value = e.target.value;
    setWordSpacingValue(Number(value));
  };

  const handleWordSpacingRangeChangeEnd = e => {
    const value = e.target.value;
    handleWordSpacingChange(value);
  };


  const handleLetterSpacingChange = async value => {
    const numericValue = Number(value);
    setLetterSpacingValue(numericValue);

    try {
      await store.setLetterSpacing(numericValue);
    } catch (error) {
      console.error('Error setting letter spacing:', error);
    }
  };

  const handleLetterSpacingRangeChange = e => {
    const value = e.target.value;
    setLetterSpacingValue(Number(value));
  };

  const handleLetterSpacingRangeChangeEnd = e => {
    const value = e.target.value;
    handleLetterSpacingChange(value);
  };



  useEffect(() => {
    if (isSubtitlesPanel) {
      const currentSpacing = store.subtitlesPanelState?.wordSpacingFactor || 0;
      setWordSpacingValue(currentSpacing);
    }
  }, [isSubtitlesPanel, store.subtitlesPanelState?.wordSpacingFactor]);

  useEffect(() => {
    if (isSubtitlesPanel) {
      const currentLetterSpacing =
        store.subtitlesPanelState?.letterSpacingFactor || 0;
      setLetterSpacingValue(currentLetterSpacing);
    }
  }, [isSubtitlesPanel, store.subtitlesPanelState?.letterSpacingFactor]);

  // Line height handlers
  const handleLineHeightChange = async value => {
    const numericValue = Number(value);
    setLineHeightValue(numericValue);

    try {
      await store.setLineHeight(numericValue / 100); 
    } catch (error) {
      console.error('Error setting line height:', error);
    }
  };

  const handleLineHeightRangeChange = e => {
    const value = e.target.value;
    setLineHeightValue(Number(value));
  };

  const handleLineHeightRangeChangeEnd = e => {
    const value = e.target.value;
    handleLineHeightChange(Number(value)); // Pass percentage directly
  };

  const [isLineHeightEditing, setIsLineHeightEditing] = useState(false);
  const [lineHeightInputValue, setLineHeightInputValue] = useState('');

  const handleLineHeightNumberChange = e => {
    const value = e.target.value;
    const cleanValue = value.replace('%', '').trim();
    setLineHeightInputValue(cleanValue);
  };

  const handleLineHeightInputBlur = () => {
    const cleanValue = lineHeightInputValue.replace('%', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      // Ensure minimum value is 10px, maximum is 100px
      const clampedValue = Math.max(10, Math.min(100, numericValue));
      setLineHeightInputValue(clampedValue.toString());
      handleLineHeightChange(clampedValue);
    } else {
      // If invalid input, reset to current value or minimum of 10
      const fallbackValue = Math.max(10, lineHeightValue);
      setLineHeightInputValue(fallbackValue.toString());
      handleLineHeightChange(fallbackValue);
    }
    setIsLineHeightEditing(false);
  };

  const handleLineHeightInputClick = () => {
    setIsLineHeightEditing(true);
    setLineHeightInputValue(lineHeightValue.toString());
  };

  const [isLetterSpacingEditing, setIsLetterSpacingEditing] = useState(false);
  const [letterSpacingInputValue, setLetterSpacingInputValue] = useState('');

  const handleLetterSpacingNumberChange = e => {
    const value = e.target.value;
    const cleanValue = value.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(0, Math.min(100, numericValue));
      setLetterSpacingInputValue(clampedValue.toString());
      handleLetterSpacingChange(clampedValue);
    } else {
      setLetterSpacingInputValue(cleanValue);
    }
  };

  const handleLetterSpacingInputBlur = () => {
    const cleanValue = letterSpacingInputValue.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(0, Math.min(100, numericValue));
      setLetterSpacingInputValue(clampedValue.toString());
      handleLetterSpacingChange(clampedValue);
    } else {
      setLetterSpacingInputValue(letterSpacingValue.toString());
    }
    setIsLetterSpacingEditing(false);
  };

  const handleLetterSpacingInputClick = () => {
    setIsLetterSpacingEditing(true);
    setLetterSpacingInputValue(letterSpacingValue.toString());
  };

  const [isWordSpacingEditing, setIsWordSpacingEditing] = useState(false);
  const [wordSpacingInputValue, setWordSpacingInputValue] = useState('');

  const lineHeightRangeRef = useRef(null);
  const letterSpacingRangeRef = useRef(null);
  const wordSpacingRangeRef = useRef(null);

  const lineHeightInputRef = useRef(null);
  const letterSpacingInputRef = useRef(null);
  const wordSpacingInputRef = useRef(null);

  useInputScroll({
    min: 10,
    max: 100,
    step: 3,
    currentValue: lineHeightValue || 100,
    onChange: (value) => {
      runInAction(() => {
        setLineHeightValue(value);
      });
      store.setLineHeight(value / 100);
    },
    ref: lineHeightRangeRef
  });

  useInputScroll({
    min: 0,
    max: 100,
    step: 3,
    currentValue: letterSpacingValue || 0,
    onChange: (value) => {
      runInAction(() => {
        setLetterSpacingValue(value);
      });
      store.setLetterSpacing(value);
    },
    ref: letterSpacingRangeRef
  });

  useInputScroll({
    min: -40,
    max: 40,
    step: 3,
    currentValue: wordSpacingValue || 0,
    onChange: (value) => {
      runInAction(() => {
        setWordSpacingValue(value);
      });
      store.setWordSpacing(value);
    },
    ref: wordSpacingRangeRef
  });

  useInputScroll({
    min: 10,
    max: 100,
    step: 3,
    currentValue: lineHeightValue || 100,
    onChange: (value) => {
      runInAction(() => {
        setLineHeightValue(value);
        setLineHeightInputValue(value.toString());
      });
      store.setLineHeight(value / 100);
    },
    ref: lineHeightInputRef
  });

  useInputScroll({
    min: 0,
    max: 100,
    step: 3,
    currentValue: letterSpacingValue || 0,
    onChange: (value) => {
      runInAction(() => {
        setLetterSpacingValue(value);
        setLetterSpacingInputValue(value.toString());
      });
      store.setLetterSpacing(value);
    },
    ref: letterSpacingInputRef
  });

  useInputScroll({
    min: -40,
    max: 40,
    step: 3,
    currentValue: wordSpacingValue || 0,
    onChange: (value) => {
      runInAction(() => {
        setWordSpacingValue(value);
        setWordSpacingInputValue(value.toString());
      });
      store.setWordSpacing(value);
    },
    ref: wordSpacingInputRef
  });

  useEffect(() => {
    if (isSubtitlesPanel) {
      const currentLineHeight =
        (store.subtitlesPanelState?.lineHeightFactor || 1.0) * 100;
      // Ensure minimum value is 10px, maximum is 100px
      const clampedValue = Math.max(10, Math.min(100, currentLineHeight));
      setLineHeightValue(clampedValue);
    }
  }, [isSubtitlesPanel, store.subtitlesPanelState?.lineHeightFactor]);

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      fontFamily: state.data.label,
      backgroundColor: state.isSelected
        ? 'rgba(255, 255, 255, 0.08)'
        : 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '2px 16px 2px 16px',
      minHeight: '24px',
      height: 'auto',
      fontSize: '12px',
      lineHeight: '1.2',
      letterSpacing: '0.01em',
      whiteSpace: 'normal',
      wordWrap: 'break-word',

      ':hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        color: '#ffffff',
      },
      '&:active': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
      },
    }),
    control: provided => ({
      ...provided,
      backgroundColor: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '8px',
      padding: '0px 8px 0px 12px',
      width: '118px',
      height: '32px',
      minHeight: '32px',
      boxShadow: 'none',
      display: 'flex',
      alignItems: 'center',
      ':hover': {
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    }),
    singleValue: (provided, state) => ({
      ...provided,
      fontFamily: state.data.label,
      fontWeight: '400',
      fontSize: '12px',
      lineHeight: '1',
      letterSpacing: '0.02em',
      color: '#fff',
      padding: '0',
      marginLeft: '0px',
    }),
    menu: provided => ({
      ...provided,
      zIndex: 9999,
      borderRadius: '12px',
      padding: '8px 0px',
      background: 'rgba(8, 24, 35, 0.56)',
      paddingTop: '0px',
    }),
    input: provided => ({
      ...provided,
      color: '#fff',
      background: 'transparent',
      boxShadow: 'none',
      fontFamily: '"General Sans Variable", sans-serif',
      fontWeight: '400',
      fontSize: '12px',
      lineHeight: '1',
      letterSpacing: '0.02em',
      marginLeft: '0px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 8px',
    }),
    valueContainer: provided => ({
      ...provided,
      padding: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      width: '70px',
      maxWidth: '70px',
    }),
    indicatorsContainer: provided => ({
      ...provided,
      display: 'flex',
      alignItems: 'center',
      paddingRight: '6px',
      paddingTop: '3px',
    }),
    menuList: provided => ({
      ...provided,
      padding: '0',
      margin: '0',
      backdropFilter: 'blur(10px)',
    }),
  };

  useEffect(() => {
    if (isSubtitlesPanel) {
      const firstTextElement = getFirstTextElement(store);
      setSelectedFont(firstTextElement?.properties?.font || 'Bangers');
      setSelectedFontWeight(
        fontWeightOptions.find(
          option =>
            option.value ===
            firstTextElement?.properties?.fontWeight?.toString()
        )?.label || 'Normal'
      );
      setSelectedFontSize(
        firstTextElement?.properties?.fontSize.toString() || '106'
      );
      setIsBoldActive(firstTextElement?.properties?.fontWeight >= 700 || false);
      const isItalic =
        firstTextElement?.properties?.fontStyle === 'italic' || false;
      setIsItalicActive(isItalic);
      setActiveHorizontalAlign(firstTextElement?.properties?.textAlign || null);
      setActiveVerticalAlign(
        firstTextElement?.properties?.verticalAlign || null
      );
    } else {
      setSelectedFontSize('16');
    }
  }, [isSubtitlesPanel]);

  const onSelectFont = selectedOption => {
    const familyWithVariants = selectedOption.value;
    const family = selectedOption.label;

    setSelectedFont(family);

    const { supportsBold: newSupportsBold, supportsItalic: newSupportsItalic } =
      getFontSupport(family);

    if (!newSupportsBold && isBoldActive) {
      setIsBoldActive(false);
      if (isSubtitlesPanel) {
        store.updateSubtitlesStyle('fontWeight', '400');
      } else {
        store.updateTextStyle('fontWeight', '400');
      }
    }

    if (!newSupportsItalic && isItalicActive) {
      setIsItalicActive(false);
      if (isSubtitlesPanel) {
        store.updateSubtitlesStyle('fontStyle', 'normal');
      } else {
        store.updateTextStyle('fontStyle', 'normal');
      }
    }

    if (!familyWithVariants || loaded.current.has(familyWithVariants)) {
      if (isSubtitlesPanel) {
        store.updateSubtitlesStyle('font', family);
      } else {
        store.updateTextStyle('font', family);
      }
      return;
    }

    WebFont.load({
      google: { families: [familyWithVariants] },
      active: () => {
        loaded.current.add(familyWithVariants);
        if (isSubtitlesPanel) {
          store.updateSubtitlesStyle('font', family);
        } else {
          store.updateTextStyle('font', family);
        }
      },
    });
  };

  const onSelectFontWeight = weight => {
    const weightLabel =
      fontWeightOptions.find(option => option.value === weight)?.label ||
      'Normal';

    setSelectedFontWeight(weightLabel);

    setIsBoldActive(parseInt(weight, 10) >= 700);

    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('fontWeight', weight);
    } else {
      store.updateTextStyle('fontWeight', weight);
    }
  };

  const onSelectFontSize = size => {
    setSelectedFontSize(size);
    setIsFontSizeInputMode(false);
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('fontSize', size);
    } else {
      store.updateTextStyle('fontSize', size);
    }
  };

  const onSelectOption = option => {
    setSelectedOption(option);
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('option', option);
    } else {
      store.updateTextStyle('option', option);
    }
  };

  const onClickTextAlign = type => {
    setActiveHorizontalAlign(type);
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('textAlign', type);
    } else {
      store.updateTextStyle('textAlign', type);
    }
  };

  const onClickVerticalAlign = type => {
    setActiveVerticalAlign(type);

    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('verticalAlign', type);
    } else {
      store.updateTextStyle('verticalAlign', type);
    }
  };

  const toggleBold = () => {
    const newBoldState = !isBoldActive;
    setIsBoldActive(newBoldState);

    const currentWeight =
      fontWeightOptions.find(option => option.label === selectedFontWeight)
        ?.value || '400';
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

    setSelectedFontWeight(
      fontWeightOptions.find(option => option.value === newWeight)?.label
    );
  };

  const toggleItalic = () => {
    const newItalicState = !isItalicActive;
    setIsItalicActive(newItalicState);
    const newStyle = newItalicState ? 'italic' : 'normal';

    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('fontStyle', newStyle);
    } else {
      store.updateTextStyle('fontStyle', newStyle);
    }
  };

  const handleFontSizeInputClick = () => {
    setIsFontSizeInputMode(true);
    setCustomFontSize(selectedFontSize);
    setTimeout(() => {
      fontSizeInputRef.current?.focus();
      fontSizeInputRef.current?.select();
    }, 0);
  };



  const handleFontSizeInputChange = e => {
    const value = e.target.value;
    if (/^\d{0,3}$/.test(value)) {
      setCustomFontSize(value);
    }
  };

  const handleFontSizeInputKeyDown = e => {
    if (e.key === 'Enter') {
      const size = parseInt(customFontSize, 10);
      if (size >= 1 && size <= 999) {
        onSelectFontSize(size.toString());
      } else {
        setCustomFontSize(selectedFontSize);
        setIsFontSizeInputMode(false);
      }
    } else if (e.key === 'Escape') {
      setIsFontSizeInputMode(false);
      setCustomFontSize('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentSize = parseInt(customFontSize || selectedFontSize, 10);
      const newSize = Math.min(currentSize + 1, 999);
      setCustomFontSize(newSize.toString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentSize = parseInt(customFontSize || selectedFontSize, 10);
      const newSize = Math.max(currentSize - 1, 1);
      setCustomFontSize(newSize.toString());
    }
  };

  const handleFontSizeInputBlur = () => {
    const size = parseInt(customFontSize, 10);
    if (size >= 1 && size <= 999) {
      onSelectFontSize(size.toString());
    } else {
      setIsFontSizeInputMode(false);
      setCustomFontSize('');
    }
  };

  const handleWordSpacingNumberChange = e => {
    const value = e.target.value;
    const cleanValue = value.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(-40, Math.min(40, numericValue));
      setWordSpacingInputValue(clampedValue.toString());
      handleWordSpacingChange(clampedValue);
    } else {
      setWordSpacingInputValue(cleanValue);
    }
  };

  const handleWordSpacingInputBlur = () => {
    const cleanValue = wordSpacingInputValue.replace('px', '').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      const clampedValue = Math.max(-40, Math.min(40, numericValue));
      setWordSpacingInputValue(clampedValue.toString());
      handleWordSpacingChange(clampedValue);
    } else {
      setWordSpacingInputValue(wordSpacingValue.toString());
    }
    setIsWordSpacingEditing(false);
  };

  const handleWordSpacingInputClick = () => {
    setIsWordSpacingEditing(true);
    setWordSpacingInputValue(wordSpacingValue.toString());
  };

  return (
    <div key={item.type} className={styles.wrapper}>
      <div className={styles.font_row}>
        <span className={styles.lines_label}>Lines</span>
        <Select
          options={fontOptions}
          value={fontOptions.find(option => option.label === selectedFont)}
          onChange={onSelectFont}
          styles={customStyles}
          placeholder="Select font..."
          isSearchable
          className={styles.font_select}
          classNamePrefix="font-select"
          isLoading={loading}
          isDisabled={loading}
          onMenuOpen={() => setIsFontDropdownOpen(true)}
          onMenuClose={() => setIsFontDropdownOpen(false)}
          components={{
            DropdownIndicator: () => (
              <div
                style={{
                  transform: isFontDropdownOpen
                    ? 'rotate(0deg)'
                    : 'rotate(180deg)',
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease',
                  marginTop: isFontDropdownOpen ? '-4px' : '0px',
                }}
              >
                <DropDownIcon size="10px" color="rgba(255, 255, 255, 0.4)" />
              </div>
            ),
          }}
        />

        {isFontSizeInputMode ? (
          <div className={styles.font_size_input_container}>
            <input
              ref={fontSizeInputRef}
              type="text"
              value={customFontSize}
              onChange={handleFontSizeInputChange}
              onKeyDown={handleFontSizeInputKeyDown}
              onBlur={handleFontSizeInputBlur}
              className={styles.font_size_input}
              maxLength={3}
            />
          </div>
        ) : (
          <div
            className={styles.font_size_button_wrapper}
            title="Click text to edit, click button to open dropdown"
          >
            <ButtonWithDropdown
              list={fontSizes}
              currentItem={selectedFontSize}
              onSelect={onSelectFontSize}
              classNameButton={`${styles.list_btn} ${styles.font_size_btn}`}
              classNameDropdownItem={styles.list_item}
              dataTestid="fontsize-dropdown"
              onTextClick={handleFontSizeInputClick}
            />
          </div>
        )}

        <InputWithSections
          value={getFirstTextElement(store)?.properties?.color || '#FFFFFF'}
          onColorChange={color => {
            if (isSubtitlesPanel) {
              store.updateSubtitlesStyle('color', color);
            } else {
              store.updateTextStyle('color', color);
            }
          }}
          showColorPicker={true}
          isSubtitlesPanel={isSubtitlesPanel}
        />
        <button
          type="button"
          className={styles.text_case_button}
          onClick={() => {
            const currentTextCase =
              store.subtitlesPanelState.textCase || 'none';
            const caseOptions = [
              'none',
              'uppercase',
              'lowercase',
              'capitalize',
            ];
            const currentIndex = caseOptions.indexOf(currentTextCase);
            const nextIndex = (currentIndex + 1) % caseOptions.length;
            const nextCase = caseOptions[nextIndex];

            store.setTextCase(nextCase);
          }}
        >
          {getTextCaseIcon()}
        </button>
      </div>

      <div className={styles.inputList_box}>
        <ul className={styles.buttons_box}>
          {textPosition.map(item => (
            <li key={item.type}>
              <ButtonWithIcon
                icon={item.icon}
                size="4px"
                classNameButton={
                  item.type === activeHorizontalAlign
                    ? styles.active_panel_button
                    : styles.panel_button
                }
                classNameIcon={styles.panel_icon}
                onClick={() => onClickTextAlign(item.type)}
              />
            </li>
          ))}
        </ul>
        <ul className={styles.buttons_box}>
          {textAlign.map((item, index) => (
            <li key={index}>
              <ButtonWithIcon
                icon={item.icon}
                size="14px"
                classNameButton={
                  item.type === activeVerticalAlign
                    ? styles.active_panel_button
                    : styles.panel_button
                }
                classNameIcon={styles.panel_icon}
                onClick={() => onClickVerticalAlign(item.type)}
              />
            </li>
          ))}
        </ul>

        <div className={styles.font_style_box}>
          {supportsItalic && (
            <div
              className={`${styles.style_btn} ${
                isItalicActive ? styles.active : ''
              }`}
              role="button"
              aria-label="Italic"
              onClick={toggleItalic}
            >
              <FontWeightItalic
                size="8px"
                color={isItalicActive ? '#1b2e37' : '#F1F1F1'}
              />
            </div>
          )}
          {supportsBold && (
            <div
              className={`${styles.style_btn} ${
                isBoldActive ? styles.active : ''
              }`}
              role="button"
              aria-label="Bold"
              onClick={toggleBold}
            >
              <FontWeightBold
                size="8px"
                color={isBoldActive ? '#1b2e37' : '#F1F1F1'}
              />
            </div>
          )}
        </div>
      </div>

      {isSubtitlesPanel && (
        <>
          <div className={styles.spacing_container}>
            <div className={styles.options_wrapper}>
              <ButtonWithDropdown
                list={options}
                currentItem={selectedOption}
                onSelect={onSelectOption}
                classNameButton={`${styles.list_btn} ${styles.font_size_btn} ${styles.options_dropdown}`}
                classNameDropdownItem={styles.list_item}
                dataTestid="options-dropdown"
                tooltipText="Subtitle text lines"
                tooltipPlace="bottom"
              />
            </div>

            <div className={styles.word_spacing_section}>
              <button
                type="button"
                className={`${styles.spacing_button} ${
                  isSpacingPanelOpen ? styles.active : ''
                }`}
                onClick={() => setIsSpacingPanelOpen(!isSpacingPanelOpen)}
              >
                Spacing
              </button>

              {isSpacingPanelOpen && (
                <div className={styles.spacing_panel}>
                  <div className={styles.spacing_panel_content}>
                    <div className={styles.spacing_control}>
                      <label>Line height</label>
                      <div className={styles.input_wrapper}>
                        <input
                          ref={lineHeightRangeRef}
                          type="range"
                          min="10"
                          max="100"
                          step="1"
                          className={styles.rangeInput}
                          value={lineHeightValue}
                          onChange={handleLineHeightRangeChange}
                          onMouseUp={handleLineHeightRangeChangeEnd}
                          onTouchEnd={handleLineHeightRangeChangeEnd}
                          style={{
                            '--value': `${
                              ((lineHeightValue - 10) / 90) * 100
                            }%`,
                          }}
                        />
                        <input
                          ref={lineHeightInputRef}
                          type="text"
                          value={isLineHeightEditing ? lineHeightInputValue : `${lineHeightValue}px`}
                          onChange={handleLineHeightNumberChange}
                          onBlur={handleLineHeightInputBlur}
                          onClick={handleLineHeightInputClick}
                          className={`${styles.spacing_input} ${isLineHeightEditing ? styles.editing : ''}`}
                        />
                      </div>
                    </div>

                    <div className={styles.spacing_control}>
                      <label>Letter spacing</label>
                      <div className={styles.input_wrapper}>
                        <input
                          ref={letterSpacingRangeRef}
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          className={styles.rangeInput}
                          value={letterSpacingValue}
                          onChange={handleLetterSpacingRangeChange}
                          onMouseUp={handleLetterSpacingRangeChangeEnd}
                          onTouchEnd={handleLetterSpacingRangeChangeEnd}
                          style={{
                            '--value': `${(letterSpacingValue / 100) * 100}%`,
                          }}
                        />
                        <input
                          ref={letterSpacingInputRef}
                          type="text"
                          value={isLetterSpacingEditing ? letterSpacingInputValue : `${letterSpacingValue}px`}
                          onChange={handleLetterSpacingNumberChange}
                          onBlur={handleLetterSpacingInputBlur}
                          onClick={handleLetterSpacingInputClick}
                          className={`${styles.spacing_input} ${isLetterSpacingEditing ? styles.editing : ''}`}
                        />
                      </div>
                    </div>

                    <div className={styles.spacing_control}>
                      <label>Word spacing</label>
                      <div className={styles.input_wrapper}>
                        <input
                          ref={wordSpacingRangeRef}
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          className={styles.rangeInput}
                          value={wordSpacingValue}
                          onChange={handleWordSpacingRangeChange}
                          onMouseUp={handleWordSpacingRangeChangeEnd}
                          onTouchEnd={handleWordSpacingRangeChangeEnd}
                          style={{
                            '--value': `${
                              ((wordSpacingValue + 40) / 80) * 100
                            }%`,
                          }}
                        />
                        <input
                          ref={wordSpacingInputRef}
                          type="text"
                          value={isWordSpacingEditing ? wordSpacingInputValue : `${wordSpacingValue}px`}
                          onChange={handleWordSpacingNumberChange}
                          onBlur={handleWordSpacingInputBlur}
                          onClick={handleWordSpacingInputClick}
                          className={`${styles.spacing_input} ${isWordSpacingEditing ? styles.editing : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export { FontSettings };
