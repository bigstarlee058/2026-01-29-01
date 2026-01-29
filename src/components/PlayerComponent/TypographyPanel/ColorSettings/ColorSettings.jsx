import styles from './ColorSettings.module.scss';
import { InputWithSections } from 'components/PlayerComponent/TypographyPanel/InputWithSections/InputWithSections';
import { observer } from 'mobx-react';
import { useContext, useEffect, useState } from 'react';
import { StoreContext } from '../../../../mobx';

const getFirstTextElement = (store) => {
  return store.editorElements.find(element => 
    element.type === 'text' || element.subType === 'subtitles'
  );
};

const ColorSettings = observer(({ isSubtitlesPanel, initialOpacity, savedColor, onColorChange }) => {
  const store = useContext(StoreContext);
  const [displayOpacity, setDisplayOpacity] = useState(Math.round((initialOpacity || 1) * 100));
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    if (isSubtitlesPanel) {
      const firstTextElement = getFirstTextElement(store);      
      setSelectedColor(firstTextElement?.properties?.color || '#FFFFFF');
      setDisplayOpacity(Math.round(firstTextElement?.properties?.opacity * 100));
    } else {
      const opacity = initialOpacity !== undefined 
        ? initialOpacity 
        : (store.selectedElement?.properties?.opacity || 1);
      setDisplayOpacity(Math.round(opacity * 100));
    }   
  }, [initialOpacity, store.selectedElement?.properties?.opacity]);

  const handleColorChange = color => {
    // Extract the base color (first 7 characters)
    const baseColor = color.slice(0, 7);
    
    setSelectedColor(baseColor);  
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('color', baseColor);
    } else {
      store.updateTextStyle('color', baseColor);
    }

    // Notify parent about color change
    if (onColorChange) {
      onColorChange(baseColor);
    }
  };

  const handleOpacityChange = value => {
    try {
      let opacityValue = parseInt(value.toString().replace('%', ''));
      opacityValue = Math.max(1, Math.min(100, opacityValue));
      
      setDisplayOpacity(opacityValue);
      
      const opacityDecimal = opacityValue / 100;
      
      if (isSubtitlesPanel) {
        store.updateSubtitlesStyle('opacity', opacityDecimal);
      } else {
        store.updateTextStyle('opacity', opacityDecimal);
      }
    } catch (error) {
      console.error('Error in handleOpacityChange:', error);
    }
  };

  return (
    <div className={styles.panelContainer}>
      {/* <InputWithSections
        value={selectedColor}
        inputValue={selectedColor}
        name={`${displayOpacity}%`}
        onColorChange={handleColorChange}
        showColorPicker={true}
        iconValue={`${displayOpacity}%`}
        onChangeInputValue={handleColorChange}
        onIconValueChange={handleOpacityChange}
      /> */}
    </div>
  );
});

export { ColorSettings };
