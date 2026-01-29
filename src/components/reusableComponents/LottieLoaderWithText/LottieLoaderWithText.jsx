import styles from './LottieLoaderWithText.module.scss';
import Lottie from 'lottie-react';
import videfyAnime from '../../../data/videfyAnime.json';

const LottieLoaderWithText = ({ text }) => {
  return (
    <div className={styles.loadingOverlay} data-testid="loading-overlay">
      <div className={styles.lottieLoaderContainer}>

          <Lottie
            animationData={videfyAnime}
            className={styles.lottieAnimation}
            data-testid="loading-animation"
          />
        <p>{text}</p>
      </div>
    </div>
  );
};

export { LottieLoaderWithText };
