import { usePageContext } from 'hooks/PageContext';
import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.scss';

const Layout = () => {
  const location = useLocation();
  const { isGalleryPage } = usePageContext();
  const hideHeaderRoutes = ['/login', '/signUp', '/reset'];
  const isStoryboardPage = location.pathname.includes('/storyboard');
  const isCreateProjectPage = location.pathname.includes('/createProject/create');

  // Define routes where stainTop should be shown
  const showStainTopRoutes = ['/createProject/create'];
  const shouldShowStainTop = showStainTopRoutes.includes(location.pathname);
  const isCreateVideoPage = location.pathname.includes('/createVideo/');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div
        className={`${styles.wrap} ${isGalleryPage ? styles.gallery : ''} ${
          isStoryboardPage ? styles.storyboard : ''
        } ${isCreateVideoPage ? styles.createVideo : ''} ${
          isCreateProjectPage ? styles.createProject : ''
        }`}
      >
        <div className="stain"></div>
        {shouldShowStainTop && (
          <div>
            <div className="stainTop"></div> <div className="stainLeft"></div>
          </div>
        )}
        <div className="stainBottom"></div>
        <div className={styles.outlet}>
          <Outlet />
        </div>
      </div>
    </Suspense>
  );
};

export default Layout;
