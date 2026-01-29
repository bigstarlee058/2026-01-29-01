import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from '../Player.module.scss';
import { StoreContext } from '../../../mobx';
import { Tooltip } from 'react-tooltip';
import { observer } from 'mobx-react';
import { useDispatch } from 'react-redux';
import { setActiveScene } from '../../../redux/scene/sceneSlice';
import TooltipIndicator from './TooltipIndicator';

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function getDynamicStep(baseInterval, scale) {
  if (baseInterval !== 5000) return baseInterval;

  if (scale <= 10) return 4800; // For 0-4.8s at 10% zoom
  if (scale <= 30) return 2500;
  if (scale <= 50) return 1300; // For 0-1.3s at 50% zoom
  if (scale <= 75) return 500;
  if (scale < 100) return 200;
  return 60; // For 0-0.06s at 100% zoom
}

function formatTime(ms, scale, playbackRate = 1) {
  const adjustedMs = ms / playbackRate;
  const s = adjustedMs / 1000;
  if (scale > 16) {
    return s.toFixed(1) + ' s';
  }
  return s.toFixed(0) + ' s';
}

function formatTooltipTime(ms, scale, playbackRate = 1) {
  const adjustedMs = ms / playbackRate;
  const s = adjustedMs / 1000;
  if (scale > 16) {
    return s.toFixed(1) + ' s';
  }
  return s.toFixed(0) + ' s';
}

