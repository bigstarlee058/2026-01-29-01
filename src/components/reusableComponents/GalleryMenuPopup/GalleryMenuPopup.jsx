import React, { useState, useRef, useEffect } from 'react';
import { ButtonWithIcon } from '../ButtonWithIcon';
import ThreeDotsIcon from '../../Icons/ThreeDotsIcon';
import { PortalMenu } from '../PortalMenu/PortalMenu';
import styles from './GalleryMenuPopup.module.scss';

const GalleryMenuPopup = ({
  itemId,
  hoveredRowId,
  setHoveredRowId,
  menuOptions = [],
  onOptionClick,
  className = '',
  iconSize = 16,
  iconColor = "rgba(255, 255, 255, 0.4)",
  menuIconColor = "#FFFFFF99",
  menuIconSize = "14px",
  rightOffset = 117,
  minWidth = 117,
}) => {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const anchorRef = useRef(null);

  // Handle scroll, resize and click outside to close menu
  useEffect(() => {
    const handleScroll = () => {
      if (openMenuIndex !== null) {
        setOpenMenuIndex(null);
        setHoveredRowId(null);
      }
    };

    const handleResize = () => {
      if (openMenuIndex !== null) {
        setOpenMenuIndex(null);
        setHoveredRowId(null);
      }
    };

    const handleClickOutside = (event) => {
      if (openMenuIndex !== null && anchorRef.current && !anchorRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
        setHoveredRowId(null);
      }
    };

    // Add event listeners
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuIndex]);

  const handleMenuHover = (itemId) => {
    setOpenMenuIndex(itemId);
    setHoveredRowId(itemId); 
  };

  const handleMenuLeave = () => {
    setTimeout(() => {
      setOpenMenuIndex(null);
      setHoveredRowId(null);
    }, 150);
  };

  const handleOptionClick = (option, itemId) => {
    if (onOptionClick) {
      onOptionClick(option, itemId);
    } else if (option.onClick) {
      option.onClick(itemId);
    }
    setOpenMenuIndex(null);
  };

  return (
    <span
      ref={anchorRef}
      className={`galleryMenuPopup_icon ${styles.menu_icon_hover} ${className}`}
      onMouseEnter={() => handleMenuHover(itemId)}
      onMouseLeave={handleMenuLeave}
    >
      <ThreeDotsIcon size={iconSize} color={iconColor} />
      <PortalMenu
        open={openMenuIndex === itemId}
        anchorRef={anchorRef}
        position="bottom-left"
        offset={{ x: -rightOffset, y: -8 }}
        className={styles.menu_popup}
        style={{
          minWidth: `${minWidth}px`,
        }}
        onMouseEnter={() => setHoveredRowId(itemId)}
        onMouseLeave={() => setTimeout(() => setHoveredRowId(null), 150)}
      >
        {menuOptions.map(option => (
          <div 
            key={option.name} 
            className={styles.menu_option}
            onClick={() => handleOptionClick(option, itemId)}
          >
            <ButtonWithIcon
              icon={option.icon}
              size={menuIconSize}
              color={menuIconColor}
              classNameIcon={styles.menuIcon}
            />
            <span>{option.label}</span>
          </div>
        ))}
      </PortalMenu>
    </span>
  );
};

export { GalleryMenuPopup }; 