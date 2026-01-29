import styles from '../TypographyPanel/TypographyPanel.module.scss';
import { FontSettings } from './FontSettings/FontSettings';
import { ColorSettings } from './ColorSettings/ColorSettings';
import { BackgroundSettings } from './BackgroundSettings/BackgroundSettings';
import { StrokeSettings } from './StrokeSettings/StrokeSettings';
import { Tumbler } from 'components/reusableComponents/Tumbler/Tumbler';
import { observer } from 'mobx-react';
import { useContext, useState, useRef, useEffect } from 'react';
import { StoreContext } from '../../../mobx';
import DeleteTextIcon from 'components/Icons/DeleteTextIcon';
import ICON_SIZE from 'components/Icons/IconSize';

const listTorender = [
  'Text settings',
  'Color',
  'Background',
  'Stroke',
  'Apply to all',
  // 'Synchronize',
];

const TYPOGRAPHY_ITEM = 'Text settings';

const TypographyPanel = observer(({ onClose, storyData }) => {
  const store = useContext(StoreContext);
  const panelRef = useRef(null);
  const [isStrokeEnabled, setIsStrokeEnabled] = useState(false);
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [savedBackgroundSettings, setSavedBackgroundSettings] = useState(null);
  const [savedStrokeSettings, setSavedStrokeSettings] = useState(null);
  const [textOpacity, setTextOpacity] = useState(1);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0);

  useEffect(() => {
    if (store?.selectedElement?.type !== 'text') {
      store.setSelectedElement(
        store.editorElements.find(
          el => el.type === 'text' && el.subType !== 'subtitles'
        )
      );
    }
  }, [storyData, store]);

  useEffect(() => {
    if (store?.selectedElement?.type === 'text') {
      const strokeWidth = store.selectedElement.properties.stroke || 0;
      const backgroundOpacityValue = store.selectedElement.properties.backgroundOpacity || 0;
      const strokeOpacityValue = store.selectedElement.properties.strokeOpacity || 1;
      const strokeColorValue = store.selectedElement.properties.strokeColor || '#000000';
      const opacity = store.selectedElement.properties.opacity || 1;
      
      const shouldEnableStroke = strokeWidth > 0;
      const shouldEnableBackground = backgroundOpacityValue > 0;
      
      setIsStrokeEnabled(shouldEnableStroke);
      setIsBackgroundEnabled(shouldEnableBackground);
      
      setTextOpacity(opacity);
      setBackgroundOpacity(backgroundOpacityValue);
      
      setSavedStrokeSettings({
        color: strokeColorValue,
        opacity: strokeOpacityValue,
        width: shouldEnableStroke ? strokeWidth : 12
      });
      
      setSavedBackgroundSettings({
        color: store.selectedElement.properties.backgroundColor || '#000000',
        opacity: backgroundOpacityValue > 0 ? backgroundOpacityValue : 0.5
      });
    }
  }, [store?.selectedElement]);

  const handleTumblerChange = (item, value) => {
    switch (item) {
      case 'Apply to all':
        store.setApplyToAll(value);
        break;
      case 'Synchronize':
        store.updateSynchronize(value);
        break;
      case 'Stroke':
        setIsStrokeEnabled(value);
        if (store.selectedElement?.type === 'text') {
          if (!value) {
            setSavedStrokeSettings({
              color: store.selectedElement.properties.strokeColor || '#000000',
              opacity: store.selectedElement.properties.strokeOpacity || 1,
              width: store.selectedElement.properties.stroke || 12
            });
            store.updateTextStyle('stroke', 0);
          } else if (savedStrokeSettings) {
            const width = savedStrokeSettings.width > 0 ? savedStrokeSettings.width : 12;
            
            store.updateTextStyle('strokeColor', savedStrokeSettings.color);
            store.updateTextStyle('strokeOpacity', savedStrokeSettings.opacity);
            store.updateTextStyle('stroke', width);
          } else {
            const currentStrokeColor = store.selectedElement.properties.strokeColor || '#000000';
            const currentStrokeOpacity = store.selectedElement.properties.strokeOpacity || 1;
            
            store.updateTextStyle('strokeColor', currentStrokeColor);
            store.updateTextStyle('strokeOpacity', currentStrokeOpacity);
            store.updateTextStyle('stroke', 12);
          }
        }
        break;
      case 'Background':
        setIsBackgroundEnabled(value);
        if (store.selectedElement?.type === 'text') {
          if (!value) {
            setSavedBackgroundSettings({
              color: store.selectedElement.properties.backgroundColor || '#000000',
              opacity: store.selectedElement.properties.backgroundOpacity || 0.5
            });
            store.updateTextStyle('backgroundOpacity', 0);
            setBackgroundOpacity(0);
          } else if (savedBackgroundSettings) {
            const restoredOpacity = Math.max(0.01, savedBackgroundSettings.opacity);
            store.updateTextStyle('backgroundColor', savedBackgroundSettings.color);
            store.updateTextStyle('backgroundOpacity', restoredOpacity);
            setBackgroundOpacity(restoredOpacity);
          } else {
            const currentBackgroundOpacity = store.selectedElement.properties.backgroundOpacity;
            const newOpacity = currentBackgroundOpacity > 0 ? currentBackgroundOpacity : 0.5;
            
            store.updateTextStyle('backgroundColor', '#000000');
            store.updateTextStyle('backgroundOpacity', newOpacity);
            setBackgroundOpacity(newOpacity);
          }
        }
        break;
      default:
        break;
    }
  };

  const componentToRender = item => {
    switch (item) {
      case 'Text settings':
        return <FontSettings item={item} tumbler={false} />;
      case 'Color':
        return <ColorSettings item={item} tumbler={false} initialOpacity={textOpacity} />;
      case 'Background':
        const shouldShowBackground = isBackgroundEnabled || (store.selectedElement?.properties?.backgroundOpacity || 0) > 0;
        return shouldShowBackground ? (
          <BackgroundSettings 
            item={item} 
            tumbler={true} 
            initialOpacity={backgroundOpacity}
          />
        ) : null;
      case 'Stroke':
        const shouldShowStroke = isStrokeEnabled || (store.selectedElement?.properties?.stroke || 0) > 0;
        const strokeOpacity = store.selectedElement?.properties?.strokeOpacity || 1;
        return shouldShowStroke ? (
          <StrokeSettings 
            item={item} 
            tumbler={true} 
            initialOpacity={strokeOpacity}
          />
        ) : null;
      default:
        return null;
    }
  };

  const isSynchronizeVisible = store.selectedElement?.type === 'text';

  return (
    <div
      ref={panelRef}
      style={{ position: 'relative', width: 'max-content' }}
      onClick={e => e.stopPropagation()}
      data-interactive={true}
    >
      <div
        className={styles.panelContainer_wide}
        onClick={e => e.stopPropagation()}
        data-testid="typography-panel"
      >
        <div className={styles.scrollContainer}>
          <ul className={styles.panelList} onClick={e => e.stopPropagation()}>
            {listTorender.map(item => (
              <li key={item} className={styles.setting_item}>
                <div className={styles.title}>
                  <h1>{item}</h1>
                  {item !== 'Text settings' &&
                    item !== 'Color' &&
                    (item === 'Synchronize' ? (
                      isSynchronizeVisible && (
                        <Tumbler
                          onChange={value => handleTumblerChange(item, value)}
                          defaultChecked={
                            store.selectedElement?.properties?.synchronize
                          }
                          checked={store.selectedElement?.properties?.synchronize}
                        />
                      )
                    ) : (
                      <Tumbler
                        onChange={value => handleTumblerChange(item, value)}
                        defaultChecked={
                          item === 'Apply to all' 
                            ? store.applyToAll 
                            : item === 'Stroke'
                              ? isStrokeEnabled
                              : item === 'Background'
                                ? isBackgroundEnabled
                                : false
                        }
                        checked={
                          item === 'Apply to all' 
                            ? store.applyToAll 
                            : item === 'Stroke'
                              ? isStrokeEnabled
                              : item === 'Background'
                                ? isBackgroundEnabled
                                : false
                        }
                      />
                    ))}
                </div>
                {componentToRender(item)}
              </li>
              
            ))}
            <li className={styles.setting_item}>
              <div
                className={styles.deleteIconContainer}
                onClick={() => store.removeAllTexts()}
              >
                <DeleteTextIcon size={ICON_SIZE.MEDIUM} />
                <span className={styles.deleteText}>Delete All Texts</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export { TypographyPanel };
