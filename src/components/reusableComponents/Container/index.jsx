import styles from './index.module.scss';

function Container({ children, sizeWidth, sizeHeight, padding, borderRadius }) {
  return (
    <section
      className={styles.container}
      style={{
        maxWidth: sizeWidth,
        maxHeight: sizeHeight,
        padding: padding,
        borderRadius,
        position: 'relative',
      }}
    >
      {children}
    </section>
  );
}
export { Container };
