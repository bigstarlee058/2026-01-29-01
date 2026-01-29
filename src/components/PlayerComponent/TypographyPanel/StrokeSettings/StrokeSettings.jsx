import styles from './StrokeSettings.module.scss';
import { InputWithSections } from 'components/PlayerComponent/TypographyPanel/InputWithSections/InputWithSections';
import { observer } from 'mobx-react';
import { useContext, useEffect, useState } from 'react';
import { StoreContext } from '../../../../mobx';

const getCurrentTextElement = (store) => {
  return store.editorElements.find(element => 
    (element.type === 'text' || 
    element.subType === 'subtitles') &&
    element.timeFrame.start <= store.currentTimeInMs && 
    store.currentTimeInMs <= element.timeFrame.end
  );
};

const getFirstTextElement = store => {
  return store.editorElements.find(
    element => element.type === 'text' || element.subType === 'subtitles'
  );
};

const StrokeSettings = observer(({ isSubtitlesPanel, initialOpacity, savedColor, onColorChange }) => {
  const store = useContext(StoreContext);
  const [displayOpacity, setDisplayOpacity] = useState(
    Math.round((initialOpacity !== undefined ? initialOpacity : 1) * 100)
  );
  const [selectedStrokeColor, setSelectedStrokeColor] = useState(savedColor || '#000000');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(12);
  
  useEffect(() => {
    if (isSubtitlesPanel) {
      const firstTextElement = getFirstTextElement(store);
      setSelectedStrokeColor(firstTextElement?.properties?.strokeColor || '#000000');
      setSelectedStrokeWidth(firstTextElement?.properties?.stroke || 12);
      setDisplayOpacity(Math.round((firstTextElement?.properties?.strokeOpacity || 1) * 100));
    }
  }, [isSubtitlesPanel, store]);

  useEffect(() => {
    if (savedColor) {
      setSelectedStrokeColor(savedColor);
    }
  }, [savedColor]);

  const handleStrokeWidthChange = value => {
    const width = Math.max(1, Number(value));
    setSelectedStrokeWidth(width);
    
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('stroke', width);
    } else {
      store.updateTextStyle('stroke', width);
    }
  };

  const handleStrokeColorChange = color => {
    const baseColor = color.slice(0, 7);
    setSelectedStrokeColor(baseColor);
    
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('strokeColor', baseColor);
    } else {
      store.updateTextStyle('strokeColor', baseColor);
    }

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
        store.updateSubtitlesStyle('strokeOpacity', opacityDecimal);
      } else {
        store.updateTextStyle('strokeOpacity', opacityDecimal);
      }
    } catch (error) {
      console.error('Error in handleOpacityChange:', error);
    }
  };

  return (
    <div className={styles.panelContainer}>
      <InputWithSections
        value={selectedStrokeColor}
        inputValue={`${displayOpacity}`}
        onChangeInputValue={handleOpacityChange}
        onColorChange={handleStrokeColorChange}
        onChange={handleStrokeColorChange}
        showColorPicker={true}
        icon="StroKeIcon"
        iconValue={`${selectedStrokeWidth}`}
        isPercentage={true}
        onIconClick={handleStrokeWidthChange}
        onIconValueChange={handleStrokeWidthChange}
      />
    </div>
  );
});

export { StrokeSettings };
