import React from 'react';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';

const AlignmentLines = observer(({ alignmentLines }) => {
  if (!alignmentLines || alignmentLines.length === 0) {
    return null;
  }

  return (
    <>
      {alignmentLines.map((line, index) => (
        <div
          key={index}
          className={`${styles.alignmentLine} ${styles[line.type]}`}
          style={{
            left: `${line.position}%`,
          }}
        />
      ))}
    </>
  );
});

export default AlignmentLines;
