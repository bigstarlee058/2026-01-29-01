'use client';
import React from 'react';
import { StoreContext } from '../../../mobx';
import { formatTimeToMinSec } from '../../../utils';
import { observer } from 'mobx-react';
import { MdAdd } from 'react-icons/md';
import styles from '../Player.module.scss';

export const VideoResource = observer(({ video, index }) => {
  const store = React.useContext(StoreContext);
  const ref = React.useRef(null);
  const [formatedVideoLength, setFormatedVideoLength] = React.useState('00:00');

  return (
    <div className={styles.videoResourceContainer}>
      <div className={styles.videoLengthLabel}>{formatedVideoLength}</div>
      <button
        className={styles.addButton}
        onClick={() => store.addVideo(index)}
      >
        <MdAdd size="25" />
      </button>
      <video
        onLoadedData={() => {
          const videoLength = ref.current?.duration || 0;
          setFormatedVideoLength(formatTimeToMinSec(videoLength));
        }}
        ref={ref}
        className={styles.videoElement}
        src={video}
        height={200}
        width={200}
        id={`video-${index}`}
      ></video>
    </div>
  );
});
