import styles from './ImageActions.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { CircleIcon, CheckedBtnIcon } from 'components/Icons';
import { useState, useRef, forwardRef, useEffect } from 'react';
import { PortalDropdown } from 'components/reusableComponents/PortalDropdown';

const ImageActionButton = forwardRef(
  (
    {
      icon,
      text,
      onClick,
      tooltipText,
      tooltipPlace = 'top',
      isActive,
      className,
      variant = 'inside', // 'inside' or 'outside'
      customIcon,
      isDisabled = false,
      ...props
    },
    ref
  ) => {
    if (variant === 'outside') {
      return (
        <ButtonWithIcon
          ref={ref}
          icon={icon}
          text={text}
          size="14px"
          color="#B4C3C7"
          onClick={onClick}
          classNameButton={className}
          tooltipText={tooltipText}
          tooltipPlace={tooltipPlace}
          tooltipBackground="#131A25"
          marginLeft="0px"
          {...props}
        />
      );
    }

    return (
      <ButtonWithIcon
        ref={ref}
        icon={icon}
        text={text}
        color="#B4C3C7"
        textColor="#B4C3C7"
        opacity={1}
        size="14px"
        accentColor="white"
        classNameButton={`${styles.icon} ${isActive ? styles.active : ''} ${
          className || ''
        }`}
        classNameIcon={styles.icon_icon}
        onClick={onClick}
        tooltipText={tooltipText}
        tooltipPlace="left"
        tooltipBackground="#131A25"
        marginLeft="0px"
        customIcon={customIcon}
        {...props}
      />
    );
  }
);

ImageActionButton.displayName = 'ImageActionButton';

