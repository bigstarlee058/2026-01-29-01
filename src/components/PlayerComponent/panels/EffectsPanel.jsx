import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { EffectResource } from '../entity/EffectResource';
import {
  isEditorImageElement,
  isEditorVideoElement,
} from '../../../mobx/store';
import styles from '../Player.module.scss';

export const EffectsPanel = observer(() => {
  const store = React.useContext(StoreContext);
  const selectedElement = store.selectedElement;
  return (
    <>
      <div className={styles.effectsTitle}>Effects</div>
      {selectedElement &&
      (isEditorImageElement(selectedElement) ||
        isEditorVideoElement(selectedElement)) ? (
        <EffectResource editorElement={selectedElement} />
      ) : null}
    </>
  );
});
