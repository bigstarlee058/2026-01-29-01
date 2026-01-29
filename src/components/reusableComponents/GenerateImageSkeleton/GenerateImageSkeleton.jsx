import styles from './GenerateImageSkeleton.module.scss';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { ButtonWithIcon } from '../ButtonWithIcon';

function GenerateImageSkeleton({
  width = '100%',
  height = '100%',
  deleteGenerations,
}) {
  return (
    <SkeletonTheme
      baseColor="#11252F"
      highlightColor=" #383633"
      width={width}
      height={height}
      borderRadius="16px"
    >
      <div className={styles.skeleton_item}>
        <Skeleton height={66} />
        <ButtonWithIcon
          icon="StopIcon"
          accentColor="var(--accent-color)"
          classNameButton={styles.btn}
          onClick={deleteGenerations}
        />
      </div>
    </SkeletonTheme>
  );
}
export { GenerateImageSkeleton };
