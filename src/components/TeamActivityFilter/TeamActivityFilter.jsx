import styles from './TeamActivityFilter.module.scss';
import { useState, useEffect } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { FilterList } from 'components/FilterList/FilterList';
import { FilterCheckBoxIcon } from 'components/Icons';
import PropTypes from 'prop-types';

const TeamActivityFilter = ({
  userSort,
  filterList,
  users,
  onChangeUserSort,
  onChangeFilters,
  search,
}) => {
  const [inputsState, setInputsState] = useState([]);
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [filtersState, setFiltersState] = useState({});
  const [listToRender, setListToRender] = useState([]);

  useEffect(() => {
    if (filterList?.length && users?.length) {
      const inputState = filterList.map(el => ({
        name: el,
        value: '',
      }));
      const listToRenderState = filterList.map(el => ({
        listName: el,
        listValue: users,
      }));
      setInputsState(inputState);
      setListToRender(listToRenderState);
    }
  }, [filterList, users]);

  useEffect(() => {
    setSelectedUser(userSort);
  }, [userSort]);

  const onInputChange = (value, filterKey) => {
    setInputsState(prevState =>
      prevState.map(i => ({
        ...i,
        value: i.name === filterKey ? value : '',
      }))
    );
    setListToRender(prevState =>
      prevState.map(l => ({
        ...l,
        listValue:
          l.listName === filterKey
            ? users?.filter(user =>
                user.toLowerCase().includes(value.toLowerCase())
              )
            : users,
      }))
    );
  };

  const onClearInput = el => {
    const newInputList = inputsState.map(input =>
      input.name === el ? { ...input, value: '' } : input
    );
    setInputsState(newInputList);
    const listToRenderState = filterList.map(el => ({
      listName: el,
      listValue: users,
    }));
    setListToRender(listToRenderState);
    onUserSelection(el, 'All Users');
  };

  const onUserSelection = (filterKey, value) => {
    if (value === 'All Users' || value === '') {
      setFiltersState({});
      const newInputState = filterList.map(el => ({
        name: el,
        value: '',
      }));
      setInputsState(newInputState);
      onChangeUserSort('All Users');
      onChangeFilters('', 'All Users');
    } else {
      setFiltersState(prevState => ({
        ...prevState,
        name: filterKey,
        value: value,
      }));
      onChangeUserSort(value);
      onChangeFilters(filterKey, value);
    }
  };

  const handleFilterClick = (filterKey, value) => {
    if (filtersState.name === filterKey && filtersState.value === value) {
      setFiltersState({});
      const hasActiveFilters = Object.keys(filtersState).length > 0;
      
      if (!hasActiveFilters) {
        onChangeUserSort('All Users');
        onUserSelection(null, 'All Users')
        onChangeFilters('', 'All Users');
      }
    } else {
      onUserSelection(filterKey, value);
    }
  };

  const getListToRender = el => {
    const foundItem = listToRender?.find(l => l.listName === el);
    return foundItem ? foundItem.listValue : users;
  };

  const getInputValue = el => {
    const foundItem = inputsState?.find(i => i.name === el);
    return foundItem ? foundItem.value : '';
  };

  return (
    <ul className={styles.filter_List}>
      <li className={styles.filter_item}>
        <label htmlFor="All Users" className={styles.filter_label}>
          {userSort === 'All Users' ? (
            <span className={styles.filter_checked}>
              <FilterCheckBoxIcon />
            </span>
          ) : (
            <span className={styles.filter_checked}></span>
          )}
          <input
            className={styles.check_input}
            id="All Users"
            type="radio"
            name="All Users"
            checked={userSort === 'All Users'}
            onChange={() => onUserSelection(null, 'All Users')}
          />
          {'All team members'}
        </label>
      </li>
      {filterList.map(el => (
        <li key={el}>
          <h2 className={styles.filter_item_title}>{el}</h2>
          <div className={styles.filter_item_search}>
            <input
              placeholder="Search"
              id={el}
              name={el}
              value={getInputValue(el)}
              onChange={e => onInputChange(e.target.value, el)}
              className={styles.searchBar_form}
            />
            <ButtonWithIcon
              icon="SearchIcon"
              accentColor="var(--accent-color)"
              classNameButton={styles.search_icon}
            />
            {getInputValue(el).length > 0 && (
              <ButtonWithIcon
                icon="CloseIcon"
                size="8px"
                color="#ffffff99"
                classNameButton={styles.close_icon}
                onClick={() => onClearInput(el)}
              />
            )}
          </div>
          <FilterList
            checkboxList={getListToRender(el)}
            onChangeFilters={value => handleFilterClick(el, value)}
            currentFilter={filtersState.name === el ? filtersState.value : null}
          />
        </li>
      ))}
    </ul>
  );
};
TeamActivityFilter.propTypes = {
  userSort: PropTypes.string,
  filterList: PropTypes.array,
  users: PropTypes.array,
  onChangeUserSort: PropTypes.func,
  onChangeFilters: PropTypes.func,
};

export { TeamActivityFilter };
