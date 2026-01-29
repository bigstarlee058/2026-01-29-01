import React, { useState, useEffect } from 'react';
import { StoreContext } from '../../../mobx';
import { observer } from 'mobx-react';
import DragableView from './DragableView';
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

const calculateTimeRange = (scale) => {
  // Calculate visible time range based on scale:
  // 10% scale: 4.8s
  // 50% scale: 1.3s
  // 100% scale: 0.6s
  const maxRange = 4800; // 4.8 seconds in milliseconds
  const minRange = 600;  // 0.6 seconds in milliseconds
  
  // Exponential scaling for smoother transitions
  const normalizedScale = (scale - 10) / 90; // normalize to 0-1 range
  const timeRange = maxRange * Math.pow(minRange / maxRange, normalizedScale);
  
  return timeRange;
};

const getVisibleTimeWindow = (currentTime, scale, totalDuration) => {
  const timeRange = calculateTimeRange(scale);
  const halfRange = timeRange / 2;
  
  let start = currentTime - halfRange;
  let end = currentTime + halfRange;
  
  // Ensure we don't go beyond bounds
  if (start < 0) {
    start = 0;
    end = timeRange;
  }
  if (end > totalDuration) {
    end = totalDuration;
    start = Math.max(0, end - timeRange);
  }
  
  return { start, end };
};

export const TimeFrameView = observer(props => {
  const [text, setText] = useState([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const store = React.useContext(StoreContext);
  const { element } = props;
  const disabled = element.type === 'audio';
  const isSelected = store.selectedElement?.id === element.id;
  const bgColorOnSelected = isSelected
    ? element.type === 'text'
      ? styles.selectedTextBackground
      : styles.selectedBackground
    : element.type === 'text'
    ? styles.unselectedTextBackground
    : styles.unselectedBackground;
  const disabledCursor = disabled ? styles.disabledHandle : styles.dragHandle;

  const frameViewClassName =
    element.type === 'text'
      ? `${styles.textFrameView}`
      : `${styles.timeFrameView}`;

  useEffect(() => {
    if (store.editorElements) {
      setText(store.editorElements.filter(text => text.type === 'text'));
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
    const fromImage = text.find(text => text.id === fromId);
    const toImage = text.find(text => text.id === toId);

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
      {element.type === 'text' ? (
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
              className={`${styles.dragTextHandleLeft} ${disabledCursor} ${
                isSelected ? styles.selected : ''
              }`}
            >
              <div
                className={`${styles.dragText} ${styles.leftDragText}`}
              ></div>
              <div
                className={`${styles.dragText} ${styles.leftDragText}`}
              ></div>
            </div>
          </DraggableElementView>

          <div
            className={`${styles.dragableTextView} ${bgColorOnSelected}`}
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
                className={styles.truncatedText}
                onClick={e => e.stopPropagation()}
              >
                {element.properties.text}
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

                const minDuration = 20;
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
              className={`${styles.dragTextHandleRight} ${disabledCursor} ${
                isSelected ? styles.selected : ''
              }`}
            >
              <div
                className={`${styles.dragText} ${styles.rightDragText}`}
              ></div>
              <div
                className={`${styles.dragText} ${styles.rightDragText}`}
              ></div>
            </div>
          </DraggableElementView>
        </>
      ) : (
        <>
          <DragableView
            className="z-10"
            value={element.timeFrame.start}
            total={store.maxTime}
            disabled={disabled}
            onChange={value => {
              store.updateEditorElementTimeFrame(element, {
                start: value,
              });
            }}
          >
            <div className={`${styles.dragHandle} ${disabledCursor}`}></div>
          </DragableView>

          <DragableView
            className={disabled ? styles.disabledHandle : styles.cursorResize}
            value={element.timeFrame.start}
            disabled={disabled}
            style={{
              width: `${
                ((element.timeFrame.end - element.timeFrame.start) /
                  store.maxTime) *
                100
              }%`,
            }}
            total={store.maxTime}
            onChange={value => {
              const { start, end } = element.timeFrame;
              store.updateEditorElementTimeFrame(element, {
                start: value,
                end: value + (end - start),
              });
            }}
          >
            <div className={`${bgColorOnSelected} ${styles.dragableContent}`}>
              {element.name}
            </div>
          </DragableView>

          <DragableView
            className="z-10"
            disabled={disabled}
            value={element.timeFrame.end}
            total={store.maxTime}
            onChange={value => {
              store.updateEditorElementTimeFrame(element, {
                end: value,
              });
            }}
          >
            <div className={`${styles.dragHandle} ${disabledCursor}`}></div>
          </DragableView>
        </>
      )}
    </div>
  );
});
