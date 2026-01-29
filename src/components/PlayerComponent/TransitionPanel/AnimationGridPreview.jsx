import React from 'react';
import styles from './TransitionPanel.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const AnimationGridPreview = ({ animationList, activeAnimation }) => {
  const isAnimationActive = animation => {
    return activeAnimation.type === animation.type;
  };

  const getAnimationCount = animation => {
    // For preview, show 1 if animation is active, 0 otherwise
    return isAnimationActive(animation) ? 1 : 0;
  };

  const handleAnimationClick = animation => {
};

  return (
    <div className={styles.content}>
      <div className={`${styles.animationsGrid} ${styles.preview}`}>
        {animationList.map(animation => (
          <div
            key={animation.id || animation.type}
            className={`${styles.animationCard} ${styles.preview}`}
            onClick={() => handleAnimationClick(animation)}
            data-animation-type={animation.type}
          >
            <div
              className={`${styles.animationPreview} ${
                animation.type === 'none' ? styles.noneAnimation : ''
              } ${styles.preview}`}
            >
              {animation.image && (
                <img
                  src={animation.image}
                  alt={animation.name}
                  className={styles.previewImage}
                />
              )}
              {/* Animation count badge */}
              {(() => {
                const count = getAnimationCount(animation);
                return count > 0 ? (
                  <div className={styles.animationBadge}>
                    {count}
                  </div>
                ) : null;
              })()}
            </div>

            <div className={styles.animationInfo}>
              <span className={styles.animationName}>
                {animation.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { AnimationGridPreview };
