import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';
import DraggableElementView from 'components/PlayerComponent/timeline-related/DraggableElementView';
import { useDrag, useDrop } from 'react-dnd';
import PopupPanel from '../PlayerComponent/panels/PopupPanel';
import { useDispatch } from 'react-redux';
import { setActiveScene } from '../../redux/scene/sceneSlice';
import { getUid } from 'utils';
import { uploadImage } from '../../utils/uploadImage';
import { InIcon, AnimationIcon, OutIcon } from 'components/Icons';
import { Tooltip } from 'react-tooltip';
import { createPortal } from 'react-dom';
import { updateSelectedImage, deleteScene } from '../../redux/scene/sceneSlice';

// Add this at the top of the file, after the imports
const GLOBAL_AUDIO_STATS = {
  maxAmplitude: 0,
  isInitialized: false,
  rmsValues: new Map(), // Store RMS values for each audio file
  globalMaxRms: 0, // Store the maximum RMS value across all audio files
};

// Function to adjust subtitles for changed time (copied from SubtitlesPanel)
const adjustSubtitlesForChangedTime = (
  element,
  newTimeFrame,
  originalTimeFrame
) => {
  if (
    !element ||
    !element.properties?.words ||
    !element.properties.words.length
  ) {
    return element;
  }

  const adjustedElement = { ...element };
  const words = [...element.properties.words];

  // Calculate the time offset for the change
  const startOffset = newTimeFrame.start - originalTimeFrame.start;
  const endOffset = newTimeFrame.end - originalTimeFrame.end;

  // Calculate the duration change
  const originalDuration = originalTimeFrame.end - originalTimeFrame.start;
  const newDuration = newTimeFrame.end - newTimeFrame.start;
  const durationRatio = newDuration / originalDuration;

  // Adjust word timings proportionally
  const adjustedWords = words.map(word => {
    const wordStart = word.start;
    const wordEnd = word.end;

    // Calculate relative position within the original subtitle (0-1)
    const relativeStart =
      (wordStart - originalTimeFrame.start) / originalDuration;
    const relativeEnd = (wordEnd - originalTimeFrame.start) / originalDuration;

    // Apply the new timing while maintaining relative positions
    const newWordStart = newTimeFrame.start + relativeStart * newDuration;
    const newWordEnd = newTimeFrame.start + relativeEnd * newDuration;

    return {
      ...word,
      start: newWordStart,
      end: newWordEnd,
    };
  });

  // Update the element with adjusted words and new time frame
  adjustedElement.timeFrame = newTimeFrame;
  adjustedElement.properties = {
    ...adjustedElement.properties,
    words: adjustedWords,
  };

  return adjustedElement;
};

// Custom audio waveform visualization function
/**
 * Draws the audio waveform on a canvas and returns silent intervals within specified windows.
 * @param {HTMLCanvasElement} canvas - The canvas element for drawing.
 * @param {string} audioUrl - URL of the audio file to analyze.
 * @param {number} audioOffset - Offset in milliseconds from the start (default: 0).
 * @param {number|null} duration - Duration in milliseconds to analyze (null = until end).
 * @param {number} thresholdDb - Silence threshold in dBFS (e.g., -60).
 * @param {number} windowMs - Window size in milliseconds for analysis (e.g., 10).
 * @param {number} minSilenceMs - Minimum silence duration in milliseconds to include (e.g., 30).
 * @returns {Promise<Array<{start: number, end: number, avgDb: number, minDb: number, maxDb: number}>>}
 *   - An array of silent intervals in seconds with average, minimum, and maximum dBFS values.
 */
const drawAudioWaveform = async (
  canvas,
  audioUrl,
  audioOffset = 0,
  duration = null,
  thresholdDb = -66,
  windowMs = 5,
  minSilenceMs = 30
) => {
  if (!canvas || !audioUrl) return [];

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    // Decode audio and cache the result
    if (!window.audioBufferCache) window.audioBufferCache = new Map();
    let audioBuffer;

    if (window.audioBufferCache.has(audioUrl)) {
      audioBuffer = window.audioBufferCache.get(audioUrl);
    } else {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Calculate max amplitude and RMS values for the entire audio file
      const channelData = audioBuffer.getChannelData(0);
      let fileMaxAmp = 0;

      // Calculate RMS values for the entire file
      const totalSamples = channelData.length;
      const samplesPerWindow = Math.max(
        1,
        Math.floor((audioBuffer.sampleRate * windowMs) / 1000)
      );
      const totalWindows = Math.ceil(totalSamples / samplesPerWindow);
      const rmsValues = new Float32Array(totalWindows);

      // Calculate RMS values
      for (let w = 0; w < totalWindows; w++) {
        const start = w * samplesPerWindow;
        const stop = Math.min(start + samplesPerWindow, totalSamples);
        let sumSq = 0;
        for (let i = start; i < stop; i++) {
          const sample = channelData[i];
          fileMaxAmp = Math.max(fileMaxAmp, Math.abs(sample));
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / (stop - start || 1e-16));
        rmsValues[w] = rms;
      }

      // Update global max amplitude if this file has higher amplitude
      if (
        !GLOBAL_AUDIO_STATS.isInitialized ||
        fileMaxAmp > GLOBAL_AUDIO_STATS.maxAmplitude
      ) {
        GLOBAL_AUDIO_STATS.maxAmplitude = fileMaxAmp;
        GLOBAL_AUDIO_STATS.isInitialized = true;
      }

      // Store RMS values for this audio file
      GLOBAL_AUDIO_STATS.rmsValues.set(audioUrl, rmsValues);

      // Cache the buffer
      window.audioBufferCache.set(audioUrl, audioBuffer);
    }

    // Extract channel data and calculate sample ranges
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = channelData.length;

    // Calculate the actual offset in samples
    const offsetSamples = Math.floor((audioOffset / 1000) * sampleRate);
    const durationMs =
      duration != null ? duration : audioBuffer.duration * 1000 - audioOffset;
    const durationSamples = Math.floor((durationMs / 1000) * sampleRate);

    // Ensure we don't exceed the audio buffer bounds
    const validOffset = Math.min(offsetSamples, totalSamples);
    const endSample = Math.min(totalSamples, validOffset + durationSamples);

    // Draw waveform bars on canvas
    ctx.fillStyle = '#ffffffcf';
    const barWidth = 2,
      barGap = 1;
    const height = canvas.height,
      centerY = height / 1.9;
    const totalBars = Math.floor(canvas.width / (barWidth + barGap));
    const samplesPerBar = Math.max(
      1,
      Math.floor((endSample - validOffset) / totalBars)
    );

    // Draw waveform directly from audio data
    for (let i = 0; i < totalBars; i++) {
      const startSample = validOffset + i * samplesPerBar;
      const endSample = Math.min(startSample + samplesPerBar, totalSamples);

      // Calculate peak amplitude for this bar
      let maxAmplitude = 0;
      for (let s = startSample; s < endSample; s++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[s]));
      }

      // Skip if amplitude is too low
      if (maxAmplitude < 0.000005) continue;

      // Calculate bar height (fixed scaling)
      const barH = Math.max(2, Math.min(height * 2, maxAmplitude * height * 2));
      const x = i * (barWidth + barGap);
      const y = centerY - barH / 2;

      ctx.fillStyle = '#d3f85aef';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [barWidth / 2]);
      ctx.fill();
    }

    const silenceIntervals = [];

    return silenceIntervals;
  } catch (err) {
    console.error('Error in drawAudioWaveform:', err);
    return [];
  }
};

