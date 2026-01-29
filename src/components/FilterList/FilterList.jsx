import styles from './FilterList.module.scss';
import { useState } from 'react';
import { ArrowUpIcon } from 'components/Icons';
import { FilterCheckBoxIcon } from 'components/Icons';
import PropTypes from 'prop-types';

const FilterList = ({
  onChangeFilters,
  onChangeFilterSearch,
  checkboxList,
  currentFilter,
  inputType = 'checkbox',
  search,
  parentName,
  username,
  allowDeselect = true,
  type = 'useChangeFilters',
}) => {
  const [shownFilters, setShownFilters] = useState(false);
  const isLongList = checkboxList.length > 3;
  const toggleShow = () => {
    setShownFilters(!shownFilters);
  };
  const getListToRender = () => {
    const listToRender = shownFilters ? checkboxList : checkboxList.slice(0, 3);
    return listToRender;
  };
  const getIsChecked = filter => {
    if (type === 'useChangeFilters') {
      return filter === currentFilter;
    }
    return search?.split(' ').includes(filter);
  };

  const handleFilterChange = filter => {
    if (type === 'useChangeFilters') {
      if (filter === currentFilter && allowDeselect) {
        onChangeFilters('', parentName || username);
      } else {
        onChangeFilters(filter, parentName || username);
      }
    } else {
      onChangeFilterSearch(filter.replace('_', ' '));
    }
  };

  return (
    <ul>
      {checkboxList &&
        getListToRender().map(filter => (
          <li className={styles.filter_item} key={filter}>
            <label className={styles.filter_label}>
              {getIsChecked(filter) ? (
                <span className={styles.filter_checked}>
                  <FilterCheckBoxIcon />
                </span>
              ) : (
                <span className={styles.filter_checked}></span>
              )}
              <input
                className={styles.check_input}
                type={inputType}
                id={filter}
                name={filter}
                value={filter}
                checked={
                  type === 'useChangeFilters'
                    ? filter === currentFilter
                    : search?.split(' ').includes(filter)
                }
                onChange={() => handleFilterChange(filter)}
              />
              {filter}
            </label>
          </li>
        ))}
      {isLongList && (
        <button className={styles.show_btn_box} onClick={() => toggleShow()}>
          {shownFilters ? 'Show less' : 'Show more'}
          <span
            className={`${styles.show_btn} ${
              shownFilters ? '' : styles.rotated
            }`}
          >
            <ArrowUpIcon size="12px" />
          </span>
        </button>
      )}
    </ul>
  );
};

FilterList.propTypes = {
  onChangeFilters: PropTypes.func,
  onChangeFilterSearch: PropTypes.func,
  checkboxList: PropTypes.array,
  currentFilter: PropTypes.string,
  inputType: PropTypes.string,
  search: PropTypes.string,
  parentName: PropTypes.string,
  username: PropTypes.string,
  type: PropTypes.string,
};

export { FilterList };