export const ScaleRangeInput = observer(props => {
  const {
    max,
    value,
    onChange,
    scale = 1,
    backgroundColor = '#0f1318',
    markings = [],
    storyData,
    timelineContentRef,
    scaleRangeRef,
  } = props;

  const canvasRef = useRef(null);
  const refIsMouseDown = useRef(false);
  const animationFrameRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const lastMousePositionRef = useRef(null);
  const thumbRef = useRef(null);

  const store = useContext(StoreContext);
  const dispatch = useDispatch();

  const [canvasSize, setCanvasSize] = useState({
    width: 50,
    height: 30,
  });

  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [lastPosition, setLastPosition] = useState(null);
  const updateThreshold = 5; // pixels
  const updateInterval = 16; // ms (approximately 60fps)
  const rafId = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredTime, setHoveredTime] = useState(value);
  const tooltipTimerRef = useRef(null);
  const hideTooltipTimerRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const mouseDownTimeRef = useRef(0);
  const [lastScale, setLastScale] = useState(scale);

  // Edge scrolling configuration
  const windowEdgeThreshold = 100;
  const scrollSpeed = 15; // Reduced from 30 to 15 for even slower base speed

  const lastWheelTimeRef = useRef(0);

  const smoothScaleUpdate = useCallback(
    newScale => {
      if (Math.abs(newScale - lastScale) < 0.05) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setLastScale(newScale);
        if (props.onScaleChange) {
          props.onScaleChange(newScale);
        }
      });
    },
    [props, lastScale]
  );

  const [showTooltipIndicator, setShowTooltipIndicator] = useState(false);

  const [isRendering, setIsRendering] = useState(false);

  const shouldUpdate = (newX, currentTime) => {
    if (lastPosition === null) {
      setLastPosition(newX);
      setLastUpdateTime(currentTime);
      return true;
    }

    if (currentTime - lastUpdateTime < updateInterval) {
      return false;
    }

    const hasSignificantChange =
      Math.abs(newX - lastPosition) > updateThreshold;

    if (hasSignificantChange) {
      setLastPosition(newX);
      setLastUpdateTime(currentTime);
      return true;
    }

    return false;
  };

  const updatePositionOnScroll = useCallback(() => {
    if (
      !refIsMouseDown.current ||
      !lastMousePositionRef.current ||
      !canvasRef.current
    )
      return;

    const rect = canvasRef.current.getBoundingClientRect();
    const parentElement = canvasRef.current.parentElement;
    const scrollLeft = parentElement?.parentElement?.scrollLeft || 0;
    const mouseX = lastMousePositionRef.current.clientX;

    const container = timelineContentRef?.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const boundedMouseX = Math.min(
      Math.max(mouseX, containerRect.left + 20),
      containerRect.right - 20
    );

    const x = Math.min(
      Math.max(boundedMouseX - rect.left + scrollLeft, 0),
      canvasSize.width * scale
    );

    const newValue = (x / (canvasSize.width * scale)) * max;
    onChange(Math.min(max, Math.max(0, newValue)));
  }, [canvasSize.width, max, onChange, scale, timelineContentRef]);

  // Check edge proximity and start auto scrolling
  const checkAndScrollEdges = useCallback(
    e => {
      if (!timelineContentRef?.current) return;

      lastMousePositionRef.current = e;

      // Clear existing scroll interval
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      // Get timeline container bounds instead of using window edges
      const container = timelineContentRef.current;
      const containerRect = container.getBoundingClientRect();

      // Calculate distance from cursor to container edges
      const distanceToLeftEdge = e.clientX - containerRect.left;
      const distanceToRightEdge = containerRect.right - e.clientX;

      // Check if cursor is near container edges
      const isNearLeftEdge = distanceToLeftEdge < windowEdgeThreshold;
      const isNearRightEdge = distanceToRightEdge < windowEdgeThreshold;

      if (!isNearLeftEdge && !isNearRightEdge) return;

      // Calculate speed based on proximity to edge (closer = faster) with cubic easing
      const calcSpeed = (distance, threshold) => {
        const ratio = 1 - Math.min(distance / threshold, 1);
        // Using cubic easing for smoother acceleration and reduced ratio
        return scrollSpeed * Math.pow(ratio, 3) * 0.8; // Added 0.8 multiplier for slower overall speed
      };

      const leftSpeed = isNearLeftEdge
        ? calcSpeed(distanceToLeftEdge, windowEdgeThreshold)
        : 0;
      const rightSpeed = isNearRightEdge
        ? calcSpeed(distanceToRightEdge, windowEdgeThreshold)
        : 0;

      let prevTimestamp = performance.now();
      const scrollTimeline = timestamp => {
        const deltaTime = timestamp - prevTimestamp;
        // Further reduced time ratio for even smoother movement
        const timeRatio = (deltaTime / 16) * 0.25; // Reduced from 0.5 to 0.25 for slower movement
        prevTimestamp = timestamp;

        let didScroll = false;

        if (isNearLeftEdge && container.scrollLeft > 0) {
          const speed = Math.max(1, leftSpeed) * timeRatio; // Reduced minimum speed from 2 to 1
          container.scrollLeft -= speed;
          didScroll = true;
        } else if (
          isNearRightEdge &&
          container.scrollLeft < container.scrollWidth - container.clientWidth
        ) {
          const speed = Math.max(1, rightSpeed) * timeRatio; // Reduced minimum speed from 2 to 1
          container.scrollLeft += speed;
          didScroll = true;
        }

        if (didScroll) {
          updatePositionOnScroll();
        }

        if (refIsMouseDown.current) {
          autoScrollIntervalRef.current = requestAnimationFrame(scrollTimeline);
        }
      };

      autoScrollIntervalRef.current = requestAnimationFrame(scrollTimeline);
    },
    [
      timelineContentRef,
      windowEdgeThreshold,
      scrollSpeed,
      updatePositionOnScroll,
    ]
  );

  // Stop auto scrolling
  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      cancelAnimationFrame(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    lastMousePositionRef.current = null;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.parentElement?.clientWidth ?? 50,
          height: 32,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);

      // Очищаємо всі анімаційні фрейми при розмонтуванні
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      stopAutoScroll();
    };
  }, [props.height, stopAutoScroll]);

  useEffect(() => {
    if (!timelineContentRef?.current) return;

    const handleScroll = () => {
      if (refIsMouseDown.current && lastMousePositionRef.current) {
        requestAnimationFrame(updatePositionOnScroll);
      }
    };

    timelineContentRef.current.addEventListener('scroll', handleScroll);
    return () => {
      timelineContentRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [timelineContentRef, updatePositionOnScroll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width * scale;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startOffset = 15;

    markings
      .slice()
      .sort((a, b) => a.interval - b.interval)
      .forEach(marking => {
        ctx.strokeStyle = marking.color;
        ctx.lineWidth = marking.width;
        ctx.beginPath();

        const step = getDynamicStep(marking.interval, scale);

        for (let i = 0; i <= max; i += step) {
          const xPosition = Math.round((i / max) * canvas.width) + 0.5;
          const yPosition = canvas.height - startOffset - marking.size / 2;

          if (marking.main) {
            // Only draw time label for main intervals
            ctx.font = '10px Inter';
            ctx.fillStyle = '#C7CED1';
            ctx.textAlign = i === 0 ? 'left' : 'center';
            ctx.textBaseline = 'middle';
            const label = formatTime(i, scale, store.playbackRate);
            ctx.fillText(
              label,
              xPosition,
              canvas.height - startOffset - marking.size / 3
            );
          } else {
            // Draw circular markers only if there's no main marking at this position
            const hasMainMarkingHere = markings.some(
              m => m.main && i % getDynamicStep(m.interval, scale) === 0
            );
            if (!hasMainMarkingHere) {
              ctx.beginPath();
              ctx.arc(xPosition, yPosition, 1.5, 0, 2 * Math.PI);
              ctx.fillStyle = marking.color;
              ctx.fill();
            }
          }
        }
      });

    // Update thumb position when scale changes
    const thumbElement = document.querySelector(`.${styles.thumb}`);
    if (thumbElement) {
      thumbElement.style.transform = `translateX(${Math.round(
        getThumbPosition()
      )}px)`; // Use Math.round for precise positioning
    }
  }, [
    markings,
    backgroundColor,
    max,
    canvasSize,
    scale,
    props.onScaleChange,
    value,
    store.playbackRate,
  ]);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!refIsMouseDown.current || !canvasRef.current) return;

      // If mouse moves while pressed, mark as dragging
      if (!isDragging) {
        setIsDragging(true);
      }

      e.stopPropagation();

      const rect = canvasRef.current.getBoundingClientRect();
      const parentElement = canvasRef.current.parentElement;
      const scrollLeft = parentElement?.parentElement?.scrollLeft || 0;

      const x = Math.min(
        Math.max(e.clientX - rect.left + scrollLeft, 0),
        canvasSize.width * scale
      );

      // Calculate current position relative to max time
      const currentTimePosition = (x / (canvasSize.width * scale)) * max;

      // Check for edge scrolling if we're dragging and not at the end
      if (isDragging && currentTimePosition < store.lastElementEnd) {
        checkAndScrollEdges(e);
      }

      // Update tooltip position to follow the thumb during dragging
      if (isDragging) {
        setShowTooltipIndicator(true);
        setHoveredTime(currentTimePosition);
        setMousePosition({
          x: e.clientX,
          y: e.clientY - 40,
        });
      }

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        const currentTime = Date.now();
        if (shouldUpdate(x, currentTime)) {
          const newValue = (x / (canvasSize.width * scale)) * max;
          onChange(Math.min(max, Math.max(0, newValue)));
        }
      });
    };

    const handleMouseUp = e => {
      if (!refIsMouseDown.current) return;
      e.stopPropagation();
      e.preventDefault();

      // Stop edge scrolling
      stopAutoScroll();

      const isClick =
        !isDragging && Date.now() - mouseDownTimeRef.current < 200;

      refIsMouseDown.current = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      setLastPosition(null);

      // Call findMatchingPointInStoryData only on click or after finishing drag
      if (isClick || isDragging) {
        setTimeout(() => findMatchingPointInStoryData(), 0);
      }

      setIsDragging(false);

      // Keep tooltip visible for a short time after releasing
      setTimeout(() => {
        if (!isHovering) {
          setShowTooltipIndicator(false);
        }
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, {
        capture: true,
      });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      stopAutoScroll();
    };
  }, [
    max,
    onChange,
    scale,
    canvasSize.width,
    lastPosition,
    lastUpdateTime,
    isDragging,
    checkAndScrollEdges,
    stopAutoScroll,
    store.lastElementEnd,
  ]);

  const getThumbPosition = () => {
    if (!canvasRef.current) return 0;
    const position = (value / max) * canvasRef.current.width;
    return Math.max(0, Math.min(position, canvasRef.current.width)); // Ensure position is within canvas bounds
  };

  const getImage = (returnFullData = false) => {
    // Get the current canvas element
    const canvasElement = document.getElementById('canvas');
    if (!canvasElement) {
      return null;
    }

    // Get the fabric.js canvas instance from the store
    if (!store.canvas) {
      return null;
    }

    // Get all objects on the canvas
    const objects = store.canvas.getObjects();

    // Find all visible image objects
    const visibleImages = objects.filter(obj => {
      return obj.type === 'image' && obj.visible !== false;
    });

    if (!visibleImages.length) {
      return null;
    }

    // Get the elements from store that correspond to these images
    const imageData = visibleImages
      .map(visibleImage => {
        const imageElement = store.editorElements.find(
          element => element.fabricObject === visibleImage
        );

        if (!imageElement) return null;

        return {
          url:
            imageElement.properties.googleCloudUrl ||
            imageElement.properties.src,
          pointId: imageElement.properties.pointId || null,
          element: imageElement,
        };
      })
      .filter(Boolean); // Remove any null values

    // Check if any element has pointId
    const hasPoint = imageData.find(data => data.pointId !== null);

    if (returnFullData) {
      return imageData.length === 1 ? imageData[0] : imageData;
    }

    // If we found an element with pointId, return its URL
    if (hasPoint) {
      return hasPoint.url;
    }

    // If there's only one image, return just the URL to maintain backward compatibility
    if (imageData.length === 1) {
      return imageData[0].url;
    }

    // Return array of image data
    return imageData.map(data => data.url);
  };

  const findMatchingPointInStoryData = () => {
    const currentImages = getImage(true);
    const hasPoint = Array.isArray(currentImages)
      ? currentImages.find(data => data.pointId !== null)
      : currentImages?.pointId
      ? currentImages
      : null;

    // If we have an image with pointId, only use that one
    const imageToUse = hasPoint ? hasPoint.url : getImage();

    if (!imageToUse || !storyData?.sentences) return null;

    // Convert to array if single image
    const imageArray = Array.isArray(imageToUse) ? imageToUse : [imageToUse];

    const foundPoints = storyData.sentences.reduce((found, sentence) => {
      if (sentence.points) {
        const matchingPoints = sentence.points.filter(point => {
          const pointImageUrl =
            point.selectedImage?.googleCloudUrl || point.selectedImage?.src;
          return imageArray.includes(pointImageUrl);
        });

        if (matchingPoints.length) {
          found.push(...matchingPoints.map(point => ({ sentence, point })));
        }
      }
      return found;
    }, []);

    if (foundPoints.length) {
      const { point, sentence } = foundPoints[0];
      dispatch(
        setActiveScene({
          ...point,
          sentence,
          prompt: point.prompt || '',
          negative_prompt: point.negative_prompt || '',
          _id: point._id,
          sentenceId: sentence._id,
          store: store,
        })
      );
    } else {
}

    return foundPoints.length ? foundPoints[0] : null;
  };

  const handleMouseDown = e => {
    e.stopPropagation();
    e.preventDefault();

    if (isRendering) return;

    refIsMouseDown.current = true;
    mouseDownTimeRef.current = Date.now();
    setIsDragging(false);
    setShowTooltipIndicator(true);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const parentElement = canvasRef.current.parentElement;
      const scrollLeft = parentElement?.parentElement?.scrollLeft || 0;

      const x = Math.min(
        Math.max(e.clientX - rect.left + scrollLeft, 0),
        canvasRef.current.width
      );

      // Initial position update should always happen
      setLastPosition(x);
      setLastUpdateTime(Date.now());
      const newValue = (x / canvasRef.current.width) * max;

      // Pause playback before time change
      const wasPlaying = store.playing;
      if (wasPlaying) {
        store.setPlaying(false);
      }

      // Update time with proper animation refresh
      requestAnimationFrame(() => {
        // First update the time
        onChange(Math.min(max, Math.max(0, newValue)));

        // Then seek to the new time without refreshing animations
        store.animationTimeLine.seek(newValue);

        // Update visibility of all word objects
        store.editorElements.forEach(element => {
          if (element.type === 'text' && element.subType === 'subtitles') {
            const isInside =
              element.timeFrame.start <= newValue &&
              newValue <= element.timeFrame.end;

            if (element.fabricObject) {
              element.fabricObject.set('opacity', 0);
            }

            if (element.properties.wordObjects) {
              element.properties.wordObjects.forEach((wordObj, index) => {
                if (wordObj && element.properties.words?.[index]) {
                  const word = element.properties.words[index];
                  const wordIsInside =
                    isInside && word.start <= newValue && newValue <= word.end;
                  wordObj.set('visible', wordIsInside);
                }
              });
            }
          }
        });

        // Final render
        store.canvas.requestRenderAll();

        // Restore playback if needed
        if (wasPlaying) {
          setTimeout(() => {
            store.setPlaying(true);
          }, 100);
        }
      });
    }
  };

  // Add these handlers to update mouse position and hover state
  const handleMouseMove = e => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const parentElement = canvasRef.current.parentElement;
      const scrollLeft = parentElement?.parentElement?.scrollLeft || 0;

      const x = e.clientX;
      const y = e.clientY - 40; // Position tooltip 40px above cursor

      setMousePosition({ x, y });
      setShowTooltipIndicator(true);

      // Calculate time value at cursor position without changing actual value
      const canvasX = Math.min(
        Math.max(e.clientX - rect.left + scrollLeft, 0),
        canvasRef.current.width
      );
      const timeAtCursor = (canvasX / canvasRef.current.width) * max;
      setHoveredTime(timeAtCursor);

      if (canvasRef.current) {
        canvasRef.current.setAttribute(
          'data-tooltip-content',
          formatTooltipTime(timeAtCursor, scale, store.playbackRate)
        );
      }
    }
  };

  const handleMouseEnter = () => {
    // Clear any existing timers
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }

    // Set a new timer to show the tooltip after 2 seconds
    tooltipTimerRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 2000); // 2 seconds delay
  };

  const handleMouseLeave = () => {
    // Clear the show timer if mouse leaves before tooltip is shown
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    // Set a timer to hide the tooltip after 1 second
    hideTooltipTimerRef.current = setTimeout(() => {
      setIsHovering(false);
      setShowTooltipIndicator(false);
      hideTooltipTimerRef.current = null;
    }, 1000); // 1 second delay
  };

  // Clean up the timers when component unmounts
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
      if (hideTooltipTimerRef.current) {
        clearTimeout(hideTooltipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFindMatchingPoint = event => {
      const { currentImage, storyData } = event.detail;

      if (!currentImage || !storyData?.sentences) return;

      const foundPoint = storyData.sentences.reduce(
        (found, sentence, sentenceIndex) => {
          if (found) return found;

          if (sentence.points) {
            sentence.points.forEach((point, pointIndex) => {
              if (point.selectedImage) {
                const pointImageUrl =
                  point.selectedImage.googleCloudUrl || point.selectedImage.src;
              }
            });
          }

          const matchingPoint = sentence.points?.find(point => {
            const pointImageUrl =
              point.selectedImage?.googleCloudUrl || point.selectedImage?.src;
            return pointImageUrl === currentImage;
          });
          return matchingPoint ? { sentence, point: matchingPoint } : null;
        },
        null
      );

      if (foundPoint) {
        dispatch(
          setActiveScene({
            ...foundPoint.point,
            sentence: foundPoint.sentence,
            prompt: foundPoint.point.prompt || '',
            negative_prompt: foundPoint.point.negative_prompt || '',
            _id: foundPoint.point._id,
            sentenceId: foundPoint.sentence._id,
            store: store,
          })
        );
      } else {
}
    };

    window.addEventListener('findMatchingPoint', handleFindMatchingPoint);
    return () => {
      window.removeEventListener('findMatchingPoint', handleFindMatchingPoint);
    };
  }, [dispatch, storyData, store]);

  useEffect(() => {
    // Check if the timeline is being resized by monitoring the scrollbar resize state
    const handleResizeStart = () => {
      // Removed thumb opacity change
    };

    const handleResizeEnd = event => {
      if (!thumbRef.current || !canvasRef.current) return;

      // If event contains position data, update thumb position
      if (event.detail && typeof event.detail.currentTimeRatio === 'number') {
        const position =
          event.detail.currentTimeRatio * canvasRef.current.width;
        thumbRef.current.style.transform = `translateX(${position}px)`;
      } else {
        // Fallback to current value
        const position = getThumbPosition();
        thumbRef.current.style.transform = `translateX(${position}px)`;
      }
    };

    window.addEventListener('timeline:resize:start', handleResizeStart);
    window.addEventListener('timeline:resize:end', handleResizeEnd);

    return () => {
      window.removeEventListener('timeline:resize:start', handleResizeStart);
      window.removeEventListener('timeline:resize:end', handleResizeEnd);
    };
  }, []);

  // Create a unique ID for this tooltip
  const tooltipId = `timeline-tooltip-${
    props.id || Math.random().toString(36).substr(2, 9)
  }`;

  // Add effect to listen for rendering state changes
  useEffect(() => {
    const handleRenderingStateChange = event => {
      const { state } = event.detail;
      setIsRendering(state === 'rendering');
    };

    window.addEventListener('renderingStateChange', handleRenderingStateChange);
    return () => {
      window.removeEventListener(
        'renderingStateChange',
        handleRenderingStateChange
      );
    };
  }, []);

  // Add new effect to calculate initial scale
  useEffect(() => {
    if (
      canvasRef.current &&
      timelineContentRef.current &&
      store.lastElementEnd
    ) {
      // Check if we already have a saved scale in localStorage
      const savedScale = localStorage.getItem('timeline-scale');
      
      if (!savedScale) {
        // Only calculate and set initial scale if there's no saved value
        const containerWidth = timelineContentRef.current.clientWidth;
        const totalContentDuration = store.lastElementEnd;

        // We want the content to take about 85% of the container width
        // So we divide container by content duration and multiply by target percentage
        const fitScale = containerWidth / totalContentDuration;

        smoothScaleUpdate(Math.max(1.2, fitScale));
      } else {
        // Use the saved scale from localStorage
        smoothScaleUpdate(parseFloat(savedScale));
      }
    }
  }, [store.lastElementEnd, timelineContentRef, canvasRef.current]);

  return (
    <div
      className={styles.scaleRangeContainer}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-timeline="true"
      ref={scaleRangeRef}
    >
      <canvas
        ref={canvasRef}
        style={{
          height: `${canvasSize.height}px`,
          opacity: isRendering ? 0.5 : 1,
          cursor: 'pointer', // Add cursor pointer for double click
        }}
        data-tooltip-id={tooltipId}
        data-timeline="true"
        onMouseDown={e => {
          if (isRendering) return;
          e.stopPropagation();
          handleMouseDown(e);
        }}
      />
      {!isRendering && (
        <TooltipIndicator
          showTooltipIndicator={showTooltipIndicator || isDragging}
          canvasRef={canvasRef}
          mousePosition={
            isDragging
              ? {
                  x:
                    getThumbPosition() +
                      canvasRef.current?.getBoundingClientRect().left || 0,
                  y: (canvasRef.current?.getBoundingClientRect().top || 0) - 40,
                }
              : mousePosition
          }
          formatTooltipTime={formatTooltipTime}
          hoveredTime={isDragging ? value : hoveredTime}
          scale={scale}
          playbackRate={store.playbackRate}
        />
      )}
      <div
        className={styles.thumb}
        ref={thumbRef}
        style={{
          transform: `translateX(${getThumbPosition()}px)`,
        }}
        data-timeline="true"
        data-rendering={isRendering}
      />
    </div>
  );
});
