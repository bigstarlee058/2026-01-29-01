import React from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import styles from '../Player.module.scss';

const EFFECT_TYPE_TO_LABEL = {
  blackAndWhite: 'Black and White',
  none: 'None',
  saturate: 'Saturate',
  sepia: 'Sepia',
  invert: 'Invert',
};

export const EffectResource = observer(props => {
  const store = React.useContext(StoreContext);
  return (
    <div className={styles.effectResourceContainer}>
      <div className={styles.effectHeader}>
        <div className={styles.effectTitle}>
          {EFFECT_TYPE_TO_LABEL[props.editorElement.properties.effect.type]}
        </div>
      </div>
      <select
        className={styles.effectSelect}
        value={props.editorElement.properties.effect.type}
        onChange={e => {
          const type = e.target.value;
          store.updateEffect(props.editorElement.id, {
            type: type,
          });
        }}
      >
        {Object.keys(EFFECT_TYPE_TO_LABEL).map(type => {
          return (
            <option key={type} value={type}>
              {EFFECT_TYPE_TO_LABEL[type]}
            </option>
          );
        })}
      </select>
    </div>
  );
});
