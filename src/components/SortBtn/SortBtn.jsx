import styles from './SortBtn.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { ChoosenIcon } from 'components/Icons';

const SortBtn = ({ isSortDropdownOpen, setIsSortDropdownOpen, sortMenuRef, sortOptions, activeSort, handleSortSelect }) => {
  return (
    <div className={styles.project_sort}>
      <ButtonWithIcon
        icon="FilterIcon"
        size="24px"
        color="var(--secondary-white-text-color)"
        accentColor="#F1F1F199"
        activeColor="var(--accent-color)"
        classNameButton={styles.sort_btn}
        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
      />
      {isSortDropdownOpen && (
        <div className={styles.sortMenu} ref={sortMenuRef}>
          {sortOptions.map(option => (
            <div
              key={option.name}
              className={`${styles.sortMenu__item} ${
                activeSort === option.name
                  ? styles['sortMenu__item--active']
                  : ''
              }`}
              onClick={() => handleSortSelect(option.name)}
            >
              <p>{option.title}</p>
              {activeSort === option.name ? (
                <ChoosenIcon color="var(--accent-color)" />
              ) : (
                ''
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortBtn;
