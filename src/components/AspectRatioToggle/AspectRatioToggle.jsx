import React from 'react';
import { observer } from 'mobx-react-lite';
import styles from './AspectRatioToggle.module.scss';

const aspectRatios = [
  { id: '16:9', value: { width: 16, height: 9 }, label: '16:9' },
  { id: '9:16', value: { width: 9, height: 16 }, label: '9:16' },
  { id: '4:3', value: { width: 4, height: 3 }, label: '4:3' },
  { id: '1:1', value: { width: 1, height: 1 }, label: '1:1' },
];

export const AspectRatioToggle = observer(({ currentRatio, onChange }) => {
  const isCurrentRatio = (ratio) => {
    return currentRatio.width === ratio.width && currentRatio.height === ratio.height;
  };

  return (
    <div className={styles.toggle_container}>
      {aspectRatios.map((ratio) => (
        <button
          key={ratio.id}
          className={`${styles.toggle_button} ${isCurrentRatio(ratio.value) ? styles.active : ''}`}
          onClick={() => onChange(ratio.value)}
        >
          {ratio.label}
        </button>
      ))}
    </div>
  );
});
