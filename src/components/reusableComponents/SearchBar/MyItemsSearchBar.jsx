import { useState, useEffect } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import PropTypes from 'prop-types';
import styles from './MyItemsSearchBar.module.scss';

const MyItemsSearchBar = ({
  placeholder = 'Search',
  value = '',
  onChange,
  onClear,
  showFilters = false,
  filterOptions = [],
  activeFilter = 'All',
  onFilterChange,
  className = '',
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const handleSearchChange = e => {
    const newValue = e.currentTarget.value;
    setSearchTerm(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onChange) {
      onChange('');
    }
    if (onClear) {
      onClear();
    }
  };

  const handleFilterClick = filter => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  return (
    <div className={`${styles.search_container_wrapper} ${className}`}>
      <div className={styles.search_container}>
        <div className={styles.search_form}>
          <ButtonWithIcon
            icon="SearchIcon"
            size="15px"
            color="rgba(255, 255, 255, 0.32)"
            accentColor="#FFFFFFB2"
            activeColor="white"
            classNameButton={styles.search_btn}
            classNameIcon={styles.search_icon}
            onClick={e => e.preventDefault()}
          />
          <input
            placeholder={placeholder}
            onChange={handleSearchChange}
            value={searchTerm}
            className={styles.search_input}
            disabled={disabled}
          />
          {searchTerm && (
            <ButtonWithIcon
              icon="CloseIcon"
              size="12px"
              color="rgba(255, 255, 255, 0.4)"
              accentColor="#FFFFFFB2"
              activeColor="white"
              classNameButton={styles.clear_btn}
              onClick={handleClear}
            />
          )}
        </div>
      </div>

      {showFilters && filterOptions.length > 0 && (
        <div className={styles.search_filters}>
          {filterOptions.map((filter, index) => (
            <div
              key={index}
              className={`${styles.search_filters_item} ${
                activeFilter === filter ? styles.active : ''
              }`}
              onClick={() => handleFilterClick(filter)}
            >
              {filter}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

MyItemsSearchBar.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  showFilters: PropTypes.bool,
  filterOptions: PropTypes.array,
  activeFilter: PropTypes.string,
  onFilterChange: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export { MyItemsSearchBar };
