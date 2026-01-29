import styles from './ImageLoader.module.scss';
import Lottie from 'lottie-react';
import videfyAnime from '../../../data/videfyAnime.json';

const ImageLoader = ({ text = "Loading ...", hasThumbnails = false }) => {
  return (
    <div 
      className={`${styles.imageLoader} ${hasThumbnails ? styles.imageLoaderReduced : ''}`} 
      data-testid="image-loader"
    >
      <div className={styles.iconContainer}>
        <Lottie
          animationData={videfyAnime}
          className={styles.lottieAnimation}
          data-testid="loading-animation"
        />
      </div>
      <p className={styles.loaderText}>{text}</p>
    </div>
  );
};

export { ImageLoader }; 