import { NavLink, useLocation } from 'react-router-dom';
import styles from './index.module.scss';

const navigationSet = [
  { id: 1, title: 'Home', link: '/home' },
  { id: 2, title: 'Gallery', link: '/gallery' },
  // { id: 3, title: 'Settings', link: '/settings' },
];

function Navigation() {
  const location = useLocation();

  return (
    <div className={styles.navBar_box}>
      {navigationSet.map(i => (
        <NavLink
          key={i.id}
          to={i.link}
          className={
            location.pathname === i.link
              ? `${styles.link} ${styles.active}`
              : styles.link
          }
        >
          {i.title}
        </NavLink>
      ))}
    </div>
  );
}

export { Navigation };
