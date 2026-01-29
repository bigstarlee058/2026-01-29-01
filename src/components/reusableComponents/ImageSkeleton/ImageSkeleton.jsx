import styles from './ImageSkeleton.module.scss';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

function ImageSkeleton({ width = '100%', height='100%' }) {
  return (
    <SkeletonTheme
      baseColor="#11252F"
      highlightColor=" #383633"
      width={width}
      height={height}
      borderRadius="16px"
    >
      <div className={styles.skeleton_item}>
        <Skeleton  />
      </div>
    </SkeletonTheme>
  );
}
export { ImageSkeleton };
