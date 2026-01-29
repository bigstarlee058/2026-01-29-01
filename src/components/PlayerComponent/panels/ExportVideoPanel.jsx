import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import styles from '../Player.module.scss';

export const ExportVideoPanel = observer(() => {
  const store = React.useContext(StoreContext);

  return (
    <div>
      <div className={styles.exportTitle}>Export</div>
      <div className={styles.inputContainer}>
        <div className={styles.inputRow}>
          <div className={styles.inputLabel}>Video Length:</div>
          <input
            type="number"
            className={styles.inputField}
            value={store.maxTime / 1000}
            onChange={e => {
              const value = e.target.value;
              store.setMaxTime(Number(value) * 1000);
            }}
          />
          <div>secs</div>
        </div>
        <div className={styles.inputRow}>
          <div className={styles.inputLabel}>Canvas Resolution:</div>
          <div className={styles.videoFormatLabel}>Todo</div>
        </div>
      </div>
      <div className={styles.inputContainer}>
        <div className={styles.videoFormatLabel}>Video Format:</div>
        <div className={styles.inputRow}>
          <input
            type="radio"
            className={styles.radioInput}
            name="video-format"
            value="mp4"
            checked={store.selectedVideoFormat === 'mp4'}
            onChange={() => {
              store.setVideoFormat('mp4');
            }}
          />
          <div className={styles.videoFormatLabel}>MP4</div>
          <input
            type="radio"
            className={styles.radioInput}
            name="video-format"
            value="webm"
            checked={store.selectedVideoFormat === 'webm'}
            onChange={() => {
              store.setVideoFormat('webm');
            }}
          />
          <div className={styles.videoFormatLabel}>webm</div>
        </div>
      </div>
      <button
        className={styles.exportButton}
        onClick={() => {
          store.handleSeek(0);
          setTimeout(() => {
            store.setPlaying(true);
            store.saveCanvasToVideoWithAudio();
          }, 1000);
        }}
      >
        Export Video ({store.maxTime / 1000} secs){' '}
        {store.selectedVideoFormat === 'mp4' ? 'ALPHA' : ''}
      </button>
    </div>
  );
});
