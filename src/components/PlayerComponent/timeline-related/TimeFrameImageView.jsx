import React, { useState, useEffect } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import DraggableElementView from './DraggableElementView';
import { useDrag, useDrop } from 'react-dnd';
import styles from '../Player.module.scss';
import PopupPanel from '../panels/PopupPanel';

const DraggableImage = ({ element, moveElement, children }) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'image',
    item: { id: element.id },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'image',
    drop: item => {
      if (item.id !== element.id) {
        moveElement(item.id, element.id);
      }
    },
  });

  return (
    <div
      ref={node => dragRef(dropRef(node))}
      className={`${styles.draggableItem} ${isDragging ? styles.dragging : ''}`}
    >
      {children}
    </div>
  );
};

export const TimeFrameImageView = observer(props => {
  const [images, setImages] = useState([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const store = React.useContext(StoreContext);
  const { element } = props;
  const disabled = element.type === 'audio';
  const isSelected = store.selectedElement?.id === element.id;
  const bgColorOnSelected = isSelected
    ? styles.selectedImageBackground
    : styles.unselectedImageBackground;
  const disabledCursor = disabled ? styles.disabledHandle : styles.dragHandle;

  const frameViewClassName = styles.imageFrameView;

  useEffect(() => {
    if (store.editorElements) {
      setImages(
        store.editorElements.filter(
          img => img.type === 'imageUrl' || img.type === 'image'
        )
      );
    }
  }, [store.editorElements]);

  const getAdjacentElements = currentElement => {
    let previousElement = null;
    let nextElement = null;

    store.editorElements.forEach((el, index) => {
      if (el.id === currentElement.id) {
        if (index > 0) {
          previousElement = store.editorElements[index - 1];
        }
        if (index < store.editorElements.length - 1) {
          nextElement = store.editorElements[index + 1];
        }
      }
    });

    return { previousElement, nextElement };
  };

  const moveElement = (fromId, toId) => {
    const fromImage = images.find(img => img.id === fromId);
    const toImage = images.find(img => img.id === toId);

    store.swapElementTimeFrames(fromImage, toImage);
  };

  const togglePopUp = e => {
    e.preventDefault();

    setPopupPosition({ x: e.clientX, y: e.clientY });
    setIsPopupVisible(true);
  };

  const handleClickOutside = () => {
    setIsPopupVisible(false);
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const { previousElement, nextElement } = getAdjacentElements(element);

  return (
    <div
      onMouseDown={() => {
        store.setSelectedElement(element);
      }}
      key={element.id}
      className={`${frameViewClassName} ${
        isSelected ? styles.selectedFrame : ''
      }`}
      onContextMenu={togglePopUp}
    >
      <>
        <DraggableElementView
          className="z-10"
          value={element.timeFrame.start}
          total={store.maxTime}
          isSelected={isSelected}
          disabled={disabled}
          onChange={value => {
            if (previousElement && value < previousElement.timeFrame.end) {
              store.updateEditorElementTimeFrame(previousElement, {
                end: value,
              });
            }

            store.updateEditorElementTimeFrame(element, {
              start: value,
            });
          }}
        >
          <div
            className={`${styles.dragImageHandleLeft} ${disabledCursor} ${
              isSelected ? styles.selected : ''
            }`}
          >
            <div className={`${styles.drag} ${styles.leftDrag}`}></div>
            <div className={`${styles.drag} ${styles.leftDrag}`}></div>
          </div>
        </DraggableElementView>

        <div
          className={`${styles.dragableView} ${bgColorOnSelected}`}
          style={{
            width: `${
              ((element.timeFrame.end - element.timeFrame.start) /
                store.maxTime) *
              100
            }%`,
            left: `${(element.timeFrame.start / store.maxTime) * 100}%`,
            top: 0,
            bottom: 0,
          }}
        >
          <DraggableImage element={element} moveElement={moveElement}>
            <div
              className={styles.imageContainer}
              style={{
                backgroundImage: `url(${element.properties.src})`,
                backgroundSize: '35px',
                backgroundPosition: 'start',
              }}
              onClick={e => e.stopPropagation()}
            >
              {isPopupVisible && (
                <PopupPanel
                  isOpen={isPopupVisible}
                  x={popupPosition.x}
                  y={popupPosition.y}
                  onClose={handleClickOutside}
                  toggleImageAnimations={props.toggleImageAnimations}
                />
              )}
            </div>
          </DraggableImage>
        </div>

        <DraggableElementView
          className="z-10"
          disabled={disabled}
          value={element.timeFrame.end}
          total={store.maxTime}
          isSelected={isSelected}
          onChange={value => {
            if (nextElement && value > nextElement.timeFrame.start) {
              const newStart = value;

              const minDuration = 1000;
              if (nextElement.timeFrame.end - newStart < minDuration) {
                store.updateEditorElementTimeFrame(nextElement, {
                  start: newStart,
                  end: newStart + minDuration,
                });
              } else {
                store.updateEditorElementTimeFrame(nextElement, {
                  start: newStart,
                });
              }
            }

            store.updateEditorElementTimeFrame(element, {
              end: value,
            });
          }}
        >
          <div
            className={`${styles.dragImageHandleRight} ${disabledCursor} ${
              isSelected ? styles.selected : ''
            }`}
          >
            <div className={`${styles.drag} ${styles.rightDrag}`}></div>
            <div className={`${styles.drag} ${styles.rightDrag}`}></div>
          </div>
        </DraggableElementView>
      </>
    </div>
  );
});
