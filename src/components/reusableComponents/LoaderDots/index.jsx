
import React from 'react';
import styles from './index.module.scss';

const LoaderDots = ({ size = '5px' }) => (
  <div className={styles.loader} style={{ '--loader-size': size}}>
    <div></div>
  </div>
);

export { LoaderDots };
