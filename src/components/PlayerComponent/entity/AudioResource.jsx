import React from 'react';
import { StoreContext } from '../../../mobx';
import { formatTimeToMinSec } from '../../../utils';
import { observer } from 'mobx-react';
import { MdAdd } from 'react-icons/md';
import styles from '../Player.module.scss';

export const AudioResource = observer(({ audio, index }) => {
  const store = React.useContext(StoreContext);
  const ref = React.useRef(null);
  const [formatedAudioLength, setFormatedAudioLength] = React.useState('00:00');

  return (
    <div className={styles.audioResourceContainer}>
      <div className={styles.audioLengthLabel}>{formatedAudioLength}</div>
      <button
        className={styles.addButton}
        onClick={() => store.addAudio(index)}
      >
        <MdAdd size="25" />
      </button>
      <audio
        onLoadedData={() => {
          const audioLength = ref.current?.duration ?? 0;
          setFormatedAudioLength(formatTimeToMinSec(audioLength));
        }}
        ref={ref}
        className={styles.audioElement}
        src={audio}
        id={`audio-${index}`}
        crossorigin="anonymous"
      ></audio>
    </div>
  );
});