const ImageActions = ({
  image,
  isDownloaded,
  asignedImage,
  onAsignImageToScene,
  onDownload,
  onDelete,
  onRateImg,
  hasDelete = true,
  username,
  onReaction,
  provider,
  variant = 'inside', // 'inside' or 'outside'
  className,
  hideDownload = false,
  hideCheckbox = false,
  isShort = false,
  onDropdownStateChange,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const threeDotsRef = useRef(null);

  // Handle smooth transition for dropdown
  useEffect(() => {
    if (isMoreMenuOpen) {
      setIsDropdownVisible(true);
    } else {
      // Delay hiding to allow transition to complete
      const timer = setTimeout(() => {
        setIsDropdownVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    // Notify parent about dropdown state
    if (onDropdownStateChange) {
      onDropdownStateChange(isMoreMenuOpen);
    }
  }, [isMoreMenuOpen, onDropdownStateChange]);

  // Additional effect to handle final cleanup when dropdown fully closes
  useEffect(() => {
    if (!isDropdownVisible && !isMoreMenuOpen && onDropdownStateChange) {
      // Small delay to ensure dropdown is fully closed
      const timer = setTimeout(() => {
        onDropdownStateChange(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDropdownVisible, isMoreMenuOpen, onDropdownStateChange]);

  const likes = Array.isArray(image?.likes) ? image.likes : [];
  const dislikes = Array.isArray(image?.dislikes) ? image.dislikes : [];

  // Menu items for the more options popup
  const moreMenuItems = [
    {
      id: 'download',
      name: 'Download',
      icon: 'DownloadArrowIcon',
      action: () => {
        onDownload();
        setIsMoreMenuOpen(false);
      },
    },
    ...(hasDelete
      ? [
          {
            id: 'delete',
            name: 'Delete',
            icon: 'DeleteIcon',
            action: () => {
              onDelete();
              setIsMoreMenuOpen(false);
            },
          },
        ]
      : []),
  ];

  const handleMenuSelect = item => {
    if (item.action) {
      item.action();
    }
  };

  const handleThreeDotsMouseEnter = () => {
    setIsMoreMenuOpen(true);
  };

  const shortActions = [
    ...(image?.provider !== 'pixabay'
      ? [
          {
            icon: likes.includes(username) ? 'DislikeFullIcon' : 'DislikeIcon',
            size: likes.includes(username) ? '13px' : '15px',
            text: likes.length || '0',
            onClick: () => {
              if (onReaction) {
                onReaction(image, 'like');
              } else if (onRateImg) {
                const updatedImage = {
                  ...image,
                  likes: likes.includes(username)
                    ? likes.filter(l => l !== username)
                    : [...likes, username],
                  dislikes: dislikes.filter(d => d !== username),
                };
                onRateImg(image._id, 'like', updatedImage);
              }
            },
            tooltipText: 'Like',
            isActive: likes.includes(username),
            variant,
            className:
              variant === 'outside'
                ? styles.outside_button
                : styles.flipped_icon,
            classNameIcon:
              variant === 'outside' ? styles.rotated_icon : styles.rotated_icon,
          },
        ]
      : []),
    {
      icon: 'ThreeDotsIcon',
      size: '16px',
      onMouseEnter: handleThreeDotsMouseEnter,
      tooltipText: 'More options',
      variant,
      className:
        variant === 'outside' ? styles.outside_button : styles.three_dots_icon,
      ref: threeDotsRef,
    },
  ];

  // Other action buttons
  const otherActions = [
    ...(image?.provider !== 'pixabay'
      ? [
          {
            id: 1,
            icon: likes.includes(username) ? 'DislikeFullIcon' : 'DislikeIcon',
            size: likes.includes(username) ? '13px' : '15px',
            text: likes.length || '0',
            onClick: () => {
              if (onReaction) {
                onReaction(image, 'like');
              } else if (onRateImg) {
                const updatedImage = {
                  ...image,
                  likes: likes.includes(username)
                    ? likes.filter(l => l !== username)
                    : [...likes, username],
                  dislikes: dislikes.filter(d => d !== username),
                };
                onRateImg(image._id, 'like', updatedImage);
              }
            },
            tooltipText: 'Like',
            isActive: likes.includes(username),
            variant,
            className:
              variant === 'outside'
                ? styles.outside_button
                : styles.flipped_icon,
            classNameIcon:
              variant === 'outside' ? styles.rotated_icon : styles.rotated_icon,
          },
          {
            id: 2,
            icon: dislikes.includes(username)
              ? 'DislikeFullIcon'
              : 'DislikeIcon',
            size: dislikes.includes(username) ? '13px' : '15px',
            text: dislikes.length || '0',
            onClick: () => {
              if (onReaction) {
                onReaction(image, 'dislike');
              } else if (onRateImg) {
                const updatedImage = {
                  ...image,
                  dislikes: dislikes.includes(username)
                    ? dislikes.filter(d => d !== username)
                    : [...dislikes, username],
                  likes: likes.filter(l => l !== username),
                };
                onRateImg(image._id, 'dislike', updatedImage);
              }
            },
            tooltipText: 'Dislike',
            isActive: dislikes.includes(username),
            variant,
            className:
              variant === 'outside'
                ? styles.outside_button
                : styles.dislike_icon,
          },
        ]
      : []),
    ...(!hideDownload
      ? [
          {
            id: 3,
            icon: 'DownloadArrowIcon',
            size: '16px',
            onClick: e => {
              e.stopPropagation();
              onDownload();
            },
            tooltipText: 'Download',
            disabled: isDownloaded,
            variant,
            className:
              variant === 'outside'
                ? styles.outside_button
                : styles.download_icon,
          },
        ]
      : []),
    ...(hasDelete
      ? [
          {
            id: 4,
            icon: 'DeleteIcon',
            size: '12px',
            onClick: e => {
              e.stopPropagation();
              onDelete();
            },
            tooltipText: 'Delete',
            variant,
            className:
              variant === 'outside'
                ? styles.outside_button
                : styles.delete_icon,
          },
        ]
      : []),
  ];

  const plusAction = {
    icon: asignedImage ? 'MinusIcon' : 'PlusIcon',
    text: variant === 'outside' ? (asignedImage ? 'Unuse' : 'Use') : '',
    size: '14px',
    onClick: () => onAsignImageToScene(image),
    tooltipText: asignedImage ? 'Remove from scene' : 'Add to scene',
    disabled: isDownloaded,
    variant,
    className: variant === 'outside' ? styles.outside_button : styles.plus_icon,
    customIcon:
      variant === 'inside' && !hideCheckbox ? (
        asignedImage ? (
          <CheckedBtnIcon size="17px" />
        ) : (
          <CircleIcon size="17px" />
        )
      ) : undefined,
  };

  // Short version rendering
  if (isShort) {
    return (
      <div className={styles.icons_box}>
        <div className={styles.other_actions_container_short}>
          {shortActions.map((action, index) => (
            <ImageActionButton key={`${action.icon}-${index}`} {...action} />
          ))}
        </div>
        <PortalDropdown
          anchorRef={threeDotsRef}
          open={isDropdownVisible}
          onClose={() => setIsMoreMenuOpen(false)}
          enableSmartPositioning={true}
          preferredPlacement="top-end"
          fallbackPlacements={['top-start', 'bottom-end', 'bottom-start']}
          dropdownSize={{ width: 120, height: moreMenuItems.length * 40 + 16 }}
        >
          <div
            className={`${styles.dropdown_container} ${
              isMoreMenuOpen ? styles.visible : ''
            }`}
          >
            {moreMenuItems.map((item) => (
              <div
                key={item.id}
                className={styles.menu_item}
                onClick={item.action}
              >
                <ImageActionButton
                  icon={item.icon}
                  size="14px"
                  tooltipText={item.name}
                  variant="inside"
                  className={styles.menu_item_button}
                />
                <span className={styles.menu_item_text}>{item.name}</span>
              </div>
            ))}
          </div>
        </PortalDropdown>
      </div>
    );
  }

  // Full version rendering
  if (variant === 'outside') {
    return (
      <div className={`${styles.outside_container} ${className || ''}`}>
        {!hideCheckbox && <ImageActionButton {...plusAction} />}
        {otherActions.map((action, index) => (
          <ImageActionButton
            key={`${action.icon}-${index}`}
            {...action}
            className={styles.actionOption}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.icons_box}>
      {!hideCheckbox && (
        <div className={styles.plus_container}>
          <ImageActionButton {...plusAction} />
        </div>
      )}

      <div className={styles.other_actions_container}>
        {otherActions.map((action, index) => (
          <ImageActionButton key={`${action.icon}-${index}`} {...action} />
        ))}
      </div>
    </div>
  );
};

export { ImageActions };
