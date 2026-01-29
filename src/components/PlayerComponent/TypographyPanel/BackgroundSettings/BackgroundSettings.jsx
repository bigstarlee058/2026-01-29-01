import styles from './BackgroundSettings.module.scss';
import { InputWithSections } from 'components/PlayerComponent/TypographyPanel/InputWithSections/InputWithSections';
import { observer } from 'mobx-react';
import { useContext, useEffect, useState } from 'react';
import { StoreContext } from '../../../../mobx';

const BackgroundSettings = observer(({ item, isSubtitlesPanel, initialOpacity }) => {
  const store = useContext(StoreContext);
  const [displayOpacity, setDisplayOpacity] = useState(Math.round((initialOpacity || 0) * 100));

  useEffect(() => {
    const opacity = initialOpacity !== undefined 
      ? initialOpacity 
      : (store.selectedElement?.properties?.backgroundOpacity || 0);
    
    setDisplayOpacity(Math.round(opacity * 100));
  }, [initialOpacity, store.selectedElement?.properties?.backgroundOpacity]);

  const handleBackgroundColorChange = color => {
    const baseColor = color.slice(0, 7);
    
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('backgroundColor', baseColor);
    } else {
      const isBackgroundEnabled = (store.selectedElement?.properties?.backgroundOpacity || 0) > 0;
      
      if (isBackgroundEnabled) {
        store.updateTextStyle('backgroundColor', baseColor);
      }
    }
  };

  const handleOpacityChange = value => {
    try {
      let opacityValue = parseInt(value.toString().replace('%', ''));
      opacityValue = Math.max(1, Math.min(100, opacityValue));
      
      setDisplayOpacity(opacityValue);
      
      const opacityDecimal = opacityValue / 100;
      
      if (isSubtitlesPanel) {
        store.updateSubtitlesStyle('backgroundOpacity', opacityDecimal);
      } else {
        const currentBackgroundOpacity = store.selectedElement?.properties?.backgroundOpacity || 0;
        
        if (currentBackgroundOpacity > 0) {
          store.updateTextStyle('backgroundOpacity', opacityDecimal);
          
          if (!store.selectedElement?.properties?.backgroundColor) {
            store.updateTextStyle('backgroundColor', '#000000');
          }
        }
      }
    } catch (error) {
      console.error('Error in handleOpacityChange:', error);
    }
  };

  const handleStrokeWidthChange = value => {
    if (isSubtitlesPanel) {
      store.updateSubtitlesStyle('radius', value);
    } else {
      store.updateTextStyle('radius', value);
    }
  };

  return (
    <div className={styles.panelContainer}>
      <InputWithSections
        value={store.selectedElement?.properties?.backgroundColor || '#000000'}
        icon={'BackgroundIcon'}
        iconValue={store.selectedElement?.properties?.radius || 0}
        inputValue={displayOpacity}
        onChangeInputValue={handleOpacityChange}
        onColorChange={handleBackgroundColorChange}
        onInputChange={handleOpacityChange}
        isPercentage={true}
        showColorPicker={true}
        onIconValueChange={handleStrokeWidthChange}
      />
    </div>
  );
});

export { BackgroundSettings };
