import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { MdAdd } from 'react-icons/md';
import styles from '../Player.module.scss';

export const ImageResource = observer(({ image, index }) => {
  const store = React.useContext(StoreContext);
  const ref = React.useRef(null);
  const [resolution, setResolution] = React.useState({ w: 0, h: 0 });

  return (
    <div className={styles.imageResourceContainer}>
      <div className={styles.resolutionLabel}>
        {resolution.w}x{resolution.h}
      </div>
      <button
        className={styles.addButton}
        onClick={() => store.addImage(index)}
      >
        <MdAdd size="25" />
      </button>
      <img
        onLoad={() => {
          setResolution({
            w: ref.current?.naturalWidth || 0,
            h: ref.current?.naturalHeight || 0,
          });
        }}
        ref={ref}
        className={styles.imageElement}
        src={image}
        height={200}
        width={200}
        id={`image-${index}`}
      />
    </div>
  );
});
