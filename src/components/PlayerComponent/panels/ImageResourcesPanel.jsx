import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { ImageResource } from '../entity/ImageResource';
import { UploadButton } from '../shared/UploadButton';
import styles from '../Player.module.scss';

export const ImageResourcesPanel = observer(() => {
  const store = React.useContext(StoreContext);

  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    store.addImageResource(URL.createObjectURL(file));
  };
  return (
    <>
      <div className={styles.panelTitle}>Images</div>
      <UploadButton
        accept="image/*"
        className={styles.uploadButton}
        onChange={handleFileChange}
      />
      <div className={styles.imagesContainer}>
        {store.images.map((image, index) => {
          return <ImageResource key={image} image={image} index={index} />;
        })}
      </div>
    </>
  );
});
