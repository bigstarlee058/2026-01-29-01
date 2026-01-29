import React, { useEffect } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { MdOutlineTextFields, MdMovie } from 'react-icons/md';
import styles from '../Player.module.scss';

export const Element = observer(props => {
  const store = React.useContext(StoreContext);
  const { element } = props;
  const Icon = element.type === 'video' ? MdMovie : MdOutlineTextFields;
  const isSelected = store.selectedElement?.id === element.id;

  useEffect(() => {
    if (
      element.type === 'audio' &&
      typeof store.volume === 'number' &&
      isFinite(store.volume)
    ) {
      const audioElement = document.getElementById(
        element.properties.elementId
      );
      if (audioElement) {
        audioElement.volume = store.volume;
      }
    }
  }, [store.volume, element]);

  return (
    <div
      style={{
        backgroundColor: isSelected ? 'rgba(0, 160, 245, 0.1)' : '',
      }}
      className={`${styles.elementContainer} ${
        isSelected ? styles.selectedBackground : ''
      }`}
      key={element.id}
      onClick={() => {
        store.setSelectedElement(element);
      }}
    >
      <Icon size="20" color="gray" className={styles.icon} />
      <div className={styles.elementName}>{element.name}</div>
      <div>
        {element.type === 'video' ? (
          <video
            className={styles.hiddenMedia}
            src={element.properties.src}
            onLoad={() => {
              store.refreshElements();
            }}
            onLoadedData={() => {
              store.refreshElements();
            }}
            height={20}
            width={20}
            id={element.properties.elementId}
          />
        ) : null}
        {element.type === 'image' ? (
          <img
            className={styles.hiddenMedia}
            src={element.properties.src}
            onLoad={() => {
              store.refreshElements();
            }}
            onLoadedData={() => {
              store.refreshElements();
            }}
            height={20}
            width={20}
            id={element.properties.elementId}
          />
        ) : null}
        {element.type === 'audio' ? (
          <audio
            className={styles.hiddenMedia}
            src={element.properties.src}
            onLoad={e => {
              store.refreshElements();
            }}
            onLoadedData={e => {
              store.refreshElements();
              if (
                e.currentTarget &&
                typeof store.volume === 'number' &&
                isFinite(store.volume)
              ) {
                e.currentTarget.volume = store.volume;
              }
            }}
            id={element.properties.elementId}
            crossOrigin="anonymous"
            ref={audioRef => {
              if (
                audioRef &&
                typeof store.volume === 'number' &&
                isFinite(store.volume)
              ) {
                audioRef.volume = store.volume;
              }
            }}
          />
        ) : null}
      </div>
      <button
        className={styles.deleteButton}
        onClick={e => {
          store.removeEditorElement(element.id);
          store.refreshElements();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        X
      </button>
    </div>
  );
});
