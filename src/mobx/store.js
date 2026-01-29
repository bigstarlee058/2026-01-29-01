import { makeAutoObservable, observable, action, runInAction } from 'mobx';
import { fabric } from 'fabric';
import { getUid, isHtmlAudioElement, isHtmlVideoElement } from '../utils';
import MP4Box from 'mp4box';
import anime from 'animejs';
import { v4 as uuidv4 } from 'uuid';
import { convertCurveToEasing } from '../components/PlayerComponent/entity/AnimationResource';
import { GLTransitionRenderer } from '../utils/gl-transitions';
import { captureFabricObjectState } from '../utils/fabric-utils';
import {
  refreshAnimationsUtil,
  updateTimeToUtil,
  refreshElementsUtil,
} from './store-modules';
import { handleCatchError } from '../utils/errorHandler';

export class Store {
  constructor() {
    // Add drawnPaths array to store drawn paths
    this.drawnPaths = [];

    // Add flag to prevent recursive saves
    this._isSaving = false;

    // Add custom origin point selection state
    this.isSelectingOrigin = false;
    this.originSelectionCallback = null;
    this.originSelectionElement = null;
    this.eyeCursor = null;
    this.originMarker = null;

    // GL Transitions support
    this.glTransitionRenderer = null;
    this.glTransitionElements = new Map(); // Store GL transition elements
    // Limit active GL renderers to avoid exceeding browser WebGL context caps
    this.MAX_ACTIVE_GL_RENDERERS = 8;
    // Throttle GL texture updates during seeks
    this.GL_SEEK_TEXTURE_UPDATE_INTERVAL_MS = 16; // ~60fps
    this._glSeekTextureUpdateTs = 0;
    // Defer removing potentially-orphaned transitions to avoid race conditions
    this._glOrphanMissCounts = new Map();
    // Lazy GL renderer setup during initialization to avoid creating many contexts at once
    this.LAZY_GL_SETUP = true;

    this.storyId = '';
    this.canvas = null;
    this.videos = [];
    this.images = [];
    this.audios = [];
    this.editorElements = [];
    this.hiddenSubtitles = [];
    this.backgroundColor = '#000000';
    this.maxTime = 0; // Will be set dynamically based on content
    this.playing = false;
    this.currentKeyFrame = 0;
    this.selectedElement = null;
    this.selectedElements = null;
    this.coppiedElements = null;
    this.fps = 60;
    this.animations = [];
    this.subtitlesAnimation = 'textWordAnimation';
    this.animationTimeLine = anime.timeline();
    this.selectedMenuOption = 'Export';
    this.selectedVideoFormat = 'mp4';
    this.possibleVideoFormats = ['mp4', 'webm'];
    this.playbackRate = 1;
    // Initialize setPlaybackRate action
    this.setPlaybackRate = action(rate => {
      this.playbackRate = rate;
      this.updateAllMediaPlaybackRates();
    });
    this.startedTime = 0;
    this.startedTimePlay = 0;
    this.isDragging = false;
    this.draggedItem = null;
    this.ghostElement = null;
    this.ghostMarkerPosition = null;
    this.dragInfo = null;
    this.maxRows = 3;
    this.volume = 0.05;
    this.playbackRate = 1;
    this.applyToAll = false;
    this.synchronise = true;
    this.refreshDebounceTimeout = null;
    this.pendingUpdates = new Set();
    this.lastPosition = null;
    this.lastUpdateTime = 0;
    this.updateThreshold = 5; // pixels
    this.updateInterval = 50; // ms
    this.batchedAnimationUpdates = new Set();
    this.animationUpdateTimeout = null;
    this.isRefreshingAnimations = false;
    this.isRefreshingElements = false;
    this.ANIMATION_BATCH_DELAY = 16; // ~1 frame at 60fps

    this.dragState = {
      isDragging: false,
      lastValue: null,
      rafId: null,
      updates: new Map(),
      lastUpdateTime: 0,
      updateInterval: 16, // ~60fps
      accumulatedUpdates: new Map(),
    };

    this.moveState = {
      isMoving: false,
      rafId: null,
      lastUpdateTime: 0,
      updateInterval: 16, // ~60fps for smooth animations
      accumulatedMoves: new Map(),
    };

    // Bind methods
    this.handleObjectModified = this.handleObjectModified.bind(this);

    // Add history tracking
    this.history = [];
    this.currentHistoryIndex = -1;
    this.isUndoRedoOperation = false;

    this.isInitializing = false;

    this.debouncedSaveToHistory = (() => {
      let timeoutId = null;
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          timeoutId = null;
        }, 500); // 500ms delay
      };
    })();

    this.autoAdjustDuration = true;

    this.isResizing = false;

    // Aspect ratio state
    this.currentAspectRatio = { width: 9, height: 16 }; // Default to 9:16

    // Subtitles panel state
    this.subtitlesPanelState = observable({
      isPunctuationEnabled: true, // true = with punctuation, false = without punctuation
      wordSpacingFactor: -13, // Add word spacing factor
      letterSpacingFactor: 0, // Add letter spacing factor
      lineHeightFactor: 1.2, // Add line height factor (default 1.2 = 120%)
      textCase: 'none', // none, uppercase, lowercase, capitalize
    });

    // ColorPicker state for preserving settings
    this.colorPickerState = observable({
      buttonColors: {
        Font: '#ffffff',
        Fill: '#000000',
        Shadow: '#808080',
        Outline: '#ffffff',
        Motion: '#ff0000',
        'Auto HL': '#ffff00',
      },
      opacities: {
        Font: 100,
        Fill: 100,
        Shadow: 100,
        Outline: 100,
        Motion: 100,
        'Auto HL': 100,
      },
      shadowSettings: {
        distance: 10,
        blur: 10,
        angle: 0,
        sliderValue: 50,
      },
      strokeWidth: 12,
      backgroundRadius: 0,
    });

    // ColorPicker state management methods
    this.updateColorPickerButtonColor = action((buttonType, color) => {
      this.colorPickerState.buttonColors[buttonType] = color;
    });

    this.updateColorPickerOpacity = action((buttonType, opacity) => {
      this.colorPickerState.opacities[buttonType] = opacity;
    });

    this.updateColorPickerShadowSettings = action(settings => {
      Object.assign(this.colorPickerState.shadowSettings, settings);
    });

    this.updateColorPickerStrokeWidth = action(width => {
      this.colorPickerState.strokeWidth = width;
    });

    this.updateColorPickerBackgroundRadius = action(radius => {
      this.colorPickerState.backgroundRadius = radius;
    });

    // Add method for toggling punctuation
    this.togglePunctuation = action(value => {
      runInAction(() => {
        this.subtitlesPanelState.isPunctuationEnabled = value;
        const subtitles = this.editorElements.filter(
          el => el.subType === 'subtitles'
        );

        if (subtitles.length > 0) {
          subtitles.forEach(subtitle => {
            // Save original text on first run
            if (!subtitle.properties.originalText) {
              subtitle.properties.originalText = subtitle.properties.text;
            }

            if (value === false) {
              // Hide punctuation
              subtitle.properties.text = (
                subtitle.properties.originalText || subtitle.properties.text
              )
                .replaceAll('.', '')
                .replaceAll(',', '');

              if (subtitle.properties.words) {
                subtitle.properties.words = subtitle.properties.words.map(
                  word => {
                    if (!word.originalWord) {
                      word.originalWord = word.word;
                    }
                    return {
                      ...word,
                      word: (word.originalWord || word.word)
                        .replaceAll('.', '')
                        .replaceAll(',', ''),
                    };
                  }
                );
              }
            } else {
              subtitle.properties.text =
                subtitle.properties.originalText || subtitle.properties.text;

              if (subtitle.properties.words) {
                subtitle.properties.words = subtitle.properties.words.map(
                  word => ({
                    ...word,
                    word: word.originalWord || word.word,
                  })
                );
              }
            }
          });

          this.refreshElements();
        }
      });
    });

    // Add method for changing word spacing
    this.setWordSpacing = action(async value => {
      runInAction(() => {
        this.subtitlesPanelState.wordSpacingFactor = value;

        // Store current time and state
        const currentTime = this.currentTimeInMs;
        const wasPlaying = this.playing;

        // Pause playback during update
        if (wasPlaying) {
          this.setPlaying(false);
        }

        // Clear all existing word animations
        this.animations = this.animations.filter(
          a => a.type !== 'textWordAnimation'
        );

        // Clear animation timeline
        if (this.animationTimeLine) {
          anime.remove(this.animationTimeLine);
          this.animationTimeLine = anime.timeline({
            duration: this.maxTime,
            autoplay: false,
          });
        }

        // Update all subtitle elements
        this.editorElements.forEach(element => {
          if (element.type === 'text' && element.subType === 'subtitles') {
            // Remove all existing word objects
            if (element.properties.wordObjects?.length > 0) {
              element.properties.wordObjects.forEach(obj => {
                if (obj && this.canvas?.contains(obj)) {
                  this.canvas.remove(obj);
                }
              });
              element.properties.wordObjects = [];
            }

            // Show the main text object temporarily
            if (element.fabricObject) {
              element.fabricObject.set('opacity', 1);
            }
          }
        });

        // Force a canvas render
        this.canvas.requestRenderAll();

        // Use requestAnimationFrame for the next phase
        requestAnimationFrame(() => {
          // Now reinitialize all word objects and animations
          this.editorElements.forEach(element => {
            if (element.type === 'text' && element.subType === 'subtitles') {
              if (element.fabricObject) {
                // Reinitialize word animations
                this.initializeWordAnimations(element);

                // Add new animation
                this.animations.push({
                  id: `${element.id}-word-animation`,
                  targetId: element.id,
                  type: 'textWordAnimation',
                  effect: 'in',
                  duration: 500,
                  properties: {},
                });
              }
            }
          });

          // Use another frame for final updates
          requestAnimationFrame(() => {
            // Refresh animations
            this.refreshAnimations();

            // Seek to current time
            this.animationTimeLine.seek(currentTime);

            // Update visibility states
            this.editorElements.forEach(element => {
              if (element.type === 'text' && element.subType === 'subtitles') {
                const isInside =
                  element.timeFrame.start <= currentTime &&
                  currentTime <= element.timeFrame.end;

                // Update main text object visibility
                if (element.fabricObject) {
                  element.fabricObject.set('opacity', 0);
                }

                // Update word objects visibility
                if (element.properties.wordObjects) {
                  element.properties.wordObjects.forEach((wordObj, index) => {
                    if (wordObj && element.properties.words?.[index]) {
                      const word = element.properties.words[index];
                      const wordIsInside =
                        isInside &&
                        word.start <= currentTime &&
                        currentTime <= word.end;
                      wordObj.set('visible', wordIsInside);
                    }
                  });
                }
              }
            });

            // Final render
            this.canvas.requestRenderAll();

            // Restore playback if needed
            if (wasPlaying) {
              setTimeout(() => {
                this.setPlaying(true);
              }, 100);
            }
          });
        });
      });
    });

    // Add method for changing letter spacing
    this.setLetterSpacing = action(async value => {
      runInAction(() => {
        this.subtitlesPanelState.letterSpacingFactor = value;

        // Store current time and state
        const currentTime = this.currentTimeInMs;
        const wasPlaying = this.playing;

        // Pause playback during update
        if (wasPlaying) {
          this.setPlaying(false);
        }

        // Clear all existing word animations
        this.animations = this.animations.filter(
          a => a.type !== 'textWordAnimation'
        );

        // Clear animation timeline
        if (this.animationTimeLine) {
          anime.remove(this.animationTimeLine);
          this.animationTimeLine = anime.timeline({
            duration: this.maxTime,
            autoplay: false,
          });
        }

        // Update all subtitle elements
        this.editorElements.forEach(element => {
          if (element.type === 'text' && element.subType === 'subtitles') {
            // Remove all existing word objects
            if (element.properties.wordObjects?.length > 0) {
              element.properties.wordObjects.forEach(obj => {
                if (obj && this.canvas?.contains(obj)) {
                  this.canvas.remove(obj);
                }
              });
              element.properties.wordObjects = [];
            }

            // Show the main text object temporarily
            if (element.fabricObject) {
              element.fabricObject.set('opacity', 1);
            }
          }
        });

        // Force a canvas render
        this.canvas.requestRenderAll();

        // Use requestAnimationFrame for the next phase
        requestAnimationFrame(() => {
          // Now reinitialize
          this.editorElements.forEach(element => {
            if (element.type === 'text' && element.subType === 'subtitles') {
              if (element.fabricObject) {
                // Reinitialize word animations
                this.initializeWordAnimations(element);

                // Add new animation
                this.animations.push({
                  id: `${element.id}-word-animation`,
                  targetId: element.id,
                  type: 'textWordAnimation',
                  effect: 'in',
                  duration: 500,
                  properties: {},
                });
              }
            }
          });

          // Use another frame for final updates
          requestAnimationFrame(() => {
            // Refresh animations once for all elements
            this.refreshAnimations();

            // Seek to current time to update visibility
            this.animationTimeLine.seek(currentTime);

            // Update visibility of all word objects
            this.editorElements.forEach(element => {
              if (element.type === 'text' && element.subType === 'subtitles') {
                const isInside =
                  element.timeFrame.start <= currentTime &&
                  currentTime <= element.timeFrame.end;

                if (element.properties.wordObjects) {
                  element.properties.wordObjects.forEach((wordObj, index) => {
                    if (wordObj) {
                      const word = element.properties.words[index];
                      const wordIsInside =
                        isInside &&
                        word.start <= currentTime &&
                        currentTime <= word.end;
                      wordObj.set('visible', wordIsInside);
                    }
                  });
                }
              }
            });

            // Final render
            this.canvas.requestRenderAll();

            // Restore playback if needed
            if (wasPlaying) {
              setTimeout(() => {
                this.setPlaying(true);
              }, 100);
            }
          });
        });
      });
    });

    // Add method for changing line height
    this.setLineHeight = action(async value => {
      runInAction(() => {
        this.subtitlesPanelState.lineHeightFactor = value;

        // Store current time and state
        const currentTime = this.currentTimeInMs;
        const wasPlaying = this.playing;

        // Pause playback during update
        if (wasPlaying) {
          this.setPlaying(false);
        }

        // Clear all existing word animations
        this.animations = this.animations.filter(
          a => a.type !== 'textWordAnimation'
        );

        // Clear animation timeline
        if (this.animationTimeLine) {
          anime.remove(this.animationTimeLine);
          this.animationTimeLine = anime.timeline({
            duration: this.maxTime,
            autoplay: false,
          });
        }

        // Update all subtitle elements
        this.editorElements.forEach(element => {
          if (element.type === 'text' && element.subType === 'subtitles') {
            // Remove all existing word objects
            if (element.properties.wordObjects?.length > 0) {
              element.properties.wordObjects.forEach(obj => {
                if (obj && this.canvas?.contains(obj)) {
                  this.canvas.remove(obj);
                }
              });
              element.properties.wordObjects = [];
            }

            // Show the main text object temporarily
            if (element.fabricObject) {
              element.fabricObject.set('opacity', 1);
            }
          }
        });

        // Force a canvas render
        this.canvas.requestRenderAll();

        // Use requestAnimationFrame for the next phase
        requestAnimationFrame(() => {
          // Now reinitialize
          this.editorElements.forEach(element => {
            if (element.type === 'text' && element.subType === 'subtitles') {
              if (element.fabricObject) {
                // Reinitialize word animations
                this.initializeWordAnimations(element);

                // Add new animation
                this.animations.push({
                  id: `${element.id}-word-animation`,
                  targetId: element.id,
                  type: 'textWordAnimation',
                  effect: 'in',
                  duration: 500,
                  properties: {},
                });
              }
            }
          });

          // Use another frame for final updates
          requestAnimationFrame(() => {
            // Refresh animations once for all elements
            this.refreshAnimations();

            // Seek to current time to update visibility
            this.animationTimeLine.seek(currentTime);

            // Update visibility of all word objects
            this.editorElements.forEach(element => {
              if (element.type === 'text' && element.subType === 'subtitles') {
                const isInside =
                  element.timeFrame.start <= currentTime &&
                  currentTime <= element.timeFrame.end;

                if (element.properties.wordObjects) {
                  element.properties.wordObjects.forEach((wordObj, index) => {
                    if (wordObj) {
                      const word = element.properties.words[index];
                      const wordIsInside =
                        isInside &&
                        word.start <= currentTime &&
                        currentTime <= word.end;
                      wordObj.set('visible', wordIsInside);
                    }
                  });
                }
              }
            });

            // Final render
            this.canvas.requestRenderAll();

            // Restore playback if needed
            if (wasPlaying) {
              setTimeout(() => {
                this.setPlaying(true);
              }, 100);
            }
          });
        });
      });
    });

    // Add method for changing text case
    this.setTextCase = action(async value => {
      runInAction(() => {
        this.subtitlesPanelState.textCase = value;

        // Apply text case to all subtitle elements
        const subtitles = this.editorElements.filter(
          el => el.subType === 'subtitles'
        );

        if (subtitles.length > 0) {
          subtitles.forEach(subtitle => {
            // Store original text if not already stored
            if (!subtitle.properties.originalText) {
              subtitle.properties.originalText = subtitle.properties.text;
            }

            // Apply text case transformation
            let transformedText = subtitle.properties.originalText;

            switch (value) {
              case 'uppercase':
                transformedText = transformedText.toUpperCase();
                break;
              case 'lowercase':
                transformedText = transformedText.toLowerCase();
                break;
              case 'capitalize':
                transformedText = transformedText.replace(/\b\w/g, char =>
                  char.toUpperCase()
                );
                break;
              case 'none':
              default:
                transformedText = subtitle.properties.originalText;
                break;
            }

            subtitle.properties.text = transformedText;

            // Apply the same transformation to word objects if they exist
            if (subtitle.properties.words) {
              subtitle.properties.words = subtitle.properties.words.map(
                word => {
                  if (!word.originalWord) {
                    word.originalWord = word.word;
                  }

                  let transformedWord = word.originalWord;

                  switch (value) {
                    case 'uppercase':
                      transformedWord = transformedWord.toUpperCase();
                      break;
                    case 'lowercase':
                      transformedWord = transformedWord.toLowerCase();
                      break;
                    case 'capitalize':
                      transformedWord = transformedWord.replace(/\b\w/g, char =>
                        char.toUpperCase()
                      );
                      break;
                    case 'none':
                    default:
                      transformedWord = word.originalWord;
                      break;
                  }

                  return {
                    ...word,
                    word: transformedWord,
                  };
                }
              );
            }
          });

          // Refresh the canvas to show changes
          this.refreshElements();
        }
      });
    });

    // Ghost System for Timeline Elements
    this.ghostState = observable({
      isDragging: false,
      ghostElement: null,
      ghostMarkerPosition: null,
      draggedElement: null,
      alignmentLines: [],
      snapThreshold: 20, // increased threshold to reduce excessive snapping
      lastAlignmentUpdate: 0, // for throttling alignment updates
      lastHoverCheck: 0, // for throttling hover checks
      isIncompatibleRow: false, // indicates if current row is incompatible
      initialClickOffset: 0, // store initial click offset within element
      initialClientX: null, // store initial mouse X coordinate
      initialElementStart: 0, // store initial element start position
      // Resize ghost state
      isResizing: false,
      resizeType: null, // 'start' | 'end'
      resizeGhostElement: null,
      // Multi-select ghost state
      isMultiDragging: false,
      multiGhostElements: [], // array of ghost elements for multi-select
      selectedElements: [], // store selected elements for multi-drag
      initialElementStarts: [], // store initial start positions for each selected element
      // Push logic state
      livePushOffsets: new Map(), // Map<elementId, pushOffsetInMs> - live push offsets during drag
      enablePushOnDrag: true, // enable/disable push functionality
      // Gallery ghost state
      isGalleryDragging: false, // indicates if dragging from gallery
      galleryGhostElement: null, // ghost element for gallery items
      galleryItemData: null, // data of the item being dragged from gallery
      // File ghost state
      isFileDragging: false, // indicates if dragging files from PC
      fileGhostElement: null, // ghost element for file drops
      fileData: null, // data of the file being dragged
      // Row reordering state
      isDraggingRow: false, // indicates if dragging rows for reordering
      draggedRowIndex: null, // index of the row being dragged
      dragOverRowIndex: null, // index of the row being hovered over
    });

    makeAutoObservable(this, {
      dragState: false,
      moveState: false,
      history: false,
      currentHistoryIndex: false,
      isUndoRedoOperation: false,
      isInitializing: false,
      debouncedSaveToHistory: false,
      isSplitting: true,
      lastElementEnd: true,
      isResizing: true,
    });

    // Add methods for custom origin point selection
    this.startOriginSelection = (element, callback) => {
      // Validate element and canvas
      if (!element || !element.fabricObject || !this.canvas) {
        console.error(
          'Cannot start origin selection: Invalid element, missing fabricObject, or no canvas'
        );
        return;
      }

      // If already selecting, clean up first
      if (this.isSelectingOrigin) {
        this.cleanupOriginSelection();
      }

      this.isSelectingOrigin = true;
      this.originSelectionElement = element;
      this.originSelectionCallback = callback;

      // Disable selection for all objects except the marker
      this.canvas.getObjects().forEach(obj => {
        if (obj !== this.originMarker) {
          obj.selectable = false;
          obj.evented = false;
        }
      });

      // Calculate initial position based on element's center or existing custom origin
      let initialPosition = {
        x:
          element.fabricObject.left +
          (element.fabricObject.width * element.fabricObject.scaleX) / 2,
        y:
          element.fabricObject.top +
          (element.fabricObject.height * element.fabricObject.scaleY) / 2,
      };

      // If there's an existing custom origin, use its position
      if (element.properties?.origin?.type === 'custom') {
        initialPosition = {
          x: element.properties.origin.absoluteX,
          y: element.properties.origin.absoluteY,
        };
      }

      // Create origin marker at initial position if it doesn't exist
      if (!this.originMarker) {
        this.originMarker = new fabric.Group(
          [
            new fabric.Circle({
              radius: 48,
              fill: 'rgba(33, 150, 243, 0.2)',
              stroke: '#2196F3',
              strokeWidth: 2,
              originX: 'center',
              originY: 'center',
            }),
            new fabric.Circle({
              radius: 36,
              fill: '#2196F3',
              originX: 'center',
              originY: 'center',
            }),
            new fabric.Line([-36, 0, 36, 0], {
              stroke: '#2196F3',
              strokeWidth: 2,
              originX: 'center',
              originY: 'center',
            }),
            new fabric.Line([0, -36, 0, 36], {
              stroke: '#2196F3',
              strokeWidth: 2,
              originX: 'center',
              originY: 'center',
            }),
          ],
          {
            left: initialPosition.x,
            top: initialPosition.y,
            selectable: true,
            evented: true,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            lockRotation: true,
          }
        );

        // Add moving handler to update marker position during drag
        this.originMarker.on('moving', () => {
          const marker = this.originMarker;
          const markerRadius = 48;

          // Get canvas dimensions
          const canvasWidth = this.canvas.width;
          const canvasHeight = this.canvas.height;

          // Calculate bounds
          let left = marker.left;
          let top = marker.top;

          // Constrain horizontal movement
          if (left < markerRadius) {
            left = markerRadius;
          } else if (left > canvasWidth - markerRadius) {
            left = canvasWidth - markerRadius;
          }

          // Constrain vertical movement
          if (top < markerRadius) {
            top = markerRadius;
          } else if (top > canvasHeight - markerRadius) {
            top = canvasHeight - markerRadius;
          }

          // Update position
          marker.set({
            left: left,
            top: top,
          });

          this.canvas.requestRenderAll();
        });

        // Add modified handler for after drag
        this.originMarker.on('modified', () => {
          const marker = this.originMarker;
          const markerRadius = 48;

          // Get canvas dimensions
          const canvasWidth = this.canvas.width;
          const canvasHeight = this.canvas.height;

          // Constrain position
          let left = Math.min(
            Math.max(marker.left, markerRadius),
            canvasWidth - markerRadius
          );
          let top = Math.min(
            Math.max(marker.top, markerRadius),
            canvasHeight - markerRadius
          );

          const currentPosition = {
            x: left,
            y: top,
          };

          const fabricObject = element.fabricObject;
          const elementLeft = fabricObject.left;
          const elementTop = fabricObject.top;
          const elementWidth = fabricObject.width * fabricObject.scaleX;
          const elementHeight = fabricObject.height * fabricObject.scaleY;

          const relativeX =
            ((currentPosition.x - elementLeft) / elementWidth) * 100;
          const relativeY =
            ((currentPosition.y - elementTop) / elementHeight) * 100;

          const customOrigin = {
            type: 'custom',
            x: Math.max(0, Math.min(100, relativeX)),
            y: Math.max(0, Math.min(100, relativeY)),
            absoluteX: currentPosition.x,
            absoluteY: currentPosition.y,
          };

          // Update marker position
          marker.set({
            left: currentPosition.x,
            top: currentPosition.y,
          });

          // Save the current position to the element's properties
          if (element.properties) {
            element.properties.origin = customOrigin;
          }

          if (this.originSelectionCallback) {
            this.originSelectionCallback(customOrigin);
          }
        });

        // Add mouseup handler to ensure position is saved
        this.originMarker.on('mouseup', () => {
          const marker = this.originMarker;
          const markerRadius = 48;

          // Get canvas dimensions
          const canvasWidth = this.canvas.width;
          const canvasHeight = this.canvas.height;

          // Constrain position
          let left = Math.min(
            Math.max(marker.left, markerRadius),
            canvasWidth - markerRadius
          );
          let top = Math.min(
            Math.max(marker.top, markerRadius),
            canvasHeight - markerRadius
          );

          // Update marker position
          marker.set({
            left: left,
            top: top,
          });

          this.canvas.requestRenderAll();
        });

        // Add the marker to canvas
        this.canvas.add(this.originMarker);
        this.canvas.setActiveObject(this.originMarker);
      } else {
        // If marker exists, move it to the initial position
        this.originMarker.set({
          left: initialPosition.x,
          top: initialPosition.y,
        });
        this.canvas.setActiveObject(this.originMarker);
      }

      this.canvas.requestRenderAll();
    };

    this.cleanupOriginSelection = () => {
      // Reset state
      this.isSelectingOrigin = false;
      this.originSelectionElement = null;
      this.originSelectionCallback = null;

      // Re-enable selection for all objects
      if (this.canvas) {
        this.canvas.getObjects().forEach(obj => {
          obj.selectable = true;
          obj.evented = true;
        });
        this.canvas.requestRenderAll();
      }

      // Remove origin marker only if it exists and we're not in the middle of a selection
      if (this.originMarker && !this.isSelectingOrigin) {
        this.canvas.remove(this.originMarker);
        this.canvas.renderAll();
        this.originMarker = null;
      }
    };

    this.cancelOriginSelection = () => {
      this.cleanupOriginSelection();
    };

    this.handleOriginSelection = event => {
      if (
        !this.isSelectingOrigin ||
        !this.originSelectionElement ||
        !this.originSelectionCallback ||
        !this.originMarker ||
        !this.canvas
      )
        return;

      // Only handle direct clicks, not drag events
      if (this.originMarker.dragging) return;

      const markerRadius = 48;
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      // Get pointer coordinates
      let left = event.e.offsetX;
      let top = event.e.offsetY;

      // Constrain horizontal movement
      if (left < markerRadius) {
        left = markerRadius;
      } else if (left > canvasWidth - markerRadius) {
        left = canvasWidth - markerRadius;
      }

      // Constrain vertical movement
      if (top < markerRadius) {
        top = markerRadius;
      } else if (top > canvasHeight - markerRadius) {
        top = canvasHeight - markerRadius;
      }

      const element = this.originSelectionElement;
      const fabricObject = element.fabricObject;

      if (!fabricObject) return;

      // Calculate relative position within the element
      const elementLeft = fabricObject.left;
      const elementTop = fabricObject.top;
      const elementWidth = fabricObject.width * fabricObject.scaleX;
      const elementHeight = fabricObject.height * fabricObject.scaleY;

      // Convert pointer coordinates to percentages relative to the element
      const relativeX = ((left - elementLeft) / elementWidth) * 100;
      const relativeY = ((top - elementTop) / elementHeight) * 100;

      // Create custom origin point object
      const customOrigin = {
        type: 'custom',
        x: Math.max(0, Math.min(100, relativeX)),
        y: Math.max(0, Math.min(100, relativeY)),
        absoluteX: left,
        absoluteY: top,
      };

      // Update marker position
      this.originMarker.set({
        left: left,
        top: top,
      });

      // Call the callback
      this.originSelectionCallback(customOrigin);

      this.canvas.requestRenderAll();
    };

    this.eyeCursor = null;

    this.isInitializationInProgress = false;
    this.isRecording = false;
  }

  refreshAnimations() {
    refreshAnimationsUtil(this);
  }

  setVolume(value, internal = false) {
    this.volume = value;

    // Only update audio elements if not an internal volume change
    if (!internal) {
      this.editorElements.forEach(element => {
        if (element.type === 'audio') {
          // Update the element's properties.volume in the store
          // Convert from 0-0.5 global range to 0-2 audio range (for 0-200% display)
          element.properties.volume = value * 2;

          // Also update the DOM audio element (keep original range 0-1)
          const audio = document.getElementById(element.properties.elementId);
          if (audio) {
            audio.volume = Math.min(value, 1); // Clamp to 1 for DOM
          }
        }
      });

      // Dispatch event to notify UI about global volume change
      window.dispatchEvent(
        new CustomEvent('globalVolumeChanged', {
          detail: { volume: value },
        })
      );
    }
  }

  // Set individual element volume
  setElementVolume(elementId, volume) {
    const element = this.editorElements.find(el => el.id === elementId);
    if (element && element.type === 'audio') {
      // Update element's properties
      if (!element.properties) {
        element.properties = {};
      }
      element.properties.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0-1

      // Update the actual audio element in DOM
      const audio = document.getElementById(element.properties.elementId);
      if (audio) {
        // Calculate final volume as element volume * global volume
        const finalVolume = element.properties.volume * this.volume;
        audio.volume = Math.max(0, Math.min(1, finalVolume));
      }

      // Update selected element if it's the same element
      if (this.selectedElement?.id === elementId) {
        this.selectedElement.properties = {
          ...this.selectedElement.properties,
          volume,
        };
      }

      // Trigger save if the global save function exists
      if (window.dispatchSaveTimelineState) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  // Set volume for multiple elements
  setElementsVolume(elementIds, volume) {
    if (!Array.isArray(elementIds) || elementIds.length === 0) {
      return;
    }

    elementIds.forEach(elementId => {
      this.setElementVolume(elementId, volume);
    });
  }

  // Add computed property
  get lastElementEnd() {
    const lastElement = this.editorElements
      .slice()
      .sort((a, b) => b.timeFrame.end - a.timeFrame.end)[0];
    return lastElement ? lastElement.timeFrame.end : 0;
  }

  async setPlaybackRate(value) {
    const wasPlaying = this.playing;
    const currentTime = this.currentTimeInMs;

    if (wasPlaying) {
      this.setPlaying(false);
    }

    this.playbackRate = value;

    // Update all video and audio elements with new playback rate
    this.videos.forEach(video => {
      if (video.element) {
        video.element.playbackRate = value;
      }
    });
    // Import audio processor dynamically to avoid circular dependencies
    const audioProcessor = (await import('../utils/audioProcessor')).default;

    // Update audio elements with pitch preservation if supported
    if (audioProcessor.isSupported()) {
      try {
        // Update store audio elements
        for (const audio of this.audios) {
          if (audio.element) {
            await audioProcessor.updateAudioPlaybackRate(audio.element, value);
          }
        }

        // Update editor audio elements
        for (const element of this.editorElements) {
          if (element.type === 'audio') {
            const audio = document.getElementById(element.properties.elementId);
            if (audio) {
              await audioProcessor.updateAudioPlaybackRate(audio, value);
            }
          }
        }
      } catch (error) {
        handleCatchError(
          error,
          'Web Audio API error, falling back to HTML5',
          false
        );
        // Fallback to standard HTML5 audio
        this.audios.forEach(audio => {
          if (audio.element) {
            audio.element.playbackRate = value;
          }
        });

        this.editorElements.forEach(element => {
          if (element.type === 'audio') {
            const audio = document.getElementById(element.properties.elementId);
            if (audio) {
              audio.playbackRate = value;
            }
          }
        });
      }
    } else {
      // Fallback to standard HTML5 audio
      this.audios.forEach(audio => {
        if (audio.element) {
          audio.element.playbackRate = value;
        }
      });

      this.editorElements.forEach(element => {
        if (element.type === 'audio') {
          const audio = document.getElementById(element.properties.elementId);
          if (audio) {
            audio.playbackRate = value;
          }
        }
      });
    }

    // Update video elements (keep standard playback for videos)
    this.editorElements.forEach(element => {
      if (element.type === 'video') {
        const video = document.getElementById(element.properties.elementId);
        if (video && isHtmlVideoElement(video)) {
          video.playbackRate = value;
        }
      }
    });

    // Resume playback with reduced delay for better responsiveness
    if (wasPlaying) {
      // Use a shorter delay for higher playback rates to reduce stuttering
      const resumeDelay = value >= 1.5 ? 50 : 100;
      setTimeout(() => {
        this.setPlaying(true);
      }, resumeDelay);
    }
  }

  cleanup() {
    // First, stop all media playback
    this.setPlaying(false);

    // Force pause all video and audio elements
    if (this.editorElements) {
      this.editorElements.forEach(element => {
        if (element.type === 'video') {
          const video = document.getElementById(element.properties?.elementId);
          if (video && !video.paused) {
            video.pause();
            // Keep user's progress - don't reset time
          }
        } else if (element.type === 'audio') {
          const audio = document.getElementById(element.properties?.elementId);
          if (audio) {
            audio.pause();
            // Keep user's progress - don't reset time
          }
        }
      });
    }

    // Clear canvas and reset state
    this.canvas?.clear();
    this.canvas = null;
    this.guideline = null;
    this.videos = [];
    this.images = [];
    this.audios = [];
    this.editorElements = [];
    this.backgroundColor = '#111111';
    this.maxTime = 0; // Will be set dynamically based on content
    this.playing = false;
    this.currentKeyFrame = 0;
    this.selectedElement = null;
    this.selectedElements = null;
    this.animations = [];
    this.animationTimeLine = anime.timeline();
    this.selectedMenuOption = 'Export';
    this.maxRows = 4;
    this.isDragging = false;
    this.draggedItem = null;
    this.ghostElement = null;
    this.ghostMarkerPosition = null;
    this.dragInfo = null;
    this.lastPosition = null;
    this.lastUpdateTime = 0;
    this.history = [];
    this.currentHistoryIndex = -1;
    this.isUndoRedoOperation = false;
  }

  async cleanupImages() {
    // Filter out only imageUrl elements with pointId, keeping all other elements
    this.editorElements = this.editorElements.filter(
      element => !(element.type === 'imageUrl' && element.pointId)
    );
  }

  setMaxRows(newMaxRows) {
    this.maxRows = Math.max(this.maxRows, newMaxRows);
  }

  get availableRows() {
    return this.maxRows;
  }

  getElementsInRow(row) {
    return this.editorElements.filter(element => element.row === row);
  }

  get currentTimeInMs() {
    return (this.currentKeyFrame * 1000) / this.fps;
  }

  setCurrentTimeInMs(time) {
    this.currentKeyFrame = Math.floor((time / 1000) * this.fps);
  }

  setCurrentKeyFrame(keyFrame) {
    this.currentKeyFrame = keyFrame;
  }

  setSelectedMenuOption(selectedMenuOption) {
    this.selectedMenuOption = selectedMenuOption;
  }

  setStoryId(id) {
    this.storyId = id;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    if (canvas) {
      canvas.backgroundColor = this.backgroundColor;
      // Initialize GL Transition Renderer
      this.initGLTransitionRenderer();
    }
  }

  initGLTransitionRenderer() {
    if (!this.canvas) return;

    try {
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      this.glTransitionRenderer = new GLTransitionRenderer(
        canvasWidth,
        canvasHeight
      );
    } catch (error) {
      handleCatchError(
        error,
        'Failed to initialize GL Transition Renderer',
        false
      );
      this.glTransitionRenderer = null;
    }
  }

  setBackgroundColor(backgroundColor) {
    this.backgroundColor = backgroundColor;
    if (this.canvas) {
      this.canvas.backgroundColor = backgroundColor;
    }
  }

  // GL Transition methods
  async addGLTransition(
    fromElementId,
    toElementId,
    transitionType,
    duration = 1000
  ) {
    if (!this.glTransitionRenderer) {
      console.error('GL Transition Renderer not initialized');
      return false;
    }

    const fromElement = this.editorElements.find(el => el.id === fromElementId);
    const toElement = this.editorElements.find(el => el.id === toElementId);

    if (!fromElement || !toElement) {
      console.error('Source or target element not found for GL transition');
      return false;
    }

    // Ensure both elements are visual elements (images or videos)
    if (
      !isEditorVisualElement(fromElement) ||
      !isEditorVisualElement(toElement)
    ) {
      console.error('GL transitions only support image and video elements');
      return false;
    }

    try {
      // Get media sources - for images use properties.src, for videos use video element
      const getMediaSource = element => {
        if (isEditorVideoElement(element)) {
          // For video elements, we need to capture frame from video element
          const videoElement = document.getElementById(
            element.properties?.elementId
          );
          if (
            videoElement &&
            videoElement.videoWidth &&
            videoElement.videoHeight
          ) {
            // Create a canvas to capture the current frame
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);
            return canvas.toDataURL('image/png');
          }
          // Fallback to properties if video element not available
          return element.properties?.src || element.src || element.url;
        } else {
          // For image elements, use the stored source
          return element.properties?.src || element.src || element.url;
        }
      };

      const fromMediaSrc = getMediaSource(fromElement);
      const toMediaSrc = getMediaSource(toElement);

      if (!fromMediaSrc || !toMediaSrc) {
        console.error('Media sources not found:', { fromMediaSrc, toMediaSrc });
        return false;
      }

      // Create a dedicated renderer for this transition
      // For video elements, use their actual dimensions; for images use canvas size
      let rendererWidth, rendererHeight;

      if (
        isEditorVideoElement(fromElement) ||
        isEditorVideoElement(toElement)
      ) {
        const videoElement = isEditorVideoElement(fromElement)
          ? fromElement
          : toElement;
        const placement = videoElement.placement;

        // Use the video's actual rendered dimensions
        rendererWidth = placement?.width || this.canvas.width;
        rendererHeight = placement?.height || this.canvas.height;
      } else {
        // For image elements, use union bounding box of the two elements to avoid covering whole canvas
        const fromFo = fromElement.fabricObject;
        const toFo = toElement.fabricObject;
        const fromRect = fromFo ? fromFo.getBoundingRect(true, true) : null;
        const toRect = toFo ? toFo.getBoundingRect(true, true) : null;
        if (fromRect && toRect) {
          const left = Math.min(fromRect.left, toRect.left);
          const top = Math.min(fromRect.top, toRect.top);
          const right = Math.max(
            fromRect.left + fromRect.width,
            toRect.left + toRect.width
          );
          const bottom = Math.max(
            fromRect.top + fromRect.height,
            toRect.top + toRect.height
          );
          rendererWidth = Math.max(1, Math.round(right - left));
          rendererHeight = Math.max(1, Math.round(bottom - top));
        } else {
          rendererWidth = this.canvas.width;
          rendererHeight = this.canvas.height;
        }
      }

      const transitionRenderer = new GLTransitionRenderer(
        rendererWidth,
        rendererHeight
      );

      // Load transition with dedicated renderer
      const success = await transitionRenderer.loadTransition(
        transitionType,
        fromMediaSrc,
        toMediaSrc
      );

      if (!success) {
        console.error('Failed to load GL transition');
        return false;
      }

      // Create transition animation with proper constraints
      const transitionId = getUid();
      const minDuration = 100; // Minimum 100ms
      const actualDuration = Math.max(duration, minDuration);

      // For GL transitions, preserve the exact duration without proportional scaling
      // Calculate start and end times to center the transition in the gap
      const gapStart = fromElement.timeFrame.end;
      const gapEnd = toElement.timeFrame.start;
      const gapDuration = gapEnd - gapStart;

      let startTime, endTime;

      if (gapDuration === 0) {
        // When gap is 0 (adjacent elements), position transition with 60% on first element, 40% on second
        // This creates a more natural visual flow
        const transitionPoint = gapStart; // This is both end of first and start of second element
        const beforeRatio = 0.6; // 60% before the transition point
        const afterRatio = 0.4; // 40% after the transition point
        startTime = transitionPoint - actualDuration * beforeRatio;
        endTime = transitionPoint + actualDuration * afterRatio;
      } else if (gapDuration >= actualDuration) {
        // Center the transition in the gap
        const gapCenter = gapStart + gapDuration / 2;
        startTime = gapCenter - actualDuration / 2;
        endTime = gapCenter + actualDuration / 2;
      } else {
        // Gap is smaller than requested duration but > 0, center in available gap
        const gapCenter = gapStart + gapDuration / 2;
        startTime = gapCenter - actualDuration / 2;
        endTime = gapCenter + actualDuration / 2;
      }

      // Use the requested duration directly for GL transitions (no proportional scaling)
      const finalDuration = actualDuration;

      // Create timeline element for the GL transition first to get row
      const animationRow = this.findAvailableRowForGLTransition(
        fromElement,
        toElement
      );

      const transitionAnimation = {
        id: transitionId,
        type: 'glTransition',
        fromElementId,
        toElementId,
        transitionType,
        duration: finalDuration,
        startTime,
        endTime,
        row: animationRow, // Add row to GL transition
        manuallyAdjusted: false, // New transitions start with auto-positioning
        targetIds: [fromElementId, toElementId], // Add targetIds for new system
        properties: {
          transitionType,
          duration: finalDuration,
          startTime,
          endTime,
        },
      };

      // Ensure proper initial state is saved for elements involved in transition
      // This is critical when GL transitions are added after regular animations
      if (fromElement.fabricObject && !fromElement.initialState) {
        fromElement.initialState = {
          scaleX: fromElement.fabricObject.scaleX,
          scaleY: fromElement.fabricObject.scaleY,
          left: fromElement.fabricObject.left,
          top: fromElement.fabricObject.top,
          opacity: fromElement.fabricObject.opacity,
        };
      }
      if (toElement.fabricObject && !toElement.initialState) {
        toElement.initialState = {
          scaleX: toElement.fabricObject.scaleX,
          scaleY: toElement.fabricObject.scaleY,
          left: toElement.fabricObject.left,
          top: toElement.fabricObject.top,
          opacity: toElement.fabricObject.opacity,
        };
      }

      // Add to animations
      this.animations.push(transitionAnimation);

      // Create timeline element for the GL transition - use already calculated row
      const timelineElement = {
        id: `animation-${transitionId}`,
        animationId: transitionId,
        type: 'animation',
        targetId: fromElementId, // Use fromElement as target for consistency
        fromElementId: fromElementId,
        toElementId: toElementId,
        targetIds: [fromElementId, toElementId], // Add targetIds for consistency
        row: animationRow,
        timeFrame: {
          start: startTime,
          end: endTime,
        },
        properties: {
          animationType: 'glTransition',
          transitionType: transitionType,
          displayName: `${transitionType} Transition`,
          originalAnimation: transitionAnimation,
          effectDirection: 'transition',
        },
        // Additional properties for compatibility
        absoluteStart: startTime,
        absoluteEnd: endTime,
        effectDirection: 'transition',
        displayName: `${transitionType} Transition`,
      };

      // Add timeline element to editorElements
      runInAction(() => {
        this.editorElements.push(timelineElement);
      });

      // Update maxRows if needed
      if (animationRow >= this.maxRows) {
        this.setMaxRows(animationRow + 1);
      }

      // Force immediate synchronization of timeline element with animation properties
      setTimeout(() => {
        runInAction(() => {
          const timelineEl = this.editorElements.find(
            el =>
              el.id === `animation-${transitionId}` && el.type === 'animation'
          );
          if (timelineEl) {
            timelineEl.timeFrame.start = startTime;
            timelineEl.timeFrame.end = endTime;
          }
        });
        // Trigger a refresh to ensure visual updates
        this.refreshAnimations();
      }, 10);

      // Create fabric image element for the transition
      const transitionCanvas = transitionRenderer.getCanvas();

      // For video elements, preserve their original placement dimensions
      // For image elements, use canvas scaling
      let transitionProperties;

      if (
        isEditorVideoElement(fromElement) ||
        isEditorVideoElement(toElement)
      ) {
        // Use the dimensions and placement from the primary video element
        const primaryElement = isEditorVideoElement(fromElement)
          ? fromElement
          : toElement;
        const placement = primaryElement.placement;

        transitionProperties = {
          left: placement?.x || 0,
          top: placement?.y || 0,
          width: placement?.width || transitionCanvas.width,
          height: placement?.height || transitionCanvas.height,
          scaleX: placement?.scaleX || 1,
          scaleY: placement?.scaleY || 1,
          selectable: false,
          evented: false,
          opacity: 0,
          originX: 'left',
          originY: 'top',
        };
      } else {
        // For image elements, position the transition over the union bounding box of the two objects
        const fromFo = fromElement.fabricObject;
        const toFo = toElement.fabricObject;
        const fromRect = fromFo ? fromFo.getBoundingRect(true, true) : null;
        const toRect = toFo ? toFo.getBoundingRect(true, true) : null;
        if (fromRect && toRect) {
          const left = Math.min(fromRect.left, toRect.left);
          const top = Math.min(fromRect.top, toRect.top);
          transitionProperties = {
            left: left,
            top: top,
            width: transitionCanvas.width,
            height: transitionCanvas.height,
            scaleX: 1,
            scaleY: 1,
            selectable: false,
            evented: false,
            opacity: 0,
            originX: 'left',
            originY: 'top',
          };
        } else {
          // Fallback to canvas sized placement
          const scaleX = this.canvas.width / transitionCanvas.width;
          const scaleY = this.canvas.height / transitionCanvas.height;
          transitionProperties = {
            left: 0,
            top: 0,
            scaleX: scaleX,
            scaleY: scaleY,
            selectable: false,
            evented: false,
            opacity: 0,
            originX: 'left',
            originY: 'top',
          };
        }
      }

      const transitionFabricImage = new fabric.Image(
        transitionCanvas,
        transitionProperties
      );

      // Add to canvas
      this.canvas.add(transitionFabricImage);

      // Move to front to ensure it's visible during transition
      this.canvas.bringToFront(transitionFabricImage);

      // Ensure proper z-order for all elements
      this.ensureElementsZOrder();

      // Store transition element with dedicated renderer
      this.glTransitionElements.set(transitionId, {
        animation: transitionAnimation,
        fabricObject: transitionFabricImage,
        renderer: transitionRenderer,
      });

      // Force update of GL transition state if it should be active at current time
      const currentTime = this.currentTimeInMs;
      const isTransitionActive =
        currentTime >= transitionAnimation.startTime &&
        currentTime <= transitionAnimation.endTime;

      if (isTransitionActive) {
        // Calculate and apply current progress
        const progress =
          (currentTime - transitionAnimation.startTime) /
          (transitionAnimation.endTime - transitionAnimation.startTime);
        const clampedProgress = Math.max(0, Math.min(1, progress));

        // Update transition immediately
        this.updateGLTransition(transitionId, clampedProgress).catch(error => {
          console.error(
            'Error updating GL transition during initialization:',
            error
          );
        });

        // Make sure transition element is visible
        transitionFabricImage.set('opacity', 1);

        // Hide original images involved in the transition, but only if not used by other active transitions
        if (fromElement && fromElement.fabricObject) {
          const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
            fromElement.id,
            currentTime,
            transitionId
          );
          // During GL transition, original elements should be hidden (inverse logic was causing the issue)
          fromElement.fabricObject.set('visible', false);
        }

        if (toElement && toElement.fabricObject) {
          const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
            toElement.id,
            currentTime,
            transitionId
          );
          // During GL transition, original elements should be hidden (inverse logic was causing the issue)
          toElement.fabricObject.set('visible', false);
        }

        // Force canvas render
        this.canvas.requestRenderAll();
      } else {
        // Make sure transition is hidden when not active
        transitionFabricImage.set('opacity', 0);

        // Ensure original images are visible when transition is not active
        if (fromElement && fromElement.fabricObject) {
          const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
            fromElement.id,
            currentTime
          );
          fromElement.fabricObject.set('visible', shouldBeVisible);
        }
        if (toElement && toElement.fabricObject) {
          const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
            toElement.id,
            currentTime
          );
          toElement.fabricObject.set('visible', shouldBeVisible);
        }
      }

      // Synchronize GL transition with existing animation system
      this.synchronizeGLTransitionState(transitionId);

      // Manage conflicts between overlapping GL transitions
      this.manageGLTransitionConflicts(this.currentTimeInMs);

      // Trigger Redux sync after adding GL transition
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }
      return transitionId;
    } catch (error) {
      console.error('Error creating GL transition:', error);
      return false;
    }
  }

  // Add dynamic GL transition (without fixed fromElementId/toElementId)
  async addDynamicGLTransition(
    transitionType,
    duration = 1000,
    targetRow = null
  ) {
    if (!this.glTransitionRenderer) {
      console.error('GL Transition Renderer not initialized');
      return false;
    }

    try {
      const transitionId = `gl-transition-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Determine animation row (either specified or find available row)
      const animationRow =
        targetRow !== null ? targetRow : this.findAvailableRow();

      // Calculate timing first
      const finalDuration = Math.max(100, duration);
      const startTime = 0; // Dynamic transitions start at timeline beginning
      const endTime = startTime + finalDuration;
      const transitionTimeFrame = { start: startTime, end: endTime };

      // Get dynamic targets based on row position and timing (elements on higher rows that intersect)
      const dynamicTargetIds = this.getDynamicTargetIds(
        animationRow,
        transitionTimeFrame
      );

      // For dynamic GL transitions, use first target as both from and to if only one target
      // Or use first two targets if multiple targets exist
      let fromElementId = dynamicTargetIds[0];
      let toElementId =
        dynamicTargetIds.length > 1 ? dynamicTargetIds[1] : dynamicTargetIds[0];

      // If no targets available, create placeholder transition
      if (dynamicTargetIds.length === 0) {
        console.warn('No target elements found for dynamic GL transition');
        fromElementId = null;
        toElementId = null;
      }

      // Use already calculated timing
      // finalDuration, startTime, endTime already calculated above

      // Create transition animation object
      const transitionAnimation = {
        id: transitionId,
        type: 'glTransition',
        fromElementId, // Legacy compatibility
        toElementId, // Legacy compatibility
        targetIds: dynamicTargetIds, // New dynamic targeting
        transitionType,
        duration: finalDuration,
        startTime,
        endTime,
        row: animationRow, // Store animation row
        properties: {
          absoluteStart: startTime,
          absoluteEnd: endTime,
        },
      };

      // Add to animations array
      this.animations.push(transitionAnimation);

      // Create timeline element for the GL transition
      const animationElement = {
        id: `animation-${transitionId}`,
        animationId: transitionId,
        type: 'animation',
        targetId: fromElementId, // Legacy compatibility
        targetIds: dynamicTargetIds, // Dynamic targeting
        fromElementId: fromElementId,
        toElementId: toElementId,
        row: animationRow,
        timeFrame: {
          start: startTime,
          end: endTime,
        },
      };

      this.editorElements.push(animationElement);

      // Initialize GL transition renderer if we have valid targets
      if (fromElementId && toElementId) {
        const fromElement = this.editorElements.find(
          el => el.id === fromElementId
        );
        const toElement = this.editorElements.find(el => el.id === toElementId);

        if (fromElement && toElement) {
          // Create GL transition with initial setup
          await this.setupGLTransitionRenderer(
            transitionId,
            fromElement,
            toElement,
            transitionType
          );
        }
      }

      // Trigger Redux sync
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }

      return transitionId;
    } catch (error) {
      console.error('Error creating dynamic GL transition:', error);
      return false;
    }
  }

  // Helper method to check if an element should be visible considering all active GL transitions
  shouldElementBeVisibleWithGLTransitions(
    elementId,
    currentTime,
    excludeTransitionId = null
  ) {
    const element = this.editorElements.find(el => el.id === elementId);
    if (!element || !element.fabricObject) {
      return false;
    }

    // Check if element is within its normal timeframe
    const isInTimeframe =
      currentTime >= element.timeFrame.start &&
      currentTime <= element.timeFrame.end;
    if (!isInTimeframe) {
      return false;
    }

    // Check if element is involved in any active GL transitions
    const activeTransitions = this.animations.filter(
      anim =>
        anim.type === 'glTransition' &&
        (excludeTransitionId ? anim.id !== excludeTransitionId : true) &&
        currentTime >= anim.startTime &&
        currentTime <= anim.endTime &&
        (anim.fromElementId === elementId || anim.toElementId === elementId)
    );

    // If element is involved in active transitions, it should be hidden
    return activeTransitions.length === 0;
  }

  // Helper method to get the highest priority GL transition for a given element
  getHighestPriorityGLTransition(elementId, currentTime) {
    const activeTransitions = this.animations.filter(
      anim =>
        anim.type === 'glTransition' &&
        currentTime >= anim.startTime &&
        currentTime <= anim.endTime &&
        (anim.fromElementId === elementId || anim.toElementId === elementId)
    );

    if (activeTransitions.length === 0) {
      return null;
    }

    // Sort by priority: later start time = higher priority (more recent)
    activeTransitions.sort((a, b) => b.startTime - a.startTime);
    return activeTransitions[0];
  }

  // Helper method to manage GL transition visibility conflicts
  manageGLTransitionConflicts(currentTime) {
    // Get all elements that are involved in multiple active GL transitions
    const elementTransitionMap = new Map();

    this.animations.forEach(anim => {
      if (
        anim.type === 'glTransition' &&
        currentTime >= anim.startTime &&
        currentTime <= anim.endTime
      ) {
        [anim.fromElementId, anim.toElementId].forEach(elementId => {
          if (!elementTransitionMap.has(elementId)) {
            elementTransitionMap.set(elementId, []);
          }
          elementTransitionMap.get(elementId).push(anim);
        });
      }
    });

    // For each element with multiple transitions, show only the highest priority one
    elementTransitionMap.forEach((transitions, elementId) => {
      if (transitions.length > 1) {
        // Sort by priority: later start time = higher priority
        transitions.sort((a, b) => b.startTime - a.startTime);
        const highestPriorityTransition = transitions[0];

        console.log(
          `Element ${elementId} has ${transitions.length} active transitions, showing: ${highestPriorityTransition.id}`
        );

        // Hide all transitions except the highest priority one
        transitions.forEach(transition => {
          const transitionElement = this.glTransitionElements.get(
            transition.id
          );
          if (transitionElement && transitionElement.fabricObject) {
            const shouldBeVisible =
              transition.id === highestPriorityTransition.id;
            transitionElement.fabricObject.set(
              'opacity',
              shouldBeVisible ? 1 : 0
            );
            console.log(
              `GL Transition ${transition.id} opacity: ${
                shouldBeVisible ? 1 : 0
              }`
            );
          }
        });
      }
    });
  }

  // Helper method to setup GL transition renderer
  async setupGLTransitionRenderer(
    transitionId,
    fromElement,
    toElement,
    transitionType
  ) {
    try {
      // Enforce renderer cap: evict least-recently-used inactive renderers
      if (this.glTransitionElements.size >= this.MAX_ACTIVE_GL_RENDERERS) {
        const candidates = Array.from(this.glTransitionElements.entries())
          .filter(([id, el]) => {
            const anim = this.animations.find(a => a.id === id);
            if (!anim || anim.type !== 'glTransition') return true; // orphaned
            const now = this.currentTimeInMs;
            const active = now >= anim.startTime && now <= anim.endTime;
            return !active;
          })
          .map(([id, el]) => ({ id, el }));
        if (candidates.length > 0) {
          const victim = candidates[0];
          if (victim.el.fabricObject && this.canvas) {
            this.canvas.remove(victim.el.fabricObject);
          }
          if (victim.el.renderer && victim.el.renderer.dispose) {
            victim.el.renderer.dispose();
          }
          this.glTransitionElements.delete(victim.id);
        }
      }
      // Remove existing renderer for this transition if it exists
      const existingTransition = this.glTransitionElements.get(transitionId);
      if (existingTransition) {
        if (existingTransition.fabricObject && this.canvas) {
          this.canvas.remove(existingTransition.fabricObject);
        }
        if (
          existingTransition.renderer &&
          existingTransition.renderer.dispose
        ) {
          existingTransition.renderer.dispose();
        }
        this.glTransitionElements.delete(transitionId);
      }

      // Get media sources - same as addGLTransition for consistency
      const getMediaSource = element => {
        if (isEditorVideoElement(element)) {
          const videoElement = document.getElementById(
            element.properties?.elementId
          );
          if (
            videoElement &&
            videoElement.videoWidth &&
            videoElement.videoHeight
          ) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);
            return canvas.toDataURL('image/png');
          }
          return element.properties?.src || element.src || element.url;
        } else {
          return element.properties?.src || element.src || element.url;
        }
      };

      const fromMediaSrc = getMediaSource(fromElement);
      const toMediaSrc = getMediaSource(toElement);

      if (!fromMediaSrc || !toMediaSrc) {
        console.error('Media sources not found:', { fromMediaSrc, toMediaSrc });
        return false;
      }

      // Create a dedicated renderer for this transition (same logic as addGLTransition)
      let rendererWidth, rendererHeight;

      if (
        isEditorVideoElement(fromElement) ||
        isEditorVideoElement(toElement)
      ) {
        const videoElement = isEditorVideoElement(fromElement)
          ? fromElement
          : toElement;
        const placement = videoElement.placement;
        rendererWidth = placement?.width || this.canvas.width;
        rendererHeight = placement?.height || this.canvas.height;
      } else {
        rendererWidth = this.canvas.width;
        rendererHeight = this.canvas.height;
      }

      const transitionRenderer = new GLTransitionRenderer(
        rendererWidth,
        rendererHeight
      );

      // Load transition with dedicated renderer
      const success = await transitionRenderer.loadTransition(
        transitionType,
        fromMediaSrc,
        toMediaSrc
      );

      if (!success) {
        console.error(
          'Failed to load GL transition in setupGLTransitionRenderer'
        );
        return false;
      }

      // Create fabric image element for the transition
      const transitionCanvas = transitionRenderer.getCanvas();
      let transitionProperties;

      if (
        isEditorVideoElement(fromElement) ||
        isEditorVideoElement(toElement)
      ) {
        const primaryElement = isEditorVideoElement(fromElement)
          ? fromElement
          : toElement;
        const placement = primaryElement.placement;

        transitionProperties = {
          left: placement?.x || 0,
          top: placement?.y || 0,
          width: placement?.width || transitionCanvas.width,
          height: placement?.height || transitionCanvas.height,
          scaleX: placement?.scaleX || 1,
          scaleY: placement?.scaleY || 1,
          selectable: false,
          evented: false,
          opacity: 0,
          originX: 'left',
          originY: 'top',
        };
      } else {
        // For image elements, position over union bounding box similar to addGLTransition
        const fromFo = fromElement.fabricObject;
        const toFo = toElement.fabricObject;
        const fromRect = fromFo ? fromFo.getBoundingRect(true, true) : null;
        const toRect = toFo ? toFo.getBoundingRect(true, true) : null;
        if (fromRect && toRect) {
          const left = Math.min(fromRect.left, toRect.left);
          const top = Math.min(fromRect.top, toRect.top);
          transitionProperties = {
            left: left,
            top: top,
            width: transitionCanvas.width,
            height: transitionCanvas.height,
            scaleX: 1,
            scaleY: 1,
            selectable: false,
            evented: false,
            opacity: 0,
            originX: 'left',
            originY: 'top',
          };
        } else {
          const scaleX = this.canvas.width / transitionCanvas.width;
          const scaleY = this.canvas.height / transitionCanvas.height;
          transitionProperties = {
            left: 0,
            top: 0,
            scaleX: scaleX,
            scaleY: scaleY,
            selectable: false,
            evented: false,
            opacity: 0,
            originX: 'left',
            originY: 'top',
          };
        }
      }

      const transitionFabricImage = new fabric.Image(
        transitionCanvas,
        transitionProperties
      );

      // Add to canvas
      this.canvas.add(transitionFabricImage);
      this.canvas.bringToFront(transitionFabricImage);
      this.ensureElementsZOrder();

      // Store transition element with dedicated renderer
      this.glTransitionElements.set(transitionId, {
        animation: this.animations.find(a => a.id === transitionId),
        fabricObject: transitionFabricImage,
        renderer: transitionRenderer,
      });

      console.log(
        `Setup GL transition renderer for ${transitionId}: fromElement=${fromElement.id}, toElement=${toElement.id}`
      );
      return true;
    } catch (error) {
      console.error('Error setting up GL transition renderer:', error);
      return false;
    }
  }

  removeGLTransition(transitionId) {
    const transitionElement = this.glTransitionElements.get(transitionId);

    // Get animation data before removal (needed even if renderer entry is missing)
    const animation = this.animations.find(a => a.id === transitionId);

    // Restore original element states if they exist
    if (animation) {
      const fromElement = this.editorElements.find(
        el => el.id === animation.fromElementId
      );
      const toElement = this.editorElements.find(
        el => el.id === animation.toElementId
      );

      // Restore visibility/state for source element
      if (fromElement && fromElement.fabricObject) {
        const currentTime = this.currentTimeInMs;
        const shouldBeVisible =
          currentTime >= fromElement.timeFrame.start &&
          currentTime <= fromElement.timeFrame.end;
        fromElement.fabricObject.set('visible', shouldBeVisible);

        if (
          isEditorVideoElement(fromElement) &&
          fromElement.glTransitionOriginalState
        ) {
          const originalState = fromElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            fromElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            fromElement.fabricObject.setCoords();
          }
        }
        delete fromElement.glTransitionOriginalState;
      }

      // Restore visibility/state for destination element
      if (toElement && toElement.fabricObject) {
        const currentTime = this.currentTimeInMs;
        const shouldBeVisible =
          currentTime >= toElement.timeFrame.start &&
          currentTime <= toElement.timeFrame.end;
        toElement.fabricObject.set('visible', shouldBeVisible);

        if (
          isEditorVideoElement(toElement) &&
          toElement.glTransitionOriginalState
        ) {
          const originalState = toElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            toElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            toElement.fabricObject.setCoords();
          }
        }
        delete toElement.glTransitionOriginalState;
      }
    }

    // Remove from canvas if renderer exists
    if (transitionElement && transitionElement.fabricObject && this.canvas) {
      this.canvas.remove(transitionElement.fabricObject);
    }

    // Remove from animations regardless of renderer presence
    const animationIndex = this.animations.findIndex(
      a => a.id === transitionId
    );
    if (animationIndex !== -1) {
      this.animations.splice(animationIndex, 1);
    }

    // Restore proper z-order for all elements after transition removal
    if (typeof this.ensureElementsZOrder === 'function') {
      this.ensureElementsZOrder();
    }

    // Remove corresponding timeline element
    const timelineElementIndex = this.editorElements.findIndex(
      el => el.id === `animation-${transitionId}` && el.type === 'animation'
    );
    if (timelineElementIndex !== -1) {
      this.editorElements.splice(timelineElementIndex, 1);
    }

    // Remove from map
    this.glTransitionElements.delete(transitionId);

    if (this.canvas) {
      this.canvas.requestRenderAll();
    }
    // Trigger Redux sync after removing GL transition
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }
  }

  async updateGLTransition(transitionId, progress) {
    const transitionElement = this.glTransitionElements.get(transitionId);
    if (transitionElement && transitionElement.renderer) {
      try {
        // Get custom parameters from the animation properties
        const animation = this.animations.find(
          anim => anim.id === transitionId
        );

        if (!animation) {
          console.warn(`GL Transition animation not found: ${transitionId}`);
          return false;
        }

        const customParams = animation?.properties?.customParams || {};

        // Get current fabric objects for source elements
        const fromElement = this.editorElements.find(
          el => el.id === animation.fromElementId
        );
        const toElement = this.editorElements.find(
          el => el.id === animation.toElementId
        );

        // Validate that both elements exist and have fabric objects
        if (!fromElement || !toElement) {
          console.warn(
            `GL Transition elements not found - fromElement: ${!!fromElement}, toElement: ${!!toElement}, transitionId: ${transitionId}`
          );
          // Remove orphaned GL transition
          this.removeGLTransition(transitionId);
          return false;
        }

        if (!fromElement.fabricObject || !toElement.fabricObject) {
          console.warn(
            `GL Transition fabric objects not found - fromElement.fabricObject: ${!!fromElement.fabricObject}, toElement.fabricObject: ${!!toElement.fabricObject}, transitionId: ${transitionId}`
          );
          return false;
        }

        if (fromElement?.fabricObject && toElement?.fabricObject) {
          // Store current state to detect changes
          const currentFromState = {
            opacity: fromElement.fabricObject.opacity,
            scaleX: fromElement.fabricObject.scaleX,
            scaleY: fromElement.fabricObject.scaleY,
          };
          const currentToState = {
            opacity: toElement.fabricObject.opacity,
            scaleX: toElement.fabricObject.scaleX,
            scaleY: toElement.fabricObject.scaleY,
          };

          // Check if state has changed significantly since last update
          const lastFromState = transitionElement.lastFromState;
          const lastToState = transitionElement.lastToState;

          // Check for opacity animations to use more sensitive thresholds
          const hasOpacityAnimation = this.animations.some(
            anim =>
              (anim.targetId === animation.fromElementId ||
                anim.targetId === animation.toElementId) &&
              (anim.type === 'fadeEffect' ||
                anim.type === 'fadeIn' ||
                anim.type === 'fadeOut')
          );

          const opacityThreshold = hasOpacityAnimation ? 0.001 : 0.002;
          const scaleThreshold = 0.005;

          let shouldUpdateTextures =
            !lastFromState ||
            !lastToState ||
            Math.abs(currentFromState.opacity - lastFromState.opacity) >
              opacityThreshold ||
            Math.abs(currentFromState.scaleX - lastFromState.scaleX) >
              scaleThreshold ||
            Math.abs(currentFromState.scaleY - lastFromState.scaleY) >
              scaleThreshold ||
            Math.abs(currentToState.opacity - lastToState.opacity) >
              opacityThreshold ||
            Math.abs(currentToState.scaleX - lastToState.scaleX) >
              scaleThreshold ||
            Math.abs(currentToState.scaleY - lastToState.scaleY) >
              scaleThreshold;

          if (shouldUpdateTextures) {
            // Only log significant state changes
            const hasOpacityChange =
              Math.abs(
                currentFromState.opacity - (lastFromState?.opacity || 1)
              ) > 0.01 ||
              Math.abs(currentToState.opacity - (lastToState?.opacity || 1)) >
                0.01;
            if (hasOpacityChange) {
            }

            // Capture current state of fabric objects with all applied animations
            // Use the actual object dimensions for proper alignment
            const fromCanvas = captureFabricObjectState(
              fromElement.fabricObject,
              fromElement.fabricObject.width * fromElement.fabricObject.scaleX,
              fromElement.fabricObject.height * fromElement.fabricObject.scaleY
            );
            const toCanvas = captureFabricObjectState(
              toElement.fabricObject,
              toElement.fabricObject.width * toElement.fabricObject.scaleX,
              toElement.fabricObject.height * toElement.fabricObject.scaleY
            );

            if (fromCanvas && toCanvas) {
              try {
                // Update textures with current fabric object state - make sure it completes
                const texturesUpdated =
                  await transitionElement.renderer.updateTextures(
                    fromCanvas,
                    toCanvas
                  );

                if (texturesUpdated) {
                  // Store last state for comparison
                  transitionElement.lastFromState = { ...currentFromState };
                  transitionElement.lastToState = { ...currentToState };
                } else {
                  console.warn(
                    'Failed to update GL transition textures - continuing with original textures'
                  );
                }
              } catch (error) {
                console.error('Error updating GL transition textures:', error);
                // Continue with original textures instead of failing completely
              }
            } else {
              console.warn(
                'Failed to capture fabric object states - using original textures'
              );
            }
          }
        } else {
          console.warn(
            'GL Transition: fabric objects not available - using original textures'
          );
        }

        // Render transition frame with custom parameters (guard against lost context)
        try {
          transitionElement.renderer.render(progress, customParams);
        } catch (e) {
          // if context was lost, try to lazily recreate on next tick
          console.warn('Renderer render failed, will attempt lazy recreate', e);
        }

        // Update fabric object
        transitionElement.fabricObject.setElement(
          transitionElement.renderer.getCanvas()
        );

        // Don't request canvas render here - let caller handle batching
        return true;
      } catch (error) {
        console.error('Error in updateGLTransition:', transitionId, error);
        return false;
      }
    }
    return false;
  }

  // Add method to update GL transition properties
  updateGLTransitionProperties(transitionId, properties) {
    // Clear transition cache when properties change
    const transitionElement = this.glTransitionElements.get(transitionId);
    if (transitionElement) {
      transitionElement.lastFromState = null;
      transitionElement.lastToState = null;
    }
    const animationIndex = this.animations.findIndex(
      anim => anim.id === transitionId
    );
    if (animationIndex !== -1) {
      const animation = this.animations[animationIndex];

      // Mark as manually adjusted to prevent auto-calculation and preserve custom parameters
      animation.manuallyAdjusted = true;

      // Update properties
      animation.properties = {
        ...animation.properties,
        ...properties,
      };

      // Update the GL transition element if it exists
      const transitionElement = this.glTransitionElements.get(transitionId);
      if (transitionElement) {
        // Update the cached animation reference with new properties
        transitionElement.animation = animation;
      }

      // Schedule animation refresh to ensure changes are applied
      this.scheduleAnimationRefresh();

      // Trigger a re-render if the transition is currently active
      const isActive =
        this.currentTimeInMs >= animation.startTime &&
        this.currentTimeInMs <= animation.endTime;
      if (isActive) {
        const progress =
          (this.currentTimeInMs - animation.startTime) /
          (animation.endTime - animation.startTime);
        this.updateGLTransition(transitionId, progress).catch(error => {
          console.error('Error updating GL transition properties:', error);
        });
        this.canvas.requestRenderAll();
      }

      // Trigger save to ensure parameters are persisted
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }

      return true;
    }
    return false;
  }

  ensureElementsZOrder() {
    if (!this.canvas) return;

    // Get all non-transition fabric objects with their row information
    const elementsWithZOrder = [];

    this.editorElements.forEach(element => {
      if (
        !element.fabricObject ||
        !this.canvas.contains(element.fabricObject)
      ) {
        return;
      }

      // Skip elements that are part of active GL transitions
      const isPartOfActiveTransition = Array.from(
        this.glTransitionElements.values()
      ).some(transitionElement => {
        const transitionId = transitionElement.animation?.id;
        if (!transitionId) return false;
        const animation = this.animations.find(
          anim => anim.id === transitionId
        );
        if (!animation || animation.type !== 'glTransition') {
          return false;
        }
        const isTransitionActive =
          this.currentTimeInMs >= animation.startTime &&
          this.currentTimeInMs <= animation.endTime;
        return (
          isTransitionActive &&
          (animation.fromElementId === element.id ||
            animation.toElementId === element.id)
        );
      });

      if (isPartOfActiveTransition) {
        return;
      }

      // Collect all fabric objects for this element
      const fabricObjects = [];

      // Main fabric object
      fabricObjects.push({
        obj: element.fabricObject,
        row: element.row,
        isSubtitle: element.type === 'text' && element.subType === 'subtitles',
        isBackground: false,
        element: element,
      });

      // Word objects for subtitles
      if (
        element.type === 'text' &&
        element.subType === 'subtitles' &&
        element.properties.wordObjects
      ) {
        element.properties.wordObjects.forEach(wordObj => {
          if (wordObj && this.canvas.contains(wordObj)) {
            fabricObjects.push({
              obj: wordObj,
              row: element.row,
              isSubtitle: true,
              isBackground: false,
              element: element,
            });
          }
        });
      }

      // Background objects for subtitles
      if (
        element.type === 'text' &&
        element.subType === 'subtitles' &&
        element.backgroundObject &&
        this.canvas.contains(element.backgroundObject)
      ) {
        fabricObjects.push({
          obj: element.backgroundObject,
          row: element.row,
          isSubtitle: true,
          isBackground: true,
          element: element,
        });
      }

      elementsWithZOrder.push(...fabricObjects);
    });

    // Add GL transition fabric objects with proper ordering
    const glTransitionsWithZOrder = [];
    Array.from(this.glTransitionElements.entries()).forEach(
      ([transitionId, transitionElement]) => {
        if (
          transitionElement.fabricObject &&
          this.canvas.contains(transitionElement.fabricObject)
        ) {
          const animation = this.animations.find(
            anim => anim.id === transitionId
          );
          if (animation && animation.type === 'glTransition') {
            glTransitionsWithZOrder.push({
              obj: transitionElement.fabricObject,
              row: animation.row || 0,
              isGLTransition: true,
              transitionId: transitionId,
              startTime: animation.startTime,
              endTime: animation.endTime,
              animation: animation,
            });
          }
        }
      }
    );

    // Sort GL transitions by row and start time (later transitions on top)
    glTransitionsWithZOrder.sort((a, b) => {
      // First, sort by row (higher row number should be on top)
      if (a.row !== b.row) {
        return b.row - a.row; // Higher row numbers on top
      }
      // Within the same row, later start time on top
      return b.startTime - a.startTime;
    });

    // Sort regular elements by row (higher row = higher z-index), then by type
    elementsWithZOrder.sort((a, b) => {
      // First, sort by row (higher row number should be on top)
      if (a.row !== b.row) {
        return b.row - a.row; // Higher row numbers on top
      }

      // Within the same row, backgrounds should be behind text
      if (a.isBackground !== b.isBackground) {
        return a.isBackground ? -1 : 1; // backgrounds first
      }

      // Subtitles should always be on top within their row
      if (a.isSubtitle !== b.isSubtitle) {
        return a.isSubtitle ? 1 : -1; // subtitles on top
      }

      return 0;
    });

    // Apply the z-order: first regular elements, then GL transitions
    elementsWithZOrder.forEach(item => {
      if (item.obj && this.canvas.contains(item.obj)) {
        this.canvas.bringToFront(item.obj);
      }
    });

    // Then bring GL transitions to front in order (so they're above regular elements)
    glTransitionsWithZOrder.forEach(item => {
      if (item.obj && this.canvas.contains(item.obj)) {
        this.canvas.bringToFront(item.obj);
      }
    });
  }

  ensureSubtitlesOnTop() {
    // For backward compatibility, call the new comprehensive function
    this.ensureElementsZOrder();
  }

  synchronizeGLTransitionState(transitionId) {
    const transitionElement = this.glTransitionElements.get(transitionId);
    if (!transitionElement) {
      console.warn(
        'GL transition element not found for synchronization:',
        transitionId
      );
      return;
    }

    const animation = this.animations.find(anim => anim.id === transitionId);
    if (!animation || animation.type !== 'glTransition') {
      console.warn(
        'GL transition animation not found for synchronization:',
        transitionId
      );
      return;
    }

    // Ensure the transition fabric object is properly positioned on canvas
    if (transitionElement.fabricObject && this.canvas) {
      // Remove and re-add to ensure proper layer order
      const wasOnCanvas = this.canvas.contains(transitionElement.fabricObject);
      if (wasOnCanvas) {
        this.canvas.remove(transitionElement.fabricObject);
      }

      // Add back and bring to front
      this.canvas.add(transitionElement.fabricObject);
      this.canvas.bringToFront(transitionElement.fabricObject);

      // Ensure proper z-order for all elements
      this.ensureElementsZOrder();
    }

    // Get involved elements
    const fromElement = this.editorElements.find(
      el => el.id === animation.fromElementId
    );
    const toElement = this.editorElements.find(
      el => el.id === animation.toElementId
    );

    // Validate that both elements exist
    if (!fromElement || !toElement) {
      console.warn(
        `GL Transition sync: elements not found - fromElement: ${!!fromElement}, toElement: ${!!toElement}, transitionId: ${transitionId}`
      );
      // Remove orphaned GL transition
      this.removeGLTransition(transitionId);
      return;
    }

    // Ensure elements have proper initial states
    if (
      fromElement &&
      fromElement.fabricObject &&
      !fromElement.glTransitionOriginalState
    ) {
      fromElement.glTransitionOriginalState = {
        visible: fromElement.fabricObject.visible,
        opacity: fromElement.fabricObject.opacity,
        // For video elements, also preserve dimensions and position
        ...(isEditorVideoElement(fromElement)
          ? {
              left: fromElement.fabricObject.left,
              top: fromElement.fabricObject.top,
              width: fromElement.fabricObject.width,
              height: fromElement.fabricObject.height,
              scaleX: fromElement.fabricObject.scaleX,
              scaleY: fromElement.fabricObject.scaleY,
            }
          : {}),
      };
    }
    if (
      toElement &&
      toElement.fabricObject &&
      !toElement.glTransitionOriginalState
    ) {
      toElement.glTransitionOriginalState = {
        visible: toElement.fabricObject.visible,
        opacity: toElement.fabricObject.opacity,
        // For video elements, also preserve dimensions and position
        ...(isEditorVideoElement(toElement)
          ? {
              left: toElement.fabricObject.left,
              top: toElement.fabricObject.top,
              width: toElement.fabricObject.width,
              height: toElement.fabricObject.height,
              scaleX: toElement.fabricObject.scaleX,
              scaleY: toElement.fabricObject.scaleY,
            }
          : {}),
      };
    }

    // Force immediate state update based on current time
    const currentTime = this.currentTimeInMs;
    const isActive =
      currentTime >= animation.startTime && currentTime <= animation.endTime;

    if (isActive) {
      const progress =
        (currentTime - animation.startTime) /
        (animation.endTime - animation.startTime);
      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Update transition
      this.updateGLTransition(transitionId, clampedProgress).catch(error => {
        console.error(
          'Error updating GL transition during synchronization:',
          error
        );
      });
      transitionElement.fabricObject.set('opacity', 1);

      // Hide original elements during GL transition
      if (fromElement && fromElement.fabricObject) {
        // During active GL transition, original elements should be hidden
        fromElement.fabricObject.set('visible', false);
      }

      if (toElement && toElement.fabricObject) {
        // During active GL transition, original elements should be hidden
        toElement.fabricObject.set('visible', false);
      }
    } else {
      // Hide transition
      transitionElement.fabricObject.set('opacity', 0);

      // Restore original elements visibility and dimensions
      if (fromElement && fromElement.fabricObject) {
        const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
          fromElement.id,
          currentTime
        );
        console.log(
          `GL Transition sync (inactive) - fromElement ${fromElement.id}: shouldBeVisible=${shouldBeVisible}`
        );
        fromElement.fabricObject.set('visible', shouldBeVisible);

        // Restore original dimensions for video elements
        if (
          isEditorVideoElement(fromElement) &&
          fromElement.glTransitionOriginalState
        ) {
          const originalState = fromElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            fromElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            fromElement.fabricObject.setCoords();
          }
        }
      }
      if (toElement && toElement.fabricObject) {
        const shouldBeVisible = this.shouldElementBeVisibleWithGLTransitions(
          toElement.id,
          currentTime
        );
        console.log(
          `GL Transition sync (inactive) - toElement ${toElement.id}: shouldBeVisible=${shouldBeVisible}`
        );
        toElement.fabricObject.set('visible', shouldBeVisible);

        // Restore original dimensions for video elements
        if (
          isEditorVideoElement(toElement) &&
          toElement.glTransitionOriginalState
        ) {
          const originalState = toElement.glTransitionOriginalState;
          if (originalState.left !== undefined) {
            toElement.fabricObject.set({
              left: originalState.left,
              top: originalState.top,
              width: originalState.width,
              height: originalState.height,
              scaleX: originalState.scaleX,
              scaleY: originalState.scaleY,
            });
            toElement.fabricObject.setCoords();
          }
        }
      }
    }

    // Manage conflicts between overlapping GL transitions
    this.manageGLTransitionConflicts(currentTime);

    // Force canvas render
    this.canvas.requestRenderAll();
  }

  updateGLTransitionTiming(transitionId, { startTime, endTime, duration }) {
    // Clear transition cache when timing changes
    const glTransition = this.glTransitionElements.get(transitionId);
    if (glTransition) {
      glTransition.lastFromState = null;
      glTransition.lastToState = null;
    }
    // Find the transition in animations array
    const transitionIndex = this.animations.findIndex(
      anim => anim.id === transitionId
    );
    if (transitionIndex === -1) return;

    const transition = this.animations[transitionIndex];

    // Mark as manually adjusted to prevent auto-calculation
    transition.manuallyAdjusted = true;

    // Update timing properties
    if (startTime !== undefined) {
      transition.startTime = startTime;
      if (transition.properties) {
        transition.properties.startTime = startTime;
      }
    }

    if (endTime !== undefined) {
      transition.endTime = endTime;
      if (transition.properties) {
        transition.properties.endTime = endTime;
      }
    }

    if (duration !== undefined) {
      transition.duration = duration;
      if (transition.properties) {
        transition.properties.duration = duration;
      }
    }

    // Update the GL transition element timing if it exists
    const glTransitionElement = this.glTransitionElements.get(transitionId);
    if (glTransitionElement) {
      glTransitionElement.startTime = startTime || transition.startTime;
      glTransitionElement.endTime = endTime || transition.endTime;
      glTransitionElement.duration = duration || transition.duration;

      // Update the cached animation reference
      glTransitionElement.animation = transition;
    }
  }

  updateEffect(id, effect) {
    const index = this.editorElements.findIndex(element => element.id === id);
    const element = this.editorElements[index];
    if (isEditorVideoElement(element) || isEditorImageElement(element)) {
      element.properties.effect = effect;
    }
    this.refreshElements();
  }

  setVideos(videos) {
    this.videos = videos;
  }

  updateAllMediaPlaybackRates() {
    // Update all video elements
    this.videos.forEach(video => {
      if (video.element) {
        video.element.playbackRate = this.playbackRate;
      }
    });

    // Update all audio elements
    this.audios.forEach(audio => {
      if (audio.element) {
        audio.element.playbackRate = this.playbackRate;
      }
    });
  }

  updateAllMediaPlaybackRates() {
    // Update all video elements
    this.videos.forEach(video => {
      if (video.element) {
        video.element.playbackRate = this.playbackRate;
      }
    });

    // Update all audio elements
    this.audios.forEach(audio => {
      if (audio.element) {
        audio.element.playbackRate = this.playbackRate;
      }
    });
  }

  setSubtitlesAnimation(animation) {
    this.subtitlesAnimation = animation;
  }

  addVideoResource(video) {
    // Create a new video element if it doesn't exist
    if (!video.element) {
      video.element = document.createElement('video');
      video.element.src = video.src;
      video.element.preload = 'auto';
    }

    // Set initial playback rate
    video.element.playbackRate = this.playbackRate;

    // Add to videos array
    this.videos = [...this.videos, video];
  }

  addAudioResource(audio) {
    // Create a new audio element if it doesn't exist
    if (!audio.element) {
      audio.element = document.createElement('audio');
    }

    // Set initial playback rate
    audio.element.playbackRate = this.playbackRate;

    // Add to audios array
    this.audios = [...this.audios, audio];
  }

  addImageResource(image) {
    this.images = [...this.images, image];
  }

  checkOverlapAndAdjust = (currentId, newStartTime, newEndTime, newRow) => {
    let adjustedStartTime = newStartTime;
    let adjustedRow = newRow;
    const newDuration = newEndTime - newStartTime;

    const sortedOverlays = [...this.editorElements].sort(
      (a, b) => a.startTime - b.startTime
    );

    for (let row = adjustedRow; row < this.maxRows; row++) {
      const overlaysInRow = sortedOverlays
        .filter(overlay => overlay.id !== currentId && overlay.row === row)
        .sort((a, b) => a.startTime - b.startTime);

      const availableSpaces = [];

      if (overlaysInRow.length === 0 || overlaysInRow[0].startTime > 0) {
        availableSpaces.push({
          start: 0,
          end: overlaysInRow.length ? overlaysInRow[0].startTime : this.maxTime,
        });
      }

      for (let i = 0; i < overlaysInRow.length; i++) {
        const currentOverlay = overlaysInRow[i];
        const nextOverlay = overlaysInRow[i + 1];
        const currentEnd = currentOverlay.endTime;

        if (nextOverlay) {
          if (nextOverlay.startTime > currentEnd) {
            availableSpaces.push({
              start: currentEnd,
              end: nextOverlay.startTime,
            });
          }
        } else {
          if (currentEnd < this.maxTime) {
            availableSpaces.push({
              start: currentEnd,
              end: this.maxTime,
            });
          }
        }
      }

      const bestSpace = availableSpaces.find(
        space =>
          space.end - space.start >= newDuration &&
          adjustedStartTime >= space.start &&
          adjustedStartTime <= space.end - newDuration
      );

      if (bestSpace) {
        adjustedStartTime = Math.max(
          bestSpace.start,
          Math.min(adjustedStartTime, bestSpace.end - newDuration)
        );
        return { startTime: adjustedStartTime, row };
      }

      adjustedRow = row + 1;
    }

    const lastRow = this.maxRows - 1;
    const lastOverlayInLastRow = sortedOverlays
      .filter(overlay => overlay.row === lastRow && overlay.id !== currentId)
      .reduce((latest, overlay) => Math.max(latest, overlay.endTime), 0);

    adjustedStartTime = Math.max(lastOverlayInLastRow, 0);
    adjustedStartTime = Math.min(adjustedStartTime, this.maxTime - newDuration);

    return { startTime: adjustedStartTime, row: lastRow };
  };

  moveImageResource(from, to) {
    const fromIndex = this.editorElements.findIndex(
      element => element.id === from.id
    );
    const toIndex = this.editorElements.findIndex(
      element => element.id === to.id
    );

    if (fromIndex === -1 || toIndex === -1) {
      console.error('Invalid IDs provided for moving elements.');
      return;
    }

    const updatedElements = [...this.editorElements];
    const [movedElement] = updatedElements.splice(fromIndex, 1);
    updatedElements.splice(toIndex, 0, movedElement);

    const tempTimeFrame = updatedElements[fromIndex].timeFrame;
    updatedElements[fromIndex].timeFrame = updatedElements[toIndex].timeFrame;
    updatedElements[toIndex].timeFrame = tempTimeFrame;

    this.editorElements = updatedElements;
    this.refreshElements();
  }

  addAnimation(animation) {
    // Determine effect type
    let effectType;
    if (animation.type.toLowerCase().includes('effect')) {
      effectType = 'dolly';
    } else {
      effectType = animation.type.toLowerCase().includes('in') ? 'in' : 'out';
    }

    // Handle both legacy and new animation systems
    let targetIds = [];
    let targetElement = null;

    if (animation.targetId) {
      // Legacy single target support - convert to targetIds array
      targetIds = [animation.targetId];
      targetElement = this.editorElements.find(
        element => element.id === animation.targetId
      );
    } else if (animation.targetIds && animation.targetIds.length > 0) {
      // New dynamic animation with multiple targets
      targetIds = animation.targetIds;
      // Use first target for timeline positioning
      targetElement = this.editorElements.find(element =>
        targetIds.includes(element.id)
      );
    } else {
      // No specific targets provided - this is OK for dynamic animations
      // We'll determine targets later based on row position
      targetIds = [];
    }

    // Always add animation to the list (even without initial targets)
    const newAnimation = {
      ...animation,
      targetIds: targetIds,
      targetId: undefined, // Remove legacy targetId
      effect: effectType,
      syncToAllScenes: animation.syncToAllScenes ?? true,
    };

    this.animations = [...this.animations, newAnimation];

    // Create timeline element for this animation (only if not restoring from backend)
    // Skip timeline element creation for textWord* animations - these should only exist on canvas
    if (!this.isInitializing && !animation.type.startsWith('textWord')) {
      // If we have a target element, use it for positioning
      if (targetElement) {
        this.createTimelineElementForAnimation(newAnimation, targetElement);
      } else {
        // Create timeline element without specific target (will be positioned freely)
        this.createTimelineElementForAnimationWithoutTarget(newAnimation);
      }
    }

    this.scheduleAnimationRefresh();

    // Trigger Redux sync after adding animation
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }

    return true; // Always return success now
  }

  // Create timeline element for animation without specific target (for dynamic animations)
  createTimelineElementForAnimationWithoutTarget(animation) {
    const properties = animation.properties || {};
    let startTime = properties.absoluteStart || properties.startTime || 0;
    let endTime =
      properties.absoluteEnd ||
      properties.endTime ||
      animation.duration ||
      1000;

    // Use saved row if available during restoration, otherwise find available row for the animation
    let animationRow =
      animation.row !== undefined
        ? animation.row
        : this.findAvailableAnimationRow();

    const animationElement = {
      id: `animation-${animation.id}`,
      animationId: animation.id,
      type: 'animation',
      targetId: null, // No specific target
      targetIds: [], // Will be determined dynamically
      row: animationRow,
      timeFrame: {
        start: startTime,
        end: endTime,
      },
      name: `Animation ${animation.type}`,
      placement: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      properties: {
        animationType: animation.type,
        effect: animation.effect,
        ...animation.properties,
      },
    };

    // Add to editor elements
    this.editorElements = [...this.editorElements, animationElement];

    // Immediately determine and set dynamic targets (will be called again in updateAnimationTargets with timeFrame)
    this.updateAnimationTargets(animation.id, animationRow);

    // Instead of full refresh, just update animation state and canvas rendering
    this.scheduleAnimationRefresh();
    if (this.canvas) {
      this.canvas.requestRenderAll();
    }
  }

  // Create timeline element for animation using addAbove logic
  createTimelineElementForAnimation(animation, targetElement) {
    const properties = animation.properties || {};
    let startTime = properties.startTime || 0;
    let endTime = properties.endTime || animation.duration || 1000;

    // For Out animations, position them at the end of the element if startTime is 0
    if (animation.type.endsWith('Out') && startTime === 0) {
      const elementDuration =
        targetElement.timeFrame.end - targetElement.timeFrame.start;
      const animationDuration = endTime - startTime;
      startTime = Math.max(0, elementDuration - animationDuration);
      endTime = startTime + animationDuration;
    }

    // Calculate absolute timing
    const absoluteStart = targetElement.timeFrame.start + startTime;
    const absoluteEnd = Math.min(
      targetElement.timeFrame.start + endTime,
      targetElement.timeFrame.end
    );

    // Determine effect direction
    let effectDirection = 'in';
    if (animation.type === 'zoomEffect') {
      const initialScale =
        properties.scaleFactor || properties.initialScale || 1.0;
      const targetScale = properties.targetScale || properties.endScale || 2.0;
      effectDirection = initialScale < targetScale ? 'in' : 'out';
    } else if (animation.type === 'fadeEffect') {
      const initialOpacity =
        properties.opacity || properties.initialOpacity || 1.0;
      const targetOpacity =
        properties.targetOpacity || properties.endOpacity || 0.0;
      effectDirection = initialOpacity < targetOpacity ? 'in' : 'out';
    } else if (animation.type.endsWith('In')) {
      effectDirection = 'in';
    } else if (animation.type.endsWith('Out')) {
      effectDirection = 'out';
    } else {
      effectDirection = animation.effectVariant || 'in';
    }

    // Use saved row if available during restoration, otherwise start from the row above the target element
    let targetRow =
      animation.row !== undefined
        ? animation.row
        : Math.max(0, targetElement.row - 1);
    const timeFrame = { start: absoluteStart, end: absoluteEnd };

    // If we have a saved row, try to use it directly (for restoration)
    if (animation.row !== undefined) {
      const animationElement = {
        id: `animation-${animation.id}`,
        animationId: animation.id,
        type: 'animation',
        targetId: animation.targetId, // Keep for legacy compatibility
        targetIds:
          animation.targetIds ||
          (animation.targetId ? [animation.targetId] : []),
        row: targetRow,
        timeFrame: {
          start: absoluteStart,
          end: absoluteEnd,
        },
        properties: {
          animationType: animation.type,
          displayName: `${animation.type} Animation`,
          originalAnimation: animation,
          effectDirection: effectDirection,
        },
        absoluteStart,
        absoluteEnd,
        effect: effectDirection,
      };

      // Add to timeline
      this.editorElements.push(animationElement);

      // Update maxRows if needed
      if (targetRow >= this.maxRows) {
        this.setMaxRows(targetRow + 1);
      }

      return; // Exit early when using saved row
    }

    // Keep looking for a free row until we find one (for new animations)
    while (true) {
      const rowElements = this.getElementsInRow(targetRow);
      const hasOverlap = rowElements.some(
        el =>
          el.timeFrame.start < timeFrame.end &&
          el.timeFrame.end > timeFrame.start
      );

      if (!hasOverlap) {
        // Found a free row - create animation element
        const animationElement = {
          id: `animation-${animation.id}`,
          animationId: animation.id,
          type: 'animation',
          targetId: animation.targetId, // Keep for legacy compatibility
          targetIds:
            animation.targetIds ||
            (animation.targetId ? [animation.targetId] : []),
          row: targetRow,
          timeFrame: {
            start: absoluteStart,
            end: absoluteEnd,
          },
          properties: {
            animationType: animation.type,
            displayName: `${animation.type} Animation`,
            originalAnimation: animation,
            effectDirection: effectDirection,
          },
          absoluteStart,
          absoluteEnd,
          effect: effectDirection,
        };

        // Add to timeline
        this.editorElements.push(animationElement);

        // Update maxRows if needed
        if (targetRow >= this.maxRows) {
          this.setMaxRows(targetRow + 1);
        }

        break;
      }

      // If we're at row 0 and still have overlap, shift everything down
      if (targetRow === 0) {
        this.shiftRowsDown(0);

        // Create animation element at row 0
        const animationElement = {
          id: `animation-${animation.id}`,
          animationId: animation.id,
          type: 'animation',
          targetId: animation.targetId, // Keep for legacy compatibility
          targetIds:
            animation.targetIds ||
            (animation.targetId ? [animation.targetId] : []),
          row: 0,
          timeFrame: {
            start: absoluteStart,
            end: absoluteEnd,
          },
          properties: {
            animationType: animation.type,
            displayName: `${animation.type} Animation`,
            originalAnimation: animation,
            effectDirection: effectDirection,
          },
          absoluteStart,
          absoluteEnd,
          effect: effectDirection,
        };

        // Add to timeline
        this.editorElements.push(animationElement);
        break;
      }

      // Try the next row up (exactly like addAbove)
      targetRow = Math.max(0, targetRow - 1);
    }
  }

  // Create timeline elements for all stored animations (used during restoration)
  createTimelineElementsForStoredAnimations(animationIds = null) {
    // Filter animations if specific IDs are provided
    const animationsToProcess = animationIds
      ? this.animations.filter(animation => animationIds.includes(animation.id))
      : this.animations;

    animationsToProcess.forEach(animation => {
      // Check if timeline element already exists for this animation
      const existingTimelineElement = this.editorElements.find(
        el => el.type === 'animation' && el.animationId === animation.id
      );

      if (!existingTimelineElement) {
        if (animation.type === 'glTransition') {
          // Handle GL transitions
          const fromElement = this.editorElements.find(
            el => el.id === animation.fromElementId && el.type !== 'animation'
          );
          const toElement = this.editorElements.find(
            el => el.id === animation.toElementId && el.type !== 'animation'
          );

          if (fromElement && toElement) {
            // Use saved row if available, otherwise find available row
            const animationRow =
              animation.row !== undefined
                ? animation.row
                : this.findAvailableRowForGLTransition(fromElement, toElement);

            const timelineElement = {
              id: `animation-${animation.id}`,
              animationId: animation.id,
              type: 'animation',
              targetId: animation.fromElementId, // Use fromElement as target for consistency
              fromElementId: animation.fromElementId,
              toElementId: animation.toElementId,
              targetIds: animation.targetIds || [
                animation.fromElementId,
                animation.toElementId,
              ], // Add targetIds
              row: animationRow,
              timeFrame: {
                start: animation.startTime,
                end: animation.endTime,
              },
              properties: {
                animationType: 'glTransition',
                transitionType: animation.transitionType,
                displayName: `${animation.transitionType} Transition`,
                originalAnimation: animation,
                effectDirection: 'transition',
              },
              // Additional properties for compatibility
              absoluteStart: animation.startTime,
              absoluteEnd: animation.endTime,
              effectDirection: 'transition',
              displayName: `${animation.transitionType} Transition`,
            };

            // Add timeline element to editorElements
            runInAction(() => {
              this.editorElements.push(timelineElement);
            });

            // Update maxRows if needed
            if (animationRow >= this.maxRows) {
              this.setMaxRows(animationRow + 1);
            }
          }
        } else {
          // Handle regular animations
          const targetElement = this.editorElements.find(
            el => el.id === animation.targetId && el.type !== 'animation'
          );

          if (targetElement) {
            this.createTimelineElementForAnimation(animation, targetElement);
          }
        }
      }
    });
  }

  updateTimelineElementForAnimation(animation) {
    // Support both legacy 'animation' and existing 'transition' timeline element types
    const timelineElement = this.editorElements.find(
      el =>
        (el.type === 'animation' || el.type === 'transition') &&
        el.animationId === animation.id
    );

    if (!timelineElement) {
      return;
    }

    const properties = animation.properties || {};
    let startTime = properties.startTime || 0;
    let endTime = properties.endTime || animation.duration || 1000;

    // Resolve all potential target elements (supports targetId and targetIds)
    const targetIds =
      Array.isArray(animation.targetIds) && animation.targetIds.length > 0
        ? animation.targetIds
        : animation.targetId
          ? [animation.targetId]
          : [];

    const targetElements = this.editorElements.filter(
      el => targetIds.includes(el.id) && el.type !== 'animation'
    );

    if (targetElements.length === 0) {
      // Fallback to legacy single target lookup if not found in list
      const legacyTarget = this.editorElements.find(
        el => el.id === animation.targetId && el.type !== 'animation'
      );
      if (!legacyTarget) return;

      // For Out animations, position them at the end of the element if startTime is 0
      if (animation.type.endsWith('Out') && startTime === 0) {
        const elementDuration =
          legacyTarget.timeFrame.end - legacyTarget.timeFrame.start;
        const animationDuration = endTime - startTime;
        startTime = Math.max(0, elementDuration - animationDuration);
        endTime = startTime + animationDuration;
      }

      const absoluteStart = legacyTarget.timeFrame.start + startTime;
      const absoluteEnd = Math.min(
        legacyTarget.timeFrame.start + endTime,
        legacyTarget.timeFrame.end
      );

      timelineElement.timeFrame = { start: absoluteStart, end: absoluteEnd };
      timelineElement.absoluteStart = absoluteStart;
      timelineElement.absoluteEnd = absoluteEnd;
      if (timelineElement.properties) {
        timelineElement.properties.originalAnimation = animation;
      }
      return;
    }

    // Prefer a single concrete target to avoid spanning multiple images unintentionally
    let selectedTarget = null;
    if (targetElements.length === 1) {
      selectedTarget = targetElements[0];
    } else if (targetElements.length > 1) {
      // Choose the target with the largest overlap with current timeline element
      const prevStart =
        timelineElement.timeFrame?.start ?? timelineElement.absoluteStart ?? 0;
      const prevEnd =
        timelineElement.timeFrame?.end ??
        timelineElement.absoluteEnd ??
        prevStart + (endTime - startTime);
      let best = null;
      let bestOverlap = -1;
      targetElements.forEach(el => {
        const overlapStart = Math.max(prevStart, el.timeFrame.start);
        const overlapEnd = Math.min(prevEnd, el.timeFrame.end);
        const overlap = Math.max(0, overlapEnd - overlapStart);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = el;
        }
      });
      // Fallback to the closest by start if no overlap
      if (!best) {
        best = targetElements.reduce((acc, el) => {
          const accDist = Math.abs((acc?.timeFrame.start ?? 0) - prevStart);
          const elDist = Math.abs(el.timeFrame.start - prevStart);
          return elDist < accDist ? el : acc;
        }, targetElements[0]);
      }
      selectedTarget = best;
    }

    if (!selectedTarget) {
      // As a safety, if we somehow have no selected target, keep existing behavior by spanning across all
      let absoluteStarts = [];
      let absoluteEnds = [];
      targetElements.forEach(targetEl => {
        let localStart = startTime;
        let localEnd = endTime;
        if (animation.type.endsWith('Out') && localStart === 0) {
          const elementDuration =
            targetEl.timeFrame.end - targetEl.timeFrame.start;
          const animationDuration = localEnd - localStart;
          localStart = Math.max(0, elementDuration - animationDuration);
          localEnd = localStart + animationDuration;
        }
        const absStart = targetEl.timeFrame.start + localStart;
        const absEnd = Math.min(
          targetEl.timeFrame.start + localEnd,
          targetEl.timeFrame.end
        );
        absoluteStarts.push(absStart);
        absoluteEnds.push(absEnd);
      });
      const absoluteStart = Math.min(...absoluteStarts);
      const absoluteEnd = Math.max(...absoluteEnds);
      timelineElement.timeFrame = { start: absoluteStart, end: absoluteEnd };
      timelineElement.absoluteStart = absoluteStart;
      timelineElement.absoluteEnd = absoluteEnd;
      if (timelineElement.properties) {
        timelineElement.properties.originalAnimation = animation;
      }
      return;
    }

    // Compute timing within the selected target, preserving anchor where possible
    const elementStart = selectedTarget.timeFrame.start;
    const elementEnd = selectedTarget.timeFrame.end;
    const elementDuration = elementEnd - elementStart;

    const prevAbsStart = timelineElement.timeFrame?.start ?? null;
    const prevAbsEnd = timelineElement.timeFrame?.end ?? null;
    const epsilon = 2; // ms tolerance for edge anchoring

    const requestedDuration = Math.max(
      100,
      endTime - startTime || animation.duration || 1000
    );

    let localStart = startTime;
    let localEnd = startTime + requestedDuration;

    const anchoredToEnd =
      prevAbsEnd != null && Math.abs(prevAbsEnd - elementEnd) <= epsilon;
    const anchoredToStart =
      prevAbsStart != null && Math.abs(prevAbsStart - elementStart) <= epsilon;

    if (animation.type.endsWith('Out') && (localStart === 0 || anchoredToEnd)) {
      // Out animations or end-anchored: keep right edge locked to element end
      localEnd = elementDuration;
      localStart = Math.max(0, localEnd - requestedDuration);
    } else if (animation.type.endsWith('In') && anchoredToEnd) {
      // In animation placed at the end by user: expand leftwards when duration changes
      localEnd = elementDuration;
      localStart = Math.max(0, localEnd - requestedDuration);
    } else if (anchoredToStart) {
      // Start-anchored: keep left edge, extend rightwards
      localStart = 0;
      localEnd = Math.min(elementDuration, requestedDuration);
    } else if (prevAbsStart != null) {
      // Preserve previous offset within element where possible
      const prevLocalStart = Math.max(0, prevAbsStart - elementStart);
      localStart = Math.min(prevLocalStart, Math.max(0, elementDuration - 100));
      localEnd = Math.min(elementDuration, localStart + requestedDuration);
    }

    // Final clamp and ensure minimum duration
    if (localEnd - localStart < 100) {
      localEnd = Math.min(elementDuration, localStart + 100);
      localStart = Math.max(0, localEnd - 100);
    }

    const absoluteStart = elementStart + localStart;
    const absoluteEnd = elementStart + localEnd;

    timelineElement.timeFrame = { start: absoluteStart, end: absoluteEnd };
    timelineElement.absoluteStart = absoluteStart;
    timelineElement.absoluteEnd = absoluteEnd;
    timelineElement.targetId = selectedTarget.id;
    timelineElement.targetIds = [selectedTarget.id];
    if (timelineElement.properties) {
      timelineElement.properties.originalAnimation = animation;
    }

    // Also update the animation's relative timing to stay consistent
    const animIndex = this.animations.findIndex(a => a.id === animation.id);
    if (animIndex !== -1) {
      const updated = {
        ...this.animations[animIndex],
        properties: {
          ...this.animations[animIndex].properties,
          startTime: localStart,
          endTime: localEnd,
        },
        duration: localEnd - localStart,
        targetIds: [selectedTarget.id],
      };
      this.animations[animIndex] = updated;
    }
  }

  addAnimationElement({
    targetId,
    targetIds,
    id,
    type,
    effect,
    timeFrame,
    row,
  }) {
    const hasElementsInFirstRow = this.editorElements.some(
      element => element.row === row && element.type !== 'transition'
    );

    // If row 0 is occupied, shift everything down first
    if (hasElementsInFirstRow) {
      this.shiftRowsDown(row);
    }

    const newElement = {
      id,
      name: `Animation ${type}`,
      type: 'transition',
      targetId, // Keep for legacy compatibility
      targetIds: targetIds || (targetId ? [targetId] : []), // Support both systems
      effect,
      placement: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      timeFrame: { ...timeFrame },
      row,
      properties: {
        animationType: type,
        effect,
      },
    };

    // Add to editorElements in the same row as target
    this.editorElements = [...this.editorElements, newElement];
    this.refreshElements();
  }

  removeAnimationElement({ targetId }) {
    // Support both old targetId and new targetIds systems
    const index = this.animations.findIndex(
      a =>
        a.targetId === targetId ||
        (a.targetIds && a.targetIds.includes(targetId))
    );

    if (index !== -1) {
      // Clear GL transition cache when animations are removed
      this.clearGLTransitionCache();

      this.animations.splice(index, 1);
      this.scheduleAnimationRefresh();
    }
  }

  updateAnimation(id, animation) {
    // Clear GL transition cache when any animation updates
    this.clearGLTransitionCache();

    const index = this.animations.findIndex(a => a.id === id);
    // Add effect field based on animation type
    const effectType = animation.type.toLowerCase().includes('in')
      ? 'in'
      : 'out';
    this.animations[index] = { ...animation, effect: effectType };
    this.scheduleAnimationRefresh();

    // Update corresponding timeline element
    this.updateTimelineElementForAnimation(animation);

    // Don't sync animations with timeline - handled in TransitionPanel
    // this.syncAnimationsWithTimeline();

    // Trigger Redux sync after updating animation
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }
  }

  scheduleAnimationRefresh() {
    if (this.animationUpdateTimeout) {
      clearTimeout(this.animationUpdateTimeout);
    }

    this.animationUpdateTimeout = setTimeout(() => {
      if (!this.isRefreshingAnimations) {
        this.refreshAnimations();
      }
    }, this.ANIMATION_BATCH_DELAY);
  }

  // Helper function to calculate correct animation start time considering moved animations
  getAnimationStartTime(animation, editorElement, startTime) {
    // Check if animation element has been moved
    const animationElement = this.editorElements.find(
      el => el.type === 'animation' && el.animationId === animation.id
    );

    if (animationElement && animationElement.timeFrame) {
      // Use the moved animation element's timeframe if it exists
      return animationElement.timeFrame.start;
    } else {
      // Fallback to original calculation
      const elementStart = editorElement.timeFrame.start;
      return elementStart + startTime;
    }
  }

  // Helper function to calculate correct animation end time considering moved animations
  getAnimationEndTime(animation, editorElement, endTime) {
    // Check if animation element has been moved
    const animationElement = this.editorElements.find(
      el => el.type === 'animation' && el.animationId === animation.id
    );

    if (animationElement && animationElement.timeFrame) {
      // Use the moved animation element's timeframe end if it exists
      return animationElement.timeFrame.end;
    } else {
      // Fallback to original calculation
      const elementStart = editorElement.timeFrame.start;
      return elementStart + endTime;
    }
  }

  // Helper function to get easing from curveData or fallback to default
  getEasingFromAnimation(animation, defaultEasing = 'linear') {
    try {
      const curveData = animation.properties?.curveData;
      if (curveData && Array.isArray(curveData) && curveData.length >= 2) {
        // Convert curve to anime.js compatible easing
        return convertCurveToEasing(curveData, 'anime');
      }
      return defaultEasing;
    } catch (error) {
      console.warn('Error converting curve to easing:', error);
      return defaultEasing;
    }
  }

  // Method to clear GL transition cache when animations change
  clearGLTransitionCache() {
    this.glTransitionElements.forEach((transitionElement, transitionId) => {
      if (transitionElement.lastFromState || transitionElement.lastToState) {
        transitionElement.lastFromState = null;
        transitionElement.lastToState = null;
      }
    });
  }

  resetAnimationState(editorElement) {
    if (editorElement.fabricObject) {
      const fabricObject = editorElement.fabricObject;

      // Check if this element is currently part of an active GL transition
      const isPartOfActiveGLTransition = Array.from(
        this.glTransitionElements.values()
      ).some(transitionElement => {
        const animation = this.animations.find(
          anim => anim.id === transitionElement.animation?.id
        );
        if (!animation || animation.type !== 'glTransition') {
          return false;
        }
        const currentTime = this.currentTimeInMs;
        const isTransitionActive =
          currentTime >= animation.startTime &&
          currentTime <= animation.endTime;
        return (
          isTransitionActive &&
          (animation.fromElementId === editorElement.id ||
            animation.toElementId === editorElement.id)
        );
      });

      // If element is part of active GL transition, preserve its visibility state
      // and don't reset opacity if it's been set to 0 by GL transition logic
      const currentVisibility = fabricObject.visible;
      const currentOpacity = fabricObject.opacity;

      // Ensure initialState exists, if not, capture current state as fallback
      if (!editorElement.initialState) {
        // This should ideally be set earlier, but as a fallback, we'll use placement data if available
        const placement = editorElement.placement || {};
        editorElement.initialState = {
          scaleX: placement.scaleX || fabricObject.scaleX,
          scaleY: placement.scaleY || fabricObject.scaleY,
          left: placement.x || fabricObject.left,
          top: placement.y || fabricObject.top,
          opacity: fabricObject.opacity || 1.0,
        };
      } else {
        // If initialState exists but seems wrong, try to correct it from placement data
        const placement = editorElement.placement || {};
        if (
          placement.x !== undefined &&
          placement.y !== undefined &&
          (Math.abs(editorElement.initialState.left - placement.x) > 1 ||
            Math.abs(editorElement.initialState.top - placement.y) > 1)
        ) {
          // Update initialState with correct placement data if there's a significant difference
          editorElement.initialState.left = placement.x;
          editorElement.initialState.top = placement.y;
          if (placement.scaleX !== undefined)
            editorElement.initialState.scaleX = placement.scaleX;
          if (placement.scaleY !== undefined)
            editorElement.initialState.scaleY = placement.scaleY;
        }
      }

      fabricObject.set({
        scaleX: editorElement.initialState.scaleX,
        scaleY: editorElement.initialState.scaleY,
        left: editorElement.initialState.left,
        top: editorElement.initialState.top,
        opacity: isPartOfActiveGLTransition
          ? currentOpacity
          : editorElement.initialState.opacity,
      });

      // Preserve visibility state for elements in active GL transitions
      if (isPartOfActiveGLTransition) {
        fabricObject.set('visible', currentVisibility);
      }

      fabricObject.setCoords();

      // Force canvas re-render to ensure changes are visible
      if (this.canvas) {
        this.canvas.requestRenderAll();
      }
    }
  }

  updateEditorElement(editorElement) {
    const index = this.editorElements.findIndex(
      el => el.id === editorElement.id
    );
    if (index === -1) return;

    // Save the current state before making changes if not in undo/redo operation
    if (!this.isUndoRedoOperation) {
    }

    // Special handling for subtitles
    if (
      editorElement.type === 'text' &&
      editorElement.subType === 'subtitles'
    ) {
      const existingElement = this.editorElements[index];

      // Update the fabric object text immediately
      if (existingElement.fabricObject) {
        existingElement.fabricObject.set('text', editorElement.properties.text);
        existingElement.fabricObject.set('opacity', 1);
      }

      // Update word objects if text changed
      if (existingElement.properties.text !== editorElement.properties.text) {
        // Remove old word objects
        if (existingElement.properties.wordObjects?.length > 0) {
          existingElement.properties.wordObjects.forEach(obj => {
            if (obj && this.canvas?.contains(obj)) {
              this.canvas.remove(obj);
            }
          });
        }

        // Initialize new word objects immediately
        this.initializeWordAnimations(editorElement);

        // Update visibility based on current time
        const currentTime = this.currentTimeInMs;
        const isInside =
          editorElement.timeFrame.start <= currentTime &&
          currentTime <= editorElement.timeFrame.end;

        if (editorElement.properties.wordObjects) {
          editorElement.properties.wordObjects.forEach((wordObj, index) => {
            if (wordObj && editorElement.properties.words?.[index]) {
              const word = editorElement.properties.words[index];
              const wordIsInside =
                isInside &&
                word.start <= currentTime &&
                currentTime <= word.end;
              wordObj.set('visible', wordIsInside);
            }
          });
        }
      }
    }

    // Update the element in the array
    this.editorElements[index] = editorElement;

    // Request canvas render
    if (this.canvas) {
      this.canvas.requestRenderAll();
    }
  }

  toggleSubtitles(boolean) {
    const subtitleElements = this.editorElements.filter(
      element => element.type === 'text' || element.subType === 'subtitles'
    );

    if (boolean) {
      // Check if subtitles already exist in editorElements
      if (subtitleElements.length > 0) {
        // Subtitles are already visible, no need to do anything
        return;
      }

      // Only restore hidden subtitles if they exist
      if (this.hiddenSubtitles.length > 0) {
        // Shift all existing elements down to make room for subtitles in row 0
        this.shiftRowsDown(0);

        // Restore hidden subtitles back to editorElements in row 0
        const restoredSubtitles = this.hiddenSubtitles.map(subtitle => ({
          ...subtitle,
          row: 0,
        }));
        this.editorElements = [...this.editorElements, ...restoredSubtitles];
        this.hiddenSubtitles = [];
      }
    } else {
      // Only hide subtitles if they exist in editorElements
      if (subtitleElements.length > 0) {
        // Store subtitles in hiddenSubtitles and remove from editorElements
        this.hiddenSubtitles = [...this.hiddenSubtitles, ...subtitleElements];
        this.editorElements = this.editorElements.filter(
          element =>
            !subtitleElements.some(subtitle => subtitle.id === element.id)
        );
        // Clean up empty rows after removing subtitles
        this.optimizedCleanupEmptyRows();
      }
    }

    this.updateSelectedElement();
    this.refreshElements();
  }

  drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.5) {
    if (arguments.length === 2) {
      x = y = 0;
      w = ctx.canvas.width;
      h = ctx.canvas.height;
    }
    offsetX = Math.max(0, Math.min(1, offsetX));
    offsetY = Math.max(0, Math.min(1, offsetY));

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    let r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let ar = 1;

    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    let cw = iw / (nw / w);
    let ch = ih / (nh / h);
    let cx = (iw - cw) * offsetX;
    let cy = (ih - ch) * offsetY;

    cx = Math.max(0, Math.min(iw - cw, cx));
    cy = Math.max(0, Math.min(ih - ch, cy));
    cw = Math.min(cw, iw);
    ch = Math.min(ch, ih);

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  findBestVideoPosition(targetRow, videoDuration) {
    const rowElements = this.editorElements.filter(el => el.row === targetRow);

    if (rowElements.length === 0) {
      return 0; // Empty row, start at beginning
    }

    const sortedElements = [...rowElements].sort(
      (a, b) => a.timeFrame.start - b.timeFrame.start
    );

    // Check space at the beginning
    if (sortedElements[0].timeFrame.start >= videoDuration) {
      return 0;
    }

    // Check gaps between elements
    for (let i = 0; i < sortedElements.length - 1; i++) {
      const gapStart = sortedElements[i].timeFrame.end;
      const gapEnd = sortedElements[i + 1].timeFrame.start;
      if (gapEnd - gapStart >= videoDuration) {
        return gapStart;
      }
    }

    // Check space at the end
    const lastElement = sortedElements[sortedElements.length - 1];
    if (this.maxTime - lastElement.timeFrame.end >= videoDuration) {
      return lastElement.timeFrame.end;
    }

    // No space found, return end of timeline
    return Math.max(0, this.maxTime - videoDuration);
  }

  addVideo(index) {
    const videoElement = document.getElementById(`video-${index}`);
    if (!isHtmlVideoElement(videoElement)) {
      return;
    }
    const videoDurationMs = videoElement.duration * 1000;
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const id = getUid();
    this.addEditorElement({
      id,
      name: `Media(video) ${index + 1}`,
      type: 'video',
      placement: {
        x: 0,
        y: 0,
        width: 100 * aspectRatio,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      timeFrame: {
        start: 0,
        end: videoDurationMs,
      },
      properties: {
        elementId: `video-${id}`,
        src: videoElement.src,
        effect: {
          type: 'none',
        },
      },
    });
  }

  handleVideoUpload(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('video/')) {
        reject(new Error('Invalid file type. Please upload a video file.'));
        return;
      }
      // First, stop any currently playing video
      if (this.playing) {
        this.setPlaying(false);
      }
      // Reset timeline position to 0
      this.setCurrentTimeInMs(0);
      this.updateTimeTo(0);
      const videoElement = document.createElement('video');
      videoElement.preload = 'auto';
      videoElement.playsInline = true;
      videoElement.muted = true;
      const objectUrl = URL.createObjectURL(file);
      videoElement.src = objectUrl;
      const videoId = `${Math.random().toString(36).substr(2, 9)}`;
      videoElement.id = `video-${videoId}`;
      videoElement.onloadedmetadata = async () => {
        // Calculate video duration
        const videoDurationMs = videoElement.duration * 1000;

        // Only update maxTime if video duration is longer than current maxTime
        // This ensures shorter videos don't shrink the timeline
        if (videoDurationMs > this.maxTime) {
          this.setMaxTime(videoDurationMs);
        }
        const generateThumbnails = async () => {
          const thumbnails = [];
          // 1 thumbnail per 3 seconds, at least 3
          const count = Math.max(3, Math.round(videoElement.duration));

          // Get timeline width from your UI or fallback to canvas width
          const timelineWidth =
            document.querySelector('.timelineGrid')?.offsetWidth ||
            window.innerWidth ||
            800;
          // Make thumbnail width so that all thumbnails fill the timeline width
          const thumbWidth = Math.max(
            32,
            Math.floor(videoElement.videoWidth / count)
          );
          // Use a fixed height relative to timeline height or window height (e.g., 10% of timeline or 60px min)
          const timelineHeight =
            document.querySelector('.timelineGrid')?.offsetHeight ||
            window.innerHeight ||
            400;
          const thumbHeight = Math.max(
            40,
            Math.floor(videoElement.videoHeight * 0.12)
          ); // 12% of timeline height, min 40px

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = thumbWidth;
          canvas.height = thumbHeight;

          for (let i = 0; i < count; i++) {
            const time = (videoElement.duration * i) / (count - 3 || 3);
            videoElement.currentTime = time;
            await new Promise(res =>
              videoElement.addEventListener('seeked', res, { once: true })
            );
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
          }
          return thumbnails;
        };
        const thumbnails = await generateThumbnails();
        // Calculate optimal placement and scaling
        const canvasWidth = this.canvas?.width || 1920;
        const canvasHeight = this.canvas?.height || 1080;
        const scale = Math.min(
          canvasWidth / videoElement.videoWidth,
          canvasHeight / videoElement.videoHeight
        );
        const xPos = (canvasWidth - videoElement.videoWidth * scale) / 2;
        // Find a suitable row for the video (similar logic to handleVideoUploadFromUrl)
        const existingElements = this.editorElements;
        let newRow = 0;

        // Check if row 0 has space for video
        const row0Elements = existingElements.filter(el => el.row === 0);
        const hasVideoInRow0 = row0Elements.some(el => el.type === 'video');
        const hasOtherTypesInRow0 = row0Elements.some(
          el => el.type !== 'video'
        );

        if (
          row0Elements.length === 0 ||
          (hasVideoInRow0 && !hasOtherTypesInRow0)
        ) {
          // Row 0 is empty or only has videos - check for space
          if (row0Elements.length === 0) {
            newRow = 0;
          } else {
            // Check if there's space for another video in row 0
            const sortedElements = [...row0Elements].sort(
              (a, b) => a.timeFrame.start - b.timeFrame.start
            );

            let hasSpace = false;

            // Check space at the beginning
            if (sortedElements[0].timeFrame.start >= videoDurationMs) {
              hasSpace = true;
              newRow = 0;
            } else {
              // Check gaps between elements
              for (let i = 0; i < sortedElements.length - 1; i++) {
                const gapStart = sortedElements[i].timeFrame.end;
                const gapEnd = sortedElements[i + 1].timeFrame.start;
                if (gapEnd - gapStart >= videoDurationMs) {
                  hasSpace = true;
                  newRow = 0;
                  break;
                }
              }

              // Check space at the end
              if (!hasSpace) {
                const lastElement = sortedElements[sortedElements.length - 1];
                if (
                  this.maxTime - lastElement.timeFrame.end >=
                  videoDurationMs
                ) {
                  hasSpace = true;
                  newRow = 0;
                }
              }
            }

            if (!hasSpace) {
              newRow = 1;
            }
          }
        } else {
          // Row 0 has other types, find first suitable row
          newRow = 1;
          while (true) {
            const rowElements = existingElements.filter(
              el => el.row === newRow
            );
            if (rowElements.length === 0) {
              break; // Found empty row
            }

            const hasOnlyVideos = rowElements.every(el => el.type === 'video');
            if (hasOnlyVideos) {
              // Check if there's space in this video row
              const sortedElements = [...rowElements].sort(
                (a, b) => a.timeFrame.start - b.timeFrame.start
              );

              let hasSpace = false;

              // Check for gaps
              for (let i = 0; i <= sortedElements.length; i++) {
                const gapStart =
                  i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
                const gapEnd =
                  i === sortedElements.length
                    ? this.maxTime
                    : sortedElements[i].timeFrame.start;

                if (gapEnd - gapStart >= videoDurationMs) {
                  hasSpace = true;
                  break;
                }
              }

              if (hasSpace) {
                break; // Found suitable row
              }
            }

            newRow++;
          }
        }

        // Update maxRows if needed
        this.maxRows = Math.max(this.maxRows, newRow + 1);
        videoElement.playbackRate = this.playbackRate || 1;
        // Hide all existing videos in both DOM and canvas
        const existingVideos = this.editorElements.filter(
          el => el.type === 'video'
        );
        existingVideos.forEach(video => {
          const videoEl = document.getElementById(video.properties.elementId);
          if (videoEl) {
            videoEl.pause();
            videoEl.currentTime = 0;
            videoEl.style.display = 'none';
            videoEl.style.visibility = 'hidden';
            videoEl.style.opacity = '0';
            videoEl.style.pointerEvents = 'none';
          }
          if (video.fabricObject) {
            video.fabricObject.set({
              visible: false,
              opacity: 0,
              selectable: false,
              evented: false,
              zIndex: 0,
            });
            video.fabricObject.setCoords();
          }
        });
        // Add to videos array
        this.videos.push({
          element: videoElement,
          id: videoId,
          url: objectUrl,
          name: `Video`,
          duration: videoDurationMs,
          thumbnails,
        });
        // Ensure we don't have duplicate videos
        const existingElement = this.editorElements.find(
          el => el.id === videoId
        );
        if (!existingElement) {
          // Calculate the highest z-index among existing elements
          const maxZIndex = Math.max(
            ...this.editorElements.map(el => el.properties?.zIndex || 0),
            0
          );
          // Add to editor elements with proper row placement
          this.addEditorElement({
            id: videoId,
            name: `Video`,
            type: 'video',
            placement: {
              x: xPos,
              y: 0,
              width: videoElement.videoWidth * scale,
              height: videoElement.videoHeight * scale,
              rotation: 0,
              scaleX: scale,
              scaleY: scale,
            },
            timeFrame: (() => {
              const startPosition = this.findBestVideoPosition(
                newRow,
                videoDurationMs
              );
              return {
                start: startPosition,
                end: startPosition + videoDurationMs,
              };
            })(),
            row: newRow,
            properties: {
              elementId: `video-${videoId}`,
              src: objectUrl,
              effect: {
                type: 'none',
              },
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              isInTimeline: true,
              thumbnails,
              thumbnailDuration: videoDurationMs / thumbnails.length,
              zIndex: maxZIndex + 1,
              isActive: true,
            },
          });

          // Trigger Redux sync after adding video element
          if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
            window.dispatchSaveTimelineState(this);
          }
          // Show the new video
          videoElement.style.display = 'block';
          videoElement.style.visibility = 'visible';
          videoElement.style.opacity = '1';
          videoElement.style.pointerEvents = 'auto';
          videoElement.style.zIndex = '10000000000001';

          const videoElements = document.querySelectorAll('video');
          videoElements.forEach(video => {
            video.pause();
            video.remove();
          });
          if (this.canvas) {
            this.canvas.getObjects().forEach(obj => {
              this.canvas.remove(obj);
            });

            this.canvas.clear();
            const fabricObject = this.editorElements.find(
              el => el.id === videoId
            )?.fabricObject;
            if (fabricObject) {
              fabricObject.set({
                visible: true,
                opacity: 1,
                selectable: true,
                evented: true,
                zIndex: maxZIndex + 1,
              });
              fabricObject.setCoords();
            }
            this.canvas.renderAll();
            this.canvas.requestRenderAll();
          }
          const debugStartPosition = this.findBestVideoPosition(
            newRow,
            videoDurationMs
          );
        }
        resolve();
      };
      videoElement.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video file.'));
      };
    });
  }

  // Method to add a loading placeholder for video
  addVideoLoadingPlaceholder({ title, row = 0, estimatedDuration = 10000 }) {
    const placeholderId = `loading-video-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Find suitable position for the placeholder
    const startPosition = this.findBestVideoPosition(row, estimatedDuration);

    const placeholderElement = {
      id: placeholderId,
      name: title,
      type: 'video',
      isLoading: true,
      timeFrame: {
        start: startPosition,
        end: startPosition + estimatedDuration,
      },
      properties: {
        src: '',
        isPlaceholder: true,
      },
      fabricObject: null,
      row: row,
    };

    runInAction(() => {
      this.editorElements.push(placeholderElement);
      this.maxRows = Math.max(this.maxRows, row + 1);
    });

    // Trigger Redux sync after adding placeholder
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }

    return placeholderId;
  }

  // Method to replace loading placeholder with actual video
  replaceVideoPlaceholder(placeholderId, videoData) {
    const elementIndex = this.editorElements.findIndex(
      el => el.id === placeholderId && el.isLoading
    );

    if (elementIndex !== -1) {
      runInAction(() => {
        // Remove the old placeholder element
        const oldElement = this.editorElements[elementIndex];

        // Replace with new video data
        this.editorElements[elementIndex] = {
          ...oldElement,
          ...videoData,
          isLoading: false,
        };

        // Ensure the fabric object is properly set up
        if (videoData.fabricObject && videoData.placement) {
          const fabricVideo = videoData.fabricObject;
          fabricVideo.set({
            left: videoData.placement.x,
            top: videoData.placement.y,
            width: videoData.placement.width,
            height: videoData.placement.height,
            scaleX: videoData.placement.scaleX,
            scaleY: videoData.placement.scaleY,
            angle: videoData.placement.rotation || 0,
          });

          // Make sure the fabric object is properly added to canvas
          if (!this.canvas.contains(fabricVideo)) {
            this.canvas.add(fabricVideo);
          }

          // Render the canvas to show the changes
          this.canvas.renderAll();
        }
      });

      // Trigger Redux sync after replacing placeholder
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  async handleVideoUploadFromUrl({
    url,
    title = 'Video',
    key = null,
    duration = null,
    row = 0,
    startTime = null, // New parameter for gallery ghost positioning
    isNeedLoader = true,
  }) {
    let placeholderId = null;
    // Add loading placeholder immediately
    if (isNeedLoader) {
      placeholderId = this.addVideoLoadingPlaceholder({
        title: title || 'Loading Animation...',
        row,
        estimatedDuration: duration || 10000,
      });
    }

    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.preload = 'auto';
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.crossOrigin = 'anonymous';
      videoElement.src = `${url}?v=${Date.now()}`;
      videoElement.style.display = 'none';
      videoElement.muted = false;
      videoElement.volume = 1.0;
      videoElement.controls = true;
      document.body.appendChild(videoElement);

      const videoId = key || `video-${Math.random().toString(36).substr(2, 9)}`;
      videoElement.id = `video-${videoId}`;

      videoElement.onloadedmetadata = async () => {
        const videoDurationMs = videoElement?.duration
          ? videoElement.duration * 1000
          : duration;

        const generateThumbnails = async () => {
          const thumbnails = [];
          const count = Math.max(3, Math.round(videoElement.duration));
          const timelineWidth =
            document.querySelector('.timelineGrid')?.offsetWidth || 800;
          const thumbWidth = Math.floor(timelineWidth / count);
          const timelineHeight =
            document.querySelector('.timelineGrid')?.offsetHeight || 400;
          const thumbHeight = Math.max(40, Math.floor(timelineHeight * 0.12));
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = thumbWidth;
          canvas.height = thumbHeight;

          for (let i = 0; i < count; i++) {
            const time = (videoElement.duration * i) / (count - 3 || 3);
            videoElement.currentTime = time;
            await new Promise(res =>
              videoElement.addEventListener('seeked', res, { once: true })
            );
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
          }
          return thumbnails;
        };

        const thumbnails = await generateThumbnails();
        const canvasWidth = this.canvas?.width || 1920;
        const canvasHeight = this.canvas?.height || 1080;
        const scale = Math.min(
          canvasWidth / videoElement.videoWidth,
          canvasHeight / videoElement.videoHeight
        );
        const xPos = (canvasWidth - videoElement.videoWidth * scale) / 2;

        // Find a suitable row for the video
        const existingElements = this.editorElements;
        let targetRow = row;

        // If row is not explicitly specified, find a suitable row
        if (row === 0) {
          // Check if row 0 has space for video
          const row0Elements = existingElements.filter(el => el.row === 0);
          const hasVideoInRow0 = row0Elements.some(el => el.type === 'video');
          const hasOtherTypesInRow0 = row0Elements.some(
            el => el.type !== 'video'
          );

          if (
            row0Elements.length === 0 ||
            (hasVideoInRow0 && !hasOtherTypesInRow0)
          ) {
            // Row 0 is empty or only has videos - check for space
            if (row0Elements.length === 0) {
              targetRow = 0;
            } else {
              // Check if there's space for another video in row 0
              const sortedElements = [...row0Elements].sort(
                (a, b) => a.timeFrame.start - b.timeFrame.start
              );

              let hasSpace = false;
              const videoDuration = videoDurationMs;

              // Check space at the beginning
              if (sortedElements[0].timeFrame.start >= videoDuration) {
                hasSpace = true;
                targetRow = 0;
              } else {
                // Check gaps between elements
                for (let i = 0; i < sortedElements.length - 1; i++) {
                  const gapStart = sortedElements[i].timeFrame.end;
                  const gapEnd = sortedElements[i + 1].timeFrame.start;
                  if (gapEnd - gapStart >= videoDuration) {
                    hasSpace = true;
                    targetRow = 0;
                    break;
                  }
                }

                // Check space at the end
                if (!hasSpace) {
                  const lastElement = sortedElements[sortedElements.length - 1];
                  if (
                    this.maxTime - lastElement.timeFrame.end >=
                    videoDuration
                  ) {
                    hasSpace = true;
                    targetRow = 0;
                  }
                }
              }

              if (!hasSpace) {
                targetRow = 1;
              }
            }
          } else {
            // Row 0 has other types, find first suitable row
            targetRow = 1;
            while (true) {
              const rowElements = existingElements.filter(
                el => el.row === targetRow
              );
              if (rowElements.length === 0) {
                break; // Found empty row
              }

              const hasOnlyVideos = rowElements.every(
                el => el.type === 'video'
              );
              if (hasOnlyVideos) {
                // Check if there's space in this video row
                const sortedElements = [...rowElements].sort(
                  (a, b) => a.timeFrame.start - b.timeFrame.start
                );

                let hasSpace = false;
                const videoDuration = videoDurationMs;

                // Check for gaps
                for (let i = 0; i <= sortedElements.length; i++) {
                  const gapStart =
                    i === 0 ? 0 : sortedElements[i - 1].timeFrame.end;
                  const gapEnd =
                    i === sortedElements.length
                      ? this.maxTime
                      : sortedElements[i].timeFrame.start;

                  if (gapEnd - gapStart >= videoDuration) {
                    hasSpace = true;
                    break;
                  }
                }

                if (hasSpace) {
                  break; // Found suitable row
                }
              }

              targetRow++;
            }
          }
        }

        this.maxRows = Math.max(this.maxRows, targetRow + 1);
        videoElement.playbackRate = this.playbackRate || 1;

        // Find existing video elements that might be temporary (local blob URLs)
        const existingVideoElements = this.editorElements.filter(
          el => el.type === 'video' && el.properties?.src?.startsWith('blob:')
        );

        // Use the same row as the existing video element if it exists
        if (existingVideoElements.length > 0) {
          targetRow = existingVideoElements[0].row;
        }

        // Check if we need to update existing video or add new one
        const existingVideoIndex = this.videos.findIndex(
          v =>
            existingVideoElements.length > 0 &&
            existingVideoElements.some(
              el =>
                v.element && v.element.src && v.element.src.startsWith('blob:')
            )
        );

        if (existingVideoIndex !== -1) {
          // Update existing video
          this.videos[existingVideoIndex] = {
            element: videoElement,
            id: videoId,
            url,
            name: title,
            duration: videoDurationMs,
            thumbnails,
          };
        } else {
          // Add new video
          this.videos.push({
            element: videoElement,
            id: videoId,
            url,
            name: title,
            duration: videoDurationMs,
            thumbnails,
          });
        }

        // Check if there's a loading placeholder to replace
        const placeholderElement = this.editorElements.find(
          el => el.isLoading && el.type === 'video' && el.row === targetRow
        );

        const existingElement = this.editorElements.find(
          el => el.id === videoId
        );

        if (placeholderElement) {
          // Replace the placeholder with the actual video
          const fabricVideo = new fabric.VideoImage(videoElement, {
            left: xPos,
            top: 0,
            width: videoElement.videoWidth * scale,
            height: videoElement.videoHeight * scale,
            scaleX: scale,
            scaleY: scale,
            angle: 0,
            selectable: true,
            objectCaching: false,
            lockUniScaling: false,
            hasControls: true,
            hasBorders: true,
            type: 'video',
          });
          this.canvas.add(fabricVideo);

          // Force canvas to render and ensure video is visible
          this.canvas.requestRenderAll();

          this.replaceVideoPlaceholder(placeholderId, {
            id: videoId,
            name: title,
            type: 'video',
            placement: {
              x: xPos,
              y: 0,
              width: videoElement.videoWidth * scale,
              height: videoElement.videoHeight * scale,
              rotation: 0,
              scaleX: scale,
              scaleY: scale,
            },
            timeFrame: {
              start: placeholderElement.timeFrame.start,
              end: placeholderElement.timeFrame.start + videoDurationMs,
            },
            properties: {
              elementId: `video-${videoId}`,
              src: url,
              effect: { type: 'none' },
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              isInTimeline: true,
              thumbnails,
              thumbnailDuration: videoDurationMs / thumbnails.length,
              duration: videoDurationMs,
            },
            fabricObject: fabricVideo,
            row: targetRow,
          });

          // Refresh elements after replacing placeholder
          this.refreshElements();
        } else if (!existingElement) {
          // Create fabric.VideoImage object
          const fabricVideo = new fabric.VideoImage(videoElement, {
            left: xPos,
            top: 0,
            width: videoElement.videoWidth * scale,
            height: videoElement.videoHeight * scale,
            scaleX: scale,
            scaleY: scale,
            angle: 0,
            selectable: true,
            objectCaching: false,
            lockUniScaling: false, // Allow resizing for video elements
            hasControls: true, // Enable resize controls for video
            hasBorders: true, // Enable borders for video
            type: 'video',
          });

          this.canvas.add(fabricVideo);

          // Check if we need to replace an existing temporary video element
          if (existingVideoElements.length > 0) {
            const tempElement = existingVideoElements[0];

            // Update the existing element instead of creating a new one
            const elementIndex = this.editorElements.findIndex(
              el => el.id === tempElement.id
            );

            if (elementIndex !== -1) {
              // Remove old fabric object if it exists
              if (
                tempElement.fabricObject &&
                this.canvas.contains(tempElement.fabricObject)
              ) {
                this.canvas.remove(tempElement.fabricObject);
              }

              // Update video element ID to match new videoId
              videoElement.id = `video-${videoId}`;

              // Update the element in place using runInAction for MobX
              runInAction(() => {
                const startPosition =
                  startTime !== null
                    ? startTime
                    : this.findBestVideoPosition(targetRow, videoDurationMs);
                this.editorElements[elementIndex] = {
                  ...tempElement,
                  name: title,
                  type: 'video',
                  timeFrame: {
                    start: startPosition,
                    end: startPosition + videoDurationMs,
                  },
                  properties: {
                    ...tempElement.properties,
                    elementId: `video-${videoId}`,
                    src: url,
                    thumbnails,
                    thumbnailDuration: videoDurationMs / thumbnails.length,
                    duration: videoDurationMs,
                    isInTimeline: true,
                  },
                  fabricObject: fabricVideo,
                };
              });

              // Trigger Redux sync after updating editorElements
              if (
                window.dispatchSaveTimelineState &&
                !this.isUndoRedoOperation
              ) {
                window.dispatchSaveTimelineState(this);
              }
            }
          } else {
            // Create new element if no temporary element exists
            this.addEditorElement({
              id: videoId,
              name: title,
              type: 'video',
              placement: {
                x: xPos,
                y: 0,
                width: videoElement.videoWidth * scale,
                height: videoElement.videoHeight * scale,
                rotation: 0,
                scaleX: scale,
                scaleY: scale,
              },
              timeFrame: (() => {
                const startPosition =
                  startTime !== null
                    ? startTime
                    : this.findBestVideoPosition(targetRow, videoDurationMs);
                return {
                  start: startPosition,
                  end: startPosition + videoDurationMs,
                };
              })(),
              row: targetRow,
              properties: {
                elementId: `video-${videoId}`,
                src: url,
                effect: { type: 'none' },
                width: videoElement.videoWidth,
                height: videoElement.videoHeight,
                isInTimeline: true,
                thumbnails,
                thumbnailDuration: videoDurationMs / thumbnails.length,
                duration: videoDurationMs,
              },
              fabricObject: fabricVideo,
            });

            // Trigger Redux sync after adding new element
            if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
              window.dispatchSaveTimelineState(this);
            }
          }

          // Refresh the timeline to show updated video element

          this.refreshElements();

          const debugStartPosition2 = this.findBestVideoPosition(
            targetRow,
            videoDurationMs
          );
        }

        resolve();
      };

      videoElement.onerror = e => {
        console.error('Error loading video:', e);

        // Remove the loading placeholder on error
        if (placeholderId) {
          const placeholderIndex = this.editorElements.findIndex(
            el => el.id === placeholderId && el.isLoading
          );
          if (placeholderIndex !== -1) {
            runInAction(() => {
              this.editorElements.splice(placeholderIndex, 1);
            });
          }
        }

        reject(new Error('Failed to load video from URL'));
      };
    });
  }

  addPlaceholderImage = ({
    imageId,
    startTime,
    endTime,
    pointId,
    sentence,
    row,
  }) => {
    return new Promise(resolve => {
      const canvasWidth = this.canvas?.width || 0;
      const maxCanvasHeight = this.canvas?.height || 0;

      const placeholderUrl =
        'https://storage.googleapis.com/images-livespro/1749852534414-min-1200px-hd-transparent-picture-png.webp';
      // Add cache busting for placeholder to prevent tainted canvas
      const cacheBustPlaceholderUrl = placeholderUrl + '?_cb=' + Date.now();

      fabric.Image.fromURL(
        cacheBustPlaceholderUrl,
        img => {
          const scale =
            Math.min(canvasWidth / img.width, maxCanvasHeight / img.height) *
            0.5;

          const regularLeft = (canvasWidth - img.width * scale) / 2;
          const regularTop = (maxCanvasHeight - img.height * scale) / 2;

          // Configure fabric object
          img.set({
            name: imageId || getUid(),
            left: regularLeft,
            top: regularTop,
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            lockUniScaling: true,
            objectCaching: true,
            opacity: 0.5, // Make placeholder semi-transparent
          });

          const element = {
            id: imageId || getUid(),
            name: `Media(placeholder) ${this.editorElements.length + 1}`,
            type: 'imageUrl',
            subType: 'placeholder',
            pointId,
            sentence,
            placement: {
              x: regularLeft,
              y: regularTop,
              width: img.width * scale,
              height: img.height * scale,
              rotation: 0,
              scaleX: scale,
              scaleY: scale,
            },
            timeFrame: {
              start: startTime,
              end: endTime,
            },
            row: row,
            from: 0,
            isDragging: false,
            properties: {
              src: 'https://storage.googleapis.com/images-livespro/1749852534414-min-1200px-hd-transparent-picture-png.webp',
              minUrl:
                'https://storage.googleapis.com/images-livespro/1749852534414-min-1200px-hd-transparent-picture-png.webp',
              effect: {
                type: 'none',
              },
              width: img.width,
              height: img.height,
            },
            fabricObject: img,
          };

          this.addEditorElement(element, true);

          if (this.canvas) {
            this.canvas.add(img);
            this.canvas.renderAll();
          }

          resolve(element);
        },
        { crossOrigin: 'anonymous' }
      );
    });
  };

  addImageLocal({ url, minUrl, startTime = 0, endTime, row = 0 }) {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No URL provided for image'));
        return;
      }

      const imageElement = new Image();
      imageElement.crossOrigin = 'Anonymous';

      console.log('Adding image from URL:', url);

      // Don't add cache busting to blob URLs - they don't support query parameters
      const cacheBustUrl = url.startsWith('blob:')
        ? url
        : url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();

      const loadImage = () => {
        try {
          fabric.Image.fromURL(
            cacheBustUrl,
            img => {
              const canvasWidth = this.canvas.getWidth();
              const canvasHeight = this.canvas.getHeight();

              const scale = Math.min(
                canvasWidth / img.width,
                canvasHeight / img.height
              );
              const regularLeft = (canvasWidth - img.width * scale) / 2;
              const regularTop = (canvasHeight - img.height * scale) / 2;

              const id = getUid();
              const newElement = {
                id,
                name: `Media(imageUrl) ${this.editorElements.length + 1}`,
                type: 'imageUrl',
                placement: {
                  x: regularLeft,
                  y: regularTop,
                  width: img.width * scale,
                  height: img.height * scale,
                  rotation: 0,
                  scaleX: scale,
                  scaleY: scale,
                },
                timeFrame: {
                  start: startTime,
                  end: endTime || startTime + 5000,
                },
                row,
                from: startTime,
                to: endTime || startTime + 5000,
                isDragging: false,
                properties: {
                  src: url,
                  minUrl,
                  effect: { type: 'none' },
                  width: img.width,
                  height: img.height,
                },
              };

              const sortedElements = [...this.editorElements].sort((a, b) => {
                if (a.type === 'text' && b.type !== 'text') return 1;
                if (b.type === 'text' && a.type !== 'text') return -1;
                return b.row - a.row;
              });

              let insertIndex = sortedElements.findIndex(el => el.row <= row);
              if (insertIndex === -1) insertIndex = sortedElements.length;
              sortedElements.splice(insertIndex, 0, newElement);

              // Use img directly, no second fabric.Image()
              img.set({
                name: id,
                left: regularLeft,
                top: regularTop,
                scaleX: scale,
                scaleY: scale,
                selectable: true,
                objectCaching: true,
              });

              newElement.fabricObject = img;

              runInAction(() => {
                this.editorElements = sortedElements;
              });

              if (
                window.dispatchSaveTimelineState &&
                !this.isUndoRedoOperation
              ) {
                window.dispatchSaveTimelineState(this);
              }

              this.canvas.add(img);

              // Let refreshElements handle stacking, or enforce after
              this.refreshElements();
              this.canvas.requestRenderAll();

              resolve();
            },
            err => {
              console.error('Fabric failed to load image:', err);
              reject(err);
            },
            { crossOrigin: 'anonymous' }
          );
        } catch (error) {
          console.error('Error loading image:', error);
          reject(error);
        }
      };

      imageElement.onload = () => {
        loadImage();
      };

      imageElement.onerror = error => {
        console.error('Image failed to load from URL:', url, error);
        console.error(
          'URL type:',
          url.startsWith('blob:') ? 'blob URL' : 'regular URL'
        );
        reject(new Error(`Failed to load image from ${url}`));
      };

      // Set src after event handlers are attached
      imageElement.src = cacheBustUrl;

      // Handle already-loaded/cached images
      if (imageElement.complete && imageElement.naturalWidth > 0) {
        loadImage();
      }
    });
  }

  addImageToCanvas = ({
    store,
    url,
    minUrl,
    imageId,
    startTime,
    endTime,
    pointId,
    point,
    sentence,
    storyId,
    row,
    isExisting = false,
  }) => {
    const hasElementsInFirstRow = this.editorElements.some(
      element => element.row === 1 && element.type !== 'imageUrl'
    );

    // If row 0 is occupied, shift everything down first
    if (hasElementsInFirstRow) {
      this.shiftRowsDown(1);
    }

    if (!url) {
      return this.addPlaceholderImage({
        imageId,
        startTime,
        endTime,
        pointId,
        sentence,
        storyId,
        row: row ? row : hasElementsInFirstRow ? 1 : 0,
      });
    }

    return new Promise((resolve, reject) => {
      const imageElement = new Image();
      imageElement.crossOrigin = 'Anonymous';
      // Add cache busting parameter to force fresh CORS load
      const cacheBustUrl =
        url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
      console.log(cacheBustUrl);
      imageElement.src = cacheBustUrl;

      imageElement.onload = () => {
        try {
          fabric.Image.fromURL(
            cacheBustUrl,
            img => {
              const canvasWidth = store.canvas.width;
              const maxCanvasHeight = store.canvas.height;

              const scale = Math.min(
                canvasWidth / img.width,
                maxCanvasHeight / img.height
              );

              const regularLeft = (canvasWidth - img.width * scale) / 2;
              const regularTop = (maxCanvasHeight - img.height * scale) / 2;

              const id = imageId || getUid();

              store.addEditorElement(
                {
                  id,
                  name: `Media(imageUrl) ${store.editorElements.length + 1}`,
                  type: 'imageUrl',
                  pointId,
                  point,
                  sentence,
                  storyId,
                  placement: {
                    x: regularLeft,
                    y: regularTop,
                    width: img.width * scale,
                    height: img.height * scale,
                    rotation: 0,
                    scaleX: scale,
                    scaleY: scale,
                  },
                  defaultState: {
                    scaleX: scale,
                    scaleY: scale,
                    left: regularLeft,
                    top: regularTop,
                    opacity: 1,
                  },
                  timeFrame: {
                    start: startTime,
                    end: endTime,
                  },
                  row: row ? row : hasElementsInFirstRow ? 1 : 0,
                  from: 0,
                  isDragging: false,
                  properties: {
                    src: url,
                    minUrl,
                    effect: {
                      type: 'none',
                    },
                    width: img.width,
                    height: img.height,
                    background: {
                      color: '#000000',
                      opacity: 0,
                    },
                  },
                },
                true
              );

              resolve();
            },
            null,
            { crossOrigin: 'anonymous' }
          );
        } catch (error) {
          console.error('Error during refreshElements:', error);
          reject(error);
        }
      };

      imageElement.onerror = error => {
        console.error('Image failed to load:', error);
        reject(error);
      };
    });
  };

  setImageOnCanvas = ({ url, element }) => {
    const { id, pointId, sentence, timeFrame, row } = element;

    const hasElementsInFirstRow = this.editorElements.some(
      element => element.row === 1 && element.type !== 'imageUrl'
    );

    if (!url) {
      return this.addPlaceholderImage({
        imageId: id,
        startTime: timeFrame.start,
        endTime: timeFrame.end,
        pointId,
        sentence,
        storyId: this.storyId,
        row: row ? row : hasElementsInFirstRow ? 1 : 0,
      });
    }

    return new Promise((resolve, reject) => {
      const imageElement = new Image();
      imageElement.crossOrigin = 'Anonymous';
      // Add cache busting parameter to force fresh CORS load
      const cacheBustUrl =
        url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
      imageElement.src = cacheBustUrl;

      imageElement.onload = () => {
        try {
          fabric.Image.fromURL(
            cacheBustUrl,
            img => {
              // Create new fabricObject
              img.set({
                name: id,
                left: element.placement.x,
                top: element.placement.y,
                angle: element.placement.rotation,
                scaleX: element.placement.scaleX,
                scaleY: element.placement.scaleY,
                selectable: true,
                lockUniScaling: true,
                objectCaching: true,
              });

              const updatedElement = {
                ...element,
                properties: {
                  ...element.properties,
                  effect: {
                    type: 'none',
                  },
                  width: img.width,
                  height: img.height,
                },
                isDragging: false,
                name: `Media(imageUrl)`,
                fabricObject: img,
                initialState: {
                  scaleX: element.placement.scaleX,
                  scaleY: element.placement.scaleY,
                  left: element.placement.x,
                  top: element.placement.y,
                  opacity: 1.0,
                },
              };

              // Add new fabricObject to canvas
              this.canvas.add(img);

              this.addEditorElement(updatedElement, true);

              resolve();
            },
            { crossOrigin: 'anonymous' }
          );
        } catch (error) {
          console.error('Error during refreshElements:', error);
          reject(error);
        }
      };

      imageElement.onerror = error => {
        console.error('Image failed to load:', error);
        reject(error);
      };
    });
  };

  updateCanvasImage = async ({ url, minUrl, pointId, id }) => {
    return await new Promise((resolve, reject) => {
      console.log('Updating canvas image with URL:', url);
      // Find the existing element
      const existingElement = this.editorElements.find(
        el => el.type === 'imageUrl' && (el.id === id || el.pointId === pointId)
      );

      if (!existingElement) {
        resolve();
        return;
      }

      // If url is null, undefined, or empty string, update the element to show placeholder instead
      if (!url || url === null || url === undefined) {
        // Remove existing fabricObject from canvas if it exists
        if (existingElement.fabricObject && this.canvas) {
          this.canvas.remove(existingElement.fabricObject);
          existingElement.fabricObject = null;
        }

        const placeholderUrl =
          'https://storage.googleapis.com/images-livespro/1749852534414-min-1200px-hd-transparent-picture-png.webp';

        // Add cache busting to placeholder as well
        const cacheBustPlaceholderUrl = placeholderUrl + '?_cb=' + Date.now();

        fabric.Image.fromURL(
          cacheBustPlaceholderUrl,
          img => {
            const canvasWidth = this.canvas?.width || 0;
            const maxCanvasHeight = this.canvas?.height || 0;

            // Check if element already has custom placement
            const hasCustomPlacement =
              existingElement.placement &&
              existingElement.placement.x !== undefined &&
              existingElement.placement.y !== undefined &&
              existingElement.subType !== 'placeholder';

            let finalLeft, finalTop, finalScaleX, finalScaleY;

            if (hasCustomPlacement) {
              // Keep existing position and scale if user has positioned the image
              finalLeft = existingElement.placement.x;
              finalTop = existingElement.placement.y;
              finalScaleX = existingElement.placement.scaleX || 1;
              finalScaleY = existingElement.placement.scaleY || 1;
            } else {
              // Center placeholder images (same scaling logic as addImageToCanvas)
              const scale = Math.min(
                canvasWidth / img.width,
                maxCanvasHeight / img.height
              );
              finalLeft = (canvasWidth - img.width * scale) / 2;
              finalTop = (maxCanvasHeight - img.height * scale) / 2;
              finalScaleX = scale;
              finalScaleY = scale;
            }

            // Configure the fabric object
            img.set({
              name: existingElement.id,
              left: finalLeft,
              top: finalTop,
              scaleX: finalScaleX,
              scaleY: finalScaleY,
              selectable: true,
              lockUniScaling: true,
              objectCaching: true,
              opacity: 0.5,
            });

            const updatedElement = {
              ...existingElement,
              subType: 'placeholder',
              placement: {
                ...existingElement.placement,
                x: finalLeft,
                y: finalTop,
                width: img.width * finalScaleX,
                height: img.height * finalScaleY,
                rotation: existingElement.placement.rotation || 0,
                scaleX: finalScaleX,
                scaleY: finalScaleY,
              },
              defaultState: {
                scaleX: finalScaleX,
                scaleY: finalScaleY,
                left: finalLeft,
                top: finalTop,
                opacity: 1,
              },
              properties: {
                ...existingElement.properties,
                src: placeholderUrl,
                minUrl: placeholderUrl,
                width: img.width,
                height: img.height,
              },
              fabricObject: img,
            };

            // Update the element in editorElements
            this.editorElements = this.editorElements.map(el => {
              if (el.id === existingElement.id) {
                return updatedElement;
              }
              return el;
            });

            // Sync with Redux timeline state
            if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
              window.dispatchSaveTimelineState(this);
            }

            // Add new fabricObject to canvas
            if (this.canvas) {
              this.canvas.add(img);
              this.canvas.renderAll();
            }

            this.refreshElements();
            resolve();
          },
          { crossOrigin: 'anonymous' }
        );
        return;
      }

      // Load image as blob URL for better CORS handling
      this.loadImageAsBlobUrl(url)
        .then(blobUrl => {
          console.log('Loaded blob URL for image update:', blobUrl);
          const imageElement = new Image();
          imageElement.crossOrigin = 'Anonymous';
          imageElement.src = blobUrl;

          imageElement.onerror = error => {
            console.error('Image failed to load:', error);

            // Clean up blob URL on error
            if (blobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(blobUrl);
            }

            // Update element to show placeholder instead of removing it
            const updatedElement = {
              ...existingElement,
              properties: {
                ...existingElement.properties,
                src: null,
                minUrl: null,
              },
            };

            // Remove existing fabricObject from canvas if it exists
            if (existingElement.fabricObject && this.canvas) {
              this.canvas.remove(existingElement.fabricObject);
              existingElement.fabricObject = null;
            }

            // Direct update without saving to history yet
            this.editorElements = this.editorElements.map(el => {
              if (el.id === existingElement.id) {
                return updatedElement;
              }
              return el;
            });

            // Save to history after the update is complete

            // Sync with Redux timeline state
            if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
              window.dispatchSaveTimelineState(this);
            }

            this.refreshElements();

            resolve();
          };

          imageElement.onload = () => {
            try {
              // Remove existing fabricObject from canvas if it exists
              if (existingElement.fabricObject && this.canvas) {
                this.canvas.remove(existingElement.fabricObject);
                existingElement.fabricObject = null;
              }

              fabric.Image.fromURL(
                blobUrl,
                img => {
                  const canvasWidth = this.canvas.width;
                  const maxCanvasHeight = this.canvas.height;

                  // Preserve existing placement if the image has been positioned by user
                  const hasCustomPlacement =
                    existingElement.placement &&
                    existingElement.placement.x !== undefined &&
                    existingElement.placement.y !== undefined &&
                    existingElement.subType !== 'placeholder';

                  let finalLeft, finalTop, finalScaleX, finalScaleY;

                  if (hasCustomPlacement) {
                    // Keep existing position and scale if user has positioned the image
                    finalLeft = existingElement.placement.x;
                    finalTop = existingElement.placement.y;
                    finalScaleX = existingElement.placement.scaleX || 1;
                    finalScaleY = existingElement.placement.scaleY || 1;
                  } else {
                    // Center and scale new images or placeholders (same as addImageToCanvas)
                    const scale = Math.min(
                      canvasWidth / img.width,
                      maxCanvasHeight / img.height
                    );
                    finalLeft = (canvasWidth - img.width * scale) / 2;
                    finalTop = (maxCanvasHeight - img.height * scale) / 2;
                    finalScaleX = scale;
                    finalScaleY = scale;
                  }

                  // Create new fabricObject
                  img.set({
                    name: existingElement.id,
                    left: finalLeft,
                    top: finalTop,
                    angle: existingElement.placement.rotation || 0,
                    scaleX: finalScaleX,
                    scaleY: finalScaleY,
                    selectable: true,
                    lockUniScaling: true,
                    objectCaching: true,
                  });

                  // Update the existing element with new image properties (like addImageToCanvas)
                  const updatedElement = {
                    ...existingElement,
                    subType: 'image',
                    placement: {
                      ...existingElement.placement,
                      x: finalLeft,
                      y: finalTop,
                      width: img.width * finalScaleX,
                      height: img.height * finalScaleY,
                      rotation: existingElement.placement.rotation || 0,
                      scaleX: finalScaleX,
                      scaleY: finalScaleY,
                    },
                    defaultState: {
                      scaleX: finalScaleX,
                      scaleY: finalScaleY,
                      left: finalLeft,
                      top: finalTop,
                      opacity: 1,
                    },
                    properties: {
                      ...existingElement.properties,
                      src: url,
                      minUrl: minUrl,
                      width: img.width,
                      height: img.height,
                    },
                    fabricObject: img,
                  };

                  // Add new fabricObject to canvas
                  this.canvas.add(img);

                  // Direct update without removing/adding
                  this.editorElements = this.editorElements.map(el => {
                    if (el.id === existingElement.id) {
                      return updatedElement;
                    }
                    return el;
                  });

                  // Save to history after the update is complete

                  // Sync with Redux timeline state
                  if (
                    window.dispatchSaveTimelineState &&
                    !this.isUndoRedoOperation
                  ) {
                    window.dispatchSaveTimelineState(this);
                  }

                  this.refreshElements();

                  // Force canvas cleanup to prevent tainted canvas issues
                  this.forceCanvasCleanup()
                    .then(() => {
                      if (blobUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(blobUrl);
                      }
                      resolve();
                    })
                    .catch(() => {
                      if (blobUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(blobUrl);
                      }
                      resolve();
                    });
                },
                null,
                { crossOrigin: 'anonymous' }
              );
            } catch (error) {
              console.error('Error updating canvas image:', error);
              reject(error);
            }
          };
        })
        .catch(error => {
          console.error('Failed to load image as blob:', error);
          reject(error);
        });
    });
  };

  // Helper method to load image as Blob URL with proper CORS
  async loadImageAsBlobUrl(url) {
    console.log('Loading image as blob URL for CORS:', url);
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      return url;
    }
  }

  // Method to force clean canvas and prevent tainted canvas issues
  async forceCanvasCleanup() {
    if (!this.canvas) return;

    try {
      // Force render all objects
      this.canvas.requestRenderAll();

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test if canvas is origin-clean by trying to access pixel data
      const ctx = this.canvas.getContext
        ? this.canvas.getContext('2d')
        : this.canvas.contextContainer;
      if (ctx) {
        try {
          ctx.getImageData(0, 0, 1, 1);
        } catch (securityError) {
          // Force a complete refresh of elements if canvas is still tainted
          await this.refreshElements();
        }
      }
    } catch (error) {
      // Swallow cleanup errors
    }
  }

  addAudio(index) {
    const audioElement = document.getElementById(`audio-${index}`);
    if (!isHtmlAudioElement(audioElement)) {
      return;
    }
    const audioDurationMs = audioElement.duration * 1000;
    const id = getUid();

    // Find the first available row
    const usedRows = new Set(
      this.editorElements
        .filter(el => el.type === 'audio' || el.type === 'sound')
        .map(el => el.row || 0)
    );

    let newRow = 0;
    while (usedRows.has(newRow)) {
      newRow++;
    }

    // Update maxRows if needed
    this.maxRows = Math.max(this.maxRows, newRow + 1);

    this.addEditorElement({
      id,
      name: `Media(audio) ${index + 1}`,
      type: 'sound',
      placement: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      row: newRow,
      timeFrame: {
        start: 0,
        end: audioDurationMs,
      },
      properties: {
        elementId: `audio-${id}`,
        src: audioElement.src,
      },
    });
  }

  async addExistingAudio({
    base64Audio,
    durationMs,
    duration,
    row,
    startTime = 0,
    audioType,
    id,
    text,
    name,
    audioOffset,
    autoSubtitles = false,
    properties,
  }) {
    let audioSrc;
    if (base64Audio.startsWith('//')) {
      audioSrc = `data:audio/wav;base64,${base64Audio}`;
    } else {
      audioSrc = base64Audio;
    }

    // Find the first available row if row is not specified
    if (row === undefined) {
      const usedRows = new Set(
        this.editorElements
          .filter(el => el.type === 'audio' || el.type === 'sound')
          .map(el => el.row || 0)
      );

      row = 0;
      while (usedRows.has(row)) {
        row++;
      }
    }
    this.maxRows = Math.max(this.maxRows, row + 1);
    this.addEditorElement({
      id,
      name,
      type: 'audio',
      placement: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      row,
      from: 1,
      content: 'Upbeat Corporate',
      left: 0,
      top: 0,
      isDragging: false,
      duration: durationMs,
      timeFrame: {
        start: startTime,
        end: startTime + durationMs,
      },
      properties: {
        ...properties,
        elementId: `audio-${id}`,
        src: audioSrc,
        audioType: audioType,
        autoSubtitles: autoSubtitles,
        text: text,
      },
    });

    this.refreshElements();

    return true;
  }

  async addExistingVideo({
    src,
    id,
    name,
    row,
    startTime = 0,
    duration,
    width,
    height,
    placement,
    properties,
    timeFrame,
  }) {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.preload = 'auto';
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.crossOrigin = 'anonymous';
      videoElement.src = src;
      videoElement.style.display = 'none';
      videoElement.controls = true;
      videoElement.id = properties?.elementId || `video-${id}`;
      document.body.appendChild(videoElement);

      videoElement.onloadedmetadata = () => {
        try {
          // Add video to videos array
          this.videos.push({
            element: videoElement,
            id: id,
            url: src,
            name: name,
            duration: duration,
            thumbnails: properties?.thumbnails || [],
          });

          // Create fabric video object
          const fabricVideo = new fabric.VideoImage(videoElement, {
            left: placement?.x || 0,
            top: placement?.y || 0,
            width: placement?.width || videoElement.videoWidth,
            height: placement?.height || videoElement.videoHeight,
            scaleX: placement?.scaleX || 1,
            scaleY: placement?.scaleY || 1,
            angle: placement?.rotation || 0,
            selectable: true,
            objectCaching: false,
            lockUniScaling: false,
            hasControls: true,
            hasBorders: true,
            type: 'video',
          });

          // Create editor element
          const editorElement = {
            id: id,
            name: name,
            type: 'video',
            placement: placement || {
              x: 0,
              y: 0,
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            timeFrame: timeFrame || {
              start: startTime,
              end: startTime + duration,
            },
            properties: {
              elementId: properties?.elementId || `video-${id}`,
              src: src,
              effect: properties?.effect || { type: 'none' },
              width: width || videoElement.videoWidth,
              height: height || videoElement.videoHeight,
              isInTimeline: true,
              thumbnails: properties?.thumbnails || [],
              thumbnailDuration:
                properties?.thumbnailDuration ||
                duration / (properties?.thumbnails?.length || 1),
              duration: duration,
              ...properties,
            },
            fabricObject: fabricVideo,
            row: row,
            from: 0,
            isDragging: false,
          };

          // Add to editor elements
          runInAction(() => {
            this.editorElements.push(editorElement);
          });

          // Sync with Redux timeline state
          if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
            window.dispatchSaveTimelineState(this);
          }

          // Add to canvas
          this.canvas.add(fabricVideo);
          this.canvas.requestRenderAll();

          // Update max rows if necessary
          this.maxRows = Math.max(this.maxRows, row + 1);

          resolve(editorElement);
        } catch (error) {
          console.error('Error adding existing video:', error);
          reject(error);
        }
      };

      videoElement.onerror = error => {
        console.error('Video failed to load:', error);
        reject(error);
      };
    });
  }

  updateAudio({ sentenceId }) {
    const audioElement = this.editorElements.find(
      el => el.type === 'audio' && el.sentenceId === sentenceId
    );

    if (!audioElement) {
      return;
    }

    this.removeEditorElement(audioElement);
  }

  async loadAudioFromUrl(url) {
    try {
      const audio = new Audio();
      audio.src = url;

      return new Promise((resolve, reject) => {
        audio.onloadedmetadata = () => {
          const audioElement = {
            id: getUid(),
            type: 'audio',
            source: audio,
            properties: {
              volume: 1,
              startTime: 0,
              endTime: audio.duration * 1000,
              row: 0,
            },
          };

          this.addAudioResource(audioElement);
          this.editorElements.push(audioElement);
          resolve(audioElement);
        };

        audio.onerror = () => {
          reject(new Error('Failed to load audio from URL'));
        };
      });
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }

  addText({
    text,
    fontSize = 86,
    fontWeight = '400',
    fontStyle = 'normal',
    startTime,
    endTime,
    imageId,
    pointId,
    sentence,
    point,
    font = 'Bangers',
    backgroundColor = '#000000',
    backgroundOpacity = 0,
    stroke = 0,
    strokeColor = '#000000',
    color = '#ffffff',
    synchronize = true,
    textAlign = 'center',
    verticalAlign = 'center',
    isExisting = false,
    timelineOnly = false,
  }) {
    const id = getUid();
    const index = this.editorElements.length;
    this.addEditorElement({
      id,
      imageId,
      pointId,
      name: `Text ${index + 1}`,
      type: 'text',
      sentence,
      point,
      placement: {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        width: 900, // Fixed width like in subtitles
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      timeFrame: {
        start: startTime,
        end: endTime,
      },
      row: 1,
      from: 0,
      content: 'Upbeat Corporate',
      left: 0,
      top: 0,
      isDragging: false,
      initialState: {
        scaleX: 1,
        scaleY: 1,
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        opacity: 1.0,
      },
      properties: {
        text: text,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        font: font,
        backgroundColor: backgroundColor,
        backgroundOpacity: backgroundOpacity,
        stroke: stroke ?? 12,
        strokeColor: strokeColor,
        color: color,
        synchronize: synchronize,
        textAlign: textAlign,
        verticalAlign: verticalAlign,
        opacity: 1, // Add explicit opacity
        strokeOpacity: 1, // Add explicit stroke opacity
        timelineOnly, // Add timelineOnly property
        shadow: {
          color: '#000000',
          blur: 0,
          offsetX: 0,
          offsetY: 0,
          opacity: 1,
        },
      },
    });
  }

  async addSubtitles(segments, punctuation, row) {
    // First, add all text elements without animations

    const hasElementsInFirstRow = this.editorElements.some(
      element => element.row === 0
    );

    // If row 0 is occupied, shift everything down first
    if (hasElementsInFirstRow) {
      this.shiftRowsDown(0);
    }

    const textElements = segments.map((segment, index) => {
      const { text, start, end, words } = segment;
      const id = getUid();
      const elementIndex = this.editorElements.length;
      const segmentDuration = segment.duration || 0;
      const isLastSegment = index === segments.length - 1;

      // For the last segment, ensure it stays visible until the end of the story
      const segmentEnd = isLastSegment
        ? this.lastElementEnd
        : end * 1000 + segmentDuration;

      return {
        id,
        name: `Text ${elementIndex + 1}`,
        type: 'text',
        subType: 'subtitles',
        placement: {
          x: this.canvas.width / 2,
          y: this.canvas.height / 2,
          width: 900,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: start * 1000 + segmentDuration,
          end: segmentEnd,
        },
        row: 0,
        from: 0,
        content: 'Upbeat Corporate',
        left: 0,
        top: 0,
        isDragging: false,
        properties: {
          styleId: '685f0f3f120221cb89adbf48',
          text: punctuation
            ? text
            : text.replaceAll('.', '').replaceAll(',', ''),
          originalText: text,
          fontSize: 106,
          fontWeight: '400',
          fontStyle: 'normal',
          font: 'Bangers',
          backgroundColor: '#00000000',
          backgroundOpacity: 0,
          backgroundRadius: 0,
          stroke: 12,
          strokeColor: '#000000',
          color: '#ffffff',
          synchronize: true,
          textAlign: 'center',
          verticalAlign: 'center',
          shadow: {
            color: '#000000',
            blur: 0,
            offsetX: 0,
            offsetY: 0,
            opacity: 1,
          },
          words: words
            ? words.map((word, wordIndex) => {
                const isLastWord =
                  isLastSegment && wordIndex === words.length - 1;
                // For the last word of the last segment, ensure it stays visible until the end
                const wordEnd = isLastWord
                  ? segmentEnd
                  : end * 1000 + segmentDuration;

                return {
                  ...word,
                  word: punctuation
                    ? word.word
                    : word.word.replaceAll('.', '').replaceAll(',', ''),
                  originalWord: word.word,
                  segmentStart: start,
                  start: word.start * 1000 + segmentDuration,
                  end: wordEnd,
                  wordEnd: word.end * 1000,
                };
              })
            : [],
          wordObjects: [],
        },
      };
    });

    // Batch add all text elements
    this.editorElements = [...this.editorElements, ...textElements];

    // Schedule animations to be added after elements are rendered
    requestAnimationFrame(() => {
      // Clear any existing word objects from canvas
      this.editorElements.forEach(element => {
        if (element.properties.wordObjects?.length > 0) {
          element.properties.wordObjects.forEach(obj => {
            if (obj && this.canvas.contains(obj)) {
              this.canvas.remove(obj);
            }
          });
          element.properties.wordObjects = [];
        }
      });

      // Add animations for all elements with words
      textElements.forEach(element => {
        if (element.properties.words?.length > 0) {
          const wordAnimation = {
            id: `${element.id}-word-animation`,
            targetId: element.id,
            type: 'textWordAnimation',
            effect: 'in',
            duration: 500,
            properties: {},
          };
          this.animations.push(wordAnimation);
        }
      });

      // Refresh animations once for all elements
      this.refreshElements();
      this.refreshAnimations();

      // Save timeline state for undo/redo functionality
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }
    });

    return true;
  }

  setSubtitlesOnCanvas({ subtitleParams, segments }) {
    const textElements = segments.map(segment => {
      return {
        id: segment.id,
        name: `Subtitle`,
        type: 'text',
        subType: 'subtitles',
        placement: {
          ...segment.placement,
        },
        timeFrame: {
          ...segment.timeFrame,
        },
        row: segment.row,
        from: segment.from,
        content: 'Upbeat Corporate',
        left: segment.left,
        top: segment.top,
        isDragging: false,
        properties: {
          ...subtitleParams,
          opacity: subtitleParams.opacity || 1,
          strokeOpacity: subtitleParams.strokeOpacity || 1,
          text: segment.properties.text,
          words: segment.properties.words,
          wordObjects: segment.properties.wordObjects,
        },
      };
    });

    this.editorElements = [...this.editorElements, ...textElements];

    // Schedule animations to be added after elements are rendered
    requestAnimationFrame(() => {
      // Clear any existing word objects from canvas
      this.editorElements.forEach(element => {
        if (element.properties.wordObjects?.length > 0) {
          element.properties.wordObjects.forEach(obj => {
            if (obj && this.canvas.contains(obj)) {
              this.canvas.remove(obj);
            }
          });
          element.properties.wordObjects = [];
        }
      });

      // Add animations for all elements with words
      textElements.forEach(element => {
        if (element.properties.words?.length > 0) {
          const wordAnimation = {
            id: `${element.id}-word-animation`,
            targetId: element.id,
            type: 'textWordAnimation',
            effect: 'in',
            duration: 500,
            properties: {},
          };
          this.animations.push(wordAnimation);
        }
      });

      // Refresh animations once for all elements
      this.refreshElements();
      this.refreshAnimations();
    });
  }

  setTextOnCanvas({ storyId, element }) {
    this.addEditorElement({
      ...element,
      storyId,
      name: `Text`,
      type: 'text',
    });
  }

  addTextOnCanvas({
    storyId,
    imageId,
    pointId,
    sentence,
    point,
    text,
    properties,
    timelineOnly,
    placement,
    timeFrame,
    row,
  }) {
    const id = uuidv4();
    const index = this.editorElements.length;
    this.addEditorElement({
      id,
      imageId,
      pointId,
      storyId,
      name: `Text ${index + 1}`,
      type: 'text',
      sentence,
      point,
      placement,
      timeFrame,
      row,
      from: 0,
      content: 'Upbeat Corporate',
      isDragging: false,
      initialState: {
        scaleX: placement?.scaleX || 1,
        scaleY: placement?.scaleY || 1,
        left: placement?.x || 0,
        top: placement?.y || 0,
        opacity: 1.0,
      },
      properties: {
        ...properties,
        timelineOnly,
      },
    });
  }

  removeAnimation(id) {
    // Clear GL transition cache when animations are removed
    this.clearGLTransitionCache();

    const animationToRemove = this.animations.find(
      animation => animation.id === id
    );

    // Stop any active animations on the timeline
    if (this.animationTimeLine) {
      this.animationTimeLine.pause();
    }

    if (animationToRemove) {
      // Get target elements (support both old and new system)
      const targetIds =
        animationToRemove.targetIds ||
        (animationToRemove.targetId ? [animationToRemove.targetId] : []);
      const targetElements = this.editorElements.filter(
        el => targetIds.includes(el.id) && el.type !== 'animation'
      );

      // Remove the animation first
      this.animations = this.animations.filter(
        animation => animation.id !== id
      );

      // Also remove animation element from editorElements if it exists
      this.editorElements = this.editorElements.filter(
        element => !(element.type === 'animation' && element.animationId === id)
      );

      // Reset target elements to initial state if no more animations target them
      targetIds.forEach(targetId => {
        const remainingAnimations = this.animations.filter(anim => {
          const animTargetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          return animTargetIds.includes(targetId);
        });

        // Only reset if no more animations target this element
        if (remainingAnimations.length === 0) {
          this.resetElementToInitialState(targetId);
        }
      });

      // If there are still animations targeting any of these elements, refresh
      const hasRemainingAnimations = targetIds.some(targetId => {
        return this.animations.some(anim => {
          const animTargetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          return animTargetIds.includes(targetId);
        });
      });

      if (hasRemainingAnimations) {
        this.refreshAnimations();
        return; // Early return to avoid double refresh
      }
    } else {
      // Animation not found, still remove it from arrays
      this.animations = this.animations.filter(
        animation => animation.id !== id
      );
      this.editorElements = this.editorElements.filter(
        element => !(element.type === 'animation' && element.animationId === id)
      );
    }

    this.refreshAnimations();
    this.refreshElements();

    // Clean up empty rows after removing animations
    this.optimizedCleanupEmptyRows();

    // Trigger Redux sync after removing animation
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }

    // Save changes to history and backend
    if (!this.isInitializing && !this.isUndoRedoOperation) {
    }
  }

  // Convert animations to timeline elements for display
  convertAnimationsToTimelineElements() {
    const animationElements = [];

    this.animations.forEach(animation => {
      if (animation.type === 'glTransition') {
        // Handle GL transitions separately
        const fromElement = this.editorElements.find(
          el => el.id === animation.fromElementId && el.type !== 'animation'
        );
        const toElement = this.editorElements.find(
          el => el.id === animation.toElementId && el.type !== 'animation'
        );

        if (!fromElement || !toElement) return;

        // Find appropriate row for the GL transition - place above images
        let animationRow = this.findAvailableRowForGLTransition(
          fromElement,
          toElement
        );

        const animationElement = {
          id: `animation-${animation.id}`,
          animationId: animation.id,
          type: 'animation',
          targetId: animation.fromElementId, // Use fromElement as target for consistency
          fromElementId: animation.fromElementId,
          toElementId: animation.toElementId,
          row: animationRow,
          timeFrame: {
            start: animation.startTime,
            end: animation.endTime,
          },
          properties: {
            animationType: 'glTransition',
            transitionType: animation.transitionType,
            displayName: `${animation.transitionType} Transition`,
            originalAnimation: animation,
            effectDirection: 'transition',
          },
          // Additional properties for compatibility
          absoluteStart: animation.startTime,
          absoluteEnd: animation.endTime,
          effectDirection: 'transition',
          displayName: `${animation.transitionType} Transition`,
        };

        animationElements.push(animationElement);
        return;
      }

      // Handle regular animations
      const targetElement = this.editorElements.find(
        el => el.id === animation.targetId && el.type !== 'animation'
      );

      if (!targetElement) return;

      const properties = animation.properties || {};
      let startTime = properties.startTime || 0;
      let endTime = properties.endTime || animation.duration || 1000;

      // For Out animations, position them at the end of the element if startTime is 0
      if (animation.type.endsWith('Out') && startTime === 0) {
        const elementDuration =
          targetElement.timeFrame.end - targetElement.timeFrame.start;
        const animationDuration = endTime - startTime;
        startTime = Math.max(0, elementDuration - animationDuration);
        endTime = startTime + animationDuration;
      }

      // Calculate absolute timing
      const absoluteStart = targetElement.timeFrame.start + startTime;
      const absoluteEnd = Math.min(
        targetElement.timeFrame.start + endTime,
        targetElement.timeFrame.end
      );

      // Determine effect direction
      let effectDirection = 'in';
      if (animation.type === 'zoomEffect') {
        const initialScale =
          properties.scaleFactor || properties.initialScale || 1.0;
        const targetScale =
          properties.targetScale || properties.endScale || 2.0;
        effectDirection = initialScale < targetScale ? 'in' : 'out';
      } else if (animation.type === 'fadeEffect') {
        const initialOpacity =
          properties.opacity || properties.initialOpacity || 1.0;
        const targetOpacity =
          properties.targetOpacity || properties.endOpacity || 0.0;
        effectDirection = initialOpacity < targetOpacity ? 'in' : 'out';
      }

      // Create display name
      const baseType = animation.type.replace(/In$|Out$|Effect$/, '');
      const capitalizedType =
        baseType.charAt(0).toUpperCase() + baseType.slice(1);
      let displayName;

      if (animation.type.endsWith('Effect')) {
        displayName = `${capitalizedType} ${
          effectDirection === 'in'
            ? 'In'
            : effectDirection === 'out'
              ? 'Out'
              : 'Effect'
        }`;
      } else if (animation.type.endsWith('In')) {
        displayName = `${capitalizedType} In`;
      } else if (animation.type.endsWith('Out')) {
        displayName = `${capitalizedType} Out`;
      } else {
        displayName = `${capitalizedType} Effect`;
      }

      // Find appropriate row for the animation
      let animationRow = this.findAvailableAnimationRow();

      const animationElement = {
        id: `animation-${animation.id}`,
        animationId: animation.id,
        type: 'animation',
        targetId: animation.targetId, // Keep for legacy compatibility
        targetIds:
          animation.targetIds ||
          (animation.targetId ? [animation.targetId] : []),
        row: animationRow,
        timeFrame: {
          start: absoluteStart,
          end: absoluteEnd,
        },
        properties: {
          animationType: animation.type,
          effectDirection: effectDirection,
          displayName: displayName,
          originalAnimation: animation,
        },
        // Additional properties for compatibility
        absoluteStart,
        absoluteEnd,
        effectDirection,
        displayName,
      };

      animationElements.push(animationElement);
    });

    return animationElements;
  }

  // Get dynamic target IDs for animation based on its row position
  getDynamicTargetIds(animationRow, animationTimeFrame = null) {
    // Find all non-animation elements that are on rows with index STRICTLY higher than animation row
    let targetElements = this.editorElements.filter(
      el =>
        el.type !== 'animation' &&
        el.type !== 'transition' &&
        el.row > animationRow // STRICTLY greater than - animation does NOT affect elements with smaller or equal index
    );

    // If animation timeFrame is provided, filter elements that intersect with animation timing
    if (animationTimeFrame) {
      const animStart = animationTimeFrame.start;
      const animEnd = animationTimeFrame.end;

      targetElements = targetElements.filter(el => {
        if (!el.timeFrame) return false;

        // Check if element timeFrame intersects with animation timeFrame
        const elementStart = el.timeFrame.start;
        const elementEnd = el.timeFrame.end;

        // Elements intersect if: elementStart < animEnd AND elementEnd > animStart
        const intersects = elementStart < animEnd && elementEnd > animStart;

        return intersects;
      });
    }

    return targetElements.map(el => el.id);
  }

  // Resolve GL transition targets: when only one element covers the entire transition timeframe,
  // use the same element as both from/to. Otherwise, pick elements nearest to start/end.
  resolveGLTargets(animationRow, animationTimeFrame) {
    if (!animationTimeFrame) return [];

    // Consider only visual elements (images/videos) below the animation row
    const candidates = this.editorElements.filter(
      el =>
        (el.type === 'imageUrl' || el.type === 'video') &&
        el.row > animationRow &&
        el.timeFrame &&
        el.timeFrame.start < animationTimeFrame.end &&
        el.timeFrame.end > animationTimeFrame.start
    );

    if (candidates.length === 0) return [];

    // If a single element fully covers the transition timeframe, duplicate it for from/to
    const covering = candidates.find(
      el =>
        el.timeFrame.start <= animationTimeFrame.start &&
        el.timeFrame.end >= animationTimeFrame.end
    );
    if (covering) {
      return [covering.id, covering.id];
    }

    // Helper to choose the best candidate for a specific timestamp
    const pickForTime = targetTime => {
      // Prefer elements that actually contain the time; fallback to nearest by distance
      const containing = candidates.filter(
        el => el.timeFrame.start <= targetTime && el.timeFrame.end >= targetTime
      );
      if (containing.length > 0) {
        containing.sort(
          (a, b) =>
            Math.abs(targetTime - (a.timeFrame.start + a.timeFrame.end) / 2) -
            Math.abs(targetTime - (b.timeFrame.start + b.timeFrame.end) / 2)
        );
        return containing[0];
      }
      // Not containing: pick nearest by boundary distance
      const withDistance = candidates.map(el => {
        const dist =
          el.timeFrame.end < targetTime
            ? targetTime - el.timeFrame.end
            : el.timeFrame.start - targetTime;
        return { el, dist: Math.max(0, dist) };
      });
      withDistance.sort((a, b) => a.dist - b.dist);
      return withDistance[0]?.el || null;
    };

    const startEl = pickForTime(animationTimeFrame.start);
    const endEl = pickForTime(animationTimeFrame.end);

    if (startEl && endEl) {
      if (startEl.id === endEl.id) return [startEl.id, startEl.id];
      return [startEl.id, endEl.id];
    }

    // Fallbacks if one side missing
    const first = startEl || endEl || candidates[0];
    if (!first) return [];
    return [first.id, first.id];
  }

  // Reset element to initial state (remove animation effects)
  resetElementToInitialState = action(elementId => {
    const element = this.editorElements.find(el => el.id === elementId);
    if (!element || !element.fabricObject || !element.initialState) return;

    const fabricObject = element.fabricObject;
    const initialState = element.initialState;

    // Reset all animation properties to initial state
    fabricObject.set({
      scaleX: initialState.scaleX,
      scaleY: initialState.scaleY,
      left: initialState.left,
      top: initialState.top,
      opacity: initialState.opacity,
    });

    fabricObject.setCoords();
    this.canvas?.renderAll();
  });

  // Reset elements to initial state if their animations have completed
  resetCompletedAnimations = action(currentTime => {
    // Group animations by target element
    const animationsByTarget = {};

    this.animations.forEach(animation => {
      if (animation.type === 'glTransition') return; // Skip GL transitions

      const targetIds =
        animation.targetIds || (animation.targetId ? [animation.targetId] : []);

      targetIds.forEach(targetId => {
        if (!animationsByTarget[targetId]) {
          animationsByTarget[targetId] = [];
        }
        animationsByTarget[targetId].push(animation);
      });
    });

    // Check each element to see if all its animations have completed
    Object.keys(animationsByTarget).forEach(targetId => {
      const element = this.editorElements.find(el => el.id === targetId);
      if (!element || !element.fabricObject) return;

      const animations = animationsByTarget[targetId];
      const hasActiveAnimations = animations.some(animation => {
        const animationStart = this.getAnimationStartTime(
          animation,
          element,
          element.timeFrame.start
        );
        const animationEnd = this.getAnimationEndTime(
          animation,
          element,
          element.timeFrame.end
        );

        return currentTime >= animationStart && currentTime <= animationEnd;
      });

      // If no animations are currently active for this element, reset it to initial state
      if (!hasActiveAnimations) {
        // Check if element is not already at initial state to avoid unnecessary updates
        const initialState = element.initialState;
        if (initialState) {
          const fabricObject = element.fabricObject;
          const needsReset =
            Math.abs(fabricObject.scaleX - initialState.scaleX) > 0.001 ||
            Math.abs(fabricObject.scaleY - initialState.scaleY) > 0.001 ||
            Math.abs(fabricObject.left - initialState.left) > 0.1 ||
            Math.abs(fabricObject.top - initialState.top) > 0.1 ||
            Math.abs(fabricObject.opacity - initialState.opacity) > 0.001;

          if (needsReset) {
            this.resetElementToInitialState(targetId);
          }
        }
      }
    });
  });

  // Apply animation to all elements on the same row as the selected element
  applyAnimationToAllOnSameRow = action((selectedElementId, animationType) => {
    const selectedElement = this.editorElements.find(
      el => el.id === selectedElementId
    );
    if (!selectedElement) {
      console.warn(`Selected element ${selectedElementId} not found`);
      return;
    }

    const selectedRow = selectedElement.row;

    // Find all elements on the same row (excluding animations and the selected element)
    const otherElementsOnSameRow = this.editorElements.filter(
      el =>
        el.row === selectedRow &&
        el.type !== 'animation' &&
        el.type !== 'transition' &&
        (el.type === 'imageUrl' || el.type === 'video') && // Only images and videos
        el.id !== selectedElementId // Exclude the selected element
    );

    // Find animations that target the selected element
    const selectedElementAnimations = this.animations.filter(anim => {
      const targetIds =
        anim.targetIds || (anim.targetId ? [anim.targetId] : []);
      return (
        targetIds.includes(selectedElementId) && anim.type === animationType
      );
    });

    if (selectedElementAnimations.length === 0) {
      console.warn(
        `No animations of type ${animationType} found for selected element`
      );
      return;
    }

    // For each animation targeting the selected element
    selectedElementAnimations.forEach(sourceAnimation => {
      // Remove existing animations of the same type from other elements on the same row
      const animationsToRemove = this.animations.filter(anim => {
        if (anim.type !== animationType) return false;
        const targetIds =
          anim.targetIds || (anim.targetId ? [anim.targetId] : []);
        return otherElementsOnSameRow.some(el => targetIds.includes(el.id));
      });

      animationsToRemove.forEach(anim => {
        this.removeAnimation(anim.id);
      });

      // Create new animations for each other element on the same row
      otherElementsOnSameRow.forEach(targetElement => {
        // Calculate timing based on target element's position
        const elementDuration =
          targetElement.timeFrame.end - targetElement.timeFrame.start;
        const animationDuration = sourceAnimation.duration || 1000;

        // Calculate relative position of the original animation within the selected element
        const selectedElementDuration =
          selectedElement.timeFrame.end - selectedElement.timeFrame.start;
        const originalAnimationProperties = sourceAnimation.properties || {};

        // Get the original animation's relative position (as percentage of element duration)
        let originalRelativeStart = 0;
        let originalRelativeEnd = 1;

        if (
          originalAnimationProperties.absoluteStart !== undefined &&
          originalAnimationProperties.absoluteEnd !== undefined
        ) {
          // For dynamic animations with absolute positioning
          const originalAbsoluteStart =
            originalAnimationProperties.absoluteStart -
            selectedElement.timeFrame.start;
          const originalAbsoluteEnd =
            originalAnimationProperties.absoluteEnd -
            selectedElement.timeFrame.start;
          originalRelativeStart = Math.max(
            0,
            originalAbsoluteStart / selectedElementDuration
          );
          originalRelativeEnd = Math.min(
            1,
            originalAbsoluteEnd / selectedElementDuration
          );
        } else {
          // For element-relative animations
          const originalStartTime = originalAnimationProperties.startTime || 0;
          const originalEndTime =
            originalAnimationProperties.endTime || animationDuration;
          originalRelativeStart = originalStartTime / selectedElementDuration;
          originalRelativeEnd = originalEndTime / selectedElementDuration;
        }

        // Apply the same relative position to the target element
        const newStartTime = originalRelativeStart * elementDuration;
        const newEndTime = originalRelativeEnd * elementDuration;
        const newDuration = newEndTime - newStartTime;

        const newAnimation = {
          id: `${animationType}-${
            targetElement.id
          }-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: sourceAnimation.type,
          duration: newDuration,
          effect: sourceAnimation.effect,
          effectVariant: sourceAnimation.effectVariant,
          targetIds: [targetElement.id], // Single target for each animation
          properties: {
            ...sourceAnimation.properties,
            startTime: newStartTime,
            endTime: newEndTime,
            // Remove absolute positioning for element-relative animations
            absoluteStart: undefined,
            absoluteEnd: undefined,
          },
          syncToAllScenes: sourceAnimation.syncToAllScenes,
        };

        // Add the new animation
        this.addAnimation(newAnimation);
      });
    });
  });

  // Remove all animations from element (for "None" button)
  removeAllAnimationsFromElement = action(elementId => {
    const animationsToRemove = this.animations.filter(anim => {
      const targetIds =
        anim.targetIds || (anim.targetId ? [anim.targetId] : []);
      return targetIds.includes(elementId) && anim.type !== 'glTransition';
    });

    animationsToRemove.forEach(anim => {
      this.removeAnimation(anim.id);
    });
  });

  // Remove all animations from all elements on the same row (for Apply to All with no animations)
  removeAllAnimationsFromRow = action(selectedElementId => {
    const selectedElement = this.editorElements.find(
      el => el.id === selectedElementId
    );
    if (!selectedElement) {
      console.warn(`Selected element ${selectedElementId} not found`);
      return;
    }

    const selectedRow = selectedElement.row;

    // Find all elements on the same row (excluding animations)
    const allElementsOnSameRow = this.editorElements.filter(
      el =>
        el.row === selectedRow &&
        el.type !== 'animation' &&
        el.type !== 'transition' &&
        (el.type === 'imageUrl' || el.type === 'video') // Only images and videos
    );

    // Find and remove all animations targeting elements on this row (except GL transitions)
    const animationsToRemove = this.animations.filter(anim => {
      if (anim.type === 'glTransition') return false; // Don't remove GL transitions
      const targetIds =
        anim.targetIds || (anim.targetId ? [anim.targetId] : []);
      return allElementsOnSameRow.some(el => targetIds.includes(el.id));
    });

    animationsToRemove.forEach(anim => {
      this.removeAnimation(anim.id);
    });
  });

  // Validate and update animation targets - remove invalid targets and add new valid ones
  validateAndUpdateAnimationTargets = action((animationId, animationRow) => {
    const animationIndex = this.animations.findIndex(
      anim => anim.id === animationId
    );
    if (animationIndex === -1) return;

    const animation = this.animations[animationIndex];
    const currentTargetIds = animation.targetIds || [];

    // Filter out invalid targets (elements on rows <= animation row)
    const validCurrentTargets = currentTargetIds.filter(targetId => {
      const targetElement = this.editorElements.find(el => el.id === targetId);
      return targetElement && targetElement.row > animationRow;
    });

    // Get animation timeFrame for target filtering
    const animationElement = this.editorElements.find(
      el => el.type === 'animation' && el.animationId === animationId
    );
    const animationTimeFrame = animationElement
      ? animationElement.timeFrame
      : null;

    // Get new potential targets based on current row position and timing
    const newPotentialTargets = this.getDynamicTargetIds(
      animationRow,
      animationTimeFrame
    );

    // Combine valid current targets with new potential targets (no duplicates)
    let finalTargetIds = [
      ...new Set([...validCurrentTargets, ...newPotentialTargets]),
    ];

    // If no targets found, preserve original targets to keep animation alive
    // This allows animations to exist without active targets
    if (finalTargetIds.length === 0 && currentTargetIds.length > 0) {
      finalTargetIds = currentTargetIds;
    }

    const invalidTargets = currentTargetIds.filter(
      id => !validCurrentTargets.includes(id)
    );

    // Reset invalid targets to initial state (skip for GL transitions as they don't modify element state)
    if (animation.type !== 'glTransition') {
      invalidTargets.forEach(targetId => {
        this.resetElementToInitialState(targetId);
      });
    }

    // Update animation with new target list
    this.animations[animationIndex] = {
      ...animation,
      targetIds: finalTargetIds,
      row: animationRow,
    };

    // For GL transitions, also update fromElementId and toElementId
    if (animation.type === 'glTransition') {
      if (finalTargetIds.length > 0) {
        this.animations[animationIndex].fromElementId = finalTargetIds[0];
        this.animations[animationIndex].toElementId =
          finalTargetIds.length > 1 ? finalTargetIds[1] : finalTargetIds[0];
      } else {
        this.animations[animationIndex].fromElementId = null;
        this.animations[animationIndex].toElementId = null;
      }

      // Re-setup GL transition renderer if targets changed
      if (
        finalTargetIds.length > 0 &&
        finalTargetIds.join(',') !== currentTargetIds.join(',')
      ) {
        const fromElement = this.editorElements.find(
          el => el.id === this.animations[animationIndex].fromElementId
        );
        const toElement = this.editorElements.find(
          el => el.id === this.animations[animationIndex].toElementId
        );

        if (fromElement && toElement) {
          this.setupGLTransitionRenderer(
            animationId,
            fromElement,
            toElement,
            animation.transitionType
          );
        }
      }
    }

    // Update timeline element (reuse animationElement from above)
    if (animationElement) {
      const animationElementIndex = this.editorElements.findIndex(
        el => el.id === animationElement.id
      );
      if (animationElementIndex !== -1) {
        this.editorElements[animationElementIndex].targetIds = finalTargetIds;

        // Update legacy fields for GL transitions
        if (animation.type === 'glTransition' && finalTargetIds.length > 0) {
          this.editorElements[animationElementIndex].fromElementId =
            finalTargetIds[0];
          this.editorElements[animationElementIndex].toElementId =
            finalTargetIds.length > 1 ? finalTargetIds[1] : finalTargetIds[0];
        }
      }
    }

    this.scheduleAnimationRefresh();
  });

  // Revalidate all animation targets when elements change rows
  revalidateAllAnimationTargets = action(() => {
    this.animations.forEach(animation => {
      if (animation.type !== 'glTransition' && animation.row !== undefined) {
        this.validateAndUpdateAnimationTargets(animation.id, animation.row);
      }
    });
  });

  // Revalidate GL transitions when elements change position or timing
  revalidateGLTransitions = action(() => {
    const glTransitions = this.animations.filter(
      anim => anim.type === 'glTransition'
    );

    glTransitions.forEach(transition => {
      const transitionElement = this.editorElements.find(
        el => el.type === 'animation' && el.animationId === transition.id
      );

      if (transitionElement) {
        // Get current targets based on row and timeFrame
        const currentTimeFrame = transitionElement.timeFrame;
        const newTargetIds = this.resolveGLTargets(
          transitionElement.row,
          currentTimeFrame
        );

        const oldTargetIds = transition.targetIds || [];
        const hasTargetChanges =
          JSON.stringify(oldTargetIds.sort()) !==
          JSON.stringify(newTargetIds.sort());

        if (hasTargetChanges) {
          // Update transition targets
          const transitionIndex = this.animations.findIndex(
            a => a.id === transition.id
          );
          if (transitionIndex !== -1) {
            this.animations[transitionIndex].targetIds = newTargetIds;

            // Update fromElementId and toElementId
            if (newTargetIds.length > 0) {
              this.animations[transitionIndex].fromElementId = newTargetIds[0];
              this.animations[transitionIndex].toElementId =
                newTargetIds.length > 1 ? newTargetIds[1] : newTargetIds[0];
            } else {
              this.animations[transitionIndex].fromElementId = null;
              this.animations[transitionIndex].toElementId = null;
            }

            // Update timeline element
            const elementIndex = this.editorElements.findIndex(
              el => el.id === transitionElement.id
            );
            if (elementIndex !== -1) {
              this.editorElements[elementIndex].targetIds = newTargetIds;
              if (newTargetIds.length > 0) {
                this.editorElements[elementIndex].fromElementId =
                  newTargetIds[0];
                this.editorElements[elementIndex].toElementId =
                  newTargetIds.length > 1 ? newTargetIds[1] : newTargetIds[0];
              }
            }

            // Re-setup GL transition renderer if targets changed and we have valid targets
            if (newTargetIds.length > 0) {
              const fromElement = this.editorElements.find(
                el => el.id === newTargetIds[0]
              );
              const toElement = this.editorElements.find(el =>
                el.id === newTargetIds.length > 1
                  ? newTargetIds[1]
                  : newTargetIds[0]
              );

              if (fromElement && toElement) {
                this.setupGLTransitionRenderer(
                  transition.id,
                  fromElement,
                  toElement,
                  transition.transitionType
                );
              }
            } else {
              // If no valid targets, hide the GL transition
              const glTransitionElement = this.glTransitionElements.get(
                transition.id
              );
              if (glTransitionElement && glTransitionElement.fabricObject) {
                glTransitionElement.fabricObject.set('opacity', 0);
              }
            }
          }
        }
      }
    });

    // Refresh canvas if any GL transitions were updated
    if (glTransitions.length > 0) {
      this.canvas?.requestRenderAll();
    }
  });

  // Update animation targets based on current position
  updateAnimationTargets = action((animationId, newRow) => {
    const animationIndex = this.animations.findIndex(
      anim => anim.id === animationId
    );
    if (animationIndex === -1) {
      console.warn(`Animation with id ${animationId} not found`);
      return;
    }

    const animation = this.animations[animationIndex];
    const oldTargetIds = animation.targetIds || [];

    // Get animation timeFrame for target filtering
    const animationElement = this.editorElements.find(
      el => el.type === 'animation' && el.animationId === animationId
    );
    const animationTimeFrame = animationElement
      ? animationElement.timeFrame
      : null;

    const newTargetIds = this.getDynamicTargetIds(newRow, animationTimeFrame);

    // Reset old target elements to initial state before changing targets
    oldTargetIds.forEach(targetId => {
      this.resetElementToInitialState(targetId);
    });

    // Update animation with new targets
    this.animations[animationIndex] = {
      ...animation,
      targetIds: newTargetIds,
      row: newRow, // Store animation row for future reference
    };

    this.scheduleAnimationRefresh();
  });

  // Find available row for animation elements
  findAvailableAnimationRow() {
    const animationElements = this.editorElements.filter(
      el => el.type === 'animation'
    );
    const usedRows = new Set(animationElements.map(el => el.row));

    // Start from row 0 and find first available row
    for (let row = 0; row < this.maxRows + 10; row++) {
      if (!usedRows.has(row)) {
        // Check if this row has any other non-animation elements
        const hasOtherElements = this.editorElements.some(
          el => el.row === row && el.type !== 'animation'
        );

        if (!hasOtherElements) {
          return row;
        }
      }
    }

    // If no available row found, use maxRows
    return this.maxRows;
  }

  // Find available row for GL transitions - should be above images (like effects)
  findAvailableRowForGLTransition(fromElement, toElement) {
    // Find the row of the images involved in the transition
    const imageRows = [fromElement.row, toElement.row];
    const minImageRow = Math.min(...imageRows);

    // Calculate transition time frame based on gap between elements
    const gapStart = fromElement.timeFrame.end;
    const gapEnd = toElement.timeFrame.start;
    const gapDuration = gapEnd - gapStart;

    // For GL transitions, we need to consider the actual transition duration
    // Default duration is 1000ms if not specified
    const transitionDuration = 1000;

    let transitionStart, transitionEnd;

    if (gapDuration === 0) {
      // When gap is 0 (adjacent elements), position transition with 60% on first element, 40% on second
      const transitionPoint = gapStart;
      const beforeRatio = 0.6;
      const afterRatio = 0.4;
      transitionStart = transitionPoint - transitionDuration * beforeRatio;
      transitionEnd = transitionPoint + transitionDuration * afterRatio;
    } else if (gapDuration >= transitionDuration) {
      // Center the transition in the gap
      const gapCenter = gapStart + gapDuration / 2;
      transitionStart = gapCenter - transitionDuration / 2;
      transitionEnd = gapCenter + transitionDuration / 2;
    } else {
      // Gap is smaller than requested duration but > 0, center in available gap
      const gapCenter = gapStart + gapDuration / 2;
      transitionStart = gapCenter - transitionDuration / 2;
      transitionEnd = gapCenter + transitionDuration / 2;
    }

    // Start looking for a row above the images (going up from minImageRow - 1)
    for (let row = minImageRow - 1; row >= 0; row--) {
      // Check if this row has any elements that would conflict
      const rowElements = this.editorElements.filter(el => el.row === row);
      const hasConflicts = rowElements.some(el => {
        // Check for time overlap with our transition
        return (
          el.timeFrame.start < transitionEnd &&
          el.timeFrame.end > transitionStart
        );
      });

      if (!hasConflicts) {
        return row;
      }
    }

    // If no row above is available, create a new row above the images
    // This ensures GL transitions don't conflict with existing animations
    this.shiftRowsDown(minImageRow);

    // Return the newly created row above the images
    return minImageRow;
  }

  // Sync animations with timeline elements
  syncAnimationsWithTimeline() {
    // Do nothing - animations are now managed directly in TransitionPanel
    return;
  }

  // Handle animation element movement
  moveAnimationElement(animationElementId, newTimeFrame) {
    const animationElement = this.editorElements.find(
      el => el.id === animationElementId && el.type === 'animation'
    );

    if (!animationElement) return;

    const originalAnimation = this.animations.find(
      anim => anim.id === animationElement.animationId
    );

    if (!originalAnimation) return;

    const targetElement = this.editorElements.find(
      el => el.id === originalAnimation.targetId && el.type !== 'animation'
    );

    if (!targetElement) return;

    // Calculate relative timing within the target element
    const relativeStart = newTimeFrame.start - targetElement.timeFrame.start;
    const relativeEnd = newTimeFrame.end - targetElement.timeFrame.start;

    // Constrain within target element bounds
    const elementDuration =
      targetElement.timeFrame.end - targetElement.timeFrame.start;
    const constrainedStart = Math.max(
      0,
      Math.min(relativeStart, elementDuration)
    );
    const constrainedEnd = Math.max(
      constrainedStart + 100,
      Math.min(relativeEnd, elementDuration)
    );

    // Update the animation
    const updatedAnimation = {
      ...originalAnimation,
      properties: {
        ...originalAnimation.properties,
        startTime: constrainedStart,
        endTime: constrainedEnd,
      },
      duration: constrainedEnd - constrainedStart,
    };

    this.updateAnimation(originalAnimation.id, updatedAnimation);

    // Update the animation element
    animationElement.timeFrame = {
      start: targetElement.timeFrame.start + constrainedStart,
      end: targetElement.timeFrame.start + constrainedEnd,
    };
    animationElement.absoluteStart = animationElement.timeFrame.start;
    animationElement.absoluteEnd = animationElement.timeFrame.end;

    this.refreshElements();

    // Refresh animations to ensure moved animation plays at new position
    this.scheduleAnimationRefresh();
  }

  setSelectedElement(selectedElement) {
    const previousElement = this.selectedElement;
    this.selectedElement = selectedElement;

    // Dispatch events for element selection changes
    if (selectedElement && selectedElement !== previousElement) {
      window.dispatchEvent(
        new CustomEvent('elementSelected', {
          detail: selectedElement,
        })
      );
    } else if (!selectedElement && previousElement) {
      window.dispatchEvent(
        new CustomEvent('elementDeselected', {
          detail: previousElement,
        })
      );
    }
    if (!selectedElement) {
      // Check if canvas exists before calling discardActiveObject
      if (this.canvas) {
        if (selectedElement?.fabricObject) {
          this.canvas.discardActiveObject();
        } else {
          this.canvas.discardActiveObject();
        }
      }
      // Clear guidelines when no element is selected
      this.clearGuidelines();
    }
  }

  updateSelectedElement() {
    this.selectedElement =
      this.editorElements.find(
        element => element.id === this.selectedElement?.id
      ) || null;

    // Update fabric object if it exists
    if (this.selectedElement?.fabricObject) {
      const fabricObject = this.selectedElement.fabricObject;
      const properties = this.selectedElement.properties;

      // Update font properties
      if (properties.fontSize)
        fabricObject.set('fontSize', properties.fontSize);
      if (properties.fontWeight)
        fabricObject.set('fontWeight', properties.fontWeight);
      if (properties.fontStyle)
        fabricObject.set('fontStyle', properties.fontStyle);
      if (properties.font) fabricObject.set('fontFamily', properties.font);
      if (properties.color) fabricObject.set('fill', properties.color);
      if (properties.textAlign)
        fabricObject.set('textAlign', properties.textAlign);

      fabricObject.setCoords();
      this.canvas.requestRenderAll();
    }
  }

  setCoppiedElements(selectedElements) {
    this.coppiedElements = selectedElements;
  }

  setSelectedElements(selectedElements) {
    this.selectedElements = selectedElements;
    if (this.canvas) {
      if (selectedElements && Object.keys(selectedElements).length > 0) {
        const liveFabricObjects = [];
        Object.keys(selectedElements).forEach(key => {
          const element = selectedElements[key];

          if (element && typeof element === 'object' && element.id) {
            // Skip timeline animation elements - they don't have fabricObjects
            if (
              element.type === 'animation' ||
              (typeof element.id === 'string' &&
                element.id.startsWith('animation-'))
            ) {
              return;
            }

            let liveFabricObject = null;

            if (
              element.fabricObject &&
              typeof element.fabricObject.get === 'function' && // Basic check for Fabric object methods
              element.fabricObject.canvas === this.canvas
            ) {
              liveFabricObject = element.fabricObject;
            } else if (element.id) {
              const canvasObjects = this.canvas.getObjects();
              for (const canvasObj of canvasObjects) {
                if (canvasObj.id === element.id) {
                  liveFabricObject = canvasObj;
                  element.fabricObject = canvasObj; // Update store's reference
                  break;
                }
              }
            }

            if (liveFabricObject) {
              liveFabricObjects.push(liveFabricObject);
            } else {
              console.warn(
                `setSelectedElements: Could not find or verify live fabricObject for element id: ${element.id}.`
              );
            }
          }
        });

        if (liveFabricObjects.length > 0) {
          try {
            const selection = new fabric.ActiveSelection(liveFabricObjects, {
              canvas: this.canvas,
            });
            this.canvas.setActiveObject(selection);
          } catch (e) {
            console.error(
              'Error creating Fabric ActiveSelection:',
              e,
              liveFabricObjects
            );
            this.canvas.discardActiveObject();
          }
        } else {
          this.canvas.discardActiveObject();
        }
      } else {
        this.selectedElements = null;
        this.canvas.discardActiveObject();
      }
      this.canvas.requestRenderAll();
    }
  }

  removeSelectedElement() {
    this.setSelectedElement(null);
  }

  setEditorElements(editorElements) {
    this.editorElements = editorElements;
    this.updateSelectedElement();
    this.refreshElements();
    if (!this.isInitializing && !this.isUndoRedoOperation) {
      // Save timeline state for undo/redo functionality
      if (window.dispatchSaveTimelineState) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  optimizedCleanupEmptyRows() {
    const rowCounts = new Map();
    let maxRow = 0;

    // Count elements in each row and track max row
    for (const element of this.editorElements) {
      rowCounts.set(element.row, (rowCounts.get(element.row) || 0) + 1);
      maxRow = Math.max(maxRow, element.row);
    }

    // If no cleanup needed, return early
    if (rowCounts.size === maxRow + 1) {
      this.maxRows = Math.max(3, maxRow + 1);
      return;
    }

    // Create efficient row mapping
    const rowMapping = new Map();
    let newRowNum = 0;

    for (let i = 0; i <= maxRow; i++) {
      if (rowCounts.has(i)) {
        rowMapping.set(i, newRowNum++);
      }
    }

    // First, remove all fabric objects that will be moved
    const elementsToUpdate = this.editorElements.filter(
      element => element.row !== rowMapping.get(element.row)
    );

    elementsToUpdate.forEach(element => {
      if (element.fabricObject && this.canvas.contains(element.fabricObject)) {
        this.canvas.remove(element.fabricObject);
      }
    });

    // Update elements with new row numbers
    for (const element of this.editorElements) {
      const newRow = rowMapping.get(element.row);
      if (element.row !== newRow) {
        element.row = newRow;
      }
    }

    // Update maxRows with minimum of 3 rows for UI consistency
    this.maxRows = Math.max(3, newRowNum);

    // Force immediate canvas refresh
    this.canvas?.discardActiveObject();
    this.canvas?.renderAll();

    // Schedule a deferred refresh for complete re-rendering
    setTimeout(() => {
      this.refreshElements();
      this.canvas?.renderAll();

      // Add to pending updates
      this.pendingUpdates.add('cleanupRows');
      this.debouncedRefreshElements();
    }, 0);
  }

  findFreeSpaceInRow(preferredStart, duration, rowElements) {
    if (rowElements.length === 0) {
      return { start: Math.min(preferredStart, this.maxTime - duration) };
    }

    // Pre-sort elements by start time for better performance
    rowElements.sort((a, b) => a.timeFrame.start - b.timeFrame.start);

    // Quick check for space at the start
    if (rowElements[0].timeFrame.start >= duration) {
      return { start: 0 };
    }

    // Check spaces between elements
    let prevEnd = 0;
    for (const element of rowElements) {
      const gap = element.timeFrame.start - prevEnd;
      if (gap >= duration) {
        return { start: prevEnd };
      }
      prevEnd = element.timeFrame.end;
    }

    // Check space after last element
    if (this.maxTime - prevEnd >= duration) {
      return { start: prevEnd };
    }

    return null;
  }

  shiftRowsDown(startFromRow, numberOfRows = 1) {
    let maxRowUpdated = this.maxRows;

    // First, remove all fabric objects from canvas for affected rows
    const objectsToRemove = this.editorElements
      .filter(element => element.row >= startFromRow && element.fabricObject)
      .map(element => element.fabricObject);

    objectsToRemove.forEach(obj => {
      if (this.canvas.contains(obj)) {
        this.canvas.remove(obj);
      }
    });

    // Batch update rows
    for (const element of this.editorElements) {
      if (element.row >= startFromRow) {
        element.row += numberOfRows;
        maxRowUpdated = Math.max(maxRowUpdated, element.row);
      }
    }

    // Update maxRows if needed
    this.maxRows = Math.max(1, maxRowUpdated + 1);

    // Force immediate canvas refresh
    this.canvas?.discardActiveObject();
    this.canvas?.renderAll();

    // Schedule a deferred refresh for complete re-rendering
    setTimeout(() => {
      this.refreshElements();
      this.canvas?.renderAll();

      // Add to pending updates
      this.pendingUpdates.add('shiftRows');
      this.debouncedRefreshElements();
    }, 0);
  }

  pasteCoppiedElementsToNewRows(coppiedElements) {
    const elementsToAdd = [];

    // Group elements by their original row
    const elementsByRow = new Map();
    coppiedElements.forEach(element => {
      if (!elementsByRow.has(element.row)) {
        elementsByRow.set(element.row, []);
      }
      elementsByRow.get(element.row).push(element);
    });

    // Sort rows in ascending order to maintain relative positioning
    const sortedRows = Array.from(elementsByRow.keys()).sort((a, b) => a - b);

    // Shift all existing rows down by the number of rows we're adding
    const numberOfNewRows = sortedRows.length;
    this.shiftRowsDown(0, numberOfNewRows);

    // Create new elements in new rows at the top, preserving time positions
    sortedRows.forEach((originalRow, index) => {
      const elementsInRow = elementsByRow.get(originalRow);
      const newRowIndex = index; // Start from row 0

      elementsInRow.forEach(elementToCopy => {
        if (!elementToCopy || !elementToCopy.timeFrame) return;

        // Create a proper deep copy without losing non-serializable properties
        const newPastedElement = {
          ...elementToCopy,
          id: uuidv4(),
          row: newRowIndex,
          timeFrame: {
            start: elementToCopy.timeFrame.start,
            end: elementToCopy.timeFrame.end,
          },
          selected: false,
          // Reset fabric object reference - will be recreated
          fabricObject: null,
          // Deep copy properties if they exist
          properties: elementToCopy.properties
            ? {
                ...elementToCopy.properties,
                // Generate new elementId for video/audio elements to avoid conflicts
                elementId: elementToCopy.properties.elementId
                  ? `${elementToCopy.type}-${uuidv4()}`
                  : elementToCopy.properties.elementId,
                // Reset word objects for text elements - will be recreated
                wordObjects: elementToCopy.properties.wordObjects
                  ? []
                  : undefined,
              }
            : undefined,
        };

        elementsToAdd.push(newPastedElement);
      });
    });

    // Update maxRows if needed
    runInAction(() => {
      if (numberOfNewRows > 0) {
        this.setMaxRows(this.maxRows + numberOfNewRows);
      }
      this.editorElements = [...elementsToAdd, ...this.editorElements];
    });

    // Properly refresh all elements to recreate canvas objects and video elements
    requestAnimationFrame(() => {
      this.refreshElements(); // This will recreate all canvas objects

      // Add a small delay to ensure DOM elements are created
      setTimeout(() => {
        this.updateVideoElements();
        this.updateAudioElements();

        // Force canvas to re-render everything
        if (this.canvas) {
          this.canvas.discardActiveObject();
          this.canvas.requestRenderAll();
        }
      }, 100); // 100ms delay to ensure DOM is ready
    });

    if (!this.isInitializing && !this.isUndoRedoOperation) {
      this.saveToHistory();
    }
  }

  pasteCoppiedElements(coppiedElements) {
    const elementsToAdd = [];
    const rowLastPastedEndTime = new Map(); // Tracks end time of last pasted element *in this batch* for each row
    const newlyClaimedRowTypesInBatch = new Map(); // Tracks type of rows newly populated or created in this batch

    const getElementType = element => {
      if (!element) return 'unknown';
      if (isEditorAudioElement(element)) return 'audio';
      if (isEditorVideoElement(element)) return 'video';
      if (isEditorImageElement(element)) return 'image';
      return 'unknown';
    };

    const findPlacementInSpaces = (spaces, duration, preferredStart) => {
      if (spaces && spaces.length > 0) {
        for (const space of spaces) {
          const potentialStartInSpace = Math.max(space.start, preferredStart);
          const potentialEndInSpace = potentialStartInSpace + duration;
          if (
            potentialEndInSpace <= space.end &&
            potentialEndInSpace - potentialStartInSpace >= duration
          ) {
            return { start: potentialStartInSpace, end: potentialEndInSpace };
          }
        }
      }
      return null;
    };

    const makeAndAddPastedElement = (elementToCopy, placement, targetRow) => {
      const newPastedElement = JSON.parse(JSON.stringify(elementToCopy));
      newPastedElement.id = uuidv4();
      newPastedElement.timeFrame = placement;
      newPastedElement.row = targetRow;

      if (typeof newPastedElement.selected !== 'undefined') {
        newPastedElement.selected = false;
      }

      elementsToAdd.push(newPastedElement);
      rowLastPastedEndTime.set(targetRow, placement.end);
      // Ensure the type claim is registered when an element is successfully made/added
      const mediaType = getElementType(elementToCopy);
      if (mediaType !== 'unknown') {
        newlyClaimedRowTypesInBatch.set(targetRow, mediaType);
      }
    };

    for (const elementToCopy of coppiedElements) {
      const originalElementIdForLogging = elementToCopy.id;
      const mediaType = getElementType(elementToCopy); // Determine media type early

      if (
        !elementToCopy ||
        !elementToCopy.timeFrame ||
        typeof elementToCopy.timeFrame.start !== 'number' ||
        typeof elementToCopy.timeFrame.end !== 'number'
      ) {
        continue;
      }

      const originalRow = elementToCopy.row;
      const duration =
        elementToCopy.timeFrame.end - elementToCopy.timeFrame.start;

      if (typeof originalRow !== 'number') {
        continue;
      }

      if (duration <= 0) {
        continue;
      }

      let successfullyPasted = false;

      // Attempt 1: Original Row
      const preferredStartTimeOriginalRow =
        rowLastPastedEndTime.get(originalRow) || 0;
      // Check type consistency for original row if it was claimed in this batch
      if (
        !(
          newlyClaimedRowTypesInBatch.has(originalRow) &&
          newlyClaimedRowTypesInBatch.get(originalRow) !== mediaType
        )
      ) {
        const availableSpacesOriginalRow = this.findAvailableSpaces(
          originalRow,
          duration,
          null
        );
        let chosenPlacementOriginalRow = findPlacementInSpaces(
          availableSpacesOriginalRow,
          duration,
          preferredStartTimeOriginalRow
        );

        if (chosenPlacementOriginalRow) {
          makeAndAddPastedElement(
            elementToCopy,
            chosenPlacementOriginalRow,
            originalRow,
            duration,
            originalElementIdForLogging
          );
          // If successfully pasted, ensure this row's type is recorded for the batch
          if (mediaType !== 'unknown')
            newlyClaimedRowTypesInBatch.set(originalRow, mediaType);
          successfullyPasted = true;
        }
      }

      // Attempt 2: Other Existing Rows of Same Media Type (if Attempt 1 failed)
      if (!successfullyPasted && mediaType !== 'unknown') {
        // Only proceed if type is known

        const candidateSameTypeRows = [];
        for (let r = 0; r < this.maxRows; r++) {
          if (r === originalRow) continue;

          // Check if row 'r' is ALREADY populated with the SAME media type (based on store)
          const rowHasMatchingStoredElements = this.editorElements.some(
            el => el.row === r && getElementType(el) === mediaType
          );
          // AND check if row 'r' is NOT claimed by a DIFFERENT type in THIS batch
          const rowIsBatchCompatible =
            !newlyClaimedRowTypesInBatch.has(r) ||
            newlyClaimedRowTypesInBatch.get(r) === mediaType;

          if (rowHasMatchingStoredElements && rowIsBatchCompatible) {
            candidateSameTypeRows.push(r);
          }
        }

        if (candidateSameTypeRows.length > 0) {
          for (const candidateRow of candidateSameTypeRows) {
            const preferredStartTimeCandidateRow =
              rowLastPastedEndTime.get(candidateRow) || 0;
            const availableSpacesCandidateRow = this.findAvailableSpaces(
              candidateRow,
              duration,
              null
            );
            let chosenPlacementCandidateRow = findPlacementInSpaces(
              availableSpacesCandidateRow,
              duration,
              preferredStartTimeCandidateRow
            );
            if (chosenPlacementCandidateRow) {
              makeAndAddPastedElement(
                elementToCopy,
                chosenPlacementCandidateRow,
                candidateRow,
                duration,
                originalElementIdForLogging
              );
              // Ensure this row's type is recorded for the batch
              if (mediaType !== 'unknown')
                newlyClaimedRowTypesInBatch.set(candidateRow, mediaType);
              successfullyPasted = true;
              break;
            }
          }
        }
      }

      // Attempt 3: New Row (if Attempts 1 & 2 failed and mediaType is known)
      if (!successfullyPasted && mediaType !== 'unknown') {
        let targetNewRowIndex = this.maxRows;
        let safetyNet = 0;
        const maxSafetyChecks = 10;

        while (safetyNet < maxSafetyChecks && !successfullyPasted) {
          if (
            newlyClaimedRowTypesInBatch.has(targetNewRowIndex) &&
            newlyClaimedRowTypesInBatch.get(targetNewRowIndex) !== mediaType
          ) {
            targetNewRowIndex++;
            safetyNet++;
            continue;
          }

          const preferredStartTimeForNewRow =
            rowLastPastedEndTime.get(targetNewRowIndex) || 0;
          const availableSpacesForNewRow = this.findAvailableSpaces(
            targetNewRowIndex,
            duration,
            null
          );
          let chosenPlacementForNewRow = findPlacementInSpaces(
            availableSpacesForNewRow,
            duration,
            preferredStartTimeForNewRow
          );

          if (chosenPlacementForNewRow) {
            makeAndAddPastedElement(
              elementToCopy,
              chosenPlacementForNewRow,
              targetNewRowIndex,
              duration,
              originalElementIdForLogging
            );
            // The makeAndAddPastedElement already sets newlyClaimedRowTypesInBatch for targetNewRowIndex

            if (targetNewRowIndex >= this.maxRows) {
              runInAction(() => {
                if (targetNewRowIndex + 1 > this.maxRows) {
                  this.setMaxRows(targetNewRowIndex + 1);
                }
              });
            }
            successfullyPasted = true;
          } else {
            targetNewRowIndex++;
            safetyNet++;
          }
        }
      }
    }

    if (elementsToAdd.length > 0) {
      runInAction(() => {
        this.editorElements = [...this.editorElements, ...elementsToAdd];
      });

      requestAnimationFrame(() => {
        this.updateVideoElements();
        this.updateAudioElements();
        this.canvas?.requestRenderAll();
      });

      if (!this.isInitializing && !this.isUndoRedoOperation) {
        this.saveToHistory();
      }
    }
  }

  // Add throttling for group drag operations
  _groupDragThrottle = null;
  _pendingGroupUpdate = null;
  _isGroupDragging = false;

  moveSelectedElementsTimeFrame(
    selectedElements,
    timeFrameDelta,
    isImmediate = false
  ) {
    // Store the pending update
    this._pendingGroupUpdate = { selectedElements, timeFrameDelta };

    // Mark that we're in group dragging mode
    if (!this._isGroupDragging) {
      this._isGroupDragging = true;
      // Add visual feedback for group drag
      this.addGroupDragClass(selectedElements);
    }

    // If immediate update is requested (e.g., on drag end), execute immediately
    if (isImmediate) {
      this._executePendingGroupUpdate();
      return;
    }

    // Throttle the updates to prevent excessive calls
    if (this._groupDragThrottle) {
      return; // Skip this update, we'll use the most recent one
    }

    // Use a slightly longer throttle for better performance with large groups
    this._groupDragThrottle = setTimeout(() => {
      this._executePendingGroupUpdate();
      this._groupDragThrottle = null;
    }, 8); // 8ms throttle for ~120fps max update rate
  }

  // Add visual feedback for group dragging
  addGroupDragClass(selectedElements) {
    selectedElements.forEach(element => {
      const elementDOM = document.querySelector(
        `[data-overlay-id="${element.id}"]`
      );
      if (elementDOM) {
        elementDOM.classList.add('group-dragging');
      }
    });
  }

  // Remove visual feedback for group dragging
  removeGroupDragClass(selectedElements) {
    if (selectedElements) {
      selectedElements.forEach(element => {
        const elementDOM = document.querySelector(
          `[data-overlay-id="${element.id}"]`
        );
        if (elementDOM) {
          elementDOM.classList.remove('group-dragging');
        }
      });
    } else {
      // Fallback: remove from all elements
      document.querySelectorAll('.group-dragging').forEach(el => {
        el.classList.remove('group-dragging');
      });
    }
  }

  _executePendingGroupUpdate() {
    if (!this._pendingGroupUpdate) return;

    const { selectedElements, timeFrameDelta } = this._pendingGroupUpdate;
    const updates = new Map();

    // Get selected element IDs for quick lookup
    const selectedIds = new Set(selectedElements.map(el => el.id));

    // Get all non-selected elements
    const nonSelectedElements = this.editorElements.filter(
      el => !selectedIds.has(el.id)
    );

    // Group selected elements by row
    const selectedByRow = new Map();
    selectedElements.forEach(el => {
      if (!selectedByRow.has(el.row)) {
        selectedByRow.set(el.row, []);
      }
      selectedByRow.get(el.row).push(el);
    });

    // Calculate distances for each row
    const rowDistances = [];

    selectedByRow.forEach((rowSelectedElements, row) => {
      const rowStart = Math.min(
        ...rowSelectedElements.map(el => el.timeFrame.start)
      );
      const rowEnd = Math.max(
        ...rowSelectedElements.map(el => el.timeFrame.end)
      );

      // Find elements in this row
      const rowElements = nonSelectedElements.filter(el => el.row === row);

      // Find elements to the left and right in this row
      const leftElements = rowElements.filter(
        el => el.timeFrame.end <= rowStart
      );
      const rightElements = rowElements.filter(
        el => el.timeFrame.start >= rowEnd
      );

      // Calculate distances in this row
      const leftDistance =
        leftElements.length > 0
          ? rowStart - Math.max(...leftElements.map(el => el.timeFrame.end))
          : rowStart;
      const rightDistance =
        rightElements.length > 0
          ? Math.min(...rightElements.map(el => el.timeFrame.start)) - rowEnd
          : Infinity;

      rowDistances.push({ row, leftDistance, rightDistance });
    });

    // Find the shortest distance across all rows
    const shortestLeftDistance = Math.min(
      ...rowDistances.map(rd => rd.leftDistance)
    );
    const shortestRightDistance = Math.min(
      ...rowDistances.map(rd => rd.rightDistance)
    );

    // Calculate single movement delta based on shortest distance
    let actualDelta = timeFrameDelta;
    if (timeFrameDelta < 0) {
      // Moving left - use shortest left distance
      actualDelta = Math.max(timeFrameDelta, -shortestLeftDistance + 10);
    } else {
      // Moving right - use shortest right distance
      actualDelta = Math.min(timeFrameDelta, shortestRightDistance);
    }

    // Apply the same movement to all selected elements
    selectedElements.forEach(element => {
      const newTimeFrame = {
        start: element.timeFrame.start + actualDelta,
        end: element.timeFrame.end + actualDelta,
      };

      updates.set(element.id, {
        ...element,
        timeFrame: newTimeFrame,
      });
    });

    // Apply all updates in a single batch
    if (updates.size > 0) {
      runInAction(() => {
        this.editorElements = this.editorElements.map(
          el => updates.get(el.id) || el
        );
      });

      // Only schedule expensive visual updates if we're not actively dragging
      // or if this is the final update
      if (!this._isGroupDragging || this._pendingGroupUpdate === null) {
        // Use a microtask for better performance
        Promise.resolve().then(() => {
          this.updateVideoElements();
          this.updateAudioElements();
          // Skip canvas render during active dragging for better performance
          if (!this._isGroupDragging) {
            this.canvas?.requestRenderAll();
          }
        });
      }
    }

    // Clear the pending update
    this._pendingGroupUpdate = null;
  }

  // Method to call when group dragging ends
  endGroupDrag() {
    if (!this._isGroupDragging) return;

    this._isGroupDragging = false;

    // Remove visual feedback
    this.removeGroupDragClass();

    // Execute any pending updates immediately
    if (this._pendingGroupUpdate) {
      this.moveSelectedElementsTimeFrame(
        this._pendingGroupUpdate.selectedElements,
        this._pendingGroupUpdate.timeFrameDelta,
        true
      );
    }

    // Cancel any pending throttled updates
    if (this._groupDragThrottle) {
      clearTimeout(this._groupDragThrottle);
      this._groupDragThrottle = null;
    }

    // Force final visual update
    requestAnimationFrame(() => {
      this.updateVideoElements();
      this.updateAudioElements();
      this.canvas?.requestRenderAll();
    });
  }

  // Helper method to find available spaces in a row
  findAvailableSpaces(row, minDuration, excludeElementId) {
    const elementsInRow = this.editorElements
      .filter(el => el.row === row && el.id !== excludeElementId)
      .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

    const availableSpaces = [];

    // Check space before first element
    if (elementsInRow.length === 0) {
      availableSpaces.push({
        start: 0,
        end: this.maxTime,
      });
      return availableSpaces;
    }

    // Check space before first element
    if (elementsInRow[0].timeFrame.start > minDuration) {
      availableSpaces.push({
        start: 0,
        end: elementsInRow[0].timeFrame.start,
      });
    }

    // Check spaces between elements
    for (let i = 0; i < elementsInRow.length - 1; i++) {
      const spaceStart = elementsInRow[i].timeFrame.end;
      const spaceEnd = elementsInRow[i + 1].timeFrame.start;

      if (spaceEnd - spaceStart >= minDuration) {
        availableSpaces.push({
          start: spaceStart,
          end: spaceEnd,
        });
      }
    }

    // Check space after last element
    const lastElement = elementsInRow[elementsInRow.length - 1];
    if (this.maxTime - lastElement.timeFrame.end >= minDuration) {
      availableSpaces.push({
        start: lastElement.timeFrame.end,
        end: this.maxTime,
      });
    }

    return availableSpaces;
  }

  endMove() {
    // End group drag if it was active
    this.endGroupDrag();

    if (this.moveState.isMoving) {
      this.moveState.isMoving = false;
      if (this.moveState.rafId) {
        cancelAnimationFrame(this.moveState.rafId);
        this.moveState.rafId = null;
      }
      this.moveState.accumulatedMoves.clear();
      this.refreshAnimations();
      this.refreshElements();

      // Save state to Redux after move operation
      if (window.dispatchSaveTimelineState) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  processDragUpdate() {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.dragState.lastUpdateTime;

    // Skip update if too soon
    if (timeSinceLastUpdate < this.dragState.updateInterval) {
      this.dragState.rafId = requestAnimationFrame(() =>
        this.processDragUpdate()
      );
      return;
    }

    const MIN_DURATION = 100;
    const updates = new Map();
    const processedElements = new Set();

    // Process accumulated updates
    for (const [id, { element, timeFrame }] of this.dragState
      .accumulatedUpdates) {
      if (processedElements.has(id)) continue;
      processedElements.add(id);

      if (timeFrame.start !== undefined) {
        if (!this.shouldUpdatePosition(timeFrame.start)) {
          continue;
        }
      }

      // Use the appropriate minimum duration for the element type
      const minDurationForType = element.type === 'audio' ? 1 : MIN_DURATION;

      const newTimeFrame = {
        start: Math.max(0, timeFrame.start ?? element.timeFrame.start),
        end: Math.min(this.maxTime, timeFrame.end ?? element.timeFrame.end),
      };

      if (newTimeFrame.end - newTimeFrame.start < minDurationForType) {
        if (timeFrame.start !== undefined) {
          newTimeFrame.end = newTimeFrame.start + minDurationForType;
        } else {
          newTimeFrame.start = newTimeFrame.end - minDurationForType;
        }
      }

      // Create new element with updated timeFrame
      // Extra protection to ensure video elements always maintain their row
      const preserveRow = element.type === 'video' || element.type === 'audio';
      const newElement = {
        ...element,
        timeFrame: newTimeFrame,
        row: element.row, // Always preserve the original row
      };
      updates.set(id, newElement);

      // Find and update overlapping elements
      const overlappingElements = this.editorElements.filter(
        el =>
          el.id !== id &&
          el.row === element.row && // Only consider elements in the same row
          newTimeFrame.start < el.timeFrame.end &&
          newTimeFrame.end > el.timeFrame.start
      );

      overlappingElements.forEach(el => {
        if (processedElements.has(el.id)) return;
        processedElements.add(el.id);

        const updatedEl = { ...el };
        if (timeFrame.start !== undefined) {
          if (el.timeFrame.end - newTimeFrame.start >= MIN_DURATION) {
            updatedEl.timeFrame = {
              ...updatedEl.timeFrame,
              end: newTimeFrame.start,
            };
          }
        } else if (timeFrame.end !== undefined) {
          if (newTimeFrame.end - el.timeFrame.start >= MIN_DURATION) {
            updatedEl.timeFrame = {
              ...updatedEl.timeFrame,
              start: newTimeFrame.end,
            };
          }
        }

        if (
          updatedEl.timeFrame.end - updatedEl.timeFrame.start >=
          MIN_DURATION
        ) {
          // Preserve the original row when updating
          updates.set(el.id, {
            ...updatedEl,
            row: el.row,
          });
        }
      });
    }

    // Apply updates in a single batch
    if (updates.size > 0) {
      runInAction(() => {
        this.editorElements = this.editorElements.map(
          el => updates.get(el.id) || el
        );
      });

      // Update visual elements
      this.updateVideoElements();
      this.updateAudioElements();
      this.canvas?.requestRenderAll();
    }

    // Clear accumulated updates
    this.dragState.accumulatedUpdates.clear();
    this.dragState.lastUpdateTime = now;
    this.dragState.rafId = null;

    // Schedule next update if still dragging
    if (this.dragState.isDragging) {
      this.dragState.rafId = requestAnimationFrame(() =>
        this.processDragUpdate()
      );
    }
  }

  endDrag() {
    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      if (this.dragState.rafId) {
        cancelAnimationFrame(this.dragState.rafId);
        this.dragState.rafId = null;
      }
      // Final update of animations
      this.refreshAnimations();
      this.refreshElements();

      // Save state to Redux after drag operation
      if (window.dispatchSaveTimelineState) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  async removeEditorElements(idsToRemove) {
    // Add debug logging to track what's being removed

    runInAction(async () => {
      const elementsToRemove = [];
      for (const id of idsToRemove) {
        const element = this.editorElements.find(el => el.id === id);
        if (element) {
          elementsToRemove.push(element);
        }
      }

      // Also consider ids that are animation ids (no corresponding editor element)
      const animationIdsToRemove = [];
      if (elementsToRemove.length === 0) {
        // If no editor elements matched, check if we were asked to remove animations by id
        idsToRemove.forEach(id => {
          const anim = this.animations.find(a => a.id === id);
          if (anim) animationIdsToRemove.push(id);
        });
        if (animationIdsToRemove.length === 0) {
          return;
        }
      }

      for (const elementToRemove of elementsToRemove) {
        // Remove the fabric object from canvas first
        if (elementToRemove.fabricObject && this.canvas) {
          this.canvas.remove(elementToRemove.fabricObject);
          elementToRemove.fabricObject = null; // Dereference for GC
        }

        // If it's an audio element, remove the HTML element
        if (elementToRemove.type === 'audio') {
          const audioElement = document.getElementById(
            elementToRemove.properties.elementId
          );
          if (audioElement) {
            audioElement.remove();
          }
        }
        // Shift elements after removal - for each element
        this.shiftElementsAfterRemoval(elementToRemove);
      }

      // FIRST: Remove animations that reference any of the removed element ids (BEFORE removing elements)
      try {
        const idsSet = new Set(idsToRemove);
        const animationsToRemove = this.animations.filter(anim => {
          const targetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          const targetsHit = targetIds.some(tid => idsSet.has(tid));
          const glHit =
            anim.type === 'glTransition' &&
            (idsSet.has(anim.fromElementId) || idsSet.has(anim.toElementId));
          // Also check if timeline element id matches animation-${animId} pattern
          const timelineHit = idsSet.has(`animation-${anim.id}`);

          return targetsHit || glHit || timelineHit;
        });

        animationsToRemove.forEach(anim => {
          if (anim.type === 'glTransition') {
            this.removeGLTransition(anim.id);
          } else {
            this.removeAnimation(anim.id);
          }
        });
      } catch (e) {
        console.warn(
          'Error while removing linked animations during multi-delete',
          e
        );
      }

      // If we have explicit animation ids to remove, do that now
      if (animationIdsToRemove.length > 0) {
        animationIdsToRemove.forEach(animId => {
          const anim = this.animations.find(a => a.id === animId);
          if (!anim) return;
          if (anim.type === 'glTransition') {
            this.removeGLTransition(anim.id);
          } else {
            this.removeAnimation(anim.id);
          }
        });
      }

      // THEN: Filter out elements from the main array
      const elementsBefore = this.editorElements.length;
      this.editorElements = this.editorElements.filter(
        element => !idsToRemove.includes(element.id)
      );
      const elementsAfter = this.editorElements.length;

      // Handle timeline animation/transition element removal -> remove corresponding animations from store
      for (const elementToRemove of elementsToRemove) {
        // Derive animationId from multiple possible sources
        let derivedAnimationId = elementToRemove.animationId;
        if (
          !derivedAnimationId &&
          typeof elementToRemove.id === 'string' &&
          elementToRemove.id.startsWith('animation-')
        ) {
          derivedAnimationId = elementToRemove.id.slice('animation-'.length);
        }
        if (
          !derivedAnimationId &&
          elementToRemove.properties?.originalAnimation?.id
        ) {
          derivedAnimationId = elementToRemove.properties.originalAnimation.id;
        }

        if (derivedAnimationId) {
          const animationIndex = this.animations.findIndex(
            anim => anim.id === derivedAnimationId
          );
          if (animationIndex !== -1) {
            const animation = this.animations[animationIndex];
            if (animation.type === 'glTransition') {
              this.removeGLTransition(animation.id);
            } else {
              this.animations.splice(animationIndex, 1);
              // Also remove any timeline element linked to this animation
              this.editorElements = this.editorElements.filter(
                el =>
                  !(
                    el.type === 'animation' && el.animationId === animation.id
                  ) && el.id !== `animation-${animation.id}`
              );
            }
          }
        }
      }

      // Update canvas and cleanup
      this.refreshAnimations(); // Refresh animations first to clean up animation state
      this.refreshElements(); // Then refresh elements to update canvas
      this.optimizedCleanupEmptyRows();

      // Wait for MobX to process state updates
      await Promise.resolve();

      if (!this.isUndoRedoOperation) {
        this.saveToHistory();
      }
    });
  }

  async removeEditorElement(id) {
    runInAction(() => {
      const existingElement = this.editorElements.findIndex(
        el => el.type === 'imageUrl' && el.id === id
      );

      if (
        this.editorElements[existingElement]?.pointId &&
        this.editorElements[existingElement]?.type === 'imageUrl' &&
        this.editorElements[existingElement]?.properties.src !== ''
      ) {
        // Remove the fabric object from canvas first
        const elementToUpdate = this.editorElements[existingElement];
        if (elementToUpdate.fabricObject && this.canvas) {
          this.canvas.remove(elementToUpdate.fabricObject);
          elementToUpdate.fabricObject = null;
        }

        this.editorElements = this.editorElements.map((element, index) => {
          if (index === existingElement) {
            return {
              ...element,
              subType: 'placeholder',
              properties: {
                ...element.properties,
                src: '',
                minUrl: '',
              },
              fabricObject: null,
            };
          }
          return element;
        });

        // Update canvas
        this.refreshElements();
        this.optimizedCleanupEmptyRows();

        return;
      }

      // Find element to delete
      const elementToRemove = this.editorElements.find(
        element => element.id === id
      );
      if (!elementToRemove) {
        // If no editor element, check if id is an animation id and remove it
        const anim = this.animations.find(a => a.id === id);
        if (anim) {
          if (anim.type === 'glTransition') {
            this.removeGLTransition(anim.id);
          } else {
            this.removeAnimation(anim.id);
          }
          return;
        }

        // Check if id matches animation-${animId} pattern and remove corresponding animation
        if (typeof id === 'string' && id.startsWith('animation-')) {
          const animId = id.slice('animation-'.length);
          const anim = this.animations.find(a => a.id === animId);
          if (anim) {
            if (anim.type === 'glTransition') {
              this.removeGLTransition(anim.id);
            } else {
              this.removeAnimation(anim.id);
            }
            return;
          }
        }

        return;
      }

      // Remove any animations targeting this element (for all element types)
      const targetAnimations = this.animations.filter(animation => {
        const targetIds =
          animation.targetIds ||
          (animation.targetId ? [animation.targetId] : []);
        return targetIds.includes(id) && animation.type !== 'glTransition';
      });
      targetAnimations.forEach(animation => {
        this.removeAnimation(animation.id);
      });

      // Remove GL transitions involving this element
      const glTransitions = this.animations.filter(
        animation =>
          animation.type === 'glTransition' &&
          (animation.fromElementId === id || animation.toElementId === id)
      );

      // Clean up GL transition elements and their fabric objects
      glTransitions.forEach(transition => {
        // Remove GL transition fabric object from canvas first
        const glTransitionElement = this.glTransitionElements.get(
          transition.id
        );
        if (
          glTransitionElement &&
          glTransitionElement.fabricObject &&
          this.canvas
        ) {
          this.canvas.remove(glTransitionElement.fabricObject);
        }

        // Remove the GL transition
        this.removeGLTransition(transition.id);
      });

      // Force canvas re-render to ensure all changes are visible
      if (this.canvas) {
        this.canvas.requestRenderAll();
      }

      // If this is a timeline animation/transition element, also remove it from animations array
      {
        let derivedAnimationId = elementToRemove.animationId;
        if (
          !derivedAnimationId &&
          typeof elementToRemove.id === 'string' &&
          elementToRemove.id.startsWith('animation-')
        ) {
          derivedAnimationId = elementToRemove.id.slice('animation-'.length);
        }
        if (
          !derivedAnimationId &&
          elementToRemove.properties?.originalAnimation?.id
        ) {
          derivedAnimationId = elementToRemove.properties.originalAnimation.id;
        }
        if (derivedAnimationId) {
          const animation = this.animations.find(
            a => a.id === derivedAnimationId
          );
          if (animation) {
            if (animation.type === 'glTransition') {
              this.removeGLTransition(animation.id);
            } else {
              this.animations = this.animations.filter(
                a => a.id !== derivedAnimationId
              );
              this.editorElements = this.editorElements.filter(
                el =>
                  !(
                    el.type === 'animation' &&
                    el.animationId === derivedAnimationId
                  ) && el.id !== `animation-${derivedAnimationId}`
              );
            }
          }
        }
      }

      // Remove the fabric object from canvas first
      if (elementToRemove.fabricObject && this.canvas) {
        this.canvas.remove(elementToRemove.fabricObject);
        elementToRemove.fabricObject = null;
      }

      // Update global frame fill after element removal
      // (will be handled by updateCanvasFrameFill after element is removed)

      // If it's an audio element, remove HTML element
      if (elementToRemove.type === 'audio') {
        const audioElement = document.getElementById(
          elementToRemove.properties.elementId
        );
        if (audioElement) {
          audioElement.remove();
        }
      }

      this.shiftElementsAfterRemoval(elementToRemove);

      this.editorElements = this.editorElements.filter(
        element => element.id !== id
      );

      this.refreshElements();
      this.optimizedCleanupEmptyRows();

      // Update global frame fill after element removal
      this.updateCanvasFrameFill();
    });

    await Promise.resolve();

    if (!this.isUndoRedoOperation) {
      // Save state to Redux after element removal
      if (window.dispatchSaveTimelineState) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  addEditorElement(editorElement, isImageUrl = false) {
    // Create audio element first if it's an audio type
    if (editorElement.type === 'audio') {
      // Remove existing audio element if it exists
      const existingAudio = document.getElementById(
        editorElement.properties.elementId
      );
      if (existingAudio) {
        existingAudio.remove();
      }

      // Create new audio element
      const audioElement = document.createElement('audio');
      audioElement.id = editorElement.properties.elementId;
      audioElement.src = editorElement.properties.src;

      // Set initial playback rate and volume
      audioElement.playbackRate = this.playbackRate;
      audioElement.volume = this.volume;

      // Set initial time based on offset if provided
      if (editorElement.properties.audioOffset !== undefined) {
        audioElement.currentTime = editorElement.properties.audioOffset / 1000;
      }

      document.body.appendChild(audioElement);
    }

    // Insert at the beginning so the new element is at index 0
    this.setEditorElements([editorElement, ...this.editorElements]);

    if (isImageUrl) {
      if (!this.isInitializing) {
      }
      return;
    }

    this.refreshElements();

    if (!this.isInitializing) {
    }
  }

  removeAllTextElementsWithPointId() {
    // Filter out all text elements with pointId in a single pass
    const filteredElements = this.editorElements.filter(
      element => !(element.type === 'text' && element.pointId)
    );

    // Only update and refresh if elements were actually removed
    if (filteredElements.length !== this.editorElements.length) {
      this.setEditorElements(filteredElements);
      this.optimizedCleanupEmptyRows();
      this.refreshElements();
    }
  }

  removeAllElementsForScene(sceneId) {
    // Remove all elements that belong to the given scene
    // This includes elements with exact pointId match and split elements
    const filteredElements = this.editorElements.filter(element => {
      // Check if element belongs to the scene (exact match or split element)
      if (element.pointId === sceneId) {
        return false; // Remove this element
      }

      // Check if element is a split element that starts with the scene ID
      if (element.pointId && element.pointId.startsWith(`${sceneId}_split_`)) {
        return false; // Remove this split element
      }

      return true; // Keep this element
    });

    // Only update and refresh if elements were actually removed
    if (filteredElements.length !== this.editorElements.length) {
      this.setEditorElements(filteredElements);
      this.optimizedCleanupEmptyRows();
      this.refreshElements();

      // Save timeline state for undo/redo functionality
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  removeAllSubtitles() {
    // Filter out all subtitle elements in a single pass
    const filteredElements = this.editorElements.filter(
      element => !(element.type === 'text' && element.subType === 'subtitles')
    );

    // Only update and refresh if elements were actually removed
    if (filteredElements.length !== this.editorElements.length) {
      // Also remove subtitle-related animations
      const filteredAnimations = this.animations.filter(animation => {
        // Remove animations that target subtitle elements
        const targetElement = this.editorElements.find(
          el => el.id === animation.targetId
        );
        return !(
          targetElement?.type === 'text' &&
          targetElement?.subType === 'subtitles'
        );
      });

      this.animations = filteredAnimations;
      this.setEditorElements(filteredElements);
      this.optimizedCleanupEmptyRows();
      this.refreshElements();

      // Save timeline state for undo/redo functionality
      if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(this);
      }
    }
  }

  setMaxTime(maxTime) {
    // Calculate dynamic max time based on content
    const lastElement = this.editorElements
      .slice()
      .sort((a, b) => b.timeFrame.end - a.timeFrame.end)[0];

    // Set max time to either the provided value or the end of the last element plus buffer
    // Use a larger buffer for longer content to allow for future additions
    const buffer = Math.max(
      30000,
      lastElement ? lastElement.timeFrame.end * 0.2 : 30000
    );

    this.maxTime = Math.max(
      maxTime,
      lastElement ? lastElement.timeFrame.end + buffer : buffer
    );
  }

  playSubtitle(element) {
    const duration = element.timeFrame.end - element.timeFrame.start;
    this.updateTimeTo(element.timeFrame.start);
    this.setPlaying(true);

    // Stop playback after the duration has elapsed
    setTimeout(() => {
      this.setPlaying(false);
    }, duration);
  }

  setPlaying(playing) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // If we're at the end and user clicks play - start from beginning
    if (playing && this.currentTimeInMs >= this.lastElementEnd - 100) {
      this.updateTimeTo(0);
      this.playing = true;
      this.startedTime = Date.now();
      this.startedTimePlay = 0;
      // Only start playFrames if we're not recording
      if (!this.isRecording) {
        requestAnimationFrame(() => this.playFrames());
      }
      return;
    }

    this.playing = playing;

    if (this.playing) {
      this.startedTime = Date.now();
      this.startedTimePlay = this.currentTimeInMs;
      // Only start playFrames if we're not recording
      if (!this.isRecording) {
        requestAnimationFrame(() => this.playFrames());
      }
    } else {
      // Ensure all videos are paused when stopping playback
      this.editorElements
        .filter(element => element.type === 'video')
        .forEach(element => {
          const video = document.getElementById(element.properties.elementId);
          if (isHtmlVideoElement(video) && !video.paused) {
            video.pause();
            // Don't reset time - keep user's progress
          }
        });

      // Also pause any audio elements
      this.editorElements
        .filter(element => element.type === 'audio')
        .forEach(element => {
          const audio = document.getElementById(element.properties.elementId);
          if (audio) {
            audio.pause();
            // Don't reset time - keep user's progress
          }
        });
    }
  }

  playFrames() {
    if (!this.playing) {
      return;
    }
    const elapsedTime = Date.now() - this.startedTime;
    const adjustedElapsedTime = elapsedTime * this.playbackRate;
    const newTime = this.startedTimePlay + adjustedElapsedTime;

    if (newTime >= this.lastElementEnd) {
      this.updateTimeTo(this.lastElementEnd);
      this.setPlaying(false);
      return;
    }

    this.updateTimeTo(newTime);

    // Use adaptive frame rate based on playback speed to reduce stuttering
    // At higher speeds, we can update less frequently since the audio/video
    // elements handle their own timing internally
    const frameInterval = this.playbackRate >= 1.5 ? 32 : 16; // ~30fps for high speeds, ~60fps for normal

    setTimeout(() => {
      requestAnimationFrame(() => this.playFrames());
    }, frameInterval);
  }

  updateTimeTo(newTime) {
    updateTimeToUtil({ newTime, store: this });
  }

  handleSeek(seek) {
    if (this.playing) {
      this.setPlaying(false);
    }

    this.updateTimeTo(seek);
    this.updateVideoElements();
    this.updateAudioElements();
  }

  updateVideoElements() {
    const now = performance.now();
    const videoElements = this.editorElements.filter(
      element => element.type === 'video'
    );

    // If no video elements, return early
    if (!videoElements.length) return;

    // Process ALL video elements, not just the first one
    videoElements.forEach(element => {
      if (!element || !element.properties) return;

      const video = document.getElementById(element.properties.elementId);
      if (!isHtmlVideoElement(video)) return;

      // Ensure video has correct playback rate
      if (video.playbackRate !== this.playbackRate) {
        video.playbackRate = this.playbackRate;
      }

      // Calculate the video's current time based on the timeline
      const elementTime = this.currentTimeInMs - element.timeFrame.start;
      const videoTime = Math.max(0, elementTime / 1000);

      // Check if the video is within its timeframe
      const isInTimeframe =
        this.currentTimeInMs >= element.timeFrame.start &&
        this.currentTimeInMs <= element.timeFrame.end;

      if (isInTimeframe) {
        // Apply video offset if present (for trimmed videos)
        const videoOffset = (element.properties.videoOffset || 0) / 1000;
        const adjustedVideoTime = videoTime + videoOffset;

        // Only update time if it's significantly different
        const timeDiff = Math.abs(video.currentTime - adjustedVideoTime);
        if (timeDiff > 0.1) {
          video.currentTime = Math.min(adjustedVideoTime, video.duration || 0);
        }

        // Handle play/pause state
        if (this.playing) {
          if (video.paused) {
            // Ensure video is ready before playing
            if (video.readyState >= 2) {
              // HAVE_CURRENT_DATA
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.warn(`Video play failed for ${element.id}:`, error);
                  // If play fails, try to reload and play again
                  video.load();
                  video
                    .play()
                    .catch(err =>
                      console.warn(`Retry play failed for ${element.id}:`, err)
                    );
                });
              }
            } else {
              // If video is not ready, wait for it
              video.addEventListener(
                'canplay',
                () => {
                  if (this.playing) {
                    // Double check we still want to play
                    video
                      .play()
                      .catch(err =>
                        console.warn(
                          `Play after canplay failed for ${element.id}:`,
                          err
                        )
                      );
                  }
                },
                { once: true }
              );
            }
          }
        }
      } else {
        // If outside timeframe, ensure video is paused
        if (!video.paused) {
          video.pause();
        }
      }

      // Update last update time
      element.properties.lastUpdateTime = now;
    });
  }

  updateAudioElements() {
    // Get all audio elements
    const audioElements = this.editorElements.filter(el => el.type === 'audio');

    // Audio updates are processed for all playback rates

    // Process each audio element
    audioElements.forEach(el => {
      const audioElement = document.getElementById(el.properties.elementId);
      if (!audioElement) return;

      // Ensure the audio element has the correct position and properties
      const audioOffset = el.properties.audioOffset || 0;
      const offsetInSeconds = Math.max(0, audioOffset / 1000);

      // Set volume based on both global and element-specific volume
      const elementVolume =
        typeof el.properties.volume === 'number' ? el.properties.volume : 1;
      const finalVolume = Math.max(0, Math.min(1, elementVolume * this.volume));

      // Only update if volume actually changed
      if (audioElement.volume !== finalVolume) {
        audioElement.volume = finalVolume;
      }

      // Only update playback rate if it actually changed
      if (audioElement.playbackRate !== this.playbackRate) {
        audioElement.playbackRate = this.playbackRate;
      }

      // Handle play/pause state
      if (this.playing) {
        // Only play if within current time frame
        if (
          this.currentTimeInMs >= el.timeFrame.start &&
          this.currentTimeInMs < el.timeFrame.end
        ) {
          // Calculate position based on current time and audio offset
          const positionInAudio =
            (this.currentTimeInMs - el.timeFrame.start) / 1000 +
            offsetInSeconds;

          // Use a larger threshold for position updates at higher playback rates
          // This reduces stuttering by avoiding too frequent currentTime updates
          const updateThreshold = this.playbackRate >= 1.5 ? 0.2 : 0.1;

          // Set the current position in the audio only if it's significantly different
          if (
            Math.abs(audioElement.currentTime - positionInAudio) >
            updateThreshold
          ) {
            try {
              audioElement.currentTime = positionInAudio;
            } catch (error) {
              console.error('Error updating audio position:', error);
            }
          }

          // Play the audio if it's not already playing
          if (audioElement.paused) {
            try {
              const playPromise = audioElement.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => {
                  console.error('Error playing audio:', e);
                });
              }
            } catch (error) {
              console.error('Error playing audio:', error);
            }
          }
        } else {
          // Pause if outside the time frame
          if (!audioElement.paused) {
            try {
              audioElement.pause();
            } catch (error) {
              console.error('Error pausing audio:', error);
            }
          }
        }
      } else {
        // Pause all audio when global playback is paused
        if (!audioElement.paused) {
          try {
            audioElement.pause();
          } catch (error) {
            console.error('Error pausing audio:', error);
          }
        }
      }
    });
  }

  setVideoFormat(format) {
    this.selectedVideoFormat = format;
  }

  saveCanvasToVideoWithAudio() {
    this.saveCanvasToVideoWithAudioWebmMp4();
  }

  async saveCanvasToVideoWithAudioWebmMp4() {
    const canvas = document.getElementById('canvas');
    let audioContext = null;
    let mediaRecorder = null;

    // Function to reload audio elements
    const reloadAudioElements = async audioElements => {
      return Promise.all(
        audioElements.map(async element => {
          const audio = document.getElementById(element.properties.elementId);
          if (audio) {
            // Create new audio element
            const newAudio = new Audio();
            newAudio.id = element.properties.elementId;
            newAudio.src = element.properties.src;
            newAudio.crossOrigin = 'anonymous';
            newAudio.volume = this.volume;
            newAudio.playbackRate = this.playbackRate;

            // Replace old element with new one
            audio.parentNode.replaceChild(newAudio, audio);

            // Wait for loading
            await new Promise(resolve => {
              newAudio.addEventListener('loadeddata', resolve, { once: true });
            });

            return newAudio;
          }
          return null;
        })
      );
    };

    // Function to restore audio elements after rendering
    const restoreAudioElements = async audioElements => {
      return Promise.all(
        audioElements.map(async element => {
          try {
            const audio = document.getElementById(element.properties.elementId);
            if (audio) {
              // Create new audio element
              const newAudio = new Audio();
              newAudio.id = element.properties.elementId;
              newAudio.src = element.properties.src;
              newAudio.crossOrigin = 'anonymous';
              newAudio.volume = this.volume;
              newAudio.playbackRate = this.playbackRate;

              // Replace old element with new one
              audio.parentNode.replaceChild(newAudio, audio);

              // Wait for loading
              await new Promise(resolve => {
                newAudio.addEventListener('loadeddata', resolve, {
                  once: true,
                });
              });

              // Update reference in editorElements
              const elementIndex = this.editorElements.findIndex(
                el => el.id === element.id
              );
              if (elementIndex !== -1) {
                runInAction(() => {
                  this.editorElements[elementIndex] = {
                    ...this.editorElements[elementIndex],
                    properties: {
                      ...this.editorElements[elementIndex].properties,
                      elementId: newAudio.id,
                    },
                  };
                });
              }

              return newAudio;
            }
            return null;
          } catch (error) {
            console.error('Error restoring audio element:', error);
            return null;
          }
        })
      );
    };

    try {
      window.dispatchEvent(
        new CustomEvent('renderingStateChange', {
          detail: { state: 'rendering', progress: 0 },
        })
      );

      const lastElement = this.editorElements
        .slice()
        .sort((a, b) => b.timeFrame.end - a.timeFrame.end)[0];
      const lastElementEnd = lastElement ? lastElement.timeFrame.end : 0;

      const durationSeconds = Math.ceil(lastElementEnd / 1000) || 5;
      const durationMs = durationSeconds * 1000;
      const fps = 60;
      const frameInterval = 1000 / fps;

      // Pause any currently playing media
      this.setPlaying(false);
      this.updateTimeTo(0);

      // Give browser time to reset audio state
      await new Promise(resolve => setTimeout(resolve, 200));

      // Ensure canvas is ready with initial content
      this.updateTimeTo(0);
      await this.refreshElements(); // Ensure all elements are rendered

      if (this.canvas) {
        this.canvas.requestRenderAll();
      }

      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const videoStream = canvas.captureStream(0);
      let finalStream = videoStream;
      const videoTrack = videoStream.getVideoTracks()[0];

      const audioElements = this.editorElements.filter(
        element => element.type === 'audio'
      );

      if (audioElements.length > 0) {
        try {
          // Reload all audio elements before starting recording
          await reloadAudioElements(audioElements);

          // Create new audio context for this recording session
          if (audioContext) {
            await audioContext.close();
          }
          audioContext = new (
            window.AudioContext || window.webkitAudioContext
          )();
          const destination = audioContext.createMediaStreamDestination();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 1.0;

          // Reset all audio elements to start
          const audioSources = await Promise.all(
            audioElements.map(async element => {
              const audio = document.getElementById(
                element.properties.elementId
              );
              if (audio) {
                // Reset audio state
                audio.pause();
                audio.currentTime = 0;
                audio.volume = this.volume;
                audio.playbackRate = this.playbackRate;

                // Ensure audio is ready to play
                await new Promise(resolve => {
                  const handleCanPlay = () => {
                    audio.removeEventListener('canplaythrough', handleCanPlay);
                    resolve();
                  };
                  audio.addEventListener('canplaythrough', handleCanPlay);
                  audio.load();
                });

                const source = audioContext.createMediaElementSource(audio);
                source.connect(gainNode);
                return { source, audio };
              }
              return null;
            })
          ).then(sources => sources.filter(Boolean));

          gainNode.connect(destination);
          gainNode.connect(audioContext.destination);

          const audioTracks = destination.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            finalStream = new MediaStream([videoTrack, audioTracks[0]]);
          }

          this.recordingAudioElements = audioSources.map(({ audio }) => audio);
        } catch (audioError) {
          console.error('Failed to setup audio for recording:', audioError);
          // Continue without audio if setup fails
          this.recordingAudioElements = [];
        }
      }

      // Improved codec selection logic
      let mimeType;
      let fileExtension;
      let codecOptions;

      if (this.selectedVideoFormat === 'mp4') {
        codecOptions = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
          'video/mp4;codecs=avc1.640028,mp4a.40.2',
          'video/mp4',
        ];
        fileExtension = 'mp4';
      } else {
        codecOptions = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,vorbis',
          'video/webm;codecs=vp8,vorbis',
          'video/webm',
        ];
        fileExtension = 'webm';
      }

      // Find first supported codec
      mimeType = codecOptions.find(codec =>
        MediaRecorder.isTypeSupported(codec)
      );

      if (!mimeType) {
        throw new Error('No supported video recording codec found');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `video-${timestamp}.${fileExtension}`;

      return new Promise((resolve, reject) => {
        const chunks = [];

        const recorderOptions = {
          mimeType,
          videoBitsPerSecond: 8000000,
          audioBitsPerSecond: 128000,
        };

        mediaRecorder = new MediaRecorder(finalStream, recorderOptions);

        mediaRecorder.ondataavailable = event => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          try {
            // Stop all audio playback
            if (this.recordingAudioElements) {
              for (const audio of this.recordingAudioElements) {
                audio.pause();
                audio.currentTime = 0;
              }
              this.recordingAudioElements = null;
            }

            // Close audio context
            if (audioContext) {
              await audioContext.close();
              audioContext = null;
            }

            const blob = new Blob(chunks, { type: mimeType });
            this.downloadBlob(blob, filename);

            // Restore audio elements after rendering
            await restoreAudioElements(audioElements);

            // Update player state
            this.updateTimeTo(0);
            this.refreshElements();

            window.dispatchEvent(
              new CustomEvent('renderingStateChange', {
                detail: { state: 'idle', progress: 100 },
              })
            );

            resolve();
          } catch (error) {
            reject(error);
          }
        };

        // Start recording with a slight delay to ensure audio is ready
        setTimeout(async () => {
          try {
            // Prepare all audio elements in parallel BEFORE starting recording
            if (this.recordingAudioElements) {
              await Promise.all(
                this.recordingAudioElements.map(async audio => {
                  try {
                    audio.pause();
                    audio.currentTime = 0;
                    // Wait for ready state
                    if (audio.readyState < 4) {
                      await new Promise(resolve => {
                        const handleCanPlay = () => {
                          audio.removeEventListener(
                            'canplaythrough',
                            handleCanPlay
                          );
                          resolve();
                        };
                        audio.addEventListener('canplaythrough', handleCanPlay);
                      });
                    }
                  } catch (err) {
                    console.error('Audio preparation failed:', err);
                  }
                })
              );
            }

            // Now start recording and playing simultaneously
            mediaRecorder.start();

            // Wait for MediaRecorder to be ready before starting anything else
            await new Promise(resolve => setTimeout(resolve, 200));

            // Ensure MediaRecorder is actually recording
            if (mediaRecorder.state !== 'recording') {
              console.warn('MediaRecorder not ready, waiting...');
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Reset timeline to start from beginning
            this.updateTimeTo(0);
            this.refreshElements();

            // Wait for canvas to render the initial frame
            await new Promise(resolve => setTimeout(resolve, 50));

            // Set recording flag to prevent separate playFrames loop
            this.isRecording = true;
            this.setPlaying(true);

            // Force first frame capture immediately
            if (videoTrack && videoTrack.readyState === 'live') {
              videoTrack.requestFrame();
            }

            // Show progress immediately
            window.dispatchEvent(
              new CustomEvent('renderingStateChange', {
                detail: { state: 'rendering', progress: 0 },
              })
            );

            // Initialize recording start time for precise timing
            this.startedTime = Date.now();
            this.startedTimePlay = 0;

            // Initialize frame capture with precise timing
            let lastFrameCapture = 0;
            let frameNumber = 0;

            const captureFrame = () => {
              if (mediaRecorder.state !== 'recording') return;

              // Calculate exact time based on frame number for consistent timing
              const targetTime = (frameNumber * 1000) / fps;
              const elapsedTime = Date.now() - this.startedTime;
              const adjustedElapsedTime = elapsedTime * this.playbackRate;
              const newTime = this.startedTimePlay + adjustedElapsedTime;

              // Only capture frame if we've reached the target time
              if (adjustedElapsedTime >= targetTime) {
                videoTrack.requestFrame();
                frameNumber++;
                lastFrameCapture = adjustedElapsedTime;
              }

              // Update timeline to match current frame time
              if (newTime < this.maxTime) {
                this.updateTimeTo(newTime);

                // Update progress
                const progress = Math.min(
                  Math.round((newTime / lastElementEnd) * 100),
                  99
                );

                // Update progress every 10 frames (roughly 3 times per second)
                if (frameNumber % 10 === 0) {
                  window.dispatchEvent(
                    new CustomEvent('renderingStateChange', {
                      detail: { state: 'rendering', progress },
                    })
                  );
                }

                // Continue capturing
                requestAnimationFrame(captureFrame);
              }
            };

            // Start frame capture immediately
            requestAnimationFrame(captureFrame);

            // NOW start all audio elements synchronously after MediaRecorder is ready
            if (this.recordingAudioElements) {
              const audioPromises = this.recordingAudioElements.map(
                async audio => {
                  try {
                    return await audio.play();
                  } catch (err) {
                    console.error('Audio play failed:', err);
                    // Try to recover by reloading and playing again
                    try {
                      audio.load();
                      await new Promise(resolve => setTimeout(resolve, 50));
                      return await audio.play();
                    } catch (retryErr) {
                      console.error('Audio recovery failed:', retryErr);
                    }
                  }
                }
              );

              // Start all audio in parallel but don't wait for completion
              Promise.all(audioPromises).catch(error => {
                console.error('Some audio elements failed to start:', error);
              });
            }

            // Stop recording after duration
            setTimeout(() => {
              this.setPlaying(false);
              this.isRecording = false;
              if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, durationMs);
          } catch (error) {
            reject(error);
          }
        }, 20); // Minimal initial delay since synchronization is handled inside
      });
    } catch (error) {
      console.error('Error in canvas recording:', error);
      alert(`Error creating video: ${error.message}`);

      // Cleanup on error
      this.isRecording = false;
      if (this.recordingAudioElements) {
        this.recordingAudioElements.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
        });
        this.recordingAudioElements = null;
      }

      if (audioContext) {
        await audioContext.close();
      }

      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }

      // Reset to initial state after error
      this.updateTimeTo(0);
      this.refreshElements();

      window.dispatchEvent(
        new CustomEvent('renderingStateChange', {
          detail: { state: 'idle', progress: 0 },
        })
      );
    }
  }

  async saveWithMediaRecorder(canvas) {
    try {
      window.dispatchEvent(
        new CustomEvent('renderingStateChange', {
          detail: { state: 'rendering', progress: 0 },
        })
      );

      const durationSeconds = Math.ceil(this.maxTime / 1000) || 5;
      const fps = 30;
      const filename = `video-${Date.now()}.${this.selectedVideoFormat === 'mp4' ? 'mp4' : 'webm'}`;

      this.setPlaying(false);
      this.updateTimeTo(0);

      await new Promise(resolve => setTimeout(resolve, 100));

      let stream = canvas.captureStream(fps);

      // Get audio elements
      const audioElements = this.editorElements.filter(
        element => element.type === 'audio'
      );

      // Add audio if available
      if (audioElements.length > 0) {
        try {
          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();

          // Create audio sources for each audio element
          for (const element of audioElements) {
            const audio = document.getElementById(element.properties.elementId);
            if (audio) {
              const source = audioContext.createMediaElementSource(audio);
              source.connect(destination);
            }
          }

          // Add audio tracks to the stream
          const tracks = [
            ...stream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
          ];
          stream = new MediaStream(tracks);
        } catch (audioError) {
          console.warn('Could not add audio to recording:', audioError);
          // Continue with video only
        }
      }

      // Setup MediaRecorder
      const options = {
        mimeType:
          this.selectedVideoFormat === 'mp4'
            ? 'video/webm; codecs=h264'
            : 'video/webm; codecs=vp9',
        videoBitsPerSecond: 5000000, // 5 Mbps
      };

      // Try to find a supported codec
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm; codecs=vp8';

        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';

          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            throw new Error('No supported media recording mime type found');
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        this.downloadBlob(blob, filename);

        window.dispatchEvent(
          new CustomEvent('renderingStateChange', {
            detail: { state: 'idle', progress: 100 },
          })
        );
      };

      const updateProgress = () => {
        if (mediaRecorder.state !== 'recording') return;

        const progress = Math.min(
          Math.round((this.currentTimeInMs / this.maxTime) * 100),
          99
        );

        window.dispatchEvent(
          new CustomEvent('renderingStateChange', {
            detail: { state: 'rendering', progress },
          })
        );

        if (this.currentTimeInMs < this.maxTime) {
          requestAnimationFrame(updateProgress);
        }
      };

      this.setPlaying(true);
      mediaRecorder.start();
      requestAnimationFrame(updateProgress);

      setTimeout(() => {
        mediaRecorder.stop();
        this.setPlaying(false);
      }, durationSeconds * 1000);
    } catch (error) {
      console.error('Error in MediaRecorder method:', error);
      alert(`Error creating video: ${error.message}`);

      window.dispatchEvent(
        new CustomEvent('renderingStateChange', {
          detail: { state: 'idle', progress: 0 },
        })
      );
    }
  }

  // Mux video chunks to MP4 using MP4Box
  muxChunksToMp4(
    chunks,
    {
      width,
      height,
      fps,
      frameDuration,
      codec = 'avc1.640032',
      bitrate = 13000000,
    }
  ) {
    try {
      const mp4boxFile = MP4Box.createFile();
      const timescale = 1000000; // Use microseconds as timescale
      const samples = [];

      // For each chunk, properly extract and copy data to ArrayBuffer
      for (const chunk of chunks) {
        // Create a properly sized ArrayBuffer
        const arrayBuffer = new ArrayBuffer(chunk.byteLength);
        // Create Uint8Array view of the buffer for copying
        const uint8Array = new Uint8Array(arrayBuffer);
        // Copy chunk data into the buffer
        chunk.copyTo(uint8Array);

        samples.push({
          dts: chunk.timestamp, // decode timestamp
          cts: chunk.timestamp, // presentation timestamp
          duration: frameDuration, // frame duration
          size: arrayBuffer.byteLength, // data size
          is_sync: chunk.type === 'key',
          data: uint8Array, // Use the Uint8Array view
        });
      }

      // Create video track description with high quality settings
      const track = {
        id: 1,
        created: new Date(),
        modified: new Date(),
        movie_timescale: timescale,
        track_duration:
          samples.length > 0
            ? samples[samples.length - 1].dts + frameDuration
            : 0,
        layer: 0,
        alternate_group: 0,
        volume: 1,
        width: width,
        height: height,
        hdlr: 'vide',
        codec: codec, // Use the same codec that was used for encoding
        samples: samples,
        bitrate: bitrate, // Add bitrate information for better quality
      };

      // Add track to mp4boxFile
      mp4boxFile.addTrack(track);

      // Set fileStart and getPosition for each sample manually
      let fileStart = 0;
      for (const sample of samples) {
        const buffer = sample.data; // This is a Uint8Array
        // Add properties directly to the Uint8Array
        buffer.fileStart = fileStart;
        buffer.getPosition = function () {
          return this.fileStart;
        };
        fileStart += buffer.byteLength;

        // Use the underlying ArrayBuffer instead of the Uint8Array itself
        mp4boxFile.appendBuffer(buffer.buffer);
      }

      // Set MP4 options for higher quality
      mp4boxFile.moov.mvhd.rate = 1; // Normal playback rate
      mp4boxFile.moov.mvhd.volume = 1; // Full volume

      // Flush all data to finalize the MP4
      mp4boxFile.flush();

      // Get final MP4 as ArrayBuffer
      const mp4Buffer = mp4boxFile.write();
      return new Blob([mp4Buffer], { type: 'video/mp4' });
    } catch (error) {
      console.error('Error in muxChunksToMp4:', error);
      throw new Error(`MP4 muxing failed: ${error.message}`);
    }
  }

  // Handle WebM with audio separately (simpler implementation)
  async muxWebMWithAudio(videoChunks, audioElements, { fps, filename }) {
    // Create MediaRecorder for WebM
    const stream = this.canvas.captureStream(fps);

    // Add audio tracks from elements if available
    if (audioElements.length > 0) {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Create audio sources for each audio element
      for (const element of audioElements) {
        const audio = document.getElementById(element.properties.elementId);
        if (audio) {
          const source = audioContext.createMediaElementSource(audio);
          source.connect(destination);
        }
      }

      // Combine audio and video streams
      const tracks = [
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(tracks);

      // Use combined stream
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 5000000,
      });

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        this.downloadBlob(blob, filename);
      };

      recorder.start();
      setTimeout(() => recorder.stop(), this.maxTime || 5000);
    }
  }
  // Helper function to download Blob as file
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Helper function to download Blob as file
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  refreshElements() {
    refreshElementsUtil(this);
  }

  updateTextStyle(property, value) {
    if (!this.selectedElement) return;

    const element = this.selectedElement;

    switch (property) {
      case 'color':
        element.properties.color = value;
        break;
      case 'backgroundColor':
        element.properties.backgroundColor = value;
        break;
      case 'backgroundOpacity':
        element.properties.backgroundOpacity = value;
        break;
      case 'backgroundRadius':
        element.properties.backgroundRadius = value;
        break;
      case 'stroke':
        element.properties.stroke = value;
        break;
      case 'strokeColor':
        element.properties.strokeColor = value;
        break;
      case 'strokeOpacity':
        element.properties.strokeOpacity = value;
        break;
      case 'font':
        element.properties.font = value;
        break;
      case 'fontSize':
        element.properties.fontSize = value;
        break;
      case 'fontWeight':
        element.properties.fontWeight = value;
        break;
      case 'fontStyle':
        element.properties.fontStyle = value;
        break;
      case 'textAlign':
        element.properties.textAlign = value;
        break;
      case 'verticalAlign':
        element.properties.verticalAlign = value;
        break;
      case 'shadowColor':
        element.properties.shadowColor = value;
        break;
      case 'shadowOpacity':
        element.properties.shadowOpacity = value;
        break;
      case 'shadowBlur':
        element.properties.shadowBlur = value;
        break;
      case 'shadowOffsetX':
        element.properties.shadowOffsetX = value;
        break;
      case 'shadowOffsetY':
        element.properties.shadowOffsetY = value;
        break;
      case 'highlightColor':
        element.properties.highlightColor = value;
        break;
    }

    this.updateSelectedElement();
  }

  setApplyToAll(value) {
    this.applyToAll = value;
  }

  setSynchronise(value) {
    this.synchronise = value;
  }

  updateSynchronize(value) {
    if (this.selectedElement && this.selectedElement.type === 'text') {
      const updatedElement = {
        ...this.selectedElement,
        properties: {
          ...this.selectedElement.properties,
          synchronize: value,
        },
      };
      this.updateEditorElement(updatedElement);
    }
  }

  trimAudioElement(editorElement, timeFrame) {
    // Start move if not already started
    if (!this.moveState.isMoving) {
      this.moveState.isMoving = true;
      this.moveState.accumulatedMoves = new Map();
    }

    const MIN_DURATION = 1; // Minimum 1ms duration for audio elements
    let audioOffset = editorElement.properties.audioOffset || 0;
    const originalStart = editorElement.timeFrame.start;

    // Adjust audioOffset when trimming from the start
    if (timeFrame.start !== undefined) {
      const shift = timeFrame.start - editorElement.timeFrame.start;
      audioOffset += shift;
    }

    // Validate and adjust timeFrame
    const validatedTimeFrame = {
      start: Math.max(0, timeFrame.start ?? editorElement.timeFrame.start),
      end: Math.min(this.maxTime, timeFrame.end ?? editorElement.timeFrame.end),
    };

    // Ensure minimum duration
    if (validatedTimeFrame.end - validatedTimeFrame.start < MIN_DURATION) {
      if (timeFrame.start !== undefined) {
        validatedTimeFrame.end = validatedTimeFrame.start + MIN_DURATION;
      } else {
        validatedTimeFrame.start = validatedTimeFrame.end - MIN_DURATION;
      }
    }

    // Check if we're exceeding the audio duration
    const originalAudioElement = this.getAudioResourceById(editorElement.id);
    if (originalAudioElement && originalAudioElement.duration) {
      const currentDuration = validatedTimeFrame.end - validatedTimeFrame.start;
      if (currentDuration > originalAudioElement.duration) {
        // Adjust end time to match available audio duration
        if (timeFrame.start !== undefined) {
          validatedTimeFrame.end =
            validatedTimeFrame.start + originalAudioElement.duration;
        } else {
          validatedTimeFrame.start =
            validatedTimeFrame.end - originalAudioElement.duration;
        }
      }
    }

    // Find and adjust associated subtitle elements
    const subtitleElements = this.editorElements.filter(
      el =>
        el.type === 'text' &&
        el.subType === 'subtitles' &&
        el.properties.audioId === editorElement.id
    );

    subtitleElements.forEach(subtitleElement => {
      // Calculate new timeframe for subtitle
      const newTimeFrame = {
        start: Math.max(
          subtitleElement.timeFrame.start,
          validatedTimeFrame.start
        ),
        end: Math.min(subtitleElement.timeFrame.end, validatedTimeFrame.end),
      };

      // Handle subtitle trimming
      this.handleSubtitleTrimming(subtitleElement, newTimeFrame);
    });

    // Add update to accumulated moves
    this.moveState.accumulatedMoves.set(editorElement.id, {
      element: {
        ...editorElement,
        timeFrame: validatedTimeFrame,
        properties: {
          ...editorElement.properties,
          audioOffset: Math.max(0, audioOffset), // Ensure offset is never negative
        },
      },
      timeFrame: validatedTimeFrame,
      isAudio: true,
    });

    // Find and update overlapping elements
    const overlappingElements = this.editorElements.filter(
      el =>
        el.id !== editorElement.id &&
        el.row === editorElement.row &&
        validatedTimeFrame.start < el.timeFrame.end &&
        validatedTimeFrame.end > el.timeFrame.start
    );

    overlappingElements.forEach(el => {
      const updatedTimeFrame = { ...el.timeFrame };

      if (timeFrame.start !== undefined) {
        updatedTimeFrame.end = Math.min(
          validatedTimeFrame.start,
          el.timeFrame.end
        );
      } else if (timeFrame.end !== undefined) {
        updatedTimeFrame.start = Math.max(
          validatedTimeFrame.end,
          el.timeFrame.start
        );
      }

      // Ensure minimum duration for overlapping elements
      if (updatedTimeFrame.end - updatedTimeFrame.start < MIN_DURATION) {
        if (timeFrame.start !== undefined) {
          updatedTimeFrame.start = updatedTimeFrame.end - MIN_DURATION;
        } else {
          updatedTimeFrame.end = updatedTimeFrame.start + MIN_DURATION;
        }
      }

      this.moveState.accumulatedMoves.set(el.id, {
        element: {
          ...el,
          timeFrame: updatedTimeFrame,
        },
        timeFrame: updatedTimeFrame,
        isAudio: isEditorAudioElement(el),
      });
    });

    // Schedule update
    if (!this.moveState.rafId) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processAudioMoveUpdate()
      );
    }
  }

  trimVideoElement(editorElement, timeFrame) {
    // Start move if not already started
    if (!this.moveState.isMoving) {
      this.moveState.isMoving = true;
      this.moveState.accumulatedMoves = new Map();
    }

    const MIN_DURATION = 1; // Minimum 1ms duration for video elements
    let videoOffset = editorElement.properties.videoOffset || 0;
    const originalStart = editorElement.timeFrame.start;

    // Adjust videoOffset when trimming from the start
    if (timeFrame.start !== undefined) {
      const shift = timeFrame.start - editorElement.timeFrame.start;
      videoOffset += shift;
    }

    // Validate and adjust timeFrame
    const validatedTimeFrame = {
      start: Math.max(0, timeFrame.start ?? editorElement.timeFrame.start),
      end: Math.min(this.maxTime, timeFrame.end ?? editorElement.timeFrame.end),
    };

    // Ensure minimum duration
    if (validatedTimeFrame.end - validatedTimeFrame.start < MIN_DURATION) {
      if (timeFrame.start !== undefined) {
        validatedTimeFrame.end = validatedTimeFrame.start + MIN_DURATION;
      } else {
        validatedTimeFrame.start = validatedTimeFrame.end - MIN_DURATION;
      }
    }

    // Check if we're exceeding the video duration
    const originalVideoElement = this.videos.find(
      v => v.id === editorElement.id
    );
    if (originalVideoElement && originalVideoElement.duration) {
      const currentDuration = validatedTimeFrame.end - validatedTimeFrame.start;
      if (currentDuration > originalVideoElement.duration) {
        // Adjust end time to match available video duration
        if (timeFrame.start !== undefined) {
          validatedTimeFrame.end =
            validatedTimeFrame.start + originalVideoElement.duration;
        } else {
          validatedTimeFrame.start =
            validatedTimeFrame.end - originalVideoElement.duration;
        }
      }
    }

    // Add update to accumulated moves
    this.moveState.accumulatedMoves.set(editorElement.id, {
      element: {
        ...editorElement,
        timeFrame: validatedTimeFrame,
        properties: {
          ...editorElement.properties,
          videoOffset: Math.max(0, videoOffset), // Ensure offset is never negative
        },
      },
      timeFrame: validatedTimeFrame,
      isVideo: true,
    });

    // Find and update overlapping elements
    const overlappingElements = this.editorElements.filter(
      el =>
        el.id !== editorElement.id &&
        el.row === editorElement.row &&
        validatedTimeFrame.start < el.timeFrame.end &&
        validatedTimeFrame.end > el.timeFrame.start
    );

    overlappingElements.forEach(el => {
      const updatedTimeFrame = { ...el.timeFrame };

      if (timeFrame.start !== undefined) {
        updatedTimeFrame.end = Math.min(
          validatedTimeFrame.start,
          el.timeFrame.end
        );
      } else if (timeFrame.end !== undefined) {
        updatedTimeFrame.start = Math.max(
          validatedTimeFrame.end,
          el.timeFrame.start
        );
      }

      // Ensure minimum duration for overlapping elements
      if (updatedTimeFrame.end - updatedTimeFrame.start < MIN_DURATION) {
        if (timeFrame.start !== undefined) {
          updatedTimeFrame.start = updatedTimeFrame.end - MIN_DURATION;
        } else {
          updatedTimeFrame.end = updatedTimeFrame.start + MIN_DURATION;
        }
      }

      this.moveState.accumulatedMoves.set(el.id, {
        element: {
          ...el,
          timeFrame: updatedTimeFrame,
        },
        timeFrame: updatedTimeFrame,
        isVideo: isEditorVideoElement(el),
      });
    });

    // Schedule update
    if (!this.moveState.rafId) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processVideoMoveUpdate()
      );
    }
  }

  processVideoMoveUpdate() {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.moveState.lastUpdateTime;

    if (timeSinceLastUpdate < this.moveState.updateInterval) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processVideoMoveUpdate()
      );
      return;
    }

    if (this.moveState.accumulatedMoves.size > 0) {
      const updates = new Map(this.moveState.accumulatedMoves);

      runInAction(() => {
        this.editorElements = this.editorElements.map(el => {
          const update = updates.get(el.id);
          if (!update) return el;

          // Apply update
          return update.element;
        });
      });

      // Batch visual updates
      requestAnimationFrame(() => {
        this.updateVideoElements();
        this.canvas?.requestRenderAll();
      });
    }

    // Reset state
    this.moveState.accumulatedMoves.clear();
    this.moveState.lastUpdateTime = now;
    this.moveState.rafId = null;

    // Continue updates if still moving
    if (this.moveState.isMoving) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processVideoMoveUpdate()
      );
    }
  }

  processAudioMoveUpdate() {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.moveState.lastUpdateTime;

    if (timeSinceLastUpdate < this.moveState.updateInterval) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processAudioMoveUpdate()
      );
      return;
    }

    if (this.moveState.accumulatedMoves.size > 0) {
      const updates = new Map(this.moveState.accumulatedMoves);

      runInAction(() => {
        this.editorElements = this.editorElements.map(el => {
          const update = updates.get(el.id);
          if (!update) return el;

          // Apply update
          return update.element;
        });
      });

      // Batch visual updates
      requestAnimationFrame(() => {
        this.updateAudioElements();
        this.canvas?.requestRenderAll();
      });
    }

    // Reset state
    this.moveState.accumulatedMoves.clear();
    this.moveState.lastUpdateTime = now;
    this.moveState.rafId = null;

    // Continue updates if still moving
    if (this.moveState.isMoving) {
      this.moveState.rafId = requestAnimationFrame(() =>
        this.processAudioMoveUpdate()
      );
    }
  }

  debouncedRefreshElements = () => {
    if (this.refreshDebounceTimeout) {
      clearTimeout(this.refreshDebounceTimeout);
    }

    this.refreshDebounceTimeout = setTimeout(() => {
      if (this.pendingUpdates.size > 0) {
        this.refreshElements();
        this.pendingUpdates.clear();
      }
    }, 16); // Approximately one frame at 60fps
  };

  shouldUpdatePosition(newPosition) {
    const now = Date.now();

    // If this is the first position, update
    if (!this.lastPosition) {
      this.lastPosition = newPosition;
      this.lastUpdateTime = now;
      return true;
    }

    // Check if enough time has passed since last update
    if (now - this.lastUpdateTime < this.updateInterval) {
      return false;
    }

    // Check if position has changed significantly
    const hasSignificantChange =
      Math.abs(newPosition - this.lastPosition) > this.updateThreshold;

    if (hasSignificantChange) {
      this.lastPosition = newPosition;
      this.lastUpdateTime = now;
      return true;
    }

    return false;
  }

  // Add handleObjectModified as a class method
  handleObjectModified(fabricObject, element) {
    // Save current state to history before making changes
    if (!this.isUndoRedoOperation) {
    }

    const placement = element.placement;
    // Handle video and image elements properly to prevent scaling issues
    let newPlacement;
    if (element.type === 'video' || isEditorImageElement(element)) {
      newPlacement = {
        ...placement,
        x: fabricObject.left ?? placement.x,
        y: fabricObject.top ?? placement.y,
        // For video and image elements, preserve the scale values to avoid shrinking/cropping
        width: fabricObject.width ?? placement.width,
        height: fabricObject.height ?? placement.height,
        rotation: fabricObject.angle ?? placement.rotation,
        scaleX: fabricObject.scaleX ?? placement.scaleX,
        scaleY: fabricObject.scaleY ?? placement.scaleY,

        cropX:
          fabricObject.cropX !== undefined
            ? fabricObject.cropX
            : placement.cropX,
        cropY:
          fabricObject.cropY !== undefined
            ? fabricObject.cropY
            : placement.cropY,
      };
    } else {
      newPlacement = {
        ...placement,
        x: fabricObject.left ?? placement.x,
        y: fabricObject.top ?? placement.y,
        // For text elements, calculate actual dimensions and reset scale
        width: fabricObject.width * (fabricObject.scaleX || 1),
        height: fabricObject.height * (fabricObject.scaleY || 1),
        rotation: fabricObject.angle ?? placement.rotation,
        scaleX: 1,
        scaleY: 1,

        cropX:
          fabricObject.cropX !== undefined
            ? fabricObject.cropX
            : placement.cropX,
        cropY:
          fabricObject.cropY !== undefined
            ? fabricObject.cropY
            : placement.cropY,
      };
    }

    // Check if element has active animations that might be affecting its current transform
    const hasActiveAnimations = this.animations.some(animation => {
      if (
        animation.targetId !== element.id &&
        !(animation.targetIds && animation.targetIds.includes(element.id))
      )
        return false;

      const currentTime = this.currentTimeInMs;
      const animationStart = animation.properties?.startTime || 0;
      const animationEnd =
        animation.properties?.endTime || animation.duration || 1000;
      const elementStart = element.timeFrame?.start || 0;
      const elementEnd = element.timeFrame?.end || 0;

      const absoluteStart = elementStart + animationStart;
      const absoluteEnd = elementStart + animationEnd;

      return currentTime >= absoluteStart && currentTime <= absoluteEnd;
    });

    // Batch updates for all elements that need to be modified
    const updates = new Map();

    // Determine the correct initialState to preserve
    let preservedInitialState;
    if (hasActiveAnimations && element.initialState) {
      // If element has active animations, preserve the existing initialState
      // and don't update it with current animated values
      preservedInitialState = element.initialState;
    } else if (element.initialState) {
      // If no active animations, we can safely update initialState
      // but only if this appears to be a user-initiated change
      preservedInitialState = {
        scaleX: fabricObject.scaleX,
        scaleY: fabricObject.scaleY,
        left: fabricObject.left,
        top: fabricObject.top,
        opacity: fabricObject.opacity,
      };
    } else {
      // If no initialState exists, create one from placement data or current values
      preservedInitialState = {
        scaleX: placement.scaleX || fabricObject.scaleX,
        scaleY: placement.scaleY || fabricObject.scaleY,
        left: placement.x || fabricObject.left,
        top: placement.y || fabricObject.top,
        opacity: fabricObject.opacity || 1.0,
      };
    }

    // Add current element update
    const updatedElement = {
      ...element,
      ...fabricObject,
      placement: newPlacement,
      initialState: preservedInitialState,
    };

    // If it's a text element, update font properties
    if (element.type === 'text' && fabricObject.type === 'textbox') {
      const newText = fabricObject.text;
      const words = element.properties.words || [];

      // Handle subtitle text changes
      if (element.subType === 'subtitles' && words.length > 0) {
        const segmentDuration = element.timeFrame.end - element.timeFrame.start;
        const oldText = element.properties.text;
        const oldWords = oldText.trim().split(/\s+/);
        const newWords = newText.trim().split(/\s+/);

        const wordTimings = [];
        oldWords.forEach((oldWord, index) => {
          const timing = words[index];
          if (timing) {
            wordTimings.push({
              word: oldWord,
              start: timing.start,
              originalStart: timing.start,
              end: timing.end,
            });
          }
        });

        const updatedWords = newWords.map((word, index) => {
          const existingTiming = wordTimings.find(t => t.word === word);
          if (existingTiming) {
            return {
              word,
              start: existingTiming.originalStart,
              end: element.timeFrame.end,
            };
          }

          // Calculate timings based on word length and position
          const totalChars = newWords.reduce((sum, w) => sum + w.length, 0);
          const charsBeforeWord = newWords
            .slice(0, index)
            .reduce((sum, w) => sum + w.length, 0);
          const wordLength = word.length;

          // Calculate proportional duration based on word length
          const wordDurationShare = wordLength / totalChars;
          const wordDuration = segmentDuration * wordDurationShare;

          // Calculate start time based on the proportion of characters before this word
          const proportionalStart =
            (charsBeforeWord / totalChars) * segmentDuration;
          const wordStart = element.timeFrame.start + proportionalStart;

          return {
            word,
            start: Math.round(wordStart),
            end: element.timeFrame.end,
          };
        });

        updatedElement.properties = {
          ...updatedElement.properties,
          text: newText,
          words: updatedWords,
          wordObjects: [], // Reset word objects for recreation
          fontSize: fabricObject.fontSize,
          fontFamily: fabricObject.fontFamily,
          fontWeight: fabricObject.fontWeight,
          fontStyle: fabricObject.fontStyle || 'normal',
          textAlign: fabricObject.textAlign,
          width: fabricObject.width,
          height: fabricObject.height,
        };

        // Add new word animation
        if (updatedWords.length > 0) {
          this.animations = this.animations.filter(
            a => a.targetId !== element.id
          );
          this.animations.push({
            id: `${element.id}-word-animation`,
            targetId: element.id,
            type: 'textWordAnimation',
            duration: 500,
            properties: {},
          });
        }
      } else {
        // Regular text update
        updatedElement.properties = {
          ...updatedElement.properties,
          text: newText,
          fontSize: fabricObject.fontSize,
          fontFamily: fabricObject.fontFamily,
          fontWeight: fabricObject.fontWeight,
          fontStyle: fabricObject.fontStyle || 'normal',
          textAlign: fabricObject.textAlign,
          width: fabricObject.width,
          height: fabricObject.height,
        };
      }
    }

    updates.set(element.id, updatedElement);

    // If this is a text element, prepare updates for other text elements in the same row
    if (element.type === 'text') {
      this.editorElements.forEach(otherElement => {
        if (
          otherElement.id !== element.id &&
          otherElement.type === 'text' &&
          otherElement.row === element.row
        ) {
          const otherPlacement = {
            ...otherElement.placement,
            x: fabricObject.left ?? otherElement.placement.x,
            y: fabricObject.top ?? otherElement.placement.y,
            width: fabricObject.width * (fabricObject.scaleX || 1),
            height: fabricObject.height * (fabricObject.scaleY || 1),
            rotation: fabricObject.angle ?? otherElement.placement.rotation,
            scaleX: fabricObject.scaleX ?? otherElement.placement.scaleX,
            scaleY: fabricObject.scaleY ?? otherElement.placement.scaleY,
          };

          if (otherElement.fabricObject) {
            otherElement.fabricObject.set({
              left: otherPlacement.x,
              top: otherPlacement.y,
              angle: otherPlacement.rotation,
              scaleX: otherPlacement.scaleX,
              scaleY: otherPlacement.scaleY,
              width: fabricObject.width,
              height: fabricObject.height,
            });
            otherElement.fabricObject.setCoords();
          }

          updates.set(otherElement.id, {
            ...otherElement,
            placement: otherPlacement,
            initialState: {
              scaleX: fabricObject.scaleX,
              scaleY: fabricObject.scaleY,
              left: fabricObject.left,
              top: fabricObject.top,
              opacity: fabricObject.opacity,
            },
          });
        }
      });
    }

    // Set isUndoRedoOperation flag to prevent duplicate history entries
    this.isUndoRedoOperation = true;

    try {
      // Apply all updates in a single batch
      this.editorElements = this.editorElements.map(
        el => updates.get(el.id) || el
      );

      // For simple position/scale changes, don't refresh elements as it recreates fabric objects
      // Only render the canvas to update the display
      this.canvas.requestRenderAll();
    } finally {
      this.isUndoRedoOperation = false;
    }
  }

  updateSubtitlesStyle(property, value) {
    // Save current state before making changes
    if (!this.isUndoRedoOperation) {
    }

    // Batch updates for better performance
    const needsZIndexUpdate =
      property.startsWith('shadow') &&
      (property === 'shadowBlur' ||
        property === 'shadowOffsetX' ||
        property === 'shadowOffsetY');
    const needsBackgroundUpdate = property.startsWith('background');
    const needsCanvasRender =
      property.startsWith('shadow') || property.startsWith('background');

    this.editorElements = this.editorElements.map(element => {
      if (element.type === 'text' && element.subType === 'subtitles') {
        const newElement = { ...element };

        // Handle shadow properties specially
        if (property.startsWith('shadow')) {
          switch (property) {
            case 'shadowColor':
              newElement.properties.shadow = {
                color: '#000000',
                blur: 0,
                offsetX: 0,
                offsetY: 0,
                opacity: 1,
                ...newElement.properties.shadow,
              };
              newElement.properties.shadow.color = value;
              break;
            case 'shadowBlur':
              newElement.properties.shadow = {
                color: '#000000',
                offsetX: 0,
                offsetY: 0,
                opacity: 1,
                ...newElement.properties.shadow,
                blur: parseInt(value),
              };
              break;
            case 'shadowOffsetX':
              newElement.properties.shadow = {
                color: '#000000',
                blur: 0,
                offsetY: 0,
                opacity: 1,
                ...newElement.properties.shadow,
                offsetX: parseInt(value),
              };
              break;
            case 'shadowOffsetY':
              newElement.properties.shadow = {
                color: '#000000',
                blur: 0,
                offsetX: 0,
                opacity: 1,
                ...newElement.properties.shadow,
                offsetY: parseInt(value),
              };
              break;
            case 'shadowOpacity':
              newElement.properties.shadow = {
                color: '#000000',
                blur: 0,
                offsetX: 0,
                offsetY: 0,
                ...newElement.properties.shadow,
                opacity: parseFloat(value),
              };
              break;
            case 'motionColor':
              newElement.properties.motionColor = value;
              break;
            case 'highlightColor':
              newElement.properties.highlightColor = value;
              break;
          }
        } else {
          // Handle special property parsing
          let parsedValue = value;
          if (property === 'backgroundRadius') {
            parsedValue = parseInt(value) || 0;
          } else if (property === 'backgroundOpacity') {
            parsedValue = parseFloat(value);
          } else if (property === 'charSpacing') {
            parsedValue = parseFloat(value) || 0;
          } else if (property === 'lineHeight') {
            parsedValue = parseFloat(value) || 1.2;
          }

          newElement.properties = {
            ...newElement.properties,
            [property]: parsedValue,
          };
        }

        return newElement;
      }
      return element;
    });

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      // Refresh canvas but don't save history again
      this.refreshElements();

      // Update background for subtitle elements if background-related properties changed
      if (needsBackgroundUpdate) {
        this.editorElements.forEach(element => {
          if (element.subType === 'subtitles' && element.fabricObject) {
            this.createSubtitleBackground(element, element.fabricObject);

            // Ensure word objects are still in front after background update
            if (
              element.properties.wordObjects &&
              element.properties.wordObjects.length > 0
            ) {
              element.properties.wordObjects.forEach(wordObj => {
                if (wordObj && this.canvas.contains(wordObj)) {
                  this.canvas.bringToFront(wordObj);
                }
              });
            }
          }
        });
      }

      // Update z-index for shadow properties (batched)
      if (needsZIndexUpdate) {
        this.editorElements.forEach(element => {
          if (
            element.type === 'text' &&
            element.subType === 'subtitles' &&
            element.properties.wordObjects
          ) {
            this.updateWordZIndex(element);
          }
        });
      }

      // Force canvas render after shadow or background updates
      if (needsCanvasRender) {
        this.canvas.requestRenderAll();
      }
    });
  }

  initializeWordAnimations(element) {
    const fabricObject = element.fabricObject;
    const words = element.properties.words;
    const textObjects = [];

    // Get text metrics from original object
    const originalWidth = fabricObject.width;
    const originalLeft = fabricObject.left;
    const originalTop = fabricObject.top;

    // Calculate space width based on font size and word spacing factor
    const baseSpaceWidth = fabricObject.fontSize / 3;
    const spaceWidth =
      baseSpaceWidth + this.subtitlesPanelState.wordSpacingFactor;

    // Calculate lines and positions
    const { lines, lineHeights } = this.calculateWordLines(
      words,
      fabricObject,
      originalWidth,
      spaceWidth
    );

    // Calculate total height adjustment needed for centering all lines
    const totalLinesHeight = lineHeights.reduce(
      (sum, height) => sum + height,
      0
    );
    const originalTotalHeight = lineHeights.length * fabricObject.fontSize;
    const totalExtraSpace = totalLinesHeight - originalTotalHeight;
    const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

    // Create and position word objects line by line
    let currentTop = originalTop + startingTopAdjustment;
    lines.forEach((line, lineIndex) => {
      const lineLeft = this.calculateLineStartPosition(
        line,
        originalLeft,
        originalWidth,
        fabricObject.textAlign,
        spaceWidth
      );

      // Calculate vertical centering for this line
      const lineHeight = lineHeights[lineIndex] || fabricObject.fontSize;
      const extraSpace = lineHeight - fabricObject.fontSize;
      const verticalOffset = extraSpace / 2; // Center the text vertically in the line
      const adjustedTop = currentTop + verticalOffset;

      let currentLeft = lineLeft;
      line.forEach((wordData, wordIndex) => {
        const wordObject = this.createWordObject(
          wordData.word,
          currentLeft,
          adjustedTop, // Use adjusted top position
          fabricObject
        );

        // Background will be handled at segment level, not word level

        currentLeft +=
          wordData.width + (wordIndex < line.length - 1 ? spaceWidth : 0);
        textObjects.push(wordObject);
        this.canvas.add(wordObject);
        wordObject.bringToFront();
      });

      currentTop += lineHeight; // Use full line height for next line
    });

    // Store word objects reference
    element.properties.wordObjects = textObjects;

    // Hide original text object
    fabricObject.set('opacity', 0);

    // Create/update background after word objects are created
    if (element.subType === 'subtitles') {
      this.createSubtitleBackground(element, fabricObject);
    }

    // Add animation
    const existingAnimation = this.animations.find(
      a => a.targetId === element.id && a.type === 'textWordAnimation'
    );

    if (!existingAnimation) {
      const wordAnimation = {
        id: `${element.id}-word-animation`,
        targetId: element.id,
        type: 'textWordAnimation',
        effect: 'in',
        duration: 500,
        properties: {},
      };
      this.animations.push(wordAnimation);
    }

    // Before creating new wordObjects, ensure all old ones are deleted
    if (element.properties.wordObjects?.length > 0) {
      element.properties.wordObjects.forEach(obj => {
        if (obj && this.canvas.contains(obj)) {
          this.canvas.remove(obj);
        }
      });
      element.properties.wordObjects = [];
    }
  }

  calculateWordLines(words, textObject, maxWidth, spaceWidth) {
    const lines = [[]];
    const lineHeights = [0];
    let currentLine = 0;
    let lineWidths = [0];

    words.forEach(word => {
      let wordWidth;
      let wordHeight;
      const letterSpacing = this.subtitlesPanelState.letterSpacingFactor || 0;

      if (letterSpacing === 0) {
        // Use canvas measurement for default case (no letter spacing)
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        ctx.font = `${textObject.fontWeight} ${textObject.fontSize}px ${textObject.fontFamily}`;
        wordWidth = ctx.measureText(word.word || word.text || '').width;
        wordHeight = textObject.fontSize;
      } else {
        // Use fabric.Text for letter spacing case
        const tempText = new fabric.Text(word.word || word.text || '', {
          fontSize: textObject.fontSize,
          fontWeight: textObject.fontWeight,
          fontFamily: textObject.fontFamily,
          charSpacing: letterSpacing,
        });
        wordWidth = tempText.width;
        wordHeight = tempText.height;
      }

      // Calculate line height using custom line height factor
      // Line height should be distributed evenly: extra space = (lineHeight - fontSize)
      // Half of extra space goes above, half below
      const lineHeightFactor = this.subtitlesPanelState.lineHeightFactor || 1.2;
      const customLineHeight = lineHeightFactor * textObject.fontSize;

      lineHeights[currentLine] = Math.max(
        lineHeights[currentLine],
        customLineHeight
      );

      if (
        lineWidths[currentLine] +
          wordWidth +
          (lines[currentLine].length > 0 ? spaceWidth : 0) >
        maxWidth
      ) {
        currentLine++;
        lines[currentLine] = [];
        lineWidths[currentLine] = 0;
        lineHeights[currentLine] = customLineHeight;
      }

      lines[currentLine].push({
        word: word,
        width: wordWidth,
      });
      lineWidths[currentLine] +=
        wordWidth + (lines[currentLine].length > 1 ? spaceWidth : 0);
    });

    return { lines, lineHeights };
  }

  calculateLineStartPosition(
    line,
    originalLeft,
    originalWidth,
    textAlign,
    spaceWidth
  ) {
    const lineWidth = line.reduce((width, wordData, index) => {
      return (
        width + wordData.width + (index < line.length - 1 ? spaceWidth : 0)
      );
    }, 0);

    // Account for the fact that originalLeft is the center position (originX: 'center')
    // We need to calculate the actual left boundary of the text container
    const containerLeft = originalLeft - originalWidth / 2;
    const containerRight = originalLeft + originalWidth / 2;

    switch (textAlign) {
      case 'center':
        return originalLeft - lineWidth / 2;
      case 'left':
        return containerRight - lineWidth;
      default: // 'right'
        return containerLeft;
    }
  }

  animateBackgroundColor(wordObj, fromColor, toColor, duration) {
    // Cancel any existing background animation for this word
    if (wordObj._backgroundAnimationId) {
      cancelAnimationFrame(wordObj._backgroundAnimationId);
      wordObj._backgroundAnimationId = null;
    }

    // Check if background rect exists
    if (!wordObj._backgroundRect) {
      return;
    }

    // If colors are the same, no need to animate
    if (fromColor === toColor) {
      if (toColor === 'transparent') {
        wordObj._backgroundRect.set({ fill: 'transparent', opacity: 0 });
      } else {
        wordObj._backgroundRect.set({ fill: toColor, opacity: 1 });
      }
      this.canvas.requestRenderAll();
      return;
    }

    // Mark animation as running
    wordObj._isAnimatingBackground = true;

    // Simple background color animation for background rectangle
    const startTime = performance.now();

    const animate = currentTime => {
      // Check if this animation was cancelled
      if (!wordObj._isAnimatingBackground || !wordObj._backgroundRect) {
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        // Interpolate between colors (simplified for transparent/color transitions)
        if (fromColor === 'transparent' && toColor !== 'transparent') {
          // Fading in
          const opacity = easedProgress;
          wordObj._backgroundRect.set({
            fill: toColor,
            opacity: opacity,
          });
        } else if (fromColor !== 'transparent' && toColor === 'transparent') {
          // Fading out
          const opacity = 1 - easedProgress;
          wordObj._backgroundRect.set({
            fill: fromColor,
            opacity: opacity,
          });
        } else {
          // Direct color change (rare case)
          wordObj._backgroundRect.set({
            fill: toColor,
            opacity: 1,
          });
        }

        // Sync position during animation to ensure alignment
        this.syncBackgroundPosition(wordObj);
        this.canvas.requestRenderAll();
        wordObj._backgroundAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete
        if (toColor === 'transparent') {
          wordObj._backgroundRect.set({ fill: 'transparent', opacity: 0 });
        } else {
          wordObj._backgroundRect.set({ fill: toColor, opacity: 1 });
        }
        wordObj._backgroundAnimationId = null;
        wordObj._isAnimatingBackground = false;
        this.canvas.requestRenderAll();
      }
    };

    wordObj._backgroundAnimationId = requestAnimationFrame(animate);
  }

  hexToRgb(hex) {
    // Convert hex color to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 215, b: 0 }; // Default to gold color
  }

  syncBackgroundPosition(wordObj) {
    // Sync background rectangle position with text object
    if (wordObj._backgroundRect && wordObj._backgroundRect._textObject) {
      const textObj = wordObj._backgroundRect._textObject;
      const horizontalPadding = Math.max(6, textObj.fontSize * 0.1);
      const verticalPadding = Math.max(4, textObj.fontSize * 0.08);

      wordObj._backgroundRect.set({
        left: textObj.left - horizontalPadding,
        top: textObj.top - verticalPadding,
      });
    }
  }

  updateWordZIndex(element) {
    if (
      !element.properties.wordObjects ||
      element.properties.wordObjects.length === 0
    ) {
      return;
    }

    // Get shadow properties from element
    const shadow = element.properties.shadow;
    if (!shadow || (shadow.offsetX === 0 && shadow.offsetY === 0)) {
      return;
    }

    // Calculate shadow angle in degrees
    let shadowAngle =
      Math.atan2(shadow.offsetY, shadow.offsetX) * (180 / Math.PI);
    // Normalize angle to 0-360 range
    if (shadowAngle < 0) {
      shadowAngle += 360;
    }

    // Sort word objects by their left position
    const sortedWords = [...element.properties.wordObjects]
      .map((wordObj, index) => ({ wordObj, index, left: wordObj.left }))
      .sort((a, b) => a.left - b.left);

    // Apply z-index based on shadow direction
    // Shadow going left (90° to 270°): rightmost words should be on top
    // Shadow going right (270° to 90°): leftmost words should be on top
    const shadowGoesLeft = shadowAngle > 90 && shadowAngle < 270;

    if (!shadowGoesLeft) {
      // Shadow goes left: arrange words from left to right (rightmost on top)
      sortedWords.forEach((item, index) => {
        if (item.wordObj && this.canvas.contains(item.wordObj)) {
          // Move each word to front in order, so rightmost ends up on top
          this.canvas.bringToFront(item.wordObj);
        }
      });
    } else {
      // Shadow goes right: arrange words from right to left (leftmost on top)
      sortedWords.reverse().forEach((item, index) => {
        if (item.wordObj && this.canvas.contains(item.wordObj)) {
          // Move each word to front in reverse order, so leftmost ends up on top
          this.canvas.bringToFront(item.wordObj);
        }
      });
    }
  }

  updateWordObjectsPositions(element, textObject) {
    const words = element.properties.words;
    const wordObjects = element.properties.wordObjects;

    if (!words || !wordObjects) return;

    // Calculate space width based on font size and word spacing factor
    const baseSpaceWidth = textObject.fontSize / 3;
    const spaceWidth =
      baseSpaceWidth + this.subtitlesPanelState.wordSpacingFactor;

    // Recalculate positions
    const originalWidth = textObject.width;
    const originalLeft = textObject.left;
    const originalTop = textObject.top;

    // Calculate new lines and positions
    const { lines, lineHeights } = this.calculateWordLines(
      words,
      textObject,
      originalWidth,
      spaceWidth
    );

    // Calculate total height adjustment needed for centering all lines
    const totalLinesHeight = lineHeights.reduce(
      (sum, height) => sum + height,
      0
    );
    const originalTotalHeight = lineHeights.length * textObject.fontSize;
    const totalExtraSpace = totalLinesHeight - originalTotalHeight;
    const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

    // Update positions
    let wordIndex = 0;
    let currentTop = originalTop + startingTopAdjustment;

    lines.forEach((line, lineIndex) => {
      const lineLeft = this.calculateLineStartPosition(
        line,
        originalLeft,
        originalWidth,
        textObject.textAlign,
        spaceWidth
      );

      // Calculate vertical centering for this line
      const lineHeight = lineHeights[lineIndex] || textObject.fontSize;
      const extraSpace = lineHeight - textObject.fontSize;
      const verticalOffset = extraSpace / 2; // Center the text vertically in the line
      const adjustedTop = currentTop + verticalOffset;

      let currentLeft = lineLeft;
      line.forEach((wordData, lineWordIndex) => {
        const wordObj = wordObjects[wordIndex];
        if (wordObj) {
          wordObj.set({
            left: currentLeft,
            top: adjustedTop, // Use adjusted top position
          });
          wordObj.setCoords();
        }
        currentLeft +=
          wordData.width + (lineWordIndex < line.length - 1 ? spaceWidth : 0);
        wordIndex++;
      });
      currentTop += lineHeight; // Use full line height for next line
    });

    // Update background after word objects are repositioned
    if (element.subType === 'subtitles') {
      this.createSubtitleBackground(element, textObject);
    }
  }

  updateWordObjects(element, textObject) {
    const words = element.properties.words;
    const wordObjects = element.properties.wordObjects;

    // Update style properties for all word objects
    wordObjects.forEach(wordObj => {
      if (!wordObj) return;

      wordObj.set({
        fontSize: textObject.fontSize,
        fontWeight: textObject.fontWeight,
        fontFamily: textObject.fontFamily,
        fontStyle: textObject.fontStyle || 'normal',
        fill: textObject.fill,
        stroke: textObject.stroke,
        strokeWidth: textObject.strokeWidth,
        strokeMiterLimit: textObject.strokeMiterLimit,
        shadow: textObject.shadow,
        textAlign: 'left',
        originX: 'left',
        originY: textObject.originY,
        paintFirst: textObject.paintFirst,
        opacity: 0,
        selectable: false,
        evented: false,
        objectCaching: true,
        backgroundColor: 'transparent',
        charSpacing: this.subtitlesPanelState.letterSpacingFactor || 0,
        lineHeight: this.subtitlesPanelState.lineHeightFactor || 1.2,
      });

      // Also set the font string explicitly
      const fontString = `${textObject.fontStyle || 'normal'} ${
        textObject.fontWeight || 'normal'
      } ${textObject.fontSize || 12}px ${textObject.fontFamily || 'Arial'}`;
      wordObj.set('font', fontString);

      // Update parent properties for background
      wordObj.parentProperties = {
        backgroundColor: textObject.backgroundColor,
        backgroundRadius: textObject.backgroundRadius,
      };

      // Update or create background if needed
      if (wordObj.backgroundObject) {
        // Remove old background
        if (this.canvas.contains(wordObj.backgroundObject)) {
          this.canvas.remove(wordObj.backgroundObject);
        }
        wordObj.backgroundObject = null;
      }

      // Create new background if needed
      const background = this.createWordBackground(
        wordObj,
        wordObj.parentProperties
      );
      if (background) {
        this.canvas.add(background);
        wordObj.backgroundObject = background;
      }
    });

    // Calculate space width based on font size and word spacing factor
    const baseSpaceWidth = textObject.fontSize / 3;
    const spaceWidth =
      baseSpaceWidth + this.subtitlesPanelState.wordSpacingFactor;

    // Recalculate positions
    const originalWidth = textObject.width;
    const originalLeft = textObject.left;
    const originalTop = textObject.top;

    // Calculate new lines and positions
    const { lines, lineHeights } = this.calculateWordLines(
      words,
      textObject,
      originalWidth,
      spaceWidth
    );

    // Calculate total height adjustment needed for centering all lines
    const totalLinesHeight = lineHeights.reduce(
      (sum, height) => sum + height,
      0
    );
    const originalTotalHeight = lineHeights.length * textObject.fontSize;
    const totalExtraSpace = totalLinesHeight - originalTotalHeight;
    const startingTopAdjustment = -totalExtraSpace / 2; // Move up by half of extra space

    // Update positions
    let wordIndex = 0;
    let currentTop = originalTop + startingTopAdjustment;

    lines.forEach((line, lineIndex) => {
      const lineLeft = this.calculateLineStartPosition(
        line,
        originalLeft,
        originalWidth,
        textObject.textAlign,
        spaceWidth
      );

      // Calculate vertical centering for this line
      const lineHeight = lineHeights[lineIndex] || textObject.fontSize;
      const extraSpace = lineHeight - textObject.fontSize;
      const verticalOffset = extraSpace / 2; // Center the text vertically in the line
      const adjustedTop = currentTop + verticalOffset;

      let currentLeft = lineLeft;
      line.forEach((wordData, lineWordIndex) => {
        const wordObj = wordObjects[wordIndex];
        if (wordObj) {
          wordObj.set({
            left: currentLeft,
            top: adjustedTop, // Use adjusted top position
          });
          wordObj.setCoords();

          // Background is handled at segment level, not word level
        }
        currentLeft +=
          wordData.width + (lineWordIndex < line.length - 1 ? spaceWidth : 0);
        wordIndex++;
      });
      currentTop += lineHeight; // Use full line height for next line
    });

    // Update background after word objects are repositioned
    if (element.subType === 'subtitles') {
      this.createSubtitleBackground(element, textObject);
    }

    this.canvas.requestRenderAll();
  }

  createWordObject(word, left, top, parentObject) {
    const textObject = new fabric.Text(word.word || word.text || '', {
      left: left,
      top: top,
      fontSize: parentObject.fontSize,
      fontWeight: parentObject.fontWeight,
      fontFamily: parentObject.fontFamily,
      fontStyle: parentObject.fontStyle || 'normal',
      fill: parentObject.fill,
      stroke: parentObject.stroke,
      strokeWidth: parentObject.strokeWidth,
      strokeMiterLimit: parentObject.strokeMiterLimit,
      shadow: parentObject.shadow,
      textAlign: 'left', // Always left align individual words
      originX: 'left',
      originY: parentObject.originY,
      paintFirst: parentObject.paintFirst,
      opacity: 0,
      selectable: false,
      evented: false,
      objectCaching: true,
      backgroundColor: 'transparent',
      charSpacing: this.subtitlesPanelState.letterSpacingFactor || 0,
      lineHeight: this.subtitlesPanelState.lineHeightFactor || 1.2,
    });

    // Also set the font string explicitly
    const fontString = `${parentObject.fontStyle || 'normal'} ${
      parentObject.fontWeight || 'normal'
    } ${parentObject.fontSize || 12}px ${parentObject.fontFamily || 'Arial'}`;
    textObject.set('font', fontString);

    return textObject;
  }

  createWordBackground(textObject, parentProperties) {
    // const { backgroundColor, backgroundOpacity, backgroundRadius } =
    //   parentProperties;
    // if (!backgroundColor || backgroundOpacity === 0) {
    //   return null;
    // }
    // const padding = 8; // Padding around text
    // const width = textObject.width + padding * 2;
    // const height = textObject.height + padding;
    // const background = new fabric.Rect({
    //   left: textObject.left - padding,
    //   top: textObject.top - padding / 2,
    //   width: width,
    //   height: height,
    //   fill: backgroundColor,
    //   opacity: backgroundOpacity,
    //   rx: backgroundRadius || 0,
    //   ry: backgroundRadius || 0,
    //   originX: 'left',
    //   originY: 'top',
    //   selectable: false,
    //   evented: false,
    //   objectCaching: true,
    // });
    // return background;
  }

  createSubtitleBackground(element, textObject) {
    const props = element.properties;

    // Remove existing background if it exists
    if (
      element.backgroundObject &&
      this.canvas.contains(element.backgroundObject)
    ) {
      this.canvas.remove(element.backgroundObject);
      element.backgroundObject = null;
    }

    const padding = 16;
    const backgroundRadius = props.backgroundRadius || 0;

    // Calculate text bounds
    const textBounds = textObject.getBoundingRect();

    const backgroundRect = new fabric.Rect({
      left: textBounds.left - padding,
      top: textBounds.top - padding / 2,
      width: textBounds.width + padding * 2,
      height: textBounds.height + padding,
      fill: props.backgroundColor,
      opacity: props.backgroundOpacity || 0.5,
      rx: backgroundRadius,
      ry: backgroundRadius,
      selectable: false,
      evented: false,
      objectCaching: true,
      name: `${element.id}_background`,
    });

    // Add background to canvas and store reference
    this.canvas.add(backgroundRect);

    // Move background behind text elements
    // Find the lowest z-index of text-related objects for this element
    let minIndex = this.canvas.getObjects().length;

    // Check main text object
    if (element.fabricObject && this.canvas.contains(element.fabricObject)) {
      const textIndex = this.canvas.getObjects().indexOf(element.fabricObject);
      if (textIndex !== -1) {
        minIndex = Math.min(minIndex, textIndex);
      }
    }

    // Check word objects if they exist
    if (element.properties.wordObjects) {
      element.properties.wordObjects.forEach(wordObj => {
        if (wordObj && this.canvas.contains(wordObj)) {
          const wordIndex = this.canvas.getObjects().indexOf(wordObj);
          if (wordIndex !== -1) {
            minIndex = Math.min(minIndex, wordIndex);
          }
        }
      });
    }

    // Always place background behind all text elements
    // First send to back, then ensure it's behind all text-related objects
    backgroundRect.sendToBack();

    // If there are word objects, make sure background is behind them
    if (
      element.properties.wordObjects &&
      element.properties.wordObjects.length > 0
    ) {
      element.properties.wordObjects.forEach(wordObj => {
        if (wordObj && this.canvas.contains(wordObj)) {
          this.canvas.bringToFront(wordObj);
        }
      });
    }

    // Also ensure main text object is in front if it's visible
    if (
      element.fabricObject &&
      this.canvas.contains(element.fabricObject) &&
      element.fabricObject.opacity > 0
    ) {
      this.canvas.bringToFront(element.fabricObject);
    }

    element.backgroundObject = backgroundRect;
  }

  // Set story ID for backend sync
  setStoryId(id) {
    this.storyId = id;
  }

  setInitializationState(state) {
    this.isInitializationInProgress = state;
  }

  async restoreElementsFromBackend({ editorElements }) {
    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < editorElements.length; i += batchSize) {
      batches.push(editorElements.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async element => {
          if (element.subType && element.subType === 'subtitles') {
            return;
          }

          switch (element.type) {
            case 'audio':
              await this.addExistingAudio({
                id: element.id,
                base64Audio: element.properties.src, // This is the URL                name: element.name,
                row: element.row,
                startTime: element.timeFrame.start,
                durationMs: element.timeFrame.end - element.timeFrame.start,
                duration: element.duration,
                audioType: element.properties?.audioType,
                audioOffset: element.properties?.audioOffset,
                properties: element.properties, // Keep all original properties
                autoSubtitles: element.properties?.autoSubtitles,
                text: element.properties?.text,
              });
              break;

            case 'imageUrl':
              await this.setImageOnCanvas({
                url: element.properties.src,
                element: {
                  id: element.id,
                  name: element.name,
                  type: element.type,
                  pointId: element.pointId,
                  sentence: element.sentence,
                  placement: element.placement,
                  timeFrame: element.timeFrame,
                  subType: element.subType,
                  row: element.row,
                  from: element.from,
                  properties: element.properties,
                  initialState: element.initialState || {
                    scaleX: element.placement?.scaleX || 1,
                    scaleY: element.placement?.scaleY || 1,
                    left: element.placement?.x || 0,
                    top: element.placement?.y || 0,
                    opacity: 1.0,
                  },
                },
              });
              break;

            case 'text':
              await this.addTextOnCanvas({
                imageId: element.imageId,
                pointId: element.pointId,
                sentence: element.sentence,
                point: element.point,
                text: element.properties.text,
                placement: element.placement,
                timeFrame: element.timeFrame,
                row: element.row,
                properties: {
                  ...element.properties,
                },
                timelineOnly: false,
              });
              break;

            case 'video':
              await this.addExistingVideo({
                src: element.properties.src,
                id: element.id,
                name: element.name,
                row: element.row,
                startTime: element.timeFrame.start,
                duration: element.timeFrame.end - element.timeFrame.start,
                width: element.properties.width,
                height: element.properties.height,
                placement: element.placement,
                properties: element.properties,
                timeFrame: element.timeFrame,
              });
              break;

            default:
              break;
          }
        })
      );

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  async mergeVoiceOvers(voiceElements) {
    try {
      let currentStartTime = 0;

      // Add audio tracks sequentially using provided durations
      for (let i = 0; i < voiceElements.length; i++) {
        const { url, duration } = voiceElements[i];

        this.addExistingAudio({
          id: `vo-${i}-${Date.now()}`,
          base64Audio: url,
          name: `Voice Over ${i + 1}`,
          row: 2,
          startTime: currentStartTime,
          durationMs: duration,
          duration: duration,
          audioType: 'voiceover',
          sentenceId: voiceElements[i].sentenceId,
        });

        currentStartTime += duration;
      }
    } catch (error) {
      console.error('Error adding voice overs:', error);
      throw error;
    }
  }

  recalculateElementsForSentence(sentenceId, newPointId) {
    const sentenceElements = this.editorElements.filter(
      el => el.sentence?._id === sentenceId
    );

    if (sentenceElements.length === 0) return;

    const sentenceTimeFrame = {
      start: Math.min(...sentenceElements.map(el => el.timeFrame.start)),
      end: Math.max(...sentenceElements.map(el => el.timeFrame.end)),
    };

    const sentenceDuration = sentenceTimeFrame.end - sentenceTimeFrame.start;

    const pointGroups = sentenceElements.reduce((groups, element) => {
      const pointId = element.pointId;
      if (!groups[pointId]) {
        groups[pointId] = [];
      }
      groups[pointId].push(element);
      return groups;
    }, {});

    const pointCount = Object.keys(pointGroups).length;

    const newPointDuration = sentenceDuration / pointCount;

    let currentStartTime = sentenceTimeFrame.start;

    Object.entries(pointGroups).forEach(([pointId, elements]) => {
      const newTimeFrame = {
        start: currentStartTime,
        end: currentStartTime + newPointDuration,
      };

      elements.forEach(element => {
        if (element.type === 'audio') {
          const currentOffset = element.properties.audioOffset || 0;
          const timeDiff = newTimeFrame.start - element.timeFrame.start;
          element.properties.audioOffset = currentOffset + timeDiff;
        }

        element.timeFrame = { ...newTimeFrame };
      });

      currentStartTime += newPointDuration;
    });

    this.refreshElements();
    this.refreshAnimations();
  }

  createElementForNewPoint(point, sentenceId) {
    const sentenceElements = this.editorElements.filter(
      el => el.sentence?._id === sentenceId
    );

    if (sentenceElements.length === 0) return;

    const sentenceTimeFrame = {
      start: Math.min(...sentenceElements.map(el => el.timeFrame.start)),
      end: Math.max(...sentenceElements.map(el => el.timeFrame.end)),
    };

    const sentence = sentenceElements[0].sentence;

    this.addImageToCanvas({
      store: this,
      url: point.selectedImage?.googleCloudUrl || '',
      minUrl: point.selectedImage?.minGoogleCloudUrl || '',
      imageId: point._id,
      startTime: sentenceTimeFrame.start,
      endTime: sentenceTimeFrame.end,
      pointId: point._id,
      point: point,
      sentence: sentence,
      storyId: sentence.storyId,
    });

    if (this.editorElements.find(el => el.subType === 'subtitles')) {
      return;
    }

    this.addText({
      text: point.point || '',
      startTime: sentenceTimeFrame.start,
      endTime: sentenceTimeFrame.end,
      imageId: point._id,
      pointId: point._id,
      sentence: sentence,
      point: point,
      storyId: sentence.storyId,
    });
  }

  // Method to clear audio without decorator
  clearAudio() {
    runInAction(() => {
      // Clear the audio array
      this.audios = [];

      // Remove audio elements from editorElements
      this.editorElements = this.editorElements.filter(
        element => element.type !== 'audio'
      );

      // Update the canvas
      if (this.canvas) {
        this.canvas.requestRenderAll();
      }
    });
  }

  // Add method to save drawn paths
  addDrawnPath(path) {
    if (path) {
      this.drawnPaths.push(path);
    }

    // Optional: Save to history
  }

  // Add method to clear all drawn paths
  clearDrawnPaths() {
    if (this.canvas) {
      const drawingObjects = this.canvas
        .getObjects()
        .filter(obj => obj.type === 'line' || obj.type === 'path');

      if (drawingObjects.length > 0) {
        this.canvas.remove(...drawingObjects);
        this.canvas.renderAll();
      }

      this.drawnPaths = [];
    }
  }

  clearGuidelines() {
    if (this.guideline && this.canvas) {
      // Clear any existing guideline lines
      const guidelineObjects = this.canvas
        .getObjects()
        .filter(obj => obj.guidelineLine);

      if (guidelineObjects.length > 0) {
        this.canvas.remove(...guidelineObjects);
        this.canvas.renderAll();
      }
    }
  }

  updateImageCrop(imageObject) {
    if (!imageObject) return;

    let elementToUpdate = null;
    if (imageObject.name) {
      elementToUpdate = this.editorElements.find(
        el => el.id === imageObject.name
      );
    }

    if (!elementToUpdate && imageObject.id) {
      elementToUpdate = this.editorElements.find(
        el => el.id === imageObject.id
      );
    }

    if (!elementToUpdate) {
      elementToUpdate = this.editorElements.find(
        el =>
          (el.type === 'image' || el.type === 'imageUrl') &&
          (el.imageId === imageObject.id ||
            el.properties?.imageId === imageObject.id)
      );
    }

    if (elementToUpdate) {
      const updatedElement = {
        ...elementToUpdate,
        placement: {
          ...elementToUpdate.placement,
          x: imageObject.left,
          y: imageObject.top,
          width: imageObject.width * (imageObject.scaleX || 1),
          height: imageObject.height * (imageObject.scaleY || 1),
          scaleX: imageObject.scaleX,
          scaleY: imageObject.scaleY,
          cropX: imageObject.cropX,
          cropY: imageObject.cropY,
        },
      };

      this.editorElements = this.editorElements.map(el =>
        el.id === updatedElement.id ? updatedElement : el
      );
    }
  }

  // Add method to get an audio resource by ID
  getAudioResourceById(id) {
    // Try to find the audio element in editorElements first
    const editorElement = this.editorElements.find(
      el => el.id === id && el.type === 'audio'
    );
    if (editorElement) {
      return editorElement;
    }

    // If not found, search in other audio resources
    // This might be necessary if the audio has been added but not yet placed in the editor
    const audioElement = this.audioResources.find(a => a.id === id);
    return audioElement;
  }

  shiftElementsAfterRemoval(removedElement) {
    return;
  }

  setAutoAdjustDuration(value) {
    this.autoAdjustDuration = value;
  }

  compactAudioElements() {
    // Set initialization state to prevent intermediate history saves
    this.setInitializationState(true);

    // Save current scale value and timeline duration before compacting
    const scaleStr =
      document.documentElement.style.getPropertyValue('--scale-factor');
    const initialScale = scaleStr
      ? Math.round(parseFloat(scaleStr) * 100) / 100
      : 1;
    const initialDuration = this.lastElementEnd;

    try {
      let hasGaps = true;
      let iterationCount = 0;
      const MAX_ITERATIONS = 100;

      while (hasGaps && iterationCount < MAX_ITERATIONS) {
        // Get all audio elements
        const audioElements = this.editorElements.filter(
          el => el.type === 'audio'
        );

        if (audioElements.length === 0) return;

        // Sort by row and start time
        const elementsByRow = audioElements.reduce((acc, element) => {
          if (!acc[element.row]) {
            acc[element.row] = [];
          }
          acc[element.row].push(element);
          return acc;
        }, {});

        // Collect all gaps from all rows, including spaces before first and after last audio
        const allGaps = [];
        Object.entries(elementsByRow).forEach(([row, elements]) => {
          // Sort elements by start time
          const sortedElements = elements.sort(
            (a, b) => a.timeFrame.start - b.timeFrame.start
          );

          // Check for gap at the start (before first audio)
          if (sortedElements[0].timeFrame.start > 0) {
            allGaps.push({
              row: parseInt(row),
              start: 0,
              end: sortedElements[0].timeFrame.start,
              duration: sortedElements[0].timeFrame.start,
            });
          }

          // Find gaps between audio elements
          for (let i = 0; i < sortedElements.length - 1; i++) {
            const currentEnd = sortedElements[i].timeFrame.end;
            const nextStart = sortedElements[i + 1].timeFrame.start;
            if (nextStart > currentEnd) {
              allGaps.push({
                row: parseInt(row),
                start: currentEnd,
                end: nextStart,
                duration: nextStart - currentEnd,
              });
            }
          }

          // Check for gap at the end (after last audio)
          const lastElement = sortedElements[sortedElements.length - 1];
          const lastElementEnd = lastElement.timeFrame.end;
          const rowEndTime = Math.max(
            ...this.editorElements.map(el => el.timeFrame.end)
          );
          if (lastElementEnd < rowEndTime) {
            allGaps.push({
              row: parseInt(row),
              start: lastElementEnd,
              end: rowEndTime,
              duration: rowEndTime - lastElementEnd,
            });
          }
        });

        // If no gaps found, we're done
        if (allGaps.length === 0) {
          hasGaps = false;
          break;
        }

        // Sort all gaps by start time
        allGaps.sort((a, b) => a.start - b.start);

        // Process the first gap
        const gap = allGaps[0];

        // Get all non-audio elements
        const nonAudioElements = this.editorElements.filter(
          el => el.type !== 'audio'
        );

        // Process each non-audio element
        nonAudioElements.forEach(element => {
          const originalStart = element.timeFrame.start;
          const originalEnd = element.timeFrame.end;
          const originalDuration = originalEnd - originalStart;

          // Case 1: Element starts after the gap - shift it
          if (element.timeFrame.start >= gap.end) {
            element.timeFrame.start -= gap.duration;
            element.timeFrame.end -= gap.duration;

            // Update subtitle word timings for shifted elements
            if (
              element.type === 'text' &&
              element.subType === 'subtitles' &&
              element.properties.words
            ) {
              element.properties.words = element.properties.words.map(word => ({
                ...word,
                start: word.start - gap.duration,
                end: word.end - gap.duration,
              }));
            }
          }
          // Case 2: Element overlaps with the gap
          else if (
            element.timeFrame.start < gap.end &&
            element.timeFrame.end > gap.start
          ) {
            // Calculate how much of the element overlaps with the gap
            const overlapStart = Math.max(element.timeFrame.start, gap.start);
            const overlapEnd = Math.min(element.timeFrame.end, gap.end);
            const overlapDuration = overlapEnd - overlapStart;

            // Calculate new timeframe
            let newStart = element.timeFrame.start;
            let newEnd = element.timeFrame.end;

            // If element starts before gap and ends after gap
            if (
              element.timeFrame.start < gap.start &&
              element.timeFrame.end > gap.end
            ) {
              newEnd -= overlapDuration;
            }
            // If element starts before gap but ends in gap
            else if (
              element.timeFrame.start < gap.start &&
              element.timeFrame.end <= gap.end
            ) {
              newEnd = gap.start;
            }
            // If element starts in gap but ends after gap
            else if (
              element.timeFrame.start >= gap.start &&
              element.timeFrame.end > gap.end
            ) {
              newStart = gap.start;
              newEnd = gap.start + (element.timeFrame.end - gap.end);
            }
            // If element is completely within gap
            else if (
              element.timeFrame.start >= gap.start &&
              element.timeFrame.end <= gap.end
            ) {
              newStart = gap.start;
              newEnd = gap.start + Math.min(originalDuration, gap.duration);
            }

            element.timeFrame.start = newStart;
            element.timeFrame.end = newEnd;

            // Update subtitle word timings
            if (
              element.type === 'text' &&
              element.subType === 'subtitles' &&
              element.properties.words
            ) {
              const timeScale = (newEnd - newStart) / originalDuration;

              element.properties.words = element.properties.words.map(word => {
                const relativePos =
                  (word.start - originalStart) / originalDuration;
                const newWordStart =
                  newStart + (newEnd - newStart) * relativePos;
                const newWordDuration = (word.end - word.start) * timeScale;

                return {
                  ...word,
                  start: Math.round(newWordStart),
                  end: Math.round(newWordStart + newWordDuration),
                };
              });
            }
          }
        });

        // Process audio elements
        audioElements.forEach(element => {
          // If element is completely after the gap, shift it backward
          if (element.timeFrame.start >= gap.end) {
            element.timeFrame.start -= gap.duration;
            element.timeFrame.end -= gap.duration;
          }
          // If element overlaps with the gap, adjust its position but preserve duration
          else if (
            element.timeFrame.start < gap.end &&
            element.timeFrame.end > gap.start
          ) {
            // Preserve the original duration
            const originalDuration =
              element.timeFrame.end - element.timeFrame.start;

            // If element starts before gap and ends after/in gap
            if (element.timeFrame.start < gap.start) {
              // Keep the start time and adjust the end time to maintain duration
              element.timeFrame.end =
                element.timeFrame.start + originalDuration;
            }
            // If element starts in gap
            else if (element.timeFrame.start >= gap.start) {
              // Adjust start to gap start and maintain duration
              element.timeFrame.start = gap.start;
              element.timeFrame.end = gap.start + originalDuration;
            }
          }

          // Adjust audioOffset if needed
          if (element.properties.audioOffset !== undefined) {
            // Only adjust if element is after gap
            if (element.timeFrame.start >= gap.end) {
              // Prevent negative offset
              element.properties.audioOffset = Math.max(
                0,
                element.properties.audioOffset
              );
            }
          }
        });

        iterationCount++;
      }

      // Update maxTime based on the last element with dynamic buffer
      const buffer = Math.max(30000, this.lastElementEnd * 0.2);
      this.maxTime = this.lastElementEnd + buffer;

      // Calculate new scale based on duration change ratio
      const finalDuration = this.lastElementEnd;
      const durationRatio = finalDuration / initialDuration;
      const newScale = Math.max(1, Math.min(30, initialScale * durationRatio));
      const adjustedScale = Math.round(newScale * 100) / 100;

      // Update audio elements
      this.updateAudioElements();

      // Refresh elements
      this.refreshElements();

      // Restore adjusted scale after refresh
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          '--scale-factor',
          adjustedScale.toString()
        );

        // Update range input if it exists
        const scaleRange = document.querySelector(
          'input[type="range"].zoomRange'
        );
        if (scaleRange) {
          scaleRange.value = adjustedScale;
          const percentage = Math.round(((adjustedScale - 1) / (30 - 1)) * 100);
          scaleRange.style.setProperty('--range-progress', `${percentage}%`);
        }
      });
    } finally {
      // Reset initialization state and save final state to history
      this.setInitializationState(false);
    }
  }

  async testAvailableCodecs() {
    const codecOptions = {
      mp4: [
        // H.264 Baseline Profile (BP)
        'video/mp4;codecs=avc1.42E01E', // Level 3.0
        'video/mp4;codecs=avc1.42E01F', // Level 3.1
        'video/mp4;codecs=avc1.42E020', // Level 3.2
        'video/mp4;codecs=avc1.42E028', // Level 4.0
        'video/mp4;codecs=avc1.42001E', // Alternative Level 3.0
        'video/mp4;codecs=avc1.42001F', // Alternative Level 3.1

        // H.264 Main Profile (MP)
        'video/mp4;codecs=avc1.4D401E', // Level 3.0
        'video/mp4;codecs=avc1.4D401F', // Level 3.1
        'video/mp4;codecs=avc1.4D4020', // Level 3.2
        'video/mp4;codecs=avc1.4D4028', // Level 4.0
        'video/mp4;codecs=avc1.4D4029', // Level 4.1
        'video/mp4;codecs=avc1.4D402A', // Level 4.2

        // H.264 High Profile (HiP)
        'video/mp4;codecs=avc1.640028', // Level 4.0
        'video/mp4;codecs=avc1.640029', // Level 4.1
        'video/mp4;codecs=avc1.64002A', // Level 4.2
        'video/mp4;codecs=avc1.640015', // Level 2.1
        'video/mp4;codecs=avc1.640016', // Level 2.2
        'video/mp4;codecs=avc1.640020', // Level 3.2

        // H.264 High 10 Profile (Hi10P)
        'video/mp4;codecs=avc1.6E0028', // Level 4.0
        'video/mp4;codecs=avc1.6E0029', // Level 4.1
        'video/mp4;codecs=avc1.6E002A', // Level 4.2

        // H.264 High 4:2:2 Profile (Hi422P)
        'video/mp4;codecs=avc1.7A0028', // Level 4.0
        'video/mp4;codecs=avc1.7A0029', // Level 4.1
        'video/mp4;codecs=avc1.7A002A', // Level 4.2

        // H.264 High 4:4:4 Profile (Hi444PP)
        'video/mp4;codecs=avc1.F40028', // Level 4.0
        'video/mp4;codecs=avc1.F40029', // Level 4.1
        'video/mp4;codecs=avc1.F4002A', // Level 4.2

        // Generic H.264 options
        'video/mp4;codecs=h264',
        'video/mp4;codecs=H264',
        'video/mp4;codecs=avc1',

        // HEVC / H.265
        'video/mp4;codecs=hevc',
        'video/mp4;codecs=hev1',
        'video/mp4;codecs=hvc1',

        // Alternative MP4 codecs
        'video/mp4;codecs=mp4v.20.8', // MPEG-4 Part 2
        'video/mp4;codecs=mp4v.20.240', // MPEG-4 ASP
        'video/mp4;codecs=avc1.42801E', // Alternative syntax
        'video/mp4;codecs=avc1.42001E', // Alternative syntax

        // Fallback
        'video/mp4',
      ],
      webm: [
        // VP8 with different quality levels
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp8.0',
        'video/webm;codecs=vp8,vorbis',

        // VP9 profiles
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp9.0',
        'video/webm;codecs=vp9.1', // HDR 10-bit
        'video/webm;codecs=vp9.2', // HDR 12-bit
        'video/webm;codecs=vp9.3', // Lossless
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp9,vorbis',

        // AV1 profiles and levels
        'video/webm;codecs=av1',
        'video/webm;codecs=av1.0',
        'video/webm;codecs=av1.1',
        'video/webm;codecs=av1.2',
        'video/webm;codecs=av1.0.00M.08', // Main Profile, Level 4.0
        'video/webm;codecs=av1.0.01M.08', // Main Profile, Level 4.0, tier 1
        'video/webm;codecs=av1.0.00M.10', // Main Profile, Level 5.0
        'video/webm;codecs=av1.0.00M.12', // Main Profile, Level 6.0
        'video/webm;codecs=av1,opus',
        'video/webm;codecs=av1,vorbis',

        // Experimental and future codecs
        'video/webm;codecs=vp10',
        'video/webm;codecs=daala',

        // Fallback
        'video/webm',
      ],
    };

    // Helper function to format codec support result
    const formatSupport = codec => {
      const isSupported = MediaRecorder.isTypeSupported(codec);
      return `${codec}: ${isSupported ? '✅' : '❌'}`;
    };

    // Test which codec is actually selected
    const selectedFormat = this.selectedVideoFormat;
    const supportedCodecs = codecOptions[selectedFormat].filter(codec =>
      MediaRecorder.isTypeSupported(codec)
    );

    if (supportedCodecs.length > 0) {
      // Create a test MediaRecorder to see what codec it actually uses
      const testStream = new MediaStream();
      const recorder = new MediaRecorder(testStream, {
        mimeType: supportedCodecs[0],
      });
    } else {
    }
  }

  // Add methods for custom origin point selection
  startOriginSelection(element, callback) {
    // Validate element and canvas
    if (!element || !element.fabricObject || !this.canvas) {
      console.error(
        'Cannot start origin selection: Invalid element, missing fabricObject, or no canvas'
      );
      return;
    }

    // If already selecting, clean up first
    if (this.isSelectingOrigin) {
      this.cleanupOriginSelection();
    }

    this.isSelectingOrigin = true;
    this.originSelectionElement = element;
    this.originSelectionCallback = callback;

    // Disable selection for all objects except the marker
    this.canvas.getObjects().forEach(obj => {
      if (obj !== this.originMarker) {
        obj.selectable = false;
        obj.evented = false;
      }
    });

    // Calculate initial position based on element's center or existing custom origin
    let initialPosition = {
      x:
        element.fabricObject.left +
        (element.fabricObject.width * element.fabricObject.scaleX) / 2,
      y:
        element.fabricObject.top +
        (element.fabricObject.height * element.fabricObject.scaleY) / 2,
    };

    // If there's an existing custom origin, use its position
    if (element.properties?.origin?.type === 'custom') {
      initialPosition = {
        x: element.properties.origin.absoluteX,
        y: element.properties.origin.absoluteY,
      };
    }

    // Create origin marker at initial position if it doesn't exist
    if (!this.originMarker) {
      this.originMarker = new fabric.Group(
        [
          new fabric.Circle({
            radius: 48,
            fill: 'rgba(33, 150, 243, 0.2)',
            stroke: '#2196F3',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          }),
          new fabric.Circle({
            radius: 36,
            fill: '#2196F3',
            originX: 'center',
            originY: 'center',
          }),
          new fabric.Line([-36, 0, 36, 0], {
            stroke: '#2196F3',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          }),
          new fabric.Line([0, -36, 0, 36], {
            stroke: '#2196F3',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          }),
        ],
        {
          left: initialPosition.x,
          top: initialPosition.y,
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
          hasControls: false,
          hasBorders: false,
          lockRotation: true,
        }
      );

      // Add moving handler to update marker position during drag
      this.originMarker.on('moving', () => {
        const marker = this.originMarker;
        const markerRadius = 48;

        // Get canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Calculate bounds
        let left = marker.left;
        let top = marker.top;

        // Constrain horizontal movement
        if (left < markerRadius) {
          left = markerRadius;
        } else if (left > canvasWidth - markerRadius) {
          left = canvasWidth - markerRadius;
        }

        // Constrain vertical movement
        if (top < markerRadius) {
          top = markerRadius;
        } else if (top > canvasHeight - markerRadius) {
          top = canvasHeight - markerRadius;
        }

        // Update position
        marker.set({
          left: left,
          top: top,
        });

        this.canvas.requestRenderAll();
      });

      // Add modified handler for after drag
      this.originMarker.on('modified', () => {
        const marker = this.originMarker;
        const markerRadius = 48;

        // Get canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Constrain position
        let left = Math.min(
          Math.max(marker.left, markerRadius),
          canvasWidth - markerRadius
        );
        let top = Math.min(
          Math.max(marker.top, markerRadius),
          canvasHeight - markerRadius
        );

        const currentPosition = {
          x: left,
          y: top,
        };

        const fabricObject = element.fabricObject;
        const elementLeft = fabricObject.left;
        const elementTop = fabricObject.top;
        const elementWidth = fabricObject.width * fabricObject.scaleX;
        const elementHeight = fabricObject.height * fabricObject.scaleY;

        const relativeX =
          ((currentPosition.x - elementLeft) / elementWidth) * 100;
        const relativeY =
          ((currentPosition.y - elementTop) / elementHeight) * 100;

        const customOrigin = {
          type: 'custom',
          x: Math.max(0, Math.min(100, relativeX)),
          y: Math.max(0, Math.min(100, relativeY)),
          absoluteX: currentPosition.x,
          absoluteY: currentPosition.y,
        };

        // Update marker position
        marker.set({
          left: currentPosition.x,
          top: currentPosition.y,
        });

        // Save the current position to the element's properties
        if (element.properties) {
          element.properties.origin = customOrigin;
        }

        if (this.originSelectionCallback) {
          this.originSelectionCallback(customOrigin);
        }
      });

      // Add mouseup handler to ensure position is saved
      this.originMarker.on('mouseup', () => {
        const marker = this.originMarker;
        const markerRadius = 48;

        // Get canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Constrain position
        let left = Math.min(
          Math.max(marker.left, markerRadius),
          canvasWidth - markerRadius
        );
        let top = Math.min(
          Math.max(marker.top, markerRadius),
          canvasHeight - markerRadius
        );

        // Update marker position
        marker.set({
          left: left,
          top: top,
        });

        this.canvas.requestRenderAll();
      });

      // Add the marker to canvas
      this.canvas.add(this.originMarker);
      this.canvas.setActiveObject(this.originMarker);
    } else {
      // If marker exists, move it to the initial position
      this.originMarker.set({
        left: initialPosition.x,
        top: initialPosition.y,
      });
      this.canvas.setActiveObject(this.originMarker);
    }

    this.canvas.requestRenderAll();
  }

  cleanupOriginSelection = () => {
    // Reset state
    this.isSelectingOrigin = false;
    this.originSelectionElement = null;
    this.originSelectionCallback = null;

    // Re-enable selection for all objects
    if (this.canvas) {
      this.canvas.getObjects().forEach(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
      this.canvas.requestRenderAll();
    }

    // Remove origin marker only if it exists and we're not in the middle of a selection
    if (this.originMarker && !this.isSelectingOrigin) {
      this.canvas.remove(this.originMarker);
      this.canvas.renderAll();
      this.originMarker = null;
    }
  };

  cancelOriginSelection = () => {
    this.cleanupOriginSelection();
  };

  handleOriginSelection = event => {
    if (
      !this.isSelectingOrigin ||
      !this.originSelectionElement ||
      !this.originSelectionCallback ||
      !this.originMarker ||
      !this.canvas
    )
      return;

    // Only handle direct clicks, not drag events
    if (this.originMarker.dragging) return;

    const markerRadius = 48;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Get pointer coordinates
    let left = event.e.offsetX;
    let top = event.e.offsetY;

    // Constrain horizontal movement
    if (left < markerRadius) {
      left = markerRadius;
    } else if (left > canvasWidth - markerRadius) {
      left = canvasWidth - markerRadius;
    }

    // Constrain vertical movement
    if (top < markerRadius) {
      top = markerRadius;
    } else if (top > canvasHeight - markerRadius) {
      top = canvasHeight - markerRadius;
    }

    const element = this.originSelectionElement;
    const fabricObject = element.fabricObject;

    if (!fabricObject) return;

    // Calculate relative position within the element
    const elementLeft = fabricObject.left;
    const elementTop = fabricObject.top;
    const elementWidth = fabricObject.width * fabricObject.scaleX;
    const elementHeight = fabricObject.height * fabricObject.scaleY;

    // Convert pointer coordinates to percentages relative to the element
    const relativeX = ((left - elementLeft) / elementWidth) * 100;
    const relativeY = ((top - elementTop) / elementHeight) * 100;

    // Create custom origin point object
    const customOrigin = {
      type: 'custom',
      x: Math.max(0, Math.min(100, relativeX)),
      y: Math.max(0, Math.min(100, relativeY)),
      absoluteX: left,
      absoluteY: top,
    };

    // Update marker position
    this.originMarker.set({
      left: left,
      top: top,
    });

    // Call the callback
    this.originSelectionCallback(customOrigin);

    this.canvas.requestRenderAll();
  };

  // Add helper function for calculating position based on origin
  calculatePositionFromOrigin(fabricObject, origin, scale = 1) {
    if (!fabricObject) return { left: 0, top: 0 };

    const initialWidth = fabricObject.width * fabricObject.scaleX;
    const initialHeight = fabricObject.height * fabricObject.scaleY;
    const scaledWidth = fabricObject.width * scale;
    const scaledHeight = fabricObject.height * scale;

    let adjustLeft = fabricObject.left;
    let adjustTop = fabricObject.top;

    if (
      origin?.type === 'custom' &&
      typeof origin.x === 'number' &&
      typeof origin.y === 'number'
    ) {
      // Convert percentage to actual coordinates
      const originX = (origin.x / 100) * initialWidth;
      const originY = (origin.y / 100) * initialHeight;

      // Calculate the position that keeps the origin point in place during scaling
      const scaledOriginX = (origin.x / 100) * scaledWidth;
      const scaledOriginY = (origin.y / 100) * scaledHeight;

      adjustLeft = fabricObject.left + (originX - scaledOriginX);
      adjustTop = fabricObject.top + (originY - scaledOriginY);
    } else {
      // For predefined origins, use the existing switch case logic
      switch (origin) {
        case 'center':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth) / 2;
          adjustTop = fabricObject.top + (initialHeight - scaledHeight) / 2;
          break;
        case 'top':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth) / 2;
          break;
        case 'bottom':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth) / 2;
          adjustTop = fabricObject.top + (initialHeight - scaledHeight);
          break;
        case 'left':
          adjustTop = fabricObject.top + (initialHeight - scaledHeight) / 2;
          break;
        case 'right':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth);
          adjustTop = fabricObject.top + (initialHeight - scaledHeight) / 2;
          break;
        case 'top-left':
          break; // No adjustment needed
        case 'top-right':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth);
          break;
        case 'bottom-left':
          adjustTop = fabricObject.top + (initialHeight - scaledHeight);
          break;
        case 'bottom-right':
          adjustLeft = fabricObject.left + (initialWidth - scaledWidth);
          adjustTop = fabricObject.top + (initialHeight - scaledHeight);
          break;
      }
    }

    return { left: adjustLeft, top: adjustTop };
  }

  restoreOriginMarker(element, origin) {
    if (!element?.fabricObject || !origin || origin?.type !== 'custom') {
      return;
    }

    if (!this.canvas) {
      return;
    }

    // Skip marker creation/update during origin selection
    if (this.isSelectingOrigin) {
      return;
    }

    // If we already have a marker, just update its position
    if (this.originMarker && this.canvas.contains(this.originMarker)) {
      this.originMarker.set({
        left: origin.absoluteX,
        top: origin.absoluteY,
      });
      this.canvas.renderAll();
      return;
    }
  }

  handleSubtitleMovement(element, newTimeFrame) {
    if (element.type !== 'text' || element.subType !== 'subtitles') return;

    // Optimization: if time hasn't changed, do nothing
    const timeDiff = newTimeFrame.start - element.timeFrame.start;
    if (timeDiff === 0 && newTimeFrame.end === element.timeFrame.end) return;

    // Check for overlap with other subtitles in the same row
    const overlapping = this.editorElements.some(
      el =>
        el.id !== element.id &&
        el.type === 'text' &&
        el.subType === 'subtitles' &&
        el.row === element.row &&
        newTimeFrame.start < el.timeFrame.end &&
        newTimeFrame.end > el.timeFrame.start
    );
    if (overlapping) {
      return;
    }

    // Adjust word timings
    if (element.properties.words) {
      element.properties.words = element.properties.words.map(word => ({
        ...word,
        start: word.start + timeDiff,
        end: word.end + timeDiff,
      }));
    }

    // Update the element's timeframe
    element.timeFrame = newTimeFrame;

    // Update the element
    this.updateEditorElement(element);
  }

  // Add new method for handling subtitle trimming
  handleSubtitleTrimming(element, newTimeFrame) {
    if (element.type !== 'text' || element.subType !== 'subtitles') return;

    const startDiff = newTimeFrame.start - element.timeFrame.start;
    const endDiff = newTimeFrame.end - element.timeFrame.end;

    // Adjust word timings based on which end was trimmed
    if (element.properties.words) {
      element.properties.words = element.properties.words
        .map(word => {
          const newWord = { ...word };

          // If start was trimmed, shift all word timings
          if (startDiff !== 0) {
            newWord.start = Math.max(
              newWord.start + startDiff,
              newTimeFrame.start
            );
            newWord.end = Math.max(newWord.end + startDiff, newTimeFrame.start);
          }

          // If end was trimmed, adjust end times
          if (endDiff !== 0) {
            newWord.end = Math.min(newWord.end, newTimeFrame.end);
          }

          return newWord;
        })
        .filter(word => word.end > word.start); // Remove any invalid words

      // Update the element's timeframe
      element.timeFrame = newTimeFrame;
    }
    // Update the element
    this.updateEditorElement(element);
  }

  removeAllTexts() {
    // Filter out all text elements in a single pass
    const filteredElements = this.editorElements.filter(
      element => !(element.type === 'text' && element.subType !== 'subtitles')
    );

    // Only update and refresh if elements were actually removed
    if (filteredElements.length !== this.editorElements.length) {
      this.setEditorElements(filteredElements);
      this.optimizedCleanupEmptyRows();
      this.refreshElements();
    }
  }

  // Clear history state
  clearHistory() {
    this.history = [];
    this.currentHistoryIndex = -1;
  }

  // Helper method to calculate available spaces in a pre-sorted list of elements for a specific row
  calculateSpacesInSortedList(sortedElementsInRow, minDuration, maxTimeForRow) {
    const availableSpaces = [];

    // If no elements, the whole row is a single available space
    if (sortedElementsInRow.length === 0) {
      if (maxTimeForRow >= minDuration) {
        // Ensure the row itself can accommodate the minDuration
        availableSpaces.push({
          start: 0,
          end: maxTimeForRow,
          duration: maxTimeForRow,
        });
      }
      return availableSpaces;
    }

    // Check space before the first element
    const firstElementStart = sortedElementsInRow[0].timeFrame.start;
    if (firstElementStart >= minDuration) {
      availableSpaces.push({
        start: 0,
        end: firstElementStart,
        duration: firstElementStart,
      });
    }

    // Check spaces between elements
    for (let i = 0; i < sortedElementsInRow.length - 1; i++) {
      const spaceStart = sortedElementsInRow[i].timeFrame.end;
      const spaceEnd = sortedElementsInRow[i + 1].timeFrame.start;
      const spaceDuration = spaceEnd - spaceStart;

      if (spaceDuration >= minDuration) {
        availableSpaces.push({
          start: spaceStart,
          end: spaceEnd,
          duration: spaceDuration,
        });
      }
    }

    // Check space after the last element
    const lastElementEnd =
      sortedElementsInRow[sortedElementsInRow.length - 1].timeFrame.end;
    const endSpaceDuration = maxTimeForRow - lastElementEnd;
    if (endSpaceDuration >= minDuration) {
      availableSpaces.push({
        start: lastElementEnd,
        end: maxTimeForRow,
        duration: endSpaceDuration,
      });
    }
    return availableSpaces;
  }

  findAvailableSpaces(row, minDuration, excludeElementId) {
    const elementsInRow = this.editorElements
      .filter(el => el.row === row && el.id !== excludeElementId)
      .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

    const availableSpaces = [];

    // Check space before first element
    if (elementsInRow.length === 0) {
      availableSpaces.push({
        start: 0,
        end: this.maxTime,
      });
      return availableSpaces;
    }

    // Check space before first element
    if (elementsInRow[0].timeFrame.start > minDuration) {
      availableSpaces.push({
        start: 0,
        end: elementsInRow[0].timeFrame.start,
      });
    }

    // Check spaces between elements
    for (let i = 0; i < elementsInRow.length - 1; i++) {
      const spaceStart = elementsInRow[i].timeFrame.end;
      const spaceEnd = elementsInRow[i + 1].timeFrame.start;
      const spaceDuration = spaceEnd - spaceStart;

      if (spaceDuration >= minDuration) {
        availableSpaces.push({
          start: spaceStart,
          end: spaceEnd,
          duration: spaceDuration,
        });
      }
    }

    // Check space after last element
    const lastElement = elementsInRow[elementsInRow.length - 1];
    if (this.maxTime - lastElement.timeFrame.end >= minDuration) {
      availableSpaces.push({
        start: lastElement.timeFrame.end,
        end: this.maxTime,
        duration: this.maxTime - lastElement.timeFrame.end,
      });
    }

    return availableSpaces;
  }

  seekWithSubtitles(newTime, preservePlayback = true) {
    // Store and pause playback if needed
    const wasPlaying = preservePlayback && this.playing;
    if (wasPlaying) {
      this.setPlaying(false);
    }

    // Update time with proper animation refresh
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // First update the time
        this.setCurrentTimeInMs(newTime);

        // Then refresh animations and visibility
        this.refreshAnimations();
        this.animationTimeLine.seek(newTime);

        // Update visibility of all word objects
        this.editorElements.forEach(element => {
          if (element.type === 'text' && element.subType === 'subtitles') {
            const isInside =
              element.timeFrame.start <= newTime &&
              newTime <= element.timeFrame.end;

            if (element.fabricObject) {
              element.fabricObject.set('opacity', 0);
            }

            if (element.properties.wordObjects) {
              element.properties.wordObjects.forEach((wordObj, index) => {
                if (wordObj && element.properties.words?.[index]) {
                  const word = element.properties.words[index];
                  const wordIsInside =
                    isInside && word.start <= newTime && newTime <= word.end;
                  wordObj.set('visible', wordIsInside);
                }
              });
            }
          }
        });

        // Final render
        this.canvas?.requestRenderAll();

        // Update video and audio elements
        this.updateVideoElements();
        this.updateAudioElements();

        // Restore playback if needed
        if (wasPlaying) {
          setTimeout(() => {
            this.setPlaying(true);
          }, 100);
        }

        resolve();
      });
    });
  }

  updateFromRedux(reduxState) {
    if (!reduxState) return;

    // Create a map of existing elements with their fabric objects and other non-serializable data
    const existingElementsMap = new Map(
      this.editorElements.map(el => [
        el.id,
        {
          fabricObject: el.fabricObject,
          properties: {
            ...el.properties,
            wordObjects: el.properties?.wordObjects,
            imageObject: el.properties?.imageObject,
          },
          initialState: el.initialState,
        },
      ])
    );

    // Update the editor elements while preserving fabric objects
    runInAction(() => {
      this.isUndoRedoOperation = true;
      try {
        // Update editor elements while preserving fabric objects
        this.editorElements = reduxState.editorElements.map(newEl => {
          const existingData = existingElementsMap.get(newEl.id);
          if (existingData) {
            // Detect image source change for imageUrl elements
            const isImageUrl = newEl && newEl.type === 'imageUrl';
            const prevSrc = existingData?.properties?.src || null;
            const nextSrc = newEl?.properties?.src || null;
            const imageSrcChanged = isImageUrl && prevSrc !== nextSrc;

            // If the image URL changed, drop fabricObject to force full reload
            // This ensures canvas updates the bitmap, not just placement
            const fabricObject = imageSrcChanged
              ? null
              : existingData.fabricObject;

            return {
              ...newEl,
              fabricObject,
              properties: {
                ...newEl.properties,
                // Preserve non-serializable data only when reusing fabric object
                wordObjects: existingData.properties.wordObjects,
                imageObject: imageSrcChanged
                  ? null
                  : existingData.properties.imageObject,
              },
              initialState: existingData.initialState,
            };
          }
          return newEl;
        });

        // Update other state properties
        this.animations = reduxState.animations || [];

        // Use saved maxTime or calculate dynamically based on content
        if (reduxState.maxTime && reduxState.maxTime > 0) {
          this.maxTime = reduxState.maxTime;
        } else {
          // Calculate based on content
          const lastElement = reduxState.editorElements
            ?.slice()
            ?.sort((a, b) => b.timeFrame.end - a.timeFrame.end)[0];

          if (lastElement) {
            const buffer = Math.max(30000, lastElement.timeFrame.end * 0.2);
            this.maxTime = lastElement.timeFrame.end + buffer;
          } else {
            this.maxTime = 30000; // Minimum 30 seconds
          }
        }

        this.backgroundColor = reduxState.backgroundColor || '';
        this.fps = reduxState.fps || 0;
        this.synchronise = reduxState.synchronise || false;

        // Recalculate maxRows based on restored elements
        const maxRowFromElements = this.editorElements.reduce(
          (max, element) => {
            return Math.max(max, element.row || 0);
          },
          0
        );
        this.maxRows = Math.max(1, maxRowFromElements + 1);

        // Refresh canvas and elements
        requestAnimationFrame(() => {
          this.refreshElements();
          this.canvas?.requestRenderAll();
        });
      } finally {
        this.isUndoRedoOperation = false;
      }
    });
  }

  setIsResizing(value) {
    this.isResizing = value;
  }

  // Method to update aspect ratio
  updateAspectRatio(aspectRatio) {
    // aspectRatio can be either a string like '16:9' or an object like { width: 16, height: 9 }
    const oldAspectRatio = this.currentAspectRatio
      ? { ...this.currentAspectRatio }
      : null;

    if (typeof aspectRatio === 'string') {
      const [width, height] = aspectRatio.split(':').map(Number);
      this.currentAspectRatio = { width, height };
    } else if (
      aspectRatio &&
      typeof aspectRatio === 'object' &&
      aspectRatio.width &&
      aspectRatio.height
    ) {
      this.currentAspectRatio = {
        width: aspectRatio.width,
        height: aspectRatio.height,
      };
    }

    // Update canvas dimensions
    if (this.canvas) {
      const newAspectRatio = this.getAspectRatioValue();
      const baseWidth = 1080;
      const newHeight = Math.round(baseWidth / newAspectRatio);

      // Calculate scaling factors if aspect ratio changed
      let scaleFactorX = 1;
      let scaleFactorY = 1;

      if (
        oldAspectRatio &&
        (oldAspectRatio.width !== this.currentAspectRatio.width ||
          oldAspectRatio.height !== this.currentAspectRatio.height)
      ) {
        const oldAspectValue = oldAspectRatio.width / oldAspectRatio.height;
        const oldHeight = Math.round(baseWidth / oldAspectValue);

        scaleFactorX = baseWidth / baseWidth; // Width stays the same (1080)
        scaleFactorY = newHeight / oldHeight; // Height changes based on aspect ratio
      }

      // Store current object states before canvas resize
      const objectStates = this.canvas.getObjects().map(obj => {
        if (
          obj.type === 'image' ||
          obj.type === 'videoImage' ||
          obj.type === 'CoverVideo'
        ) {
          return {
            object: obj,
            originalWidth: obj.width,
            originalHeight: obj.height,
            currentScaleX: obj.scaleX,
            currentScaleY: obj.scaleY,
            currentLeft: obj.left,
            currentTop: obj.top,
          };
        }
        return { object: obj };
      });

      // Update actual canvas dimensions
      this.canvas.setWidth(baseWidth);
      this.canvas.setHeight(newHeight);

      // Scale element positions if aspect ratio changed
      if (oldAspectRatio && (scaleFactorX !== 1 || scaleFactorY !== 1)) {
        this.scaleElementPositions(scaleFactorX, scaleFactorY);
      }

      // Restore proper scaling for images while preserving user positioning
      objectStates.forEach(state => {
        if (state.originalWidth && state.originalHeight) {
          const obj = state.object;

          // Find corresponding editor element to check if it has custom placement
          const editorElement = this.editorElements.find(
            el => el.fabricObject === obj
          );
          const hasCustomPlacement =
            editorElement?.placement &&
            editorElement.placement.x !== undefined &&
            editorElement.placement.y !== undefined &&
            editorElement.subType !== 'placeholder';

          if (hasCustomPlacement) {
            // For custom-positioned images, scale position proportionally but recalculate proper scale
            const scaledLeft = state.currentLeft * scaleFactorX;
            const scaledTop = state.currentTop * scaleFactorY;

            // Recalculate proper scale for new canvas dimensions (maintain contain behavior)
            const newScale = Math.min(
              baseWidth / state.originalWidth,
              newHeight / state.originalHeight
            );

            obj.set({
              scaleX: newScale,
              scaleY: newScale,
              left: scaledLeft,
              top: scaledTop,
            });
          } else {
            // Center new images or placeholders
            const newScale = Math.min(
              baseWidth / state.originalWidth,
              newHeight / state.originalHeight
            );

            const newLeft = (baseWidth - state.originalWidth * newScale) / 2;
            const newTop = (newHeight - state.originalHeight * newScale) / 2;

            obj.set({
              scaleX: newScale,
              scaleY: newScale,
              left: newLeft,
              top: newTop,
            });
          }

          obj.setCoords();

          // Update editor element placement to reflect new fabric object values
          if (editorElement) {
            editorElement.placement = {
              ...editorElement.placement,
              x: obj.left,
              y: obj.top,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              width: state.originalWidth * obj.scaleX,
              height: state.originalHeight * obj.scaleY,
            };
          }
        }
      });

      // Update CSS dimensions
      this.canvas.setDimensions(
        {
          width: `calc((100vh - 360px) * ${newAspectRatio})`,
          height: 'calc(100vh - 360px)',
        },
        {
          cssOnly: true,
        }
      );

      // Re-render canvas
      this.canvas.renderAll();
    }

    // Trigger canvas size update
    if (typeof window !== 'undefined' && window.updateCanvasSize) {
      requestAnimationFrame(() => {
        window.updateCanvasSize();
      });
    }
  }

  // Method to get current aspect ratio as decimal
  getAspectRatioValue() {
    return this.currentAspectRatio.width / this.currentAspectRatio.height;
  }

  // Scale element positions when aspect ratio changes
  scaleElementPositions(scaleFactorX, scaleFactorY) {
    if (!this.canvas) return;

    // Scale all canvas objects
    this.canvas.getObjects().forEach(obj => {
      if (
        obj.type === 'image' ||
        obj.type === 'videoImage' ||
        obj.type === 'CoverVideo' ||
        obj.type === 'text'
      ) {
        // Scale position
        obj.set({
          left: obj.left * scaleFactorX,
          top: obj.top * scaleFactorY,
        });

        // Update corresponding editor element if it exists
        const editorElement = this.editorElements.find(
          el => el.fabricObject === obj
        );
        if (editorElement && editorElement.placement) {
          editorElement.placement.x = obj.left;
          editorElement.placement.y = obj.top;
        }
      }
    });

    // Render canvas to apply changes
    this.canvas.requestRenderAll();
  }

  updateImageBackground = (elementId, backgroundColor, backgroundOpacity) => {
    const element = this.editorElements.find(el => el.id === elementId);
    if (!element || element.type !== 'imageUrl') return;

    // Update the element's properties
    element.properties.background = {
      color: backgroundColor,
      opacity: backgroundOpacity,
    };

    // Find any animations for this element
    const elementAnimations = this.animations.filter(
      a => a.targetId === elementId
    );

    // Update the canvas background for this time frame
    if (this.canvas) {
      const currentTime = this.currentTimeInMs;
      if (
        currentTime >= element.timeFrame.start &&
        currentTime <= element.timeFrame.end
      ) {
        // If there are no animations or we're not in an animation timeframe,
        // update the background directly
        if (elementAnimations.length === 0) {
          this.canvas.backgroundColor = backgroundColor;
          this.canvas.backgroundOpacity = backgroundOpacity;
          this.canvas.renderAll();
        } else {
          // If there are animations, refresh them to apply the new background properly
          this.refreshAnimations();
        }
      }
    }
  };

  updateElementFrameFill = element => {
    if (!element || !element.properties?.frameFill || !this.canvas) return;

    // Just update the current frame fill - actual rendering will be handled by updateTimeTo
    this.updateCanvasFrameFill();
  };

  removeElementFrameFill = element => {
    if (!element || !this.canvas) return;

    // Just update the canvas frame fill - no individual objects to remove
    this.updateCanvasFrameFill();
  };

  updateCanvasFrameFill = () => {
    if (!this.canvas) return;

    const currentTime = this.currentTimeInMs;

    // Find all elements with Frame Fill that are active at current time
    const activeFrameFillElements = this.editorElements.filter(
      element =>
        element.properties?.frameFill &&
        element.properties.frameFill.type !== 'None' &&
        currentTime >= element.timeFrame.start &&
        currentTime <= element.timeFrame.end
    );

    // Get or create global frame fill object
    let globalFrameFill = this.canvas
      .getObjects()
      .find(obj => obj.name === 'globalFrameFill');

    if (activeFrameFillElements.length > 0) {
      // Sort by row (higher row = higher priority), then by start time (later start = higher priority)
      const priorityElement = activeFrameFillElements.sort((a, b) => {
        if (a.row !== b.row) {
          return b.row - a.row; // Higher row first
        }
        return b.timeFrame.start - a.timeFrame.start; // Later start time first
      })[0];

      const frameFill = priorityElement.properties.frameFill;

      if (!globalFrameFill) {
        // Create global frame fill object
        globalFrameFill = new fabric.Rect({
          left: 0,
          top: 0,
          width: this.canvas.width,
          height: this.canvas.height,
          fill: frameFill.color,
          opacity: frameFill.opacity,
          selectable: false,
          evented: false,
          excludeFromExport: false,
          name: 'globalFrameFill',
          objectCaching: true,
        });

        this.canvas.add(globalFrameFill);
        globalFrameFill.sendToBack();
      } else {
        // Update existing global frame fill
        globalFrameFill.set({
          fill: frameFill.color,
          opacity: frameFill.opacity,
          visible: true,
        });
      }
    } else {
      // No active frame fill elements, hide global frame fill and reset canvas background
      if (globalFrameFill) {
        globalFrameFill.set({
          visible: false,
          opacity: 0,
        });
      }

      // Reset canvas to default background
      this.canvas.backgroundColor = this.backgroundColor;
      this.canvas.backgroundOpacity = 1;
    }
  };

  // Method to get gaps in a timeline row for GapIndicator
  getRowGaps = rowIndex => {
    const elementsInRow = this.editorElements
      .filter(el => el.row === rowIndex)
      .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

    const gaps = [];

    if (elementsInRow.length === 0) return gaps;

    // Gap before first element (only if there are elements to shift)
    if (elementsInRow[0].timeFrame.start > 0) {
      // Check if there are elements to the right that can be shifted
      if (elementsInRow.length > 0) {
        gaps.push({
          start: 0,
          end: elementsInRow[0].timeFrame.start,
        });
      }
    }

    // Gaps between elements (only if there are elements to the right to shift)
    for (let i = 0; i < elementsInRow.length - 1; i++) {
      const currentEnd = elementsInRow[i].timeFrame.end;
      const nextStart = elementsInRow[i + 1].timeFrame.start;

      if (nextStart > currentEnd) {
        gaps.push({
          start: currentEnd,
          end: nextStart,
        });
      }
    }

    // Don't show gap after last element - no point in removing it

    return gaps;
  };

  // Method to remove gaps by shifting elements left
  removeGap = action((gapStart, gapEnd, rowIndex) => {
    const gapDuration = gapEnd - gapStart;

    // Find all elements in the SAME ROW that start at or after the gap end
    const elementsToShift = this.editorElements.filter(
      el => el.row === rowIndex && el.timeFrame.start >= gapEnd
    );

    // Shift elements to the left by gap duration
    elementsToShift.forEach(element => {
      this.moveEditorElementTimeFrame(
        element,
        {
          start: element.timeFrame.start - gapDuration,
          end: element.timeFrame.end - gapDuration,
        },
        true
      );
    });

    // Save state
    this.saveToHistory?.();

    // Force refresh to ensure UI updates
    setTimeout(() => {
      this.refreshElements?.();
    }, 0);

    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }
  });

  // Helper method to recalculate maxRows and clean up empty rows
  recalculateMaxRows = action(() => {
    // Use existing optimized cleanup method which also handles maxRows
    this.optimizedCleanupEmptyRows();
  });

  // Row reordering methods
  startRowDrag = action(rowIndex => {
    this.ghostState.isDraggingRow = true;
    this.ghostState.draggedRowIndex = rowIndex;
    this.ghostState.dragOverRowIndex = null;
    this.ghostState.rowInsertPosition = null; // 'above' | 'below'
  });

  updateRowDragOver = action((rowIndex, position = null) => {
    if (!this.ghostState.isDraggingRow) return;
    // Allow clearing highlight with null (staying on origin row)
    this.ghostState.dragOverRowIndex = rowIndex;
    this.ghostState.rowInsertPosition = position;
  });

  finishRowDrag = action(targetRowIndex => {
    if (
      !this.ghostState.isDraggingRow ||
      this.ghostState.draggedRowIndex === null
    ) {
      return;
    }

    const fromRowIndex = this.ghostState.draggedRowIndex;

    // Don't do anything if dropping on the same row
    if (fromRowIndex === targetRowIndex) {
      this.ghostState.isDraggingRow = false;
      this.ghostState.draggedRowIndex = null;
      this.ghostState.dragOverRowIndex = null;
      return;
    }

    // Get all elements and reorder rows properly
    const allElements = [...this.editorElements];

    if (fromRowIndex < targetRowIndex) {
      // Moving down: shift rows up
      allElements.forEach(element => {
        if (element.row === fromRowIndex) {
          element.row = targetRowIndex;
        } else if (
          element.row > fromRowIndex &&
          element.row <= targetRowIndex
        ) {
          element.row -= 1;
        }
      });
    } else {
      // Moving up: shift rows down
      allElements.forEach(element => {
        if (element.row === fromRowIndex) {
          element.row = targetRowIndex;
        } else if (
          element.row >= targetRowIndex &&
          element.row < fromRowIndex
        ) {
          element.row += 1;
        }
      });
    }

    // Recalculate maxRows based on actual used rows
    this.recalculateMaxRows();

    // Revalidate all animation targets after row reordering
    this.revalidateAllAnimationTargets();

    // Revalidate GL transitions after row reordering
    this.revalidateGLTransitions();

    // Reset drag state
    this.ghostState.isDraggingRow = false;
    this.ghostState.draggedRowIndex = null;
    this.ghostState.dragOverRowIndex = null;
    this.ghostState.rowInsertPosition = null;

    // Refresh elements and save to history
    this.refreshElements();

    // Save to history
    if (window.dispatchSaveTimelineState && !this.isUndoRedoOperation) {
      window.dispatchSaveTimelineState(this);
    }
  });

  cancelRowDrag = action(() => {
    this.ghostState.isDraggingRow = false;
    this.ghostState.draggedRowIndex = null;
    this.ghostState.dragOverRowIndex = null;
    this.ghostState.rowInsertPosition = null;
  });

  // Delete an entire row: remove all elements in that row and shift rows above it down
  deleteRow = action(rowIndex => {
    if (rowIndex == null || rowIndex < 0) return;

    // Remove all elements in the target row
    this.editorElements = this.editorElements.filter(el => el.row !== rowIndex);

    // Shift rows above down by 1
    this.editorElements.forEach(el => {
      if (el.row > rowIndex) {
        el.row -= 1;
      }
    });

    // Recalculate maxRows based on actual used rows
    this.recalculateMaxRows();

    // Reset drag state just in case
    this.ghostState.isDraggingRow = false;
    this.ghostState.draggedRowIndex = null;
    this.ghostState.dragOverRowIndex = null;

    this.refreshElements?.();
  });
}

export function isEditorAudioElement(element) {
  return element.type === 'audio';
}

export function isEditorVideoElement(element) {
  return element.type === 'video';
}

export function isEditorImageElement(element) {
  return element.type === 'image' || element.type === 'imageUrl';
}

export function isEditorVisualElement(element) {
  return isEditorImageElement(element) || isEditorVideoElement(element);
}

export function canHaveAnimations(element) {
  return isEditorVisualElement(element);
}

export function canHaveTransitions(element) {
  return isEditorVisualElement(element);
}
