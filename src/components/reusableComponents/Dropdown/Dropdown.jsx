import styles from './Dropdown.module.scss';
import { ButtonWithIcon } from '../ButtonWithIcon';

const Dropdown = ({ onSelect, itemsList, selectedItem, customStyles = {} }) => {
  // Combine default styles with custom styles
  const dropdownStyles = {
    ...customStyles,
  };

  return (
    <div className={styles.sizePopup} style={dropdownStyles}>
      <div className={styles.dropdownContent}>
        {itemsList.map(item => (
          <div key={item.id}>
            {item.name === 'Delete' && (
              <div
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
              />
            )}
            <div
              className={styles.sizePopupItem}
              onClick={() => onSelect(item)}
              data-action={
                item.name !== null && item.name !== undefined
                  ? typeof item.name === 'string' 
                    ? item.name.toLowerCase().replace(' ', '-')
                    : String(item.name)
                  : item.icon?.toLowerCase()
              }
            >
              {item.name !== null && item.name !== undefined ? (
                <p>{item.label || item.name}</p>
              ) : (
                item.icon && (
                  <ButtonWithIcon
                    icon={item.icon}
                    onClick={e => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    classNameButton={styles.iconButton}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { Dropdown };
