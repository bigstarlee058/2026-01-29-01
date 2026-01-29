import styles from './FilterSidebar.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { FilterList } from 'components/FilterList/FilterList';
import { useState, useEffect } from 'react';
import { user } from '../../redux/auth';
import { useSelector } from 'react-redux';
import { FilterItem } from 'components/FilterItem/FilterItem';
import filtersData from '../../data/tips.json';
import { TeamActivityFilter } from 'components/TeamActivityFilter/TeamActivityFilter';

const { characters, emotions, actions } = filtersData;

const FILTERS_KEYS = {
  PROVIDER: 'provider',
  MY_ACTIVITY: 'myActivity',
  // TEAM_ACTIVITY: 'teamActivity', // Remove team activity filter task 86b4rra4g
  CONTENT: 'content',
  IMAGES: 'images',
  AUDIO_TYPE: 'audioType',
  AUDIO_GENRE: 'audioGenre',
  AUDIO_AUTHOR: 'audioAuthor',
};

const imageFilterData = [
  {
    key: FILTERS_KEYS.MY_ACTIVITY,
    name: 'My activity',
    filters: ['Liked images', 'Disliked images'],
  },
  // {
  //   key: FILTERS_KEYS.TEAM_ACTIVITY, // Remove team activity filter task 86b4rra4g
  //   name: 'Team activity',
  //   filters: ['Liked by:', 'Disliked by:'],
  // },
  {
    key: FILTERS_KEYS.CONTENT,
    name: 'Content',
    filters: ['Characters', 'Actions', 'Emotions'],
  },
  {
    key: FILTERS_KEYS.IMAGES,
    name: 'Images',
    filters: ['Newer', 'Older'],
  },
];

const audioFilterData = [
  {
    key: FILTERS_KEYS.AUDIO_TYPE,
    name: 'Sound type',
    filters: ['All', 'Music', 'Sound effect'],
  },
  {
    key: FILTERS_KEYS.AUDIO_GENRE,
    name: 'Genre',
    searchable: true,
    filters: ['All'],
  },
];

