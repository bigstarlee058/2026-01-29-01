import { useEffect } from 'react';
import { sizes } from 'data/sizes';
import { useStoryManager } from 'hooks/story/useStoryManager';
import { useState } from 'react';
import { ButtonWithDropdown } from 'components/ButtonWithDropdown/ButtonWithDropdown';
import { useChangePresetMutation } from '../../../redux/stories/storyApi';
import styles from './SelectSizeFormatBtnSet.module.scss';
import { VectorIcon } from 'components/Icons';

const SelectSizeFormatBtnSet = ({
  storyData,
  format = false,
  size = true,
  width = '100%',
}) => {
  const { onUpdateStorySize } = useStoryManager();

  const listTorender = sizes.sizes.map(size => size.name);
  const formatListTorender = sizes.presets.map(preset => preset.style);

  const [changePreset] = useChangePresetMutation();

  const getCurrentSize = () => {
    if (storyData) {
      return storyData.orientation || sizes.sizes[2].name;
    }
    return sizes.sizes[2].name;
  };

  const [currentSize, setCurrentSize] = useState('');
  const [currentFormat, setCurrentFormat] = useState(
    storyData?.generationStyle?.style || sizes.presets[0].style
  );

  useEffect(() => {
    setCurrentSize(getCurrentSize());
  }, [storyData.width, storyData.height, storyData.orientation]);

  // Add event listener for frame size changes from Lyra
  useEffect(() => {
    const handleFrameSizeChange = event => {
if (event.detail && event.detail.orientation) {
        setCurrentSize(event.detail.orientation);
      }
    };

    window.addEventListener('frame_size_changed', handleFrameSizeChange);

    return () => {
      window.removeEventListener('frame_size_changed', handleFrameSizeChange);
    };
  }, []);

  const onChangeSize = value => {
const selectedSize = sizes.sizes.find(size => size.name === value);
    setCurrentSize(value);
    onUpdateStorySize({
      storyId: storyData._id,
      size: selectedSize,
    });
  };

  const onChangeFormat = value => {
    setCurrentFormat(value);
    const selectedPreset = sizes.presets.find(preset => preset.style === value);
    
    changePreset({
      storyId: storyData._id,
      preset: {
        preset: selectedPreset?.name,
        style: selectedPreset?.style,
      },
    });
  };

  return (
    <div className={styles.select_size_btnSet}>
      {size && (
        <ButtonWithDropdown
          currentItem={currentSize}
          list={listTorender}
          onSelect={newSize => onChangeSize(newSize)}
          children={<VectorIcon className={styles.icon} color="white" />}
          classNameButton={styles.select_button}
          classNameDropdownItem={styles.dropdown_item}
          style={{ width }}
        />
      )}
      {format ? (
        <ButtonWithDropdown
          currentItem={currentFormat}
          list={formatListTorender}
          onSelect={onChangeFormat}
          children={<VectorIcon className={styles.icon} color="white" />}
          classNameButton={styles.select_button}
          classNameDropdownItem={styles.dropdown_item}
          width={width}
        />
      ) : null}
    </div>
  );
};
export default SelectSizeFormatBtnSet;
