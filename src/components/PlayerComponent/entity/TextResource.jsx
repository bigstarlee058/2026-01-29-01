import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { MdAdd } from 'react-icons/md';
import styles from '../Player.module.scss';

export const TextResource = observer(({ fontSize, fontWeight, sampleText }) => {
  const store = React.useContext(StoreContext);
  return (
    <div>
      <div
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: `${fontWeight}`,
        }}
      >
        {sampleText}
      </div>
      <button
        onClick={() =>
          store.addText({
            text: sampleText,
            fontSize: fontSize,
            fontWeight: fontWeight,
          })
        }
      >
        <MdAdd size="25" />
      </button>
    </div>
  );
});