const DraggableElement = ({
  element,
  children,
  moveElement,
  onImageDrop,
  onMouseUp,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const store = React.useContext(StoreContext);

  const [{ isDragging: dragMonitorState }, dragRef, preview] = useDrag({
    type: 'timeline-item',
    item: monitor => {
      // Get initial click coordinates
      const initialClientOffset = monitor.getInitialClientOffset();
      const initialSourceClientOffset = monitor.getInitialSourceClientOffset();

      // Calculate initial click offset within the element
      let initialClickOffset = 0;
      if (initialClientOffset && initialSourceClientOffset) {
        initialClickOffset =
          initialClientOffset.x - initialSourceClientOffset.x;
      }

      // Check if this element is part of multi-select
      const isPartOfMultiSelect =
        store?.selectedElements &&
        Object.keys(store.selectedElements).length > 1 &&
        Object.values(store.selectedElements).some(
          selected => selected.id === element.id
        );

      // Only start single ghost drag if not part of multi-select
      if (!isPartOfMultiSelect) {
        store.startGhostDrag(element, initialClickOffset, 0, 'move');
      }

      const dragItem = {
        id: element.id,
        timeFrame: element.timeFrame,
        elementType: element.type,
        element: element, // Pass the full element for ghost system
        initialClickOffset: initialClickOffset, // Store for later use
      };
      
      return dragItem;
    },
    canDrag: () => true,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // Reset ghost state when drag ends
      store.resetGhostState();
    },
  });

  // Set empty drag preview to hide default ghost
  React.useEffect(() => {
    preview(new Image(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [
      'timeline-item',
      'gallery-image',
      'scene-image',
      'gallery-video',
      'scene-video',
      'animation-drop',
      '__NATIVE_FILE__',
    ],
    canDrop: (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        return false;
      }

      if (monitor.getItemType() === '__NATIVE_FILE__') {
        const files = monitor.getItem().files;
        if (files && files.length > 0) {
          const file = files[0];
          return file.type.startsWith('image/') && element.type === 'imageUrl';
        }
      }

      // Handle scene-image type
      if (monitor.getItemType() === 'scene-image') {
        return element.type === 'imageUrl';
      }

      // Handle gallery-video and scene-video types
      if (
        monitor.getItemType() === 'gallery-video' ||
        monitor.getItemType() === 'scene-video'
      ) {
        return element.type === 'video';
      }

      // Handle animation drop - allow on images and videos
      if (monitor.getItemType() === 'animation-drop') {
        return element.type === 'imageUrl' || element.type === 'video';
      }

      return item.type === 'gallery-image' && element.type === 'imageUrl';
    },
    drop: async (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        return;
      }
      if (monitor.didDrop()) {
        return;
      }

      if (monitor.getItemType() === '__NATIVE_FILE__') {
        const files = monitor.getItem().files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/') && element.type === 'imageUrl') {
            const formData = new FormData();
            formData.append('image', file);
            try {
              const response = await uploadImage(formData);
              if (response && response.url) {
                const img = new Image();
                img.src = response.url;
                await new Promise(resolve => {
                  img.onload = () => {
                    onImageDrop(
                      {
                        url: response.url,
                        imageWidth: img.naturalWidth,
                        imageHeight: img.naturalHeight,
                        _id: Date.now().toString(),
                        prompt: '',
                        negativePrompt: '',
                      },
                      element
                    );
                    resolve();
                  };
                  img.onerror = resolve;
                });
              }
            } catch (error) {
              console.error('Error uploading image:', error);
            }
          }
        }
        return { handled: true };
      }

      if (monitor.getItemType() === 'gallery-image') {
        onImageDrop(item.image, element);
        return { handled: true };
      }

      if (monitor.getItemType() === 'scene-image') {
        // Make sure the image data structure matches what onImageDrop expects
        const sceneImage = item.image;

        // Create a compatible image object structure
        const imageForTimeline = {
          _id: sceneImage.id || Date.now().toString(),
          url: sceneImage.url,
          minUrl: sceneImage.minUrl,
          prompt: sceneImage.prompt,
          negativePrompt: sceneImage.negativePrompt,
          imageWidth: sceneImage.imageWidth,
          imageHeight: sceneImage.imageHeight,
        };

        onImageDrop(imageForTimeline, element);
        return { handled: true };
      }

      if (
        monitor.getItemType() === 'gallery-video' ||
        monitor.getItemType() === 'scene-video'
      ) {
        // Handle video drop on existing video element (replace functionality)
        const videoData = item.video;

        // For now, we don't support replacing videos, just return handled
        // In the future, you could implement video replacement logic here
        return { handled: true };
      }

      if (monitor.getItemType() === 'animation-drop') {
        // Handle animation drop on visual element (image or video)
        const animationData = item.animation;

        if (element.type === 'imageUrl' || element.type === 'video') {
          // Handle "None" animation - remove existing animations/transitions
          if (animationData.type === 'none') {
            // Remove all animations for this element (like handleNoneClick in TransitionPanel)
            const animationsToRemove = store.animations.filter(
              anim =>
                (anim.targetId === element.id || 
                 (anim.targetIds && anim.targetIds.includes(element.id))) && 
                anim.type !== 'glTransition'
            );
            animationsToRemove.forEach(anim => {
              store.removeAnimation(anim.id);
            });

            // Remove animation elements from timeline
            const animationElements = store.editorElements.filter(
              el => el.type === 'animation' && 
                   (el.targetId === element.id || 
                    (el.targetIds && el.targetIds.includes(element.id)))
            );
            animationElements.forEach(animEl => {
              store.removeEditorElement(animEl.id);
            });

            // Remove GL transitions related to this element
            const glTransitions = store.animations.filter(
              a =>
                a.type === 'glTransition' &&
                (a.fromElementId === element.id || a.toElementId === element.id)
            );
            glTransitions.forEach(transition => {
              store.removeGLTransition(transition.id);
            });

            return { handled: true };
          }

          // Check if this is a GL transition (like in TransitionPanel)
          if (animationData.isGLTransition) {
            // Handle GL transition exactly like handleGLTransitionClick in TransitionPanel
            const currentElement = element;
            const currentRow = currentElement.row;
            const elementsInRow = store.editorElements
              .filter(el => el.row === currentRow && el.type === 'imageUrl')
              .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

            const currentIndex = elementsInRow.findIndex(
              el => el.id === currentElement.id
            );
            const nextElement = elementsInRow[currentIndex + 1];

            if (nextElement) {
              const existingTransition = store.animations.find(
                a =>
                  a.type === 'glTransition' &&
                  a.fromElementId === currentElement.id &&
                  a.toElementId === nextElement.id
              );

              if (existingTransition) {
                // Check if it's the same transition type - if so, just remove it (toggle off)
                if (existingTransition.transitionType === animationData.type) {
                  store.removeGLTransition(existingTransition.id);
                  return { handled: true };
                } else {
                  // Different transition type - remove old and add new
                  store.removeGLTransition(existingTransition.id);
                }
              }

              const duration = animationData.duration || 300;

              // Use store.addGLTransition for proper gap positioning (like TransitionPanel does)
              store
                .addGLTransition(
                  currentElement.id,
                  nextElement.id,
                  animationData.type,
                  duration
                )
                .then(transitionId => {
                  if (transitionId) {
                  }
                })
                .catch(error => {
                  console.error('Error adding GL transition:', error);
                });
            } else {
              console.warn('No next image element found for GL transition');
            }
            return { handled: true };
          }

          // Handle regular animations (not GL transitions)
          // Use unified type and properties if available (like in TransitionPanel)
          const actualType = animationData.unifiedType || animationData.type;
          const actualProperties =
            animationData.unifiedProperties || animationData.properties || {};

          // Create animation exactly like TransitionPanel does
          const newAnimation = {
            id: getUid(),
            type: actualType,
            targetId: element.id,
            duration:
              actualProperties.duration || animationData.duration || 600,
            properties: { ...actualProperties },
            effectVariant: animationData.effectVariant,
          };

          // Set timing based on position type for unified effects (like in TransitionPanel)
          if (
            actualType === 'zoomEffect' ||
            actualType === 'fadeEffect' ||
            actualType === 'slideIn' ||
            actualType === 'slideOut' ||
            actualType === 'dropIn' ||
            actualType === 'dropOut'
          ) {
            const elementTimeFrame = element.timeFrame;
            if (elementTimeFrame) {
              const sceneDuration =
                elementTimeFrame.end - elementTimeFrame.start;

              if (
                animationData.effectVariant === 'in' ||
                actualType === 'slideIn' ||
                actualType === 'dropIn'
              ) {
                // Start at beginning of scene
                newAnimation.properties.startTime = 0;
                newAnimation.properties.endTime = newAnimation.duration;
              } else if (
                animationData.effectVariant === 'out' ||
                actualType === 'slideOut' ||
                actualType === 'dropOut'
              ) {
                // End at end of scene
                newAnimation.properties.startTime =
                  sceneDuration - newAnimation.duration;
                newAnimation.properties.endTime = sceneDuration;
              } else if (animationData.effectVariant === 'effect') {
                // Custom timing for effects
                newAnimation.properties.startTime =
                  newAnimation.properties.startTime || 0;
                newAnimation.properties.endTime =
                  newAnimation.properties.endTime || newAnimation.duration;
              }
            }
          }

          // Use store.addAnimation - it will create timeline element automatically
          if (store) {
            store.addAnimation(newAnimation);

            // Trigger refresh (already done in store.addAnimation, but ensure it happens)
            store.scheduleAnimationRefresh();

            // Trigger Redux sync (already done in store.addAnimation, but ensure it happens)
            if (
              window.dispatchSaveTimelineState &&
              !store.isUndoRedoOperation
            ) {
              window.dispatchSaveTimelineState(store);
            }
          }
        }
        return { handled: true };
      }

      if (item.id !== element.id) {
        moveElement(item.id, element.id);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={node => dragRef(drop(node))}
      className={`${styles.draggableItem} 
        ${
          dragMonitorState && !store.ghostState.isDragging
            ? styles.dragging
            : ''
        } 
        ${isOver && canDrop ? styles.dropHover : ''}`}
      draggable={true}
      style={{
        // Reduce pointer events during gallery/file drag to allow InterRowDropZone to work
        pointerEvents:
          store.ghostState.isFileDragging
            ? 'none'
            : 'auto',
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setIsDragging(false);
        if (onMouseUp) onMouseUp();
      }}
    >
      {children}
    </div>
  );
};

const TimelineItem = observer(
  ({
    item,
    toggleAnimations,
    storyData,
    isCutMode = false,
    defaultButton,
    setIsCutMode,
    isSwapTarget,
    scenes,
    rowHeight,
  }) => {
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const waveformRef = useRef(null);
    const canvasRef = useRef(null);
    const inputRef = useRef(null);
    // Add state to track original time frame for subtitle dragging optimization
    const [originalTimeFrame, setOriginalTimeFrame] = useState(null);
    const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);

    const store = React.useContext(StoreContext);
    const dispatch = useDispatch();

    const [tooltipContent, setTooltipContent] = useState('');
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const showTooltipTimeoutRef = useRef(null);
    const hideTooltipTimeoutRef = useRef(null);
    const [overlappingWord, setOverlappingWord] = useState(null);
    const [highlightedSubtitle, setHighlightedSubtitle] = useState(null);
    const [wasCutMode, setWasCutMode] = useState(false);
    const [text, setText] = useState(item?.properties?.text || '');

    // Add effect to sync text state with item properties
    useEffect(() => {
      if (item?.properties?.text !== text) {
        setText(item?.properties?.text || '');
      }
    }, [item?.properties?.text]);

    useEffect(() => {
      if (isCutMode === true) {
        setWasCutMode(true);
      }
    }, [isCutMode]);

    useEffect(() => {
      if (isPopupVisible === true) {
        setIsCutMode(false);
      } else if (isPopupVisible === false) {
        if (wasCutMode === true) setIsCutMode(true);
      }
    }, [isPopupVisible]);

    const handleImageDrop = async (image, targetElement) => {
      if (targetElement.pointId && targetElement.type === 'imageUrl') {
        // Update scene with new image using Redux

        dispatch(
          updateSelectedImage({
            sceneId: targetElement.pointId,
            selectedImage: {
              id: image._id || getUid(),
              url: image.url,
              minUrl: image.minUrl,
              prompt: image.prompt,
              negativePrompt: image.negativePrompt,
              imageHeight: image.imageHeight,
              imageWidth: image.imageWidth,
            },
          })
        );
      }

      await store.updateCanvasImage({
        url: image.googleCloudUrl || image.url,
        minUrl: image.minGoogleCloudUrl || image.minUrl,
        pointId: item.pointId,
        id: image._id || image.id,
      });
    };

    let isSelected = '';
    if (
      store?.selectedElements &&
      Object.keys(store.selectedElements).length > 0
    ) {
      isSelected = Object.values(store.selectedElements).some(
        selectedItem => selectedItem.id === item?.id
      );
    } else if (
      store?.selectedElement &&
      store.selectedElement.id === item?.id
    ) {
      // Add support for single selected element
      isSelected = true;
    }

    useEffect(() => {
      const handleKeyDown = e => {
        // Don't handle delete/backspace if focused on an input, textarea, or interacting with autocomplete/dropdown
        const activeElement = document.activeElement;
        const isInputOrTextarea =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA';
        const isAutocompleteOrDropdown =
          activeElement.getAttribute('role') === 'combobox' ||
          activeElement.getAttribute('role') === 'listbox' ||
          activeElement.closest('[role="combobox"]') ||
          activeElement.closest('[role="listbox"]') ||
          activeElement.closest('.autocomplete-dropdown') ||
          activeElement.closest('.dropdown-menu');

        if (isInputOrTextarea || isAutocompleteOrDropdown) {
          return;
        }

        if (!store.selectedElement || store.selectedElement.id !== item.id)
          return;

        // Don't handle delete for animation elements - let AnimationItem handle it
        if (store.selectedElement.type === 'animation') {
          return;
        }

        if (
          e.key === 'Delete' ||
          e.key === 'Del' ||
          (e.key === 'Backspace' && store.selectedElement?.type !== 'text')
        ) {
          e.preventDefault();

          const image = store.editorElements.find(
            el =>
              el.type === 'imageUrl' &&
              el.id === item.id &&
              el.pointId === item.pointId
          );

          if (image) {
            dispatch(
              updateSelectedImage({
                sceneId: item.pointId,
                selectedImage: null,
              })
            );
          } else {
            dispatch(
              deleteScene({
                sceneId: item.pointId,
              })
            );
          }

          store.removeEditorElement(item.id);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [store.selectedElement, item.id]);

    useEffect(() => {
      if (
        item.type === 'audio' &&
        item.properties?.src &&
        waveformRef.current
      ) {
        // Create canvas element if it doesn't exist
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = waveformRef.current.clientWidth || 300;
          canvas.height = waveformRef.current.clientHeight || 18;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          waveformRef.current.innerHTML = '';
          waveformRef.current.appendChild(canvas);
          canvasRef.current = canvas;
        }

        // Calculate the actual duration of the displayed portion
        const displayDuration = item.timeFrame.end - item.timeFrame.start;

        // Draw the waveform with the correct offset
        drawAudioWaveform(
          canvasRef.current,
          item.properties?.src,
          item.properties?.audioOffset || 0,
          displayDuration
        );

        // Add resize observer to handle container resizing
        const resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            if (canvasRef.current) {
              // Update canvas dimensions
              canvasRef.current.width = entry.contentRect.width;
              canvasRef.current.height = entry.contentRect.height;

              // Redraw waveform with new dimensions
              drawAudioWaveform(
                canvasRef.current,
                item.properties?.src,
                item.properties?.audioOffset || 0,
                displayDuration
              );
            }
          }
        });

        // Start observing the waveform container
        resizeObserver.observe(waveformRef.current);

        return () => {
          // Clean up
          resizeObserver.disconnect();
          if (canvasRef.current) {
            canvasRef.current = null;
          }
        };
      }
    }, [
      item.properties?.src,
      item.properties?.audioOffset,
      item.timeFrame.start,
      item.timeFrame.end,
    ]);

    // Add a separate effect to update the waveform when the audio offset changes
    useEffect(() => {
      if (
        item.type === 'audio' &&
        item.properties?.src &&
        canvasRef.current &&
        item.properties?.audioOffset !== undefined
      ) {
        const displayDuration = item.timeFrame.end - item.timeFrame.start;

        // Redraw the waveform with the updated offset
        drawAudioWaveform(
          canvasRef.current,
          item.properties?.src,
          item.properties?.audioOffset,
          displayDuration
        );
      }
    }, [item.properties?.audioOffset]);

    const bgColorOnSelected = isSelected
      ? item.type === 'image' || item.type === 'imageUrl'
        ? styles.selectedImageBackground
        : item.type === 'transition'
        ? styles.selectedTransitionBackground
        : styles.selectedBackground
      : item.type === 'image' || item.type === 'imageUrl'
      ? styles.unselectedImageBackground
      : item.type === 'text'
      ? styles.unselectedTextBackground
      : item.type === 'transition'
      ? styles.unselectedTransitionBackground
      : styles.unselectedBackground;

    const handleDirectClick = e => {
      // Skip if this is a context menu event
      if (e.type === 'contextmenu') {
        return;
      }
      if (e.button !== defaultButton) {
        return;
      }

      if (
        !isCutMode ||
        (item.type !== 'imageUrl' &&
          item.type !== 'audio' &&
          item.type !== 'video')
      ) {
        onSelectItemClick();
        return;
      }

      e.stopPropagation();

      // Get the draggable element
      const dragableView = e.currentTarget.querySelector(
        `.${styles.dragableView}`
      );
      const dragableRect = dragableView.getBoundingClientRect();

      // Calculate click position relative to the dragableView
      const clickX = e.clientX - dragableRect.left;
      const clickPercentage = clickX / dragableRect.width;

      // Calculate split point based on the element's timeframe
      const splitPoint =
        item.timeFrame.start +
        (item.timeFrame.end - item.timeFrame.start) * clickPercentage;

      if (item.type === 'audio') {
        handleSplitAudio(splitPoint);
      } else if (item.type === 'imageUrl') {
        handleSplitImage(splitPoint);
      } else if (item.type === 'video') {
        handleSplitVideo(splitPoint);
      }
    };

    const handleSplitVideo = splitPoint => {
      if (item.type === 'video') {
        store.splitVideoElement(item, splitPoint);
        setIsPopupVisible(false);
      }
    };

    const togglePopUp = e => {
      e.preventDefault();
      e.stopPropagation();

      // Get the draggable element
      const dragableView = e.currentTarget.querySelector(
        `.${styles.dragableView}`
      );
      const dragableRect = dragableView.getBoundingClientRect();

      // Calculate click position relative to the dragableView
      const clickX = e.clientX - dragableRect.left;
      const clickPercentage = clickX / dragableRect.width;

      // Calculate split point based on the element's timeframe
      const splitPoint =
        item.timeFrame.start +
        (item.timeFrame.end - item.timeFrame.start) * clickPercentage;

      // Check if there's enough space on the right side of the screen
      const spaceOnRight = window.innerWidth - e.clientX;
      const PANEL_WIDTH = 160;
      const OFFSET = 40;

      // If not enough space on right, position to the left
      const xPosition =
        spaceOnRight < PANEL_WIDTH + OFFSET ? -PANEL_WIDTH : OFFSET;

      // Position popup relative to the click position within the draggable element
      setPopupPosition({
        x: clickX,
        y: e.clientY - dragableRect.top,
        splitPoint: splitPoint,
        positionRight: spaceOnRight < PANEL_WIDTH + OFFSET,
      });
      setIsPopupVisible(true);
    };

    const handleClickOutside = () => {
      setIsPopupVisible(false);
    };

    const handleSplitAudio = async splitPoint => {
      if (item.type === 'audio') {
        store.splitAudioElement(item, splitPoint);
        setIsPopupVisible(false);
      }
    };

    const handleSplitImage = splitPoint => {
      if (item.type === 'imageUrl' || item.type === 'image') {
        store.splitImageElement(item, splitPoint);
        setIsPopupVisible(false);
      }
    };

    const scene = scenes?.find(scene => scene._id === item.pointId);

    const getItemContent = (type, id) => {
      switch (type) {
        case 'transition':
          return (
            <div>
              {item.effect === 'in' && (
                <div className={styles.rectangleMarker}>
                  <InIcon size={18} color="#FFFFFF99" />
                </div>
              )}
              {item.effect === 'out' && (
                <div className={styles.rectangleMarker}>
                  <OutIcon size={18} color="#FFFFFF99" />
                </div>
              )}
              {item.effect === 'dolly' && (
                <div
                  className={styles.rectangleMarker}
                  style={{ width: '28px', height: '28px' }}
                >
                  <AnimationIcon size={14} color="#FFFFFF99" />
                </div>
              )}
            </div>
          );
        case 'text':
          return (
            <div
              className={styles.textContainer}
              data-tooltip-id={`text-tooltip-${item.id}`}
              data-overlay-id={item.id}
              onMouseEnter={e => {
                const input = e.currentTarget.querySelector('input');
                // Show tooltip only if text is truncated
                if (input && input.scrollWidth > input.clientWidth) {
                  e.currentTarget.setAttribute(
                    'data-tooltip-content',
                    item.properties?.text
                  );
                } else {
                  e.currentTarget.removeAttribute('data-tooltip-content');
                }
              }}
            >
              <input
                ref={inputRef}
                className={styles.truncatedText}
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                onClick={e => {
                  // Focus when clicked but not during drag
                  e.currentTarget.focus();
                  e.stopPropagation();
                }}
              />
              <Tooltip
                id={`text-tooltip-${item.id}`}
                place="top"
                className={styles.textTooltip}
                delayShow={500}
              />
            </div>
          );

        case 'clip':
          return <div className={styles.itemLabel}>{item.type}</div>;

        case 'audio':
          return (
            <div
              className={`${styles.audioElement} ${styles.itemLabel} ${
                item.isLoading ? styles.loadingAudio : ''
              }`}
              data-timeline-item
              data-overlay-id={item.id}
            >
              <div
                ref={waveformRef}
                style={{
                  height: rowHeight,
                }}
                className={styles.waveform}
                data-timeline-item
              ></div>
              {item.isLoading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loadingSpinner}></div>
                  <span className={styles.loadingText}>Processing...</span>
                </div>
              )}
            </div>
          );

        case 'video':
          return (
            <div
              className={`${styles.videoElement} ${styles.itemLabel} ${
                item.isLoading ? styles.loadingVideo : ''
              }`}
              data-timeline-item
              data-overlay-id={item.id}
            >
              {item.isLoading ? (
                <div className={styles.loadingPlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                  <span className={styles.loadingText}>Loading...</span>
                </div>
              ) : item.properties?.thumbnails ? (
                <div className={styles.thumbnailsContainer}>
                  {item.properties?.thumbnails?.map((thumb, idx) => {
                    // Calculate if this thumbnail should be visible based on the element's width
                    const elementWidth =
                      ((item.timeFrame.end - item.timeFrame.start) /
                        store.maxTime) *
                      100;
                    const thumbnailWidth =
                      elementWidth / (item.properties?.thumbnails?.length || 1);

                    // Only render thumbnails that would be at least 28px wide
                    if (thumbnailWidth < 0.5) return null;

                    return (
                      <img
                        key={idx}
                        src={thumb}
                        alt=""
                        className={styles.thumbnail}
                        style={{
                          width: `${
                            100 / (item.properties?.thumbnails?.length || 1)
                          }%`,
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={styles.placeholderVideo}>
                  <span>Video</span>
                </div>
              )}
            </div>
          );

        default:
          return (
            <>
              <div
                className={styles.imageContainer}
                style={{
                  backgroundImage: `url(${
                    item.properties?.minUrl || item.properties?.src || ''
                  })`,
                  backgroundSize:
                    (item.properties?.width || 0) <
                    (item.properties?.height || 0)
                      ? rowHeight / 1.5
                      : rowHeight / 1.5,
                  backgroundPosition: 'start',
                  backgroundRepeat: 'repeat-x',
                  outline:
                    item.subType === 'placeholder'
                      ? '1px solid rgba(255, 255, 255, 0.1019607843)'
                      : 'none',
                }}
                onClick={e => e.stopPropagation()}
                onMouseEnter={e => {
                  // Clear any existing hide timeout
                  if (hideTooltipTimeoutRef.current) {
                    clearTimeout(hideTooltipTimeoutRef.current);
                    hideTooltipTimeoutRef.current = null;
                  }

                  // Get element position for fixed Y coordinate
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fixedYPosition = rect.top - 220; // Fixed position above the element

                  setTooltipPosition({
                    x: e.clientX, // Use cursor X position
                    y: fixedYPosition, // Fixed Y position
                  });
                  setTooltipContent(item.properties?.src);

                  // Set a delay for showing the tooltip (300ms)
                  showTooltipTimeoutRef.current = setTimeout(() => {
                    setShowTooltip(true);
                  }, 300);
                }}
                onMouseMove={e => {
                  // Update only X position as cursor moves, keeping Y fixed
                  if (showTooltip) {
                    setTooltipPosition(prevPosition => ({
                      x: e.clientX,
                      y: prevPosition.y, // Keep Y position fixed
                    }));
                  }
                }}
                onMouseLeave={() => {
                  // Clear any existing show timeout
                  if (showTooltipTimeoutRef.current) {
                    clearTimeout(showTooltipTimeoutRef.current);
                    showTooltipTimeoutRef.current = null;
                  }

                  // Set a delay for hiding the tooltip (200ms)
                  hideTooltipTimeoutRef.current = setTimeout(() => {
                    setShowTooltip(false);
                  }, 200);
                }}
                data-testid="timeline-image-container"
                data-overlay-id={item.id}
              />
              {item.subType === 'placeholder' && (
                <div
                  className={styles.sceneNumber}
                  data-tooltip-id={`scene-tooltip-${item.id}`}
                  onMouseEnter={e => {
                    const div = e.currentTarget;
                    // Show tooltip only if text is truncated
                    if (div.scrollWidth > div.clientWidth) {
                      div.setAttribute(
                        'data-tooltip-content',
                        scene?.title
                          ? scene?.title
                          : `Scene ${scene?.order + 1}`
                      );
                    } else {
                      div.removeAttribute('data-tooltip-content');
                    }
                  }}
                >
                  {scene?.title ? scene?.title : `Scene ${scene?.order + 1}`}
                  <Tooltip
                    id={`scene-tooltip-${item.id}`}
                    place="top"
                    className={styles.textTooltip}
                    delayShow={500}
                  />
                </div>
              )}
              {showTooltip &&
                item.properties?.src &&
                createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y}px`,
                      transform: 'translateX(-50%)', // Center the tooltip
                      backgroundColor: '#000000db',
                      padding: '0',
                      borderRadius: '8px',
                      zIndex: 9999,
                      pointerEvents: 'none',
                    }}
                  >
                    {item.subType !== 'placeholder' && (
                      <img
                        src={item.properties?.src}
                        alt="Full size preview"
                        style={{
                          maxWidth: '160px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                        }}
                      />
                    )}
                  </div>,
                  document.body
                )}
            </>
          );
      }
    };

    const getAdjacentElements = currentElement => {
      const index = store.editorElements.findIndex(
        el => el.id === currentElement.id
      );

      if (index === -1) return { previousElement: null, nextElement: null };

      const elementsInSameRow = store.editorElements.filter(
        el => el.row === currentElement.row
      );

      const sortedElements = [...elementsInSameRow].sort(
        (a, b) => a.timeFrame.start - b.timeFrame.start
      );

      const currentIndexInSorted = sortedElements.findIndex(
        el => el.id === currentElement.id
      );

      const previousElement =
        currentIndexInSorted > 0
          ? sortedElements[currentIndexInSorted - 1]
          : null;

      const nextElement =
        currentIndexInSorted < sortedElements.length - 1
          ? sortedElements[currentIndexInSorted + 1]
          : null;

      return { previousElement, nextElement };
    };

    useEffect(() => {
      document.addEventListener('click', handleClickOutside);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, []);

    const { previousElement, nextElement } = getAdjacentElements(item);

    const onSelectItemClick = () => {
      if (item.pointId) {
        const scene = storyData?.scenes?.find(el => el._id === item.pointId);

        dispatch(
          setActiveScene({
            ...scene,
            _id: item.pointId,
          })
        );

        store.updateTimeTo(item.timeFrame.start + 10);
      }

      if (item?.subType === 'subtitles') {
        store.setCurrentTimeInMs(item.timeFrame.end);
      }

      // Set single selected element for volume control and other features
      store.setSelectedElement(item);

      // Also set selectedElements for compatibility with existing code
      store.setSelectedElements({
        ...[item],
        effect: item.effect || 'in',
      });
    };

    const handleTextChange = newText => {
      const words = item.properties?.words || [];
      setText(newText);

      // For non-subtitle text, do simple update
      if (!item.subType || item.subType !== 'subtitles') {
        const simpleUpdate = {
          ...item,
          properties: {
            ...item.properties,
            text: newText,
          },
        };

        store.isUndoRedoOperation = true;
        try {
          store.updateEditorElement(simpleUpdate);
        } finally {
          store.isUndoRedoOperation = false;
        }
        return;
      }

      // Split text into words or single characters
      const segments = newText.split(/(\s+)/).filter(Boolean);

      // Calculate base time per segment
      const segmentDuration = item.timeFrame.end - item.timeFrame.start;
      const timePerSegment = Math.min(300, segmentDuration / segments.length);

      let currentTime = item.timeFrame.start;
      const updatedWords = [];

      segments.forEach((segment, index) => {
        if (segment.trim() === '') {
          // Handle spaces - just update current time slightly
          currentTime += 50;
          return;
        }

        // If it's a single character (not a space) or a number
        if (segment.length === 1 || !isNaN(segment)) {
          updatedWords.push({
            word: segment,
            text: segment,
            start: currentTime,
            end: item.timeFrame.end,
            isNew: true,
            isSingle: true,
          });
        } else {
          // Handle multi-character word - now just add one entry for the whole word
          updatedWords.push({
            word: segment,
            text: segment,
            start: currentTime,
            end: item.timeFrame.end,
            isNew: true,
          });
        }

        currentTime += timePerSegment;
      });

      const updatedElement = {
        ...item,
        properties: {
          ...item.properties,
          text: newText,
          words: updatedWords,
          wordObjects: [],
        },
      };

      store.isUndoRedoOperation = true;
      try {
        store.updateEditorElement(updatedElement);

        // Add animation for words
        updatedWords
          .filter(w => w.isNew)
          .forEach(word => {
            store.addAnimation({
              id: `${item.id}-word-animation-${word.word}`,
              targetId: item.id,
              type: 'textWordAnimation',
              duration: 500,
              properties: {},
            });
          });
      } finally {
        store.isUndoRedoOperation = false;
      }
    };

    const handleKeyDown = event => {
      if (event.key === 'Backspace') {
        const cursorPosition = inputRef?.current?.selectionStart;

        if (cursorPosition === 0) {
          const previousElement = store.editorElements.find(
            el =>
              el.row === item.row &&
              el.type === item.type &&
              el.timeFrame.end === item.timeFrame.start
          );

          if (previousElement) {
            const mergedText =
              (previousElement.properties?.text || '') +
              ' ' +
              (item.properties?.text || '');
            const prevStart = previousElement.timeFrame.start;
            const currentEnd = item.timeFrame.end;

            const mergedWords = [
              ...(previousElement.properties?.words || []).map(word => ({
                ...word,
                start: word.start,
                end: currentEnd,
              })),
              ...(item.properties?.words || []).map(word => ({
                ...word,
                start: word.start,
                end: currentEnd,
              })),
            ].sort((a, b) => a.start - b.start);

            const mergedElement = {
              ...previousElement,
              properties: {
                ...previousElement.properties,
                text: mergedText,
                words: mergedWords,
                wordObjects: [], // Reset word objects
              },
              timeFrame: {
                start: prevStart,
                end: currentEnd,
              },
            };

            store.saveToHistory();

            store.isUndoRedoOperation = true;

            try {
              store.updateEditorElement(mergedElement);
              store.removeEditorElement(item.id);

              if (mergedWords.length > 0) {
                store.addAnimation({
                  id: `${mergedElement.id}-word-animation`,
                  targetId: mergedElement.id,
                  type: 'textWordAnimation',
                  duration: 500,
                  properties: {},
                });
              }

              requestAnimationFrame(() => {
                const elements = document.querySelectorAll(
                  'input.truncatedText'
                );
                const input = Array.from(elements).find(
                  input => input.value === mergedText
                );
                if (input) {
                  input.focus();
                  input.selectionStart = previousElement.properties.text.length;
                  input.selectionEnd = previousElement.properties.text.length;
                }
              });
            } finally {
              store.isUndoRedoOperation = false;
            }
          }
        }
      }
    };

    const handleKeyPress = event => {
      if (event.key === 'Enter') {
        event.preventDefault();

        const cursorPosition = inputRef?.current?.selectionStart;
        const currentText = item.properties?.text || '';

        const firstPart = currentText.slice(0, cursorPosition).trim();
        const secondPart = currentText.slice(cursorPosition).trim();

        const totalDuration = item.timeFrame.end - item.timeFrame.start;
        const splitPoint =
          item.timeFrame.start +
          (totalDuration * cursorPosition) / currentText.length;

        const firstPartWords = [];
        const secondPartWords = [];

        if (item.properties?.words) {
          let currentPosition = 0;
          // First, create a map of all hyphenated words and their positions
          const hyphenatedWords = new Map();
          item.properties?.words?.forEach(word => {
            const wordText = word.word || word.text || '';
            if (wordText.includes('-')) {
              const startPos = currentText.indexOf(wordText, currentPosition);
              if (startPos !== -1) {
                hyphenatedWords.set(startPos, {
                  word,
                  length: wordText.length,
                  endPos: startPos + wordText.length,
                });
              }
            }
          });

          // Now map all words, handling hyphenated words specially
          const wordPositions = item.properties?.words?.map(word => {
            const wordText = word.word || word.text || '';
            const startPos = currentText.indexOf(wordText, currentPosition);
            currentPosition = startPos + wordText.length;

            // Check if this word is part of a hyphenated word
            let isPartOfHyphenated = false;
            for (const [hyphenStart, hyphenData] of hyphenatedWords.entries()) {
              if (startPos >= hyphenStart && startPos < hyphenData.endPos) {
                isPartOfHyphenated = true;
                break;
              }
            }

            return {
              word,
              textPosition: startPos,
              length: wordText.length,
              isPartOfHyphenated,
            };
          });

          // Calculate time per character for more accurate timing
          const timePerChar = totalDuration / currentText.length;

          // Process words, handling hyphenated words specially
          wordPositions?.forEach(
            ({ word, textPosition, length, isPartOfHyphenated }) => {
              const wordObject = { ...word };
              const wordEnd = textPosition + length;

              if (isPartOfHyphenated) {
                // For hyphenated words that are split
                if (cursorPosition > textPosition && cursorPosition < wordEnd) {
                  // Create two parts of the hyphenated word
                  const beforeCursor = currentText.slice(
                    textPosition,
                    cursorPosition
                  );
                  const afterCursor = currentText.slice(
                    cursorPosition,
                    wordEnd
                  );

                  if (beforeCursor.trim()) {
                    firstPartWords.push({
                      ...wordObject,
                      word: beforeCursor.trim(),
                      text: beforeCursor.trim(),
                      end: splitPoint,
                    });
                  }

                  if (afterCursor.trim()) {
                    secondPartWords.push({
                      ...wordObject,
                      word: afterCursor.trim(),
                      text: afterCursor.trim(),
                      start: splitPoint,
                      end: item.timeFrame.end,
                    });
                  }
                } else if (textPosition < cursorPosition) {
                  wordObject.end = splitPoint;
                  firstPartWords.push(wordObject);
                } else {
                  const relativePosition = textPosition - cursorPosition;
                  wordObject.start =
                    splitPoint + relativePosition * timePerChar;
                  wordObject.end = item.timeFrame.end;
                  secondPartWords.push(wordObject);
                }
              } else {
                // Handle non-hyphenated words as before
                if (wordEnd <= cursorPosition) {
                  wordObject.end = splitPoint;
                  firstPartWords.push(wordObject);
                } else if (textPosition >= cursorPosition) {
                  const relativePosition = textPosition - cursorPosition;
                  wordObject.start =
                    splitPoint + relativePosition * timePerChar;
                  wordObject.end = item.timeFrame.end;
                  secondPartWords.push(wordObject);
                }
              }
            }
          );
        }

        const newElementId = getUid();

        const firstElement = {
          ...item,
          properties: {
            ...item.properties,
            text: firstPart,
            words: firstPartWords.map(word => ({
              ...word,
              isNew: true,
            })),
            wordObjects: [],
          },
          timeFrame: {
            start: item.timeFrame.start,
            end: splitPoint,
          },
        };

        const secondElement = {
          ...item,
          id: newElementId,
          properties: {
            ...item.properties,
            text: secondPart,
            words: secondPartWords.map(word => ({
              ...word,
              isNew: true,
            })),
            wordObjects: [],
          },
          timeFrame: {
            start: splitPoint,
            end: item.timeFrame.end,
          },
        };

        // Find the current element's index in editorElements
        const currentIndex = store.editorElements.findIndex(
          el => el.id === item.id
        );

        try {
          // Update the text state for the current element
          setText(firstPart);

          // First update the current element
          store.updateEditorElement(firstElement);

          // Then insert the new element at the correct position
          const newEditorElements = [...store.editorElements];
          newEditorElements.splice(currentIndex + 1, 0, secondElement);
          store.setEditorElements(newEditorElements);

          if (firstPartWords.length > 0) {
            store.addAnimation({
              id: `${firstElement.id}-word-animation`,
              targetId: firstElement.id,
              type: 'textWordAnimation',
              duration: 500,
              properties: {},
            });
          }

          if (secondPartWords.length > 0) {
            store.addAnimation({
              id: `${secondElement.id}-word-animation`,
              targetId: secondElement.id,
              type: 'textWordAnimation',
              duration: 500,
              properties: {},
            });
          }

          requestAnimationFrame(() => {
            const elements = document.querySelectorAll('input.truncatedText');
            const newInput = Array.from(elements).find(
              input => input.value === secondPart
            );
            if (newInput) {
              newInput.focus();
              newInput.selectionStart = 0;
              newInput.selectionEnd = 0;
            }
          });
        } finally {
          store.isUndoRedoOperation = false;
        }
      }
    };

    const handleMouseMove = e => {
      if (!isCutMode) return;

      const dragableView = e.currentTarget;
      const rect = dragableView.getBoundingClientRect();
      const x = e.clientX - rect.left;

      dragableView.style.setProperty('--mouse-x', `${x}px`);

      // Check for word overlap
      const overlap = checkWordOverlap(e.clientX, rect);
      setOverlappingWord(overlap?.word || null);
      setHighlightedSubtitle(overlap?.subtitle || null);
    };

    // Add this function to check for word overlap
    const checkWordOverlap = useCallback(
      (mouseX, dragableRect) => {
        if (!isCutMode || item.type !== 'audio') return null;

        // Calculate current time based on mouse position
        const clickPercentage =
          (mouseX - dragableRect.left) / dragableRect.width;
        const currentTime =
          item.timeFrame.start +
          (item.timeFrame.end - item.timeFrame.start) * clickPercentage;

        // Find subtitles in the editor elements
        const subtitleElements = store.editorElements.filter(
          el => el.type === 'text' && el.subType === 'subtitles'
        );

        // Get all words from all subtitles and sort them by start time
        const allWords = subtitleElements
          .reduce((words, subtitle) => {
            if (subtitle.properties.words) {
              words.push(
                ...subtitle.properties.words.map(word => ({
                  ...word,
                  subtitle,
                }))
              );
            }
            return words;
          }, [])
          .sort((a, b) => a.start - b.start);

        // Check if we're inside a word
        for (let i = 0; i < allWords.length; i++) {
          const word = allWords[i];
          if (currentTime >= word.start && currentTime <= word.end) {
            return {
              word: word,
              subtitle: word.subtitle,
            };
          }
        }

        // If we're not inside any word, it's safe to cut
        return null;
      },
      [isCutMode, item, store.editorElements]
    );

    // Clean up timeouts when component unmounts
    useEffect(() => {
      return () => {
        if (showTooltipTimeoutRef.current) {
          clearTimeout(showTooltipTimeoutRef.current);
        }
        if (hideTooltipTimeoutRef.current) {
          clearTimeout(hideTooltipTimeoutRef.current);
        }
      };
    }, []);

    // Add cleanup effect
    useEffect(() => {
      return () => {
        setOverlappingWord(null);
        setHighlightedSubtitle(null);
      };
    }, [isCutMode]);

    // Add this effect to clean up highlight states when component unmounts or audio changes
    useEffect(() => {
      return () => {
        if (item.type === 'audio') {
          setHighlightedSubtitle(null);
          setOverlappingWord(null);
        }
        setIsDraggingSubtitle(false);
        setOriginalTimeFrame(null);
      };
    }, [item.id, item.type]);

    // Modify the className in the main container div to include both wordOverlap and subtitleHighlight classes
    const isHighlighted =
      highlightedSubtitle?.id === item.id &&
      item.type === 'text' &&
      item.subType === 'subtitles';
    const hasWordOverlap = item.type === 'audio' && overlappingWord;

    return (
      <div
        onMouseUp={handleDirectClick}
        key={item.id}
        className={`${styles.frameView} ${
          isSelected ? styles.selectedItem : ''
        } 
          timeline-item ${isCutMode ? styles.cutMode : ''} 
          ${isHighlighted ? styles.subtitleHighlight : ''}
          ${isSwapTarget ? styles.subtitleHighlight : ''}`}
        onContextMenu={togglePopUp}
        data-testid={`timeline-item-${item.id}`}
        data-timeline-item
      >
        <DraggableElementView
          value={item.timeFrame.start}
          total={store.maxTime}
          isSelected={isSelected}
          element={item}
          resizeType="start"
          onMouseUp={() => {
            // Apply full subtitle adjustment if we were dragging a subtitle
            if (
              isDraggingSubtitle &&
              originalTimeFrame &&
              item.type === 'text' &&
              item.subType === 'subtitles' &&
              item.properties?.words?.length > 0
            ) {
              const updatedElement = adjustSubtitlesForChangedTime(
                item,
                item.timeFrame,
                originalTimeFrame
              );

              store.isUndoRedoOperation = true;
              try {
                store.updateEditorElement(updatedElement);
              } finally {
                store.isUndoRedoOperation = false;
              }

              // Reset dragging state
              setIsDraggingSubtitle(false);
              setOriginalTimeFrame(null);
            }

            store.endMove();
          }}
          onMouseDown={() => {}}
          elementType={item.type}
          data-timeline-item
          onChange={value => {
            // When resize-ghost is active, DraggableElementView drives the ghost; skip real edits
            if (store.ghostState?.isResizing) return;
          }}
        >
          {item.type !== 'transition' && (
            <>
              <div
                className={`${styles.dragImageHandleLeft} `}
                style={{
                  borderWidth: item.type === 'text' ? '1px' : '2px',
                }}
              />
            </>
          )}
        </DraggableElementView>

        <div
          className={`${styles.dragableView} ${bgColorOnSelected}`}
          style={{
            width: `${
              ((item.timeFrame.end - item.timeFrame.start) / store.maxTime) *
              100
            }%`,
            left: `${(item.timeFrame.start / store.maxTime) * 100}%`,
            top: 0,
            bottom: 0,
            zIndex: 10,
            // Don't apply live push offset during dragging - only show final result
            transform: 'none',
            transition: 'transform 0.2s ease-out',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setOverlappingWord(null);
            setHighlightedSubtitle(null);
          }}
          data-testid="timeline-image-container"
          data-timeline-item
        >
          {overlappingWord && (
            <div className={styles.wordPreview}>{overlappingWord.word}</div>
          )}
          <div className={styles.splitBottomTriangle} />
          <DraggableElement
            element={item}
            moveElement={store.moveElement}
            onImageDrop={handleImageDrop}
            elementType={item.type}
            onMouseUp={() => {
              store.endMove();
            }}
          >
            {item.type && getItemContent(item.type, item.id)}

            {isPopupVisible && (
              <PopupPanel
                isOpen={isPopupVisible}
                x={popupPosition.x + (popupPosition.positionRight ? -160 : 160)}
                y={popupPosition.y}
                onClose={handleClickOutside}
                toggleAnimations={() => toggleAnimations(item.row)}
                isAudioType={item.type === 'audio'}
                isImageType={item.type === 'imageUrl' || item.type === 'image'}
                isVideoType={item.type === 'video'}
                deleteElement={() => {
                  store.removeEditorElement(item.id);
                }}
                splitPoint={popupPosition.splitPoint}
                onSplitAudio={handleSplitAudio}
                onSplitImage={handleSplitImage}
                onSplitVideo={handleSplitVideo}
                element={item}
              />
            )}
          </DraggableElement>
        </div>

        <DraggableElementView
          value={item.timeFrame.end}
          total={store.maxTime}
          isSelected={isSelected}
          element={item}
          resizeType="end"
          onMouseUp={() => {
            // Apply full subtitle adjustment if we were dragging a subtitle
            if (
              isDraggingSubtitle &&
              originalTimeFrame &&
              item.type === 'text' &&
              item.subType === 'subtitles' &&
              item.properties?.words?.length > 0
            ) {
              const updatedElement = adjustSubtitlesForChangedTime(
                item,
                item.timeFrame,
                originalTimeFrame
              );

              store.isUndoRedoOperation = true;
              try {
                store.updateEditorElement(updatedElement);
              } finally {
                store.isUndoRedoOperation = false;
              }

              // Reset dragging state
              setIsDraggingSubtitle(false);
              setOriginalTimeFrame(null);
            }

            store.endMove();
          }}
          onMouseDown={() => {}}
          onChange={value => {
            // When resize-ghost is active, DraggableElementView drives the ghost; skip real edits
            if (store.ghostState?.isResizing) return;
          }}
        >
          {item.type !== 'transition' && (
            <>
              <div
                className={`${styles.dragImageHandleRight} `}
                style={{
                  borderWidth: item.type === 'text' ? '1px' : '2px',
                }}
              />
            </>
          )}
        </DraggableElementView>
      </div>
    );
  }
);

export default TimelineItem;
