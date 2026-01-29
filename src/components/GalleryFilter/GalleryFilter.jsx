import styles from './GalleryFilter.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { FilterList } from 'components/FilterList/FilterList';
import { useState } from 'react';
import { user } from '../../redux/auth';
import { useSelector } from 'react-redux';
import { FilterItem } from 'components/FilterItem/FilterItem';
import filtersData from '../../data/tips.json';
import { TeamActivityFilter } from 'components/TeamActivityFilter/TeamActivityFilter';

const { characters, emotions, actions } = filtersData;

const FILTERS_KEYS = {
  PROVIDER: 'provider',
  MY_ACTIVITY: 'myActivity',
  TEAM_ACTIVITY: 'teamActivity',
  CONTENT: 'content',
  IMAGES: 'images',
  AUDIO_TYPE: 'audioType',
  AUDIO_GENRE: 'audioGenre',
  AUDIO_AUTHOR: 'audioAuthor',
};

const imageFilterData = [
  {
    key: FILTERS_KEYS.PROVIDER,
    name: 'Provider',
    filters: ['Leonardo AI', 'Pixabay'],
  },
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

const GalleryFilter = ({
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
}) => {
  const [shownFilters, setShownFilters] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const { username } = useSelector(user);
const filterData =
    contentType === 'images' ? imageFilterData : audioFilterData;

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
      case FILTERS_KEYS.PROVIDER:
        return (
          <FilterList
            checkboxList={filters}
            onChangeFilters={filter => {
              if (filter.toLowerCase() === 'leonardo ai') {
                onChangeProvider('leonardo');
              } else if (filter.toLowerCase() === 'pixabay') {
                onChangeProvider('pixabay');
              }
            }}
            allowDeselect={false}
            currentFilter={provider === 'leonardo' ? 'Leonardo AI' : 'Pixabay'}
          />
        );
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
      //       search={search}
      //     />
      //   );
      case FILTERS_KEYS.CONTENT:
        if (contentType === 'images') {
          return (
            <ul>
              {filters.map(el => (
                <li key={el}>
                  <h2>{el}</h2>
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
        paddingBottom: isGalleryPage ? '16px' : '0',
        width: isGalleryPage ? '100%' : '202px',
      }}
    >
      <div className={styles.title_box}>
        <h1>Filters</h1>
        <ButtonWithIcon
          icon="CloseIcon"
          size="10"
          color="#BABABA"
          accentColor="white"
          classNameButton={styles.filter_title_icon}
          onClick={sidebarToogle}
        />
      </div>
      <div className={styles.filter_content}>
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

export { GalleryFilter };
