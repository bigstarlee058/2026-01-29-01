import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './ImagesSize.module.scss';
import { sizes } from 'data/sizes';
import { useState } from 'react';
import nineSixteen from 'images/9-16.png';
import fourThree from 'images/4-3.png';
import oneOne from 'images/1-1.png';
import sixteenNine from 'images/16-9.png';
import nineSixteenVertical from 'images/9-16-v.png';
import fourThreeVertical from 'images/4-3-v.png';
import oneOneVertical from 'images/1-1-v.png';
import sixteenNineVertical from 'images/16-9-v.png';

const sizeImages = {
  1: nineSixteen,
  2: fourThree,
  3: oneOne,
  4: sixteenNine,
};

const sizeImagesGorizontal = {
  1: nineSixteenVertical,
  2: fourThreeVertical,
  3: oneOneVertical,
  4: sixteenNineVertical,
};

const ImagesSize = ({ handleSizeChange, currentSize, customStyle }) => {
  const [isVerticalPosition, setIsVerticalPosition] = useState(true);

  const onTogglePosition = () => {
    setIsVerticalPosition(!isVerticalPosition);
  };

  const isActive = id => {
    return currentSize.id === id;
  };

  const sizeList = sizes.sizes;
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <h1>Images size</h1>
        <ButtonWithIcon
          icon="ScreenSizeIcon"
          classNameButton={styles.switchBtn}
          onClick={() => onTogglePosition()}
          tooltipText="Switch screen size"
          tooltipPlace="top"
        />
      </div>
      <ul className={styles.sizeList} style={customStyle}>
        {sizeList.map(item => (
          <li
            key={item.id}
            onClick={() => handleSizeChange(item.name)}
            className={`${styles.sizeItem} ${
              isActive(item.id) ? styles.active : ''
            }`}
          >
            <img
              src={
                isVerticalPosition
                  ? sizeImages[item.id]
                  : sizeImagesGorizontal[item.id]
              }
              alt={item.name}
              className={styles.sizeImage}
            />
            <p>{item.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { ImagesSize };