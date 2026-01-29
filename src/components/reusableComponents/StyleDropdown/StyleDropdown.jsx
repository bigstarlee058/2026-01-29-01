import styles from './StyleDropdown.module.scss';
import { ChosenIcon } from 'components/Icons';

const StyleDropdown = ({
  onSelect,
  itemsList,
  selectedItem,
  customStyles = {},
}) => {
// Combine default styles with custom styles
  const dropdownStyles = {
    ...customStyles,
  };

  // Helper function to get the style value regardless of selectedItem type
  const getSelectedStyle = () => {
    if (!selectedItem) return '';
    return typeof selectedItem === 'object' ? selectedItem.style : selectedItem;
  };

  const selectedStyle = getSelectedStyle();

  return (
    <div className={styles.sizePopup} style={dropdownStyles}>
      <div className={styles.dropdownContent}>
        {itemsList.map(item => (
          <div
            key={item.id}
            className={styles.sizePopupItem}
            onClick={() => onSelect(item)}
          >
            <p>{item.style}</p>
            {selectedStyle === item.style && (
              <span>
                <ChosenIcon />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { StyleDropdown };
