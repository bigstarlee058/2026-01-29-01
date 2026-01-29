import styles from './LottieLoader.module.scss';
import Lottie from 'lottie-react';
import videfyAnime from '../../../data/videfyAnime.json';

const LottieLoader = () => {
  return (
    <div className={styles.loadingOverlay} data-testid="loading-overlay">
      <Lottie
        animationData={videfyAnime}
        className={styles.lottieAnimation}
        data-testid="loading-animation"
      />
    </div>
  );
};

export { LottieLoader };
