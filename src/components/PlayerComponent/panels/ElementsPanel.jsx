import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { Element } from '../entity/Element';
import styles from '../Player.module.scss';

export const ElementsPanel = observer(_props => {
  const store = React.useContext(StoreContext);
  return (
    <div className={styles.elementsPanelContainer}>
      <div className={styles.elementsHeader}>
        <div className={styles.elementsTitle}>Elements</div>
      </div>
      <div className={styles.elementsList}>
        {store.editorElements.map(element => {
          return <Element key={element.id} element={element} />;
        })}
      </div>
    </div>
  );
  
});
