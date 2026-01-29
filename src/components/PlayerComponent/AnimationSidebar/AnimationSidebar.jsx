import React, { useState, useEffect, useContext, useRef } from 'react';
import { observer } from 'mobx-react';
import styles from '../AnimationSidebar/AnimationSidebar.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { StoreContext } from '../../../mobx';
import { useSelector } from 'react-redux';
import { selectActiveScene } from '../../../redux/scene/sceneSlice';
import { DrawingPanel } from 'components/PlayerComponent/panels/DrawingPanel';
import { useLocalStorage } from 'hooks/useLocalStorage';

const AnimationSidebar = observer(
  ({
    toggleImageEditing,
    toggleTypographyPanel,
    toggleSubtitlesPanel,
    isSubtitlesPanelOpen,
    toggleTransitionPanel,
    isTransitionPanelOpen,
    storyData,
    isAnimationPanelOpen,
    toggleAnimationPanel,
    isImageEditingOpen,
    isTypographyPanelOpen,
  }) => {
    const sidebarRef = useRef(null);
    const store = useContext(StoreContext);
    const activeScene = useSelector(selectActiveScene);
    const [activeButton, setActiveButton] = useState('');

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isHideNames, setIsHideNames] = useLocalStorage(
      'hide-animation-names',
      false
    );
    const moreMenuTimeoutRef = useRef(null);

    // Sync activeButton state with actual panel states from VideoCreationPage
    useEffect(() => {
      let activePanel = '';

      switch (true) {
        case isImageEditingOpen:
          activePanel = 'imageEditing';
          break;
        case isTypographyPanelOpen:
          activePanel = 'typography';
          break;
        case isSubtitlesPanelOpen:
          activePanel = 'subtitles';
          break;
        case isTransitionPanelOpen:
          activePanel = 'transition';
          break;
        case isAnimationPanelOpen:
          activePanel = 'animation';
          break;
        default:
          activePanel = '';
      }

      setActiveButton(activePanel);
    }, [
      isImageEditingOpen,
      isTypographyPanelOpen,
      isSubtitlesPanelOpen,
      isTransitionPanelOpen,
      isAnimationPanelOpen,
    ]);

    // Handle panel initialization after page refresh
    useEffect(() => {
      // Check if image editing panel is open but no suitable element is selected
      if (
        isImageEditingOpen &&
        store.canvas &&
        store.editorElements.length > 0
      ) {
        const currentElement = store.selectedElement;
        const isImageElement =
          currentElement?.type === 'imageUrl' ||
          currentElement?.type === 'image';

        if (!currentElement || !isImageElement) {
          // Find image at current timeline position
          const currentTime = store.currentTimeInMs;
          const imageAtCurrentTime = store.editorElements.find(
            element =>
              (element.type === 'imageUrl' || element.type === 'image') &&
              element.timeFrame.start <= currentTime &&
              currentTime <= element.timeFrame.end
          );

          if (imageAtCurrentTime) {
            store.setSelectedElement(imageAtCurrentTime);
          } else {
            // If no image at current time, find the first available image
            const firstImage = store.editorElements.find(
              element => element.type === 'imageUrl' || element.type === 'image'
            );
            if (firstImage) {
              store.setSelectedElement(firstImage);
              // Optionally seek to the image's start time
              store.handleSeek(firstImage.timeFrame.start);
            }
          }
        }
      }

      // Similar logic for other panels that need specific element types
      if (
        isTransitionPanelOpen &&
        store.canvas &&
        store.editorElements.length > 0
      ) {
        const currentElement = store.selectedElement;
        const isImageElement =
          currentElement?.type === 'imageUrl' ||
          currentElement?.type === 'image';

        if (!currentElement || !isImageElement) {
          const currentTime = store.currentTimeInMs;
          const imageAtCurrentTime = store.editorElements.find(
            element =>
              (element.type === 'imageUrl' || element.type === 'image') &&
              element.timeFrame.start <= currentTime &&
              currentTime <= element.timeFrame.end
          );

          if (imageAtCurrentTime) {
            // store.setSelectedElement(imageAtCurrentTime);
          }
        }
      }
    }, [
      isImageEditingOpen,
      isTransitionPanelOpen,
      store.canvas,
      store.editorElements.length,
      store.currentTimeInMs,
    ]);

    // Add new useEffect to watch for selectedElement changes
    useEffect(() => {
      if (
        store.selectedElement?.subType === 'subtitles' &&
        !isSubtitlesPanelOpen
      ) {
        toggleSubtitlesPanel();
      }
    }, [store.selectedElement, isSubtitlesPanelOpen, toggleSubtitlesPanel]);

    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (store.isSelectingOrigin) {
          store.cleanupOriginSelection();
        }
        if (moreMenuTimeoutRef.current) {
          clearTimeout(moreMenuTimeoutRef.current);
        }
      };
    }, [store]);

    const onMainButtonClick = option => {
      switch (option) {
        case 'imageEditing':
          if (activeScene) {
            const imageElement = store.editorElements.find(
              element => element.pointId === activeScene._id
            );

            if (imageElement) {
              const event = new CustomEvent('findMatchingPoint', {
                detail: {
                  currentImage:
                    imageElement.properties.googleCloudUrl ||
                    imageElement.properties.src,
                  storyData: storyData,
                  store: store,
                },
              });
              window.dispatchEvent(event);
            }
          }
          toggleImageEditing();
          break;

        case 'typography':
          toggleTypographyPanel();
          break;

        case 'subtitles':
          toggleSubtitlesPanel();
          break;

        case 'transition':
          toggleTransitionPanel();
          break;

        case 'animation':
          toggleAnimationPanel();
          break;

        default:
          // No action for unknown options
          break;
      }
    };

    const panelData = [
      {
        type: 'imageEditing',
        name: 'Image editing',
        text: 'Image Editing',
        icon: 'ImageEditingIcon',
        size: '18px',
      },
      {
        type: 'animation',
        name: 'Animation',
        text: 'Overlays',
        icon: 'ThreeCirclesIcon',
        size: '19px',
      },
      {
        type: 'subtitles',
        name: 'Subtitles',
        text: 'Subtitles',
        icon: 'SubtitlesIcon',
        size: '24px',
      },
      {
        type: 'audio',
        name: 'Audio',
        text: 'Audio',
        icon: 'AudioSettingsIcon',
        size: '17px',
      },
      {
        type: 'transition',
        name: 'Transition',
        text: ' Transitions & Effects',
        icon: 'TransitionsIcon',
        size: '19px',
      },
      // {
      //   type: 'drawing',
      //   name: 'Drawing',
      //   icon: 'PencilIcon',
      // },
    ];

    return (
      <div
        className={`${styles.wrapper} ${isHideNames ? styles.hideNames : ''}`}
        ref={sidebarRef}
      ></div>
    );
  }
);

export { AnimationSidebar };
