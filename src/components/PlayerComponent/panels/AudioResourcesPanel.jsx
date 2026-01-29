import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { AudioResource } from '../entity/AudioResource.jsx';
import { UploadButton } from '../shared/UploadButton';
import styles from '../Player.module.scss';

export const AudioResourcesPanel = observer(() => {
  const store = React.useContext(StoreContext);
  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    store.addAudioResource(URL.createObjectURL(file));
  };

  return (
    <>
      <div className={styles.audioTitle}>Audios</div>
      {store.audios.map((audio, index) => {
        return <AudioResource key={audio} audio={audio} index={index} />;
      })}
      <UploadButton
        accept="audio/mp3,audio/*"
        className={styles.uploadButton}
        onChange={handleFileChange}
      />
    </>
  );
});
