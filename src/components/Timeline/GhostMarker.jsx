import React from 'react';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';

const GhostMarker = observer(({ position }) => {
  if (position === null || position === undefined) {
    return null;
  }

  return (
    <div className={styles.ghostMarker} style={{ left: `${position}%` }}>
      <div className={styles.ghostTriangle} />
    </div>
  );
});

export default GhostMarker;
