import { fabric } from 'fabric';
import React, { useEffect, useState } from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import { Resources } from './Resources';
import { ElementsPanel } from './panels/ElementsPanel';
import { Menu } from './Menu';
import { TimeLine } from './TimeLine';
import { Store } from '../../mobx/store';
import '../../utils/fabric-utils';
import styles from './Player.module.scss';

export const EditorWithStore = ({ data, handleActiveScene }) => {
  const [store] = useState(new Store());

  return (
    <StoreContext.Provider value={store}>
      <Editor
        data={data}
        handleActiveScene={handleActiveScene}
        isShown
      ></Editor>
    </StoreContext.Provider>
  );
};

export const Editor = observer(
  ({
    overlays,
    handleActiveScene,
    isShown,
    currentScale,
    setCurrentScale,
    currentVolume,
    storyData,
    isCutMode,
    defaultButton,
    setIsCutMode,
    handleMuteToggle,
    handleVolumeChange,
    isMuted,
    volumeRangeRef,
    onUndo,
    onRedo,
    isUndoRedoLoading,
  }) => {
    return (
      <div className={styles.container}>
        {/* <div className={styles.playerContainer}>
          <div className={styles.tile} style={{ display: 'none' }}>
            <Menu />
          </div>
          <div
            className={`${styles.tile} ${styles.overflowScroll}`}
            style={{
              maxWidth: '300px',
              display: 'none',
            }}
          >
            <Resources />
          </div>
          <div className={styles.elementsPanel} style={{ display: 'none' }}>
            <ElementsPanel />
          </div>
        </div> */}
        <TimeLine
          overlays={overlays}
          handleActiveScene={handleActiveScene}
          isShown={isShown}
          currentScale={currentScale}
          setCurrentScale={setCurrentScale}
          currentVolume={currentVolume}
          storyData={storyData}
          isCutMode={isCutMode}
          defaultButton={defaultButton}
          setIsCutMode={setIsCutMode}
          handleMuteToggle={handleMuteToggle}
          handleVolumeChange={handleVolumeChange}
          isMuted={isMuted}
          volumeRangeRef={volumeRangeRef}
          onUndo={onUndo}
          onRedo={onRedo}
          isUndoRedoLoading={isUndoRedoLoading}
        />
      </div>
    );
  }
);
