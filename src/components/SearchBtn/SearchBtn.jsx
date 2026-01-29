import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './SearchBtn.module.scss';
import PropTypes from 'prop-types';
import { useState } from 'react';

function SearchBtn({ onChangeSearch, search, color }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = e => {
    const value = e.currentTarget.value.toLowerCase();
onChangeSearch(value);
  };

  return (
    <div className={styles.searchBar_container}>
      <form className={styles.searchBar_form}>
        <input
          placeholder="Search"
          onChange={handleChange}
          value={search}
          style={{ backgroundColor: color }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        ></input>
        <ButtonWithIcon
          icon="SearchIcon"
          size="20px"
          color={isFocused ? '#FFFFFF' : '#F1F1F199'}
          opacity={1}
          textColor="#F1F1F199"
          accentColor="white"
          classNameButton={styles.search_btn}
          classNameIcon={styles.search_icon}
          onClick={e => e.preventDefault()}
        />
        {search.length > 0 && (
          <ButtonWithIcon
            icon="CloseIcon"
            size="10px"
            color="#FFFFFF99"
            classNameButton={styles.close_btn}
            onClick={() => onChangeSearch('')}
          />
        )}
      </form>
    </div>
  );
}

SearchBtn.propTypes = {
  onChangeSearch: PropTypes.func,
  search: PropTypes.string,
  sidebarToogle: PropTypes.func,
  isSideBarOpen: PropTypes.bool,
  isLoading: PropTypes.bool,
};
export { SearchBtn };