const FilterSidebar = ({
  sidebarToogle,
  onChangeFilters,
  currentFilter,
  onChangeFilterSearch,
  search,
  onChangeUserSort,
  userSort,
  users,
  sort,
  resetFilters,
  isGalleryPage,
  selectedFilters,
  provider,
  onChangeProvider,
  contentType = 'images',
  isProviderLoading,
  isLoading

}) => {
  const [shownFilters, setShownFilters] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const { username } = useSelector(user);

  const filterData =
    contentType === 'images' ? imageFilterData : audioFilterData;

  useEffect(() => {
    const handleProviderChange = event => {
      const { provider: newProvider } = event.detail;
      if (newProvider && newProvider !== provider) {
        onChangeProvider(newProvider);
      }
    };

    document.addEventListener('providerChanged', handleProviderChange);

    return () => {
      document.removeEventListener('providerChanged', handleProviderChange);
    };
  }, [provider, onChangeProvider]);


  const toggleFilterItemVisibility = filter => {
    if (shownFilters.includes(filter)) {
      setShownFilters(shownFilters.filter(i => i !== filter));
    } else setShownFilters(prev => [...prev, filter]);
  };

  const getFilterData = name => {
    if (name.toLowerCase() === 'characters') {
      return characters;
    } else if (name.toLowerCase() === 'emotions') {
      return emotions;
    } else if (name.toLowerCase() === 'actions') {
      return actions;
    } else return [];
  };

  const getComponentToRender = filterItem => {
    const { key, filters, searchable } = filterItem;
    switch (key) {
      case FILTERS_KEYS.MY_ACTIVITY:
        return (
          <FilterList
            checkboxList={filters}
            onChangeFilters={onChangeFilters}
            currentFilter={currentFilter}
            username={username}
          />
        );
      // case FILTERS_KEYS.TEAM_ACTIVITY: // Remove team activity filter task 86b4rra4g
      //   return (
      //     <TeamActivityFilter
      //       filterList={filters}
      //       users={users}
      //       onChangeUserSort={onChangeUserSort}
      //       onChangeFilters={onChangeFilters}
      //       userSort={userSort}
      //       sort={sort}
      //     />
      //   );

      case FILTERS_KEYS.CONTENT:
        if (contentType === 'images') {
          return (
            <ul>
              {filters.map(el => (
                <li key={el}>
                  <h2 className={styles.filter_box_title_text}>{el}</h2>
                  <FilterList
                    checkboxList={getFilterData(el)}
                    onChangeFilterSearch={onChangeFilterSearch}
                    search={search}
                    type="useChangeFiltersSearch"
                  />
                </li>
              ))}
            </ul>
          );
        }
        return null;
      case FILTERS_KEYS.IMAGES:
        return (
          <FilterList
            checkboxList={filters}
            onChangeFilters={onChangeFilters}
            currentFilter={currentFilter}
          />
        );
      case FILTERS_KEYS.AUDIO_TYPE:
        return (
          <FilterList
            checkboxList={filters}
            onChangeFilters={onChangeFilters}
            currentFilter={currentFilter}
          />
        );
      case FILTERS_KEYS.AUDIO_GENRE:
        return (
          <div className={styles.genreFilter}>
            <input
              type="text"
              value={genreSearch}
              onChange={e => setGenreSearch(e.target.value)}
              placeholder="Search"
              className={styles.searchInput}
            />
            <FilterList
              checkboxList={filters}
              onChangeFilters={onChangeFilters}
              currentFilter={currentFilter}
            />
          </div>
        );
      default:
        return <div></div>;
    }
  };

  return (
    <section
      className={styles.filter_container}
      style={{
        top: isGalleryPage ? '32px' : '0',
        right: isGalleryPage ? '60px' : '32px',
        maxHeight: isGalleryPage ? 'calc(100vh - 172px)' : '100%',
      }}
    >
      <div className={styles.filter_header}>
        <div className={styles.title_box}>
          <ButtonWithIcon
            icon="FilterLeftIcon"
            accentColor="white"
            classNameButton={styles.filter_title_icon}
            onClick={sidebarToogle}
          />
          <h1>Filters</h1>
        </div>
      </div>
      <div className={styles.filter_content}>
        <div className={styles.filterBlock}>
          <h3 className={styles.filterTitle}>Provider</h3>
          <div className={styles.filterOptions}>
            {contentType === 'images' ? (
              <>
                <button
                  className={`${styles.filterBtn} ${
                    provider === 'leonardo' ? styles.active : ''
                  }`}
                  onClick={() => {
                    onChangeProvider('leonardo');
                    const event = new CustomEvent('providerChanged', {
                      detail: {
                        provider: 'leonardo',
                        displayName: 'Leonardo AI',
                      },
                    });
                    document.dispatchEvent(event);
                  }}
                >
                  Leonardo AI
                </button>
                <button
                  className={`${styles.filterBtn} ${
                    provider === 'pixabay' ? styles.active : ''
                  }`}
                  onClick={() => {
                    onChangeProvider('pixabay');
                    const event = new CustomEvent('providerChanged', {
                      detail: { provider: 'pixabay', displayName: 'Pixabay' },
                    });
                    document.dispatchEvent(event);
                  }}
                >
                  Pixabay
                </button>
              </>
            ) : (
              <button
                className={`${styles.filterBtn} ${styles.active}`}
                onClick={() => onChangeProvider('pixabay')}
              >
                Pixabay
              </button>
            )}
          </div>
        </div>
        <ul>
          {filterData &&
            filterData.map(i => (
              <li key={i.name}>
                <FilterItem
                  name={i.name}
                  toggleFilterItemVisibility={toggleFilterItemVisibility}
                  shownFilters={shownFilters}
                  children={getComponentToRender(i)}
                />
              </li>
            ))}
        </ul>
        <button className={styles.filter_submit_btn} onClick={resetFilters}>
          Clear all
        </button>
      </div>
    </section>
  );
};

export { FilterSidebar };
