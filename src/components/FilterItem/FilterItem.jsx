import styles from './FilterItem.module.scss';
import { ArrowUpIcon } from 'components/Icons';

const FilterItem = ({
  name,
  children,
  toggleFilterItemVisibility,
  shownFilters,
  key,
}) => {
  const isShown = shownFilters.includes(name);

  return (
    <div className={styles.filter_box}>
      <div className={styles.filter_box_title}  onClick={() => toggleFilterItemVisibility(name)}>
        <h2 className={styles.filter_box_title_text}>{name}</h2>
        <div
          
          className={`${styles.show_btn} ${isShown ? '' : styles.rotated}`}
        >
          <ArrowUpIcon size="16px" color=" #BABABA" />
        </div>
      </div>
      {isShown && children}
    </div>
  );
};
export { FilterItem };
