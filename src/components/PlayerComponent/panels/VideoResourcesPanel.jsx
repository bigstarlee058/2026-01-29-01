import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { VideoResource } from '../entity/VideoResource';
import { UploadButton } from '../shared/UploadButton';
import styles from '../Player.module.scss';

export const VideoResourcesPanel = observer(() => {
  const store = React.useContext(StoreContext);
  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    store.addVideoResource(URL.createObjectURL(file));
  };
  return (
    <>
      <div className={styles.panelContainer}>Videos</div>
      {store.videos.map((video, index) => {
        return <VideoResource key={video} video={video} index={index} />;
      })}
      <UploadButton
        accept="video/mp4,video/x-m4v,video/*"
        className={styles.uploadButton}
        onChange={handleFileChange}
      />
    </>
  );
});
