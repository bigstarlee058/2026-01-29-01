import styles from './ContentSkeleton.module.scss';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

function ContentSkeleton() {
  const itemsTorender = Array(2).fill('');
  return (
    <section className={styles.container} data-testid="content-skeleton">
      {itemsTorender.map((i, index) => (
        <div key={index}>
          <SkeletonTheme
            baseColor="#11252F"
            highlightColor=" #383633"
            width="100%"
            height="100%"
            borderRadius="8px"
          >
            <div className={styles.title_container}>
              <Skeleton />
            </div>
            <div className={styles.skeleton_item}>
              <Skeleton />
            </div>
          </SkeletonTheme>
        </div>
      ))}
    </section>
  );
}
export { ContentSkeleton };
