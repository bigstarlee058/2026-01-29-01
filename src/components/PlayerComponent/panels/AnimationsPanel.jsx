import React, { useState, useEffect, useRef } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import { AnimationResource } from '../entity/AnimationResource';
import { BsXLg, BsPencil } from 'react-icons/bs';
import { getUid } from '../../../utils';
import styles from '../Player.module.scss';

export const AnimationsPanel = observer(props => {
  const store = React.useContext(StoreContext);
  const [openAnimationId, setOpenAnimationId] = useState(null);
  const selectedElement = store.selectedElement;

  // Cleanup when panel is closed
  const handleClosePanel = () => {
    if (store.isSelectingOrigin) {
      store.cleanupOriginSelection();
    }
    props.onCloseAnimations();
  };

  if (!selectedElement) {
    return <div className={styles.animationsPanel}>No element selected</div>;
  }

  const selectedElementAnimations = store.animations.filter(animation => {
    return animation.targetId === selectedElement.id || 
           (animation.targetIds && animation.targetIds.includes(selectedElement.id));
  });

  const animationChecks = {
    fadeIn: selectedElementAnimations.some(
      animation => animation.type === 'fadeIn'
    ),
    fadeOut: selectedElementAnimations.some(
      animation => animation.type === 'fadeOut'
    ),
    slideIn: selectedElementAnimations.some(
      animation => animation.type === 'slideIn'
    ),
    slideOut: selectedElementAnimations.some(
      animation => animation.type === 'slideOut'
    ),
    zoomIn: selectedElementAnimations.some(
      animation => animation.type === 'zoomIn'
    ),
    zoomOut: selectedElementAnimations.some(
      animation => animation.type === 'zoomOut'
    ),
    drop: selectedElementAnimations.some(
      animation => animation.type === 'drop'
    ),
  };

  const animationsConfig = [
    {
      type: 'fadeIn',
      name: 'Fade In',
      properties: { W: 4 },
    },
    {
      type: 'fadeOut',
      name: 'Fade Out',
      properties: { W: 4 },
    },
    {
      type: 'slideIn',
      name: 'Slide In',
      properties: { direction: 'right', W: 4 },
    },
    {
      type: 'slideOut',
      name: 'Slide Out',
      properties: { direction: 'left', W: 4 },
    },
    {
      type: 'zoomIn',
      name: 'Zoom In',
      properties: { scaleFactor: 1.2, W: 4 },
    },
    {
      type: 'zoomOut',
      name: 'Zoom Out',
      properties: { scaleFactor: 0.8, W: 4 },
    },
    {
      type: 'drop',
      name: 'Drop',
      properties: { W: 4, scaleFactor: 1.5, origin: 'center' },
    },
  ];

  const toggleAnimationOpen = animationId => {
    if (openAnimationId === animationId) {
      setOpenAnimationId(null);
    } else {
      setOpenAnimationId(animationId);
    }
  };

  return (
    <div className={styles.animationsPanel}>
      <button
        type="button"
        className={styles.closeAnimationButton}
        onClick={handleClosePanel}
      >
        <BsXLg size="16" />
      </button>
      {animationsConfig.map(animation =>
        selectedElement && !animationChecks[animation.type] ? (
          <div
            key={animation.type}
            className={styles.addAnimationButton}
            onClick={() => {
              const newAnimation = {
                id: getUid(),
                type: animation.type,
                targetId: selectedElement?.id ?? '',
                duration: 1000,
                properties: animation.properties,
              };
              store.addAnimation(newAnimation);
              setOpenAnimationId(animation.type);
            }}
          >
            <div className={styles.imageWrap}>
              {selectedElement?.properties?.src && (
                <img
                  className={styles.animationPreview}
                  src={selectedElement.properties.src}
                  alt=""
                />
              )}
            </div>
            <div className={styles.animationTitle}>{animation.name}</div>
          </div>
        ) : (
          <div key={animation.type} className={styles.addAnimationButton}>
            <div className={styles.imageWrap}>
              {selectedElement?.properties?.src && (
                <img
                  className={styles.animationPreview}
                  src={selectedElement.properties.src}
                  alt=""
                />
              )}
            </div>
            <div className={styles.animationTitle}>{animation.name}</div>
            {openAnimationId === animation.type ? (
              <></>
            ) : (
              <button
                className={styles.editAnimationButton}
                onClick={() => toggleAnimationOpen(animation.type)}
              >
                <BsPencil size="16" />
              </button>
            )}
            <button
              className={styles.deleteAnimationButton}
              onClick={() => {
                const animationToRemove = selectedElementAnimations.find(
                  a => a.type === animation.type
                );
                if (animationToRemove) {
                  store.removeAnimation(animationToRemove.id);
                }
              }}
            >
              <BsXLg size="16" />
            </button>
            {openAnimationId === animation.type && (
              <AnimationResource
                animation={selectedElementAnimations.find(
                  a => a.type === animation.type
                )}
                isSidebar={false}
                onClose={() => setOpenAnimationId(null)}
              />
            )}
          </div>
        )
      )}
    </div>
  );
});
