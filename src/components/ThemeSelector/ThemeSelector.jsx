import styles from './ThemeSelector.module.scss';
import CheckBoxBlackIcon from 'components/Icons/CheckBoxBlackIcon';
import { useTheme } from 'components/ThemeProvider/ThemeProvider';

const ThemeSelector = () => {
  const { theme, toggleTheme } = useTheme();

  const themes = [
    { name: 'green', color: '#D3F85A' },
    { name: 'purple', color: '#FD4BE0' },
    { name: 'orange', color: '#E16B16' },
    { name: 'blue', color: '#6985FF' },
  ];

  return (
    <ul className={styles.container}>
      {themes.map(({ name, color }) => (
        <li
          key={name}
          className={`${styles.item} ${theme === name ? styles.active : ''}`}
          style={{
            backgroundColor: color,
            '--active-border-color': color,
          }}
          onClick={() => toggleTheme(name)}
        >
          {theme === name && <CheckBoxBlackIcon color="black" />}
        </li>
      ))}
    </ul>
  );
};

export { ThemeSelector };
