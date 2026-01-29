import styles from './GallerySkeleton.module.scss';
import 'react-loading-skeleton/dist/skeleton.css';
import { ImageSkeleton } from 'components/reusableComponents/ImageSkeleton/ImageSkeleton';
import { usePageContext } from 'hooks/PageContext';

function GallerySkeleton() {
  const itemsTorender = Array(20).fill(null);

 const { isGalleryPage } = usePageContext();

  return (
    <section
      className={`${styles.container} ${isGalleryPage ? styles.gallery : ''}`}
    >
      {itemsTorender.map((_, index) => (
        <ImageSkeleton key={`skeleton-${index}`} />
      ))}
    </section>
  );
}
export { GallerySkeleton };
