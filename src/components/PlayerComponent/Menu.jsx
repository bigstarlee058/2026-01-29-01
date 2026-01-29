import React from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import {
  MdDownload,
  MdVideoLibrary,
  MdImage,
  MdTransform,
  MdTitle,
  MdAudiotrack,
  MdOutlineFormatColorFill,
  MdMovieFilter,
} from 'react-icons/md';
import styles from './Player.module.scss';

export const Menu = observer(() => {
  const store = React.useContext(StoreContext);

  return (
    <ul className={styles.menu}>
      {MENU_OPTIONS.map(option => {
        const isSelected = store.selectedMenuOption === option.name;
        return (
          <li
            key={option.name}
            className={`${styles.menuItem} ${
              isSelected ? styles.menuItemSelected : ''
            }`}
          >
            <button
              onClick={() => option.action(store)}
              className={styles.menu_button}
            >
              <option.icon size="20" color={isSelected ? '#000' : '#444'} />
              <div
                className={`${styles.textSmall} ${styles.textHoverBlack} ${
                  isSelected ? styles.textBlack : styles.textSlate600
                }`}
              >
                {option.name}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

const MENU_OPTIONS = [
  {
    name: 'Video',
    icon: MdVideoLibrary,
    action: store => {
      store.setSelectedMenuOption('Video');
    },
  },
  {
    name: 'Audio',
    icon: MdAudiotrack,
    action: store => {
      store.setSelectedMenuOption('Audio');
    },
  },
  {
    name: 'Image',
    icon: MdImage,
    action: store => {
      store.setSelectedMenuOption('Image');
    },
  },
  {
    name: 'Text',
    icon: MdTitle,
    action: store => {
      store.setSelectedMenuOption('Text');
    },
  },
  {
    name: 'Animation',
    icon: MdTransform,
    action: store => {
      store.setSelectedMenuOption('Animation');
    },
  },
  {
    name: 'Effect',
    icon: MdMovieFilter,
    action: store => {
      store.setSelectedMenuOption('Effect');
    },
  },
  {
    name: 'Fill',
    icon: MdOutlineFormatColorFill,
    action: store => {
      store.setSelectedMenuOption('Fill');
    },
  },
  {
    name: 'Export',
    icon: MdDownload,
    action: store => {
      store.setSelectedMenuOption('Export');
    },
  },
];
