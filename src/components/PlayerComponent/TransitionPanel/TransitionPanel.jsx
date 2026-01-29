import ArrowLeftIcon from 'components/Icons/ArrowLeftIcon';
import CheckIcon from 'components/Icons/CheckIcon';
import ClockIcon from 'components/Icons/ClockIcon';
import CloseIcon from 'components/Icons/CloseIcon';
import ActiveAnimationItem from 'components/PlayerComponent/TransitionPanel/ActiveAnimationItem/ActiveAnimationItem';
import { AnimationGridPreview } from 'components/PlayerComponent/TransitionPanel/AnimationGridPreview';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import transitionImage from 'images/transitionMock.png';
import transitionImage1 from 'images/transitionMock1.png';
import transitionImage2 from 'images/transitionMock2.png';
import { debounce } from 'lodash';
import { observer } from 'mobx-react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useDispatch } from 'react-redux';
import { StoreContext } from '../../../mobx';
import { getUid } from '../../../utils';
import {
  applyGlitchFilter,
  applyPixiFilter,
  logAllPixiFilters,
  removePixiFilters,
} from '../../../utils/pixi-filters';
import {
  calculateGLTransitionDuration,
  determineEffectVariant,
  isAnimationAppliedToAllScenes,
  removeAnimationFromAllScenes,
} from '../entity/AnimationResource';
import styles from '../TransitionPanel/TransitionPanel.module.scss';
import { DetailPanel } from './DetailPanel/DetailPanel';
// Helper function to format animation type names
const formatAnimationType = type => {
  if (!type) return '';
  // Add space before capital letters and trim
  return type.replace(/([A-Z])/g, ' $1').trim();
};

// Helper function to get animation display name
const getAnimationDisplayName = animation => {
  return (
    animation?.config?.name ||
    animation?.name ||
    formatAnimationType(animation?.type) ||
    'Animation'
  );
};

const transitionTabs = [
  { id: 'all', name: 'All' },
  { id: 'in', name: 'In' },
  { id: 'out', name: 'Out' },
  { id: 'effect', name: 'Motion' },
  { id: 'filters', name: 'Filters' },
  { id: 'active', name: 'Active Transitions' },
];

// Add this outside the component to track which action panel is open
let openActionPanelId = null;

// Draggable Animation Card Component for regular animations
const DraggableAnimationCard = ({
  animation,
  children,
  className,
  onClick,
  ...props
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'animation-drop',
    item: {
      type: 'animation-drop',
      animation: {
        type: animation.unifiedType || animation.type,
        name: animation.name,
        unifiedType: animation.unifiedType,
        unifiedProperties: animation.unifiedProperties,
        properties: animation.properties || {},
        effectVariant: animation.type.includes('In')
          ? 'in'
          : animation.type.includes('Out')
            ? 'out'
            : 'effect',
        duration:
          animation.properties?.duration ||
          animation.unifiedProperties?.duration ||
          600,
      },
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      className={`${className} ${isDragging ? styles.dragging : ''}`}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      {...props}
    >
      {children}
    </div>
  );
};

// Draggable GL Transition Card Component - separate type for GL transitions
const DraggableGLTransitionCard = ({
  animation,
  children,
  className,
  onClick,
  ...props
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'gl-transition-drop',
    item: {
      type: 'gl-transition-drop',
      glTransition: {
        type: animation.type,
        name: animation.name,
        transitionType: animation.type,
        isGLTransition: true,
        duration: 1000, // Default duration for GL transitions
      },
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      className={`${className} ${isDragging ? styles.dragging : ''}`}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      {...props}
    >
      {children}
    </div>
  );
};

const TransitionPanel = observer(
  ({ onClose, storyData, isPreview = false, activeAnimation }) => {
    const store = useContext(StoreContext);
    const [activeTab, setActiveTab] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAnimation, setSelectedAnimation] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [currentFilterConfig, setCurrentFilterConfig] = useState(null);
    const [isFilterDetailPanel, setIsFilterDetailPanel] = useState(false);
    const [activeSideFilter, setActiveSideFilter] = useState('zoom');
    const [activeVisibleCategory, setActiveVisibleCategory] = useState('clear');
    const [inEffect, setInEffect] = useState(null);
    const [outEffect, setOutEffect] = useState(null);
    const [effectType, setEffectType] = useState(null);
    const [transitionType, setTransitionType] = useState(null);
    const [previousTabState, setPreviousTabState] = useState({
      activeTab: 'all',
      activeSideFilter: 'zoom',
    });
    const [availableTransitions, setAvailableTransitions] = useState([]);
    const [transitionsLoaded, setTransitionsLoaded] = useState(false);
    // Removed sceneSelection - we work with visible canvas images now
    // Removed currentApplyToAll - now each animation has its own "Apply to all" button
    const [hasTopShadow, setHasTopShadow] = useState(false);
    const [hasBottomShadow, setHasBottomShadow] = useState(false);
    const [selectedCheckboxes, setSelectedCheckboxes] = useState(new Set());
    const [isTransitionNameExpanded, setIsTransitionNameExpanded] =
      useState(false);
    const [isTransitionSectionExpanded, setIsTransitionSectionExpanded] =
      useState(true);
    const [isTransitionNameCollapsed, setIsTransitionNameCollapsed] =
      useState(false);
    const [isTransitionNameIndeterminate, setIsTransitionNameIndeterminate] =
      useState(false);
    const [showActionPanel, setShowActionPanel] = useState(false);
    const [activePanelAnimationId, setActivePanelAnimationId] = useState(null);
    const [hoveredAnimationId, setHoveredAnimationId] = useState(null);
    const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
    const [isActiveAnimationDetailsOpen, setIsActiveAnimationDetailsOpen] =
      useState(null);
    const [panelMode, setPanelMode] = useState('effects'); // 'effects', 'transitions', or 'filters'
    const [currentFilter, setCurrentFilter] = useState(null);

    const panelRef = useRef(null);
    const actionPanelTimeoutRef = useRef(null);
    const isMouseOverActionPanelRef = useRef(false);
    const isMouseOverThreeDotsRef = useRef(false);
    const threeDotsRefs = useRef(new Map());
    const dispatch = useDispatch();
    const debouncedUpdateAnimation = useRef(null);
    const contentRef = useRef(null);
    const tabsWrapperRef = useRef(null);

    // Force re-render when canvas selection changes (like in ResizeImage)
    const [canvasUpdateTrigger, setCanvasUpdateTrigger] = useState(0);

    // Removed scene selection - working with visible canvas images now

    // Get visible image from canvas (improved approach)
    const getActiveVisibleImage = () => {
      if (!store?.canvas) return null;

      try {
        const objects = store.canvas.getObjects();
        const currentTime = store.currentTimeInMs || 0;

        // First try: get selected object if it's an image or video
        const activeObject = store.canvas.getActiveObject();

        if (
          activeObject &&
          (activeObject.type === 'image' ||
            activeObject.type === 'coverImage' ||
            activeObject.type === 'coverVideo' ||
            activeObject.type === 'videoImage') &&
          activeObject.visible !== false &&
          activeObject.opacity > 0
        ) {
          return activeObject;
        }

        // Second try: find visual elements (images/videos) that are visible at current time and on canvas
        const visibleImages = objects.filter(obj => {
          if (
            (obj.type !== 'image' &&
              obj.type !== 'coverImage' &&
              obj.type !== 'coverVideo' &&
              obj.type !== 'videoImage') ||
            obj.visible === false ||
            obj.opacity <= 0
          ) {
            return false;
          }

          // Check if image should be visible at current time
          if (obj.name) {
            const element = store.editorElements.find(el => el.id === obj.name);
            if (element && element.timeFrame) {
              const isInTimeFrame =
                currentTime >= element.timeFrame.start &&
                currentTime <= element.timeFrame.end;
              if (!isInTimeFrame) return false;
            }
          }

          return true;
        });

        if (!visibleImages.length) return null;

        // Third try: prefer image at current scene/time position
        if (store.selectedElement) {
          const sceneImage = visibleImages.find(img => {
            if (img.name) {
              const element = store.editorElements.find(
                el => el.id === img.name
              );
              return element && element.id === store.selectedElement.id;
            }
            return false;
          });
          if (sceneImage) return sceneImage;
        }

        // Fallback: get the topmost visible image (z-index wise)
        return visibleImages[visibleImages.length - 1];
      } catch (error) {
        console.warn('Error getting visible image from canvas:', error);
        return null;
      }
    };

    // Get corresponding element from store based on canvas object
    const getElementFromCanvasObject = canvasObject => {
      if (!canvasObject || !canvasObject.name) {
        // Fallback to store.selectedElement if no canvas object
        if (
          store?.selectedElement &&
          (store.selectedElement.type === 'imageUrl' ||
            store.selectedElement.type === 'video')
        ) {
          return store.selectedElement;
        }
        return null;
      }
      return store.editorElements.find(el => el.id === canvasObject.name);
    };

    // Re-calculate active image when canvas changes
    const activeCanvasImage =
      canvasUpdateTrigger >= 0 ? getActiveVisibleImage() : null;
    const selectedElement = getElementFromCanvasObject(activeCanvasImage);

    const selectedElementAnimations = selectedElement
      ? store.animations.filter(animation => {
          return (
            animation?.targetId === selectedElement.id &&
            animation?.type !== 'glTransition'
          );
        })
      : [];

    // Автоматичне закриття action panel за аналогією з бургер меню
    useEffect(() => {
      if (
        !isMouseOverActionPanelRef.current &&
        !isMouseOverThreeDotsRef.current
      ) {
        actionPanelTimeoutRef.current = setTimeout(() => {
          openActionPanelId = null;
          setShowActionPanel(false);
          setActivePanelAnimationId(null);
          setHoveredAnimationId(null);
        }, 500);
      }
      return () => {
        if (actionPanelTimeoutRef.current) {
          clearTimeout(actionPanelTimeoutRef.current);
        }
      };
    }, [isMouseOverActionPanelRef.current, isMouseOverThreeDotsRef.current]);

    // Also watch for current time changes in store
    useEffect(() => {
      // Add a delay after time changes to allow canvas to update
      const timeoutId = setTimeout(() => {
        setCanvasUpdateTrigger(prev => prev + 1);
      }, 150);

      return () => clearTimeout(timeoutId);
    }, [store?.currentTimeInMs]);

    // Watch for selectedElement changes in store
    useEffect(() => {
      // Trigger update when selectedElement changes
      setCanvasUpdateTrigger(prev => prev + 1);
    }, [store?.selectedElement?.id]);

    // Watch for editorElements changes (timeline changes)
    useEffect(() => {
      // Trigger update when timeline elements change
      const timeoutId = setTimeout(() => {
        setCanvasUpdateTrigger(prev => prev + 1);
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [store?.editorElements?.length]);

    useEffect(() => {
      if (selectedElementAnimations.length > 0) {
        // Handle unified effects (zoomEffect, fadeEffect with timing-based detection)
        const zoomEffectAnim = selectedElementAnimations.find(
          a => a.type === 'zoomEffect'
        );
        const fadeEffectAnim = selectedElementAnimations.find(
          a => a.type === 'fadeEffect'
        );

        if (zoomEffectAnim) {
          // Use effectVariant if available, otherwise determine from properties
          let effectVariant = zoomEffectAnim.effectVariant;
          if (!effectVariant) {
            const properties = zoomEffectAnim.properties || {};
            const initialScale =
              properties.scaleFactor || properties.initialScale || 1.0;
            const targetScale =
              properties.targetScale || properties.endScale || 2.0;
            effectVariant = initialScale < targetScale ? 'in' : 'out';
          }

          if (effectVariant === 'in') {
            setInEffect('zoom');
          } else if (effectVariant === 'out') {
            setOutEffect('zoom');
          } else {
            setEffectType('zoomEffect');
          }
        }

        if (fadeEffectAnim) {
          // Use effectVariant if available, otherwise determine from properties
          let effectVariant = fadeEffectAnim.effectVariant;
          if (!effectVariant) {
            const properties = fadeEffectAnim.properties || {};
            const initialOpacity =
              properties.opacity || properties.initialOpacity || 1.0;
            const targetOpacity =
              properties.targetOpacity || properties.endOpacity || 0.0;
            effectVariant = initialOpacity < targetOpacity ? 'in' : 'out';
          }

          if (effectVariant === 'in') {
            setInEffect('fade');
          } else if (effectVariant === 'out') {
            setOutEffect('fade');
          } else {
            setEffectType('fadeEffect');
          }
        }

        // Handle traditional animations (slide, drop)
        const inAnim = selectedElementAnimations.find(
          a =>
            a.type.endsWith('In') &&
            !['zoomEffect', 'fadeEffect'].includes(a.type)
        );
        const outAnim = selectedElementAnimations.find(
          a =>
            a.type.endsWith('Out') &&
            !['zoomEffect', 'fadeEffect'].includes(a.type)
        );
        const effectAnim = selectedElementAnimations.find(
          a =>
            a.type.endsWith('Effect') &&
            !['zoomEffect', 'fadeEffect'].includes(a.type)
        );

        if (inAnim) {
          setInEffect(getBaseAnimationType(inAnim.type));
        }
        if (outAnim) {
          setOutEffect(getBaseAnimationType(outAnim.type));
        }
        if (effectAnim) {
          setEffectType(effectAnim.type);
        }
      }

      if (
        selectedElement?.type === 'imageUrl' ||
        selectedElement?.type === 'video'
      ) {
        const glTransition = store.animations.find(
          a =>
            a.type === 'glTransition' &&
            (a.fromElementId === selectedElement.id ||
              a.toElementId === selectedElement.id)
        );

        if (glTransition) {
          setTransitionType(glTransition.transitionType);
        } else {
          setTransitionType(null);
        }
      } else {
        setTransitionType(null);
      }

      // Update current filter based on selected element
      if (selectedElement && activeCanvasImage) {
        const currentElementFilter = activeCanvasImage.customFilter || 'none';
        setCurrentFilter(currentElementFilter);
      } else {
        setCurrentFilter(null);
      }
    }, [
      selectedElement?.id,
      selectedElement?.type,
      store.animations,
      activeCanvasImage,
    ]);

    // Removed scene selection logic - working with visible canvas images now

    useEffect(() => {
      debouncedUpdateAnimation.current = debounce((animation, updates) => {
        store.updateAnimation(animation.id, {
          ...animation,
          ...updates,
        });
      }, 16);

      return () => {
        if (debouncedUpdateAnimation.current) {
          debouncedUpdateAnimation.current.cancel();
        }
      };
    }, [store]);

    // Load transitions
    useEffect(() => {
      const loadTransitions = async () => {
        try {
          const { transitionsLoadedPromise } = await import(
            '../../../utils/gl-transitions'
          );

          const { availableTransitions: transitions } =
            await transitionsLoadedPromise;

          if (transitions && transitions.length > 0) {
            setAvailableTransitions(transitions);
            setTransitionsLoaded(true);
          } else {
            console.warn('No transitions were loaded');
            setTransitionsLoaded(false);
          }
        } catch (error) {
          console.error('Failed to load transitions:', error);
          setTransitionsLoaded(false);
        }
      };

      loadTransitions();
    }, []);

    useEffect(() => {
      const handleScroll = () => {
        if (!contentRef.current) return;

        // Find the actual scrollable element
        let scrollableElement = contentRef.current;

        // In preview mode, the scrollable element might be the animationsGrid
        if (isPreview) {
          const animationsGrid = contentRef.current.querySelector(
            `.${styles.animationsGrid}`
          );
          if (animationsGrid) {
            scrollableElement = animationsGrid;
          }
        }

        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;

        const canScrollUp = scrollTop > 0;
        const canScrollDown = scrollTop < scrollHeight - clientHeight - 1; // -1 for rounding errors

        setHasTopShadow(canScrollUp);
        setHasBottomShadow(canScrollDown);
      };

      const contentElement = contentRef.current;
      if (contentElement) {
        // Find the actual scrollable element to attach the event listener
        let scrollableElement = contentElement;

        if (isPreview) {
          const animationsGrid = contentElement.querySelector(
            `.${styles.animationsGrid}`
          );
          if (animationsGrid) {
            scrollableElement = animationsGrid;
          }
        }
        scrollableElement.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
          scrollableElement.removeEventListener('scroll', handleScroll);
        };
      }
    }, [
      activeTab,
      searchQuery,
      activeSideFilter,
      isPreview,
      styles.animationsGrid,
    ]);

    // Additional effect to handle preview mode changes
    useEffect(() => {
      if (isPreview && contentRef.current) {
        // Force a re-render of scroll shadows when switching to preview mode
        const handleInitialScroll = () => {
          const animationsGrid = contentRef.current.querySelector(
            `.${styles.animationsGrid}`
          );
          if (animationsGrid) {
            const { scrollTop, scrollHeight, clientHeight } = animationsGrid;
            setHasTopShadow(scrollTop > 0);
            setHasBottomShadow(scrollTop < scrollHeight - clientHeight - 1);
          } else {
          }
        };

        // Use a small delay to ensure the DOM is updated
        const timeoutId = setTimeout(handleInitialScroll, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [isPreview]);

    useEffect(() => {
      const handleWheel = e => {
        if (!tabsWrapperRef.current) return;

        e.preventDefault();
        const container = tabsWrapperRef.current;
        container.scrollLeft += e.deltaY;
      };

      const tabsElement = tabsWrapperRef.current;
      if (tabsElement) {
        tabsElement.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
          tabsElement.removeEventListener('wheel', handleWheel);
        };
      }
    }, []);

    const getBaseAnimationType = type => {
      if (!type) return null;
      return type.replace(/In$|Out$/, '').toLowerCase();
    };

    const addAnimation = useCallback(
      (baseType, positionType, animationConfig = null) => {
        // Check if we have a valid selected element (visible image)
        if (!selectedElement) {
          console.warn('No visible image selected on canvas');
          return false;
        }

        const newType =
          positionType === 'effect'
            ? baseType
            : `${baseType}${positionType
                .charAt(0)
                .toUpperCase()}${positionType.slice(1)}`;

        let matchedAnimation = animationsConfig.find(
          animation => animation.type.toLowerCase() === newType.toLowerCase()
        );

        // If no direct match found and we have an animation config, use it
        if (!matchedAnimation && animationConfig) {
          matchedAnimation = animationConfig;
        }

        if (matchedAnimation) {
          // Use unified type and properties if available
          const actualType =
            matchedAnimation.unifiedType || matchedAnimation.type;
          const actualProperties =
            matchedAnimation.unifiedProperties || matchedAnimation.properties;

          // Calculate new timing based on current keyframe and 3% of total timeline duration
          // Animation starts at current playhead position and lasts 3% of total timeline duration
          const currentTimeMs = store.currentTimeInMs; // Current time from currentKeyFrame
          const totalTimelineEnd = store.lastElementEnd; // Total timeline duration
          const animationDuration = Math.max(100, totalTimelineEnd * 0.1); // 3% of total timeline, minimum 100ms

          const newAnimation = {
            id: getUid(),
            type: actualType,
            targetId: selectedElement?.id ?? '',
            duration: animationDuration,
            properties: { ...actualProperties },
            effectVariant: positionType, // 'in', 'out', or 'effect'
          };

          // Set timing based on current time position
          const elementTimeFrame = selectedElement?.timeFrame;
          if (elementTimeFrame) {
            // Calculate relative time within the selected element
            const elementStart = elementTimeFrame.start;
            const elementEnd = elementTimeFrame.end;
            const elementDuration = elementEnd - elementStart;

            // Ensure current time is within the element's timeframe
            const clampedCurrentTime = Math.max(
              elementStart,
              Math.min(currentTimeMs, elementEnd)
            );

            // Calculate relative start time within the element (0-based)
            const relativeStartTime = clampedCurrentTime - elementStart;
            const relativeEndTime = Math.min(
              relativeStartTime + animationDuration,
              elementDuration
            );

            // Ensure we have a valid duration (at least 100ms)
            const finalDuration = Math.max(
              100,
              relativeEndTime - relativeStartTime
            );
            const finalEndTime = Math.min(
              relativeStartTime + finalDuration,
              elementDuration
            );

            // Set the animation timing
            newAnimation.properties.startTime = relativeStartTime;
            newAnimation.properties.endTime = finalEndTime;

            // Update duration to match the actual available time
            newAnimation.duration = finalEndTime - relativeStartTime;
          } else {
            // Fallback if no timeFrame available
            newAnimation.properties.startTime = 0;
            newAnimation.properties.endTime = animationDuration;
          }

          // Add animation to store (timeline element will be created automatically)
          store.addAnimation(newAnimation);

          // Trigger refresh
          store.scheduleAnimationRefresh();

          // Trigger Redux sync
          if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
            window.dispatchSaveTimelineState(store);
          }

          return true;
        }
        return false;
      },
      [store, selectedElement, dispatch]
    );

    // Apply to All functionality - apply animations to all elements on the same row
    const handleApplyToAll = useCallback(async () => {
      if (
        !selectedElement ||
        (selectedElement.type !== 'imageUrl' &&
          selectedElement.type !== 'video')
      ) {
        console.warn(
          'No valid visual element (image or video) selected for Apply to All'
        );
        return;
      }

      // Determine what animation types to apply based on panel mode and active tab
      let animationTypesToApply = [];

      if (panelMode === 'effects') {
        // Get animations targeting the selected element based on active tab
        const selectedElementAnimations = store.animations.filter(anim => {
          const targetIds =
            anim.targetIds || (anim.targetId ? [anim.targetId] : []);
          return (
            targetIds.includes(selectedElement.id) &&
            anim.type !== 'glTransition'
          );
        });

        if (activeTab === 'all') {
          // Apply all animation types except GL transitions
          animationTypesToApply = [
            ...new Set(selectedElementAnimations.map(anim => anim.type)),
          ];
        } else if (activeTab === 'in') {
          // Apply only "In" animations and unified effects with "in" variant
          animationTypesToApply = [
            ...new Set(
              selectedElementAnimations
                .filter(anim => {
                  // Traditional In animations
                  if (anim.type.endsWith('In')) return true;

                  // Unified effects with "in" variant
                  if (
                    (anim.type === 'zoomEffect' ||
                      anim.type === 'fadeEffect') &&
                    (anim.effectVariant === 'in' ||
                      determineEffectVariant(anim) === 'in')
                  ) {
                    return true;
                  }

                  return false;
                })
                .map(anim => anim.type)
            ),
          ];
        } else if (activeTab === 'out') {
          // Apply only "Out" animations and unified effects with "out" variant
          animationTypesToApply = [
            ...new Set(
              selectedElementAnimations
                .filter(anim => {
                  // Traditional Out animations
                  if (anim.type.endsWith('Out')) return true;

                  // Unified effects with "out" variant
                  if (
                    (anim.type === 'zoomEffect' ||
                      anim.type === 'fadeEffect') &&
                    (anim.effectVariant === 'out' ||
                      determineEffectVariant(anim) === 'out')
                  ) {
                    return true;
                  }

                  return false;
                })
                .map(anim => anim.type)
            ),
          ];
        } else if (activeTab === 'effect') {
          // Apply only effect animations
          animationTypesToApply = [
            ...new Set(
              selectedElementAnimations
                .filter(anim => {
                  // Traditional effect animations (but exclude zoomEffect and fadeEffect)
                  if (
                    anim.type.endsWith('Effect') &&
                    !['zoomEffect', 'fadeEffect'].includes(anim.type)
                  ) {
                    return true;
                  }

                  // Unified effects with "effect" variant only
                  if (
                    (anim.type === 'zoomEffect' ||
                      anim.type === 'fadeEffect') &&
                    (anim.effectVariant === 'effect' ||
                      determineEffectVariant(anim) === 'effect')
                  ) {
                    return true;
                  }

                  return false;
                })
                .map(anim => anim.type)
            ),
          ];
        }

        // Apply each animation type to all elements on the same row
        if (animationTypesToApply.length > 0) {
          animationTypesToApply.forEach(animationType => {
            store.applyAnimationToAllOnSameRow(
              selectedElement.id,
              animationType
            );
          });
        } else {
          // If selected element has no animations, remove all animations from all elements on the same row (NONE state)
          store.removeAllAnimationsFromRow(selectedElement.id);
        }
      } else if (panelMode === 'transitions') {
        // Get GL transitions where selected element is involved
        const selectedElementGLTransitions = store.animations.filter(
          anim =>
            anim.type === 'glTransition' &&
            (anim.fromElementId === selectedElement.id ||
              anim.toElementId === selectedElement.id)
        );

        if (selectedElementGLTransitions.length > 0) {
          // Apply transitions to all gaps in the same row
          const currentRow = selectedElement.row;

          // Get all visual elements in the same row, sorted by start time
          const elementsInRow = store.editorElements
            .filter(
              el =>
                el.row === currentRow &&
                (el.type === 'imageUrl' || el.type === 'video')
            )
            .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

          // For each transition type applied to the selected element
          const transitionPromises = [];
          
          selectedElementGLTransitions.forEach(originalTransition => {
            // Apply this transition type to all consecutive pairs in the row
            for (let i = 0; i < elementsInRow.length - 1; i++) {
              const fromElement = elementsInRow[i];
              const toElement = elementsInRow[i + 1];

              // Check if there's a gap between elements (not overlapping)
              if (fromElement.timeFrame.end <= toElement.timeFrame.start) {
                // Remove existing transition if any
                const existingTransition = store.animations.find(
                  anim =>
                    anim.type === 'glTransition' &&
                    anim.fromElementId === fromElement.id &&
                    anim.toElementId === toElement.id
                );

                if (existingTransition) {
                  store.removeGLTransition(existingTransition.id);
                }

                // Calculate gap duration and proportional transition duration
                const gapDuration =
                  toElement.timeFrame.start - fromElement.timeFrame.end;

                const durationFromTimeframe =
                  (originalTransition.endTime ?? 0) -
                  (originalTransition.startTime ?? 0);
                const finalDuration = Math.max(
                  100,
                  durationFromTimeframe > 0
                    ? durationFromTimeframe
                    : (originalTransition.duration ?? 1000)
                );

                // Create transition promise for parallel execution
                const transitionPromise = store.addGLTransition(
                  fromElement.id,
                  toElement.id,
                  originalTransition.transitionType,
                  finalDuration
                ).then(transitionId => {
                  if (transitionId) {
                    // Copy custom parameters if they exist in the original transition
                    if (
                      originalTransition.properties &&
                      originalTransition.properties.customParams
                    ) {
                      store.updateGLTransitionProperties(transitionId, {
                        customParams:
                          originalTransition.properties.customParams,
                      });
                    } else {
                      // Ensure transition is marked as manually adjusted to preserve exact timing/duration
                      store.updateGLTransitionProperties(transitionId, {});
                    }
                  }
                  return transitionId;
                }).catch(error => {
                  console.error('Error creating GL transition:', error);
                  return null;
                });

                transitionPromises.push(transitionPromise);
              }
            }
          });

          // Wait for all transitions to be created in parallel
          try {
            await Promise.all(transitionPromises);
          } catch (error) {
            console.error('Error creating GL transitions in parallel:', error);
          }
        } else {
          // No transitions on selected element - remove all transitions from the same row
          const currentRow = selectedElement.row;

          // Get all visual elements in the same row
          const elementsInRow = store.editorElements.filter(
            el =>
              el.row === currentRow &&
              (el.type === 'imageUrl' || el.type === 'video')
          );

          // Remove all GL transitions involving elements from this row
          const transitionsToRemove = store.animations.filter(anim => {
            if (anim.type !== 'glTransition') return false;

            const fromElement = elementsInRow.find(
              el => el.id === anim.fromElementId
            );
            const toElement = elementsInRow.find(
              el => el.id === anim.toElementId
            );

            return fromElement && toElement;
          });

          transitionsToRemove.forEach(transition => {
            store.removeGLTransition(transition.id);
          });
        }

        // Skip the rest of the logic for transitions mode
        // Trigger refresh
        store.scheduleAnimationRefresh();

        // Trigger Redux sync
        if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
          window.dispatchSaveTimelineState(store);
        }
        return;
      }

      // Apply to All works for effects mode:
      // 1. If selected element has animations - copy them to all other images
      // 2. If selected element has no animations (none state) - remove all from other images

      // Get all other visual elements (images and videos)
      const allVisualElements = store.editorElements.filter(
        el =>
          (el.type === 'imageUrl' || el.type === 'video') &&
          el.id !== selectedElement.id
      );

      // Remove existing animations from target visual elements based on what we're applying
      allVisualElements.forEach(visualElement => {
        if (panelMode === 'effects') {
          // Remove only the specific type of animations based on active tab
          const animationsToRemove = store.animations.filter(anim => {
            // Skip GL transitions - they should only be handled in transitions mode
            if (anim.type === 'glTransition') return false;
            if (anim.targetId !== visualElement.id) return false;

            if (activeTab === 'all') {
              // Remove all regular animations (but keep GL transitions)
              return true;
            } else if (activeTab === 'in') {
              // Remove only "In" animations and unified effects with "in" variant
              if (anim.type.endsWith('In')) return true;
              if (
                (anim.type === 'zoomEffect' || anim.type === 'fadeEffect') &&
                (anim.effectVariant === 'in' ||
                  determineEffectVariant(anim) === 'in')
              ) {
                return true;
              }
              return false;
            } else if (activeTab === 'out') {
              // Remove only "Out" animations and unified effects with "out" variant
              if (anim.type.endsWith('Out')) return true;
              if (
                (anim.type === 'zoomEffect' || anim.type === 'fadeEffect') &&
                (anim.effectVariant === 'out' ||
                  determineEffectVariant(anim) === 'out')
              ) {
                return true;
              }
              return false;
            } else if (activeTab === 'effect') {
              // Remove only effect animations
              if (
                anim.type.endsWith('Effect') &&
                !['zoomEffect', 'fadeEffect'].includes(anim.type)
              ) {
                return true;
              }
              if (
                (anim.type === 'zoomEffect' || anim.type === 'fadeEffect') &&
                (anim.effectVariant === 'effect' ||
                  determineEffectVariant(anim) === 'effect')
              ) {
                return true;
              }
              return false;
            }

            return false;
          });

          animationsToRemove.forEach(anim => {
            store.removeAnimation(anim.id);
          });

          // Remove corresponding animation elements from timeline
          const animationElementsToRemove = store.editorElements.filter(
            el =>
              el.type === 'animation' &&
              animationsToRemove.some(anim => anim.id === el.animationId) &&
              // Extra safety check to ensure we don't remove GL transition elements
              !el.isGLTransition
          );
          animationElementsToRemove.forEach(animEl => {
            store.removeEditorElement(animEl.id);
          });
        }
      });

      // Apply animations based on panel mode
      if (panelMode === 'effects') {
        // Apply regular animations (effects) to each visual element
        allVisualElements.forEach(visualElement => {
          selectedElementAnimations.forEach(originalAnimation => {
            // Calculate proportional timing based on the source and target element durations
            const sourceElementDuration =
              selectedElement.timeFrame.end - selectedElement.timeFrame.start;
            const targetElementDuration =
              visualElement.timeFrame.end - visualElement.timeFrame.start;

            // Get original animation timing
            const originalProperties = originalAnimation.properties || {};
            const originalStartTime = originalProperties.startTime || 0;
            const originalEndTime =
              originalProperties.endTime || originalAnimation.duration || 1000;

            // Calculate proportional timing
            const startTimeRatio = originalStartTime / sourceElementDuration;
            const endTimeRatio = originalEndTime / sourceElementDuration;

            // Apply proportional timing to target element
            const proportionalStartTime =
              startTimeRatio * targetElementDuration;
            const proportionalEndTime = endTimeRatio * targetElementDuration;
            const proportionalDuration =
              proportionalEndTime - proportionalStartTime;

            // Create a copy of the animation for the new target with proportional timing
            const newAnimation = {
              ...originalAnimation,
              id: getUid(), // Generate new unique ID
              targetId: visualElement.id, // Change target to new visual element
              duration: proportionalDuration,
              properties: {
                ...originalProperties,
                startTime: proportionalStartTime,
                endTime: proportionalEndTime,
              },
            };

            // Add animation to store (timeline element will be created automatically)
            store.addAnimation(newAnimation);
          });
        });
      }

      // Trigger refresh
      store.scheduleAnimationRefresh();

      // Trigger Redux sync
      if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(store);
      }
    }, [store, selectedElement, panelMode, activeTab]);

    const animationsConfig = [
      // Unified Zoom Effects - displayed as In/Out but using zoomEffect internally
      {
        type: 'zoomIn',
        name: 'Zoom In',
        image: transitionImage2,
        category: 'Zoom',
        icon: 'ZoomInIcon',
        properties: {
          scaleFactor: 1.0, // Start at normal size
          targetScale: 1.5, // End larger for zoom in
          speed: 1.0,
          isAutoSpeed: true,
          origin: 'center',
          duration: 600,
        },
        unifiedType: 'zoomEffect', // Internal animation type to create
        unifiedProperties: {
          scaleFactor: 1.0,
          targetScale: 1.5,
          speed: 1.0,
          isAutoSpeed: true,
          origin: 'center',
          animationType: 'zoomIn',
        },
      },
      {
        type: 'zoomOut',
        name: 'Zoom Out',
        image: transitionImage1,
        category: 'Zoom',
        icon: 'ZoomInIcon',
        properties: {
          scaleFactor: 1.0, // Start at normal size
          targetScale: 0.7, // End smaller for zoom out
          speed: 1.0,
          isAutoSpeed: true,
          origin: 'center',
          duration: 600,
        },
        unifiedType: 'zoomEffect',
        unifiedProperties: {
          scaleFactor: 1.0,
          targetScale: 0.7,
          speed: 1.0,
          isAutoSpeed: true,
          origin: 'center',
          animationType: 'zoomOut',
        },
      },
      {
        type: 'zoomEffect',
        name: 'Zoom Effect',
        image: transitionImage,
        category: 'Zoom',
        icon: 'FadeIcon',
        properties: {
          scaleFactor: 1.0,
          targetScale: 2.0,
          speed: 1.0,
          isAutoSpeed: true,
          startTime: 0,
          endTime: 1000,
          animationType: 'zoomIn',
          duration: 1000,
        },
      },
      // Unified Fade Effects - displayed as In/Out but using fadeEffect internally
      {
        type: 'fadeIn',
        name: 'Fade In',
        image: transitionImage,
        category: 'Fade',
        icon: 'FadeIcon',
        properties: {
          opacity: 0.0, // Start transparent for fade in
          targetOpacity: 1.0, // End opaque
          speed: 1.0,
          isAutoSpeed: true,
          duration: 600,
        },
        unifiedType: 'fadeEffect',
        unifiedProperties: {
          opacity: 0.0,
          targetOpacity: 1.0,
          speed: 1.0,
          isAutoSpeed: true,
          animationType: 'fadeIn',
        },
      },
      {
        type: 'fadeOut',
        name: 'Fade Out',
        image: transitionImage1,
        category: 'Fade',
        icon: 'FadeIcon',
        properties: {
          opacity: 1.0, // Start opaque for fade out
          targetOpacity: 0.0, // End transparent
          speed: 1.0,
          isAutoSpeed: true,
          duration: 600,
        },
        unifiedType: 'fadeEffect',
        unifiedProperties: {
          opacity: 1.0,
          targetOpacity: 0.0,
          speed: 1.0,
          isAutoSpeed: true,
          animationType: 'fadeOut',
        },
      },
      {
        type: 'fadeEffect',
        name: 'Fade Effect',
        image: transitionImage,
        category: 'Fade',
        icon: 'FadeIcon',
        properties: {
          opacity: 1.0,
          targetOpacity: 0.3,
          speed: 1.0,
          isAutoSpeed: true,
          startTime: 0,
          endTime: 1000,
          animationType: 'fadeIn',
          duration: 1000,
        },
      },
      {
        type: 'slideIn',
        name: 'Slide In',
        image: transitionImage,
        category: 'Slide',
        icon: 'SldeIcon',
        properties: {
          direction: 'left',
          W: 4,
          duration: 600,
          startTime: 0,
          endTime: 600,
        },
      },
      {
        type: 'slideOut',
        name: 'Slide Out',
        image: transitionImage1,
        category: 'Slide',
        icon: 'SldeIcon',
        properties: {
          direction: 'right',
          W: 4,
          duration: 600,
          startTime: 0,
          endTime: 600,
        },
      },
      {
        type: 'slideEffect',
        name: 'Slide Effect',
        image: transitionImage,
        category: 'Slide',
        icon: 'SldeIcon',
        properties: {
          scaleFactor: 1.5,
          direction: 'left',
          duration: null,
          isAutoSpeed: false,
          speed: 0.1,
        },
      },
      {
        type: 'dropIn',
        name: 'Drop In',
        image: transitionImage2,
        category: 'Drop',
        icon: 'DropIcon',
        properties: {
          W: 4,
          scaleFactor: 1.5,
          origin: 'center',
          duration: 600,
          startTime: 0,
          endTime: 600,
        },
      },
      {
        type: 'dropOut',
        name: 'Drop Out',
        image: transitionImage,
        category: 'Drop',
        icon: 'DropIcon',
        properties: {
          W: 4,
          scaleFactor: 1.5,
          origin: 'center',
          duration: 600,
          startTime: 0,
          endTime: 600,
        },
      },
    ];

    // Filters configuration - now with PIXI filters
    const filtersConfig = [
      {
        type: 'none',
        name: 'None',
        category: 'Clear',
        icon: 'NoneIcon',
        properties: {},
      },
      // PIXI Filters - Advanced Effects
      {
        type: 'adjustment',
        name: 'Adjustment',
        image: transitionImage1,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          gamma: 1,
          saturation: 1,
          contrast: 1,
          brightness: 1,
          red: 1,
          green: 1,
          blue: 1,
          alpha: 1,
        },
      },
      {
        type: 'advancedBloom',
        name: 'Advanced Bloom',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          threshold: 0.5,
          bloomScale: 1,
          brightness: 1,
          blur: 8,
          quality: 4,
        },
      },
      {
        type: 'ascii',
        name: 'ASCII',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          size: 8,
        },
      },
      {
        type: 'backdropBlur',
        name: 'Backdrop Blur',
        image: transitionImage1,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          strength: 8,
          quality: 4,
          kernelSize: 5,
        },
      },
      {
        type: 'bevel',
        name: 'Bevel',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          rotation: 45,
          thickness: 2,
          lightColor: 16777215,
          lightAlpha: 0.7,
          shadowColor: 0,
          shadowAlpha: 0.7,
        },
      },
      {
        type: 'bloom',
        name: 'Bloom',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          blur: 2,
          quality: 4,
          resolution: 1,
          kernelSize: 5,
        },
      },
      {
        type: 'bulgePinch',
        name: 'Bulge Pinch',
        image: transitionImage1,
        category: 'Distortion',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          center: [0.5, 0.5],
          radius: 100,
          strength: 1,
        },
      },
      {
        type: 'colorGradient',
        name: 'Color Gradient',
        image: transitionImage2,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          type: 0,
          stops: [
            {
              offset: 0,
              color: [1, 0, 0, 1],
            },
            {
              offset: 1,
              color: [0, 1, 0, 1],
            },
          ],
        },
      },
      {
        type: 'colorMap',
        name: 'Color Map',
        image: transitionImage,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          colorMap: null,
          nearest: false,
          mix: 1,
        },
      },
      {
        type: 'colorOverlay',
        name: 'Color Overlay',
        image: transitionImage1,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          color: [1, 0, 0],
          alpha: 1,
        },
      },
      {
        type: 'colorReplace',
        name: 'Color Replace',
        image: transitionImage2,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          originalColor: 16711680,
          newColor: 65280,
          epsilon: 0.4,
        },
      },
      {
        type: 'convolution',
        name: 'Convolution',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          width: 200,
          height: 200,
        },
      },
      {
        type: 'crossHatch',
        name: 'Cross Hatch',
        image: transitionImage1,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {},
      },
      {
        type: 'crt',
        name: 'CRT',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          curvature: 1,
          lineWidth: 1,
          lineContrast: 0.25,
          verticalLine: false,
          noise: 0.3,
          noiseSize: 1,
          seed: 0,
          vignetting: 0.3,
          vignettingAlpha: 1,
          vignettingBlur: 0.3,
          time: 0,
        },
      },
      {
        type: 'dot',
        name: 'Dot',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          scale: 1,
          angle: 5,
        },
      },
      {
        type: 'dropShadow',
        name: 'Drop Shadow',
        image: transitionImage1,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          rotation: 45,
          distance: 5,
          color: 0,
          alpha: 0.5,
          shadowOnly: false,
          blur: 2,
          quality: 3,
          kernelSize: 5,
          resolution: 1,
        },
      },
      {
        type: 'emboss',
        name: 'Emboss',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          strength: 5,
        },
      },
      {
        type: 'glitch',
        name: 'Glitch',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          slices: 5,
          offset: 100,
          direction: 0,
          fillMode: 0,
          seed: 0,
          average: false,
          minSize: 8,
          sampleSize: 512,
          red: { x: 0, y: 0 },
          green: { x: 0, y: 0 },
          blue: { x: 0, y: 0 },
        },
      },
      {
        type: 'glow',
        name: 'Glow',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          distance: 10,
          outerStrength: 4,
          innerStrength: 0,
          color: 16777215,
          quality: 0.1,
          knockout: false,
        },
      },
      {
        type: 'godray',
        name: 'Godray',
        image: transitionImage1,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          angle: 30,
          gain: 0.5,
          lacunarity: 2.5,
          parallel: true,
          time: 0,
          center: [0, 0],
        },
      },
      {
        type: 'grayscale',
        name: 'Grayscale',
        image: transitionImage2,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {},
      },
      {
        type: 'hslAdjustment',
        name: 'HSL Adjustment',
        image: transitionImage,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          hue: 0,
          saturation: 0,
          lightness: 0,
          colorize: false,
          alpha: 1,
        },
      },
      {
        type: 'kawaseBlur',
        name: 'Kawase Blur',
        image: transitionImage1,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          blur: 4,
          quality: 3,
          clamp: false,
          kernelSize: 5,
        },
      },
      {
        type: 'motionBlur',
        name: 'Motion Blur',
        image: transitionImage2,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          velocity: { x: 0, y: 0 },
          kernelSize: 5,
          offset: 0,
        },
      },
      {
        type: 'multiColorReplace',
        name: 'Multi Color Replace',
        image: transitionImage,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          replacements: [
            [16711680, 65280, 0.05],
            [255, 16776960, 0.05],
          ],
          epsilon: 0.05,
          maxColors: 0,
        },
      },
      {
        type: 'oldFilm',
        name: 'Old Film',
        image: transitionImage1,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          sepia: 0.3,
          noise: 0.3,
          noiseSize: 1,
          scratch: 0.5,
          scratchDensity: 0.3,
          scratchWidth: 1,
          vignetting: 0.3,
          vignettingAlpha: 1,
          vignettingBlur: 0.3,
          seed: 0,
        },
      },
      {
        type: 'outline',
        name: 'Outline',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          thickness: 1,
          color: 0,
          quality: 0.1,
          alpha: 1,
          knockout: false,
        },
      },
      {
        type: 'pixelate',
        name: 'Pixelate',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          size: { x: 10, y: 10 },
        },
      },
      {
        type: 'radialBlur',
        name: 'Radial Blur',
        image: transitionImage1,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          angle: 0,
          center: { x: 0, y: 0 },
          kernelSize: 5,
          radius: -1,
        },
      },
      {
        type: 'reflection',
        name: 'Reflection',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          mirror: true,
          boundary: 0.5,
          amplitude: [0, 20],
          waveLength: [30, 100],
          alpha: [1, 0],
          time: 0,
        },
      },
      {
        type: 'rgbSplit',
        name: 'RGB Split',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          red: { x: -10, y: 0 },
          green: { x: 0, y: 0 },
          blue: { x: 10, y: 0 },
        },
      },
      {
        type: 'shockwave',
        name: 'Shockwave',
        image: transitionImage1,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          center: { x: 0.5, y: 0.5 },
          params: {
            amplitude: 30,
            wavelength: 160,
            brightness: 1,
            speed: 500,
            radius: -1,
          },
          time: 0,
        },
      },
      {
        type: 'simpleLightmap',
        name: 'Simple Lightmap',
        image: transitionImage2,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          lightMap: null,
          color: 0x000000,
          alpha: 1,
        },
      },
      {
        type: 'simplexNoise',
        name: 'Simplex Noise',
        image: transitionImage,
        category: 'Effect',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          scale: 1,
          animationSpeed: 1,
        },
      },
      {
        type: 'tiltShiftAxis',
        name: 'Tilt Shift Axis',
        image: transitionImage1,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          blur: 100,
          gradientBlur: 600,
          start: { x: 0, y: 0 },
          end: { x: 600, y: 0 },
        },
      },
      {
        type: 'tiltShift',
        name: 'Tilt Shift',
        image: transitionImage2,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          blur: 100,
          gradientBlur: 600,
          start: { x: 0, y: 0 },
          end: { x: 600, y: 0 },
        },
      },
      {
        type: 'twist',
        name: 'Twist',
        image: transitionImage,
        category: 'Distortion',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          radius: 0.5,
          angle: 5,
          padding: 20,
          offset: { x: 0, y: 0 },
        },
      },
      {
        type: 'zoomBlur',
        name: 'Zoom Blur',
        image: transitionImage1,
        category: 'Blur',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          strength: 0.1,
          center: [0.5, 0.5],
          innerRadius: 0,
          radius: 100,
        },
      },
      // Simple PIXI filters (replacements for CSS filters)
      {
        type: 'blackAndWhite',
        name: 'Black & White',
        image: transitionImage,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {},
      },
      {
        type: 'sepia',
        name: 'Sepia',
        image: transitionImage1,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {},
      },
      {
        type: 'invert',
        name: 'Invert',
        image: transitionImage2,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {},
      },
      {
        type: 'saturate',
        name: 'Saturate',
        image: transitionImage,
        category: 'Color',
        icon: 'FadeIcon',
        isPixiFilter: true,
        properties: {
          saturation: 2,
        },
      },
    ];

    // Categorized transitions data
    const categorizedTransitions = {
      Zoom: [
        { name: 'None', displayName: 'None', author: '' },
        { name: 'SimpleZoom', displayName: 'Simple Zoom', author: '0gust1' },
        {
          name: 'DreamyZoom',
          displayName: 'Dreamy Zoom',
          author: 'Zeh Fernando',
        },
        { name: 'CrossZoom', displayName: 'Cross Zoom', author: 'rectalogic' },
        {
          name: 'ZoomInCircles',
          displayName: 'Zoom In Circles',
          author: 'dycm8009',
        },
      ],
      Directional: [
        { name: 'CircleCrop', displayName: 'Circle Crop', author: 'fkuteken' },
        { name: 'circleopen', displayName: 'Circleopen', author: 'gre' },
        { name: 'circle', displayName: 'Circle', author: 'Fernando Kuteken' },
        {
          name: 'Directional',
          displayName: 'Directional',
          author: 'Gaëtan Renaudeau',
        },
        {
          name: 'directionalwarp',
          displayName: 'Directionalwarp',
          author: 'pschroen',
        },
        {
          name: 'directionalwipe',
          displayName: 'Directionalwipe',
          author: 'gre',
        },
        { name: 'wipeLeft', displayName: 'Wipe Left', author: 'Jake Nelson' },
        { name: 'wipeRight', displayName: 'Wipe Right', author: 'Jake Nelson' },
        { name: 'wipeDown', displayName: 'Wipe Down', author: 'Jake Nelson' },
        { name: 'wipeUp', displayName: 'Wipe Up', author: 'Jake Nelson' },
        { name: 'doorway', displayName: 'Doorway', author: 'gre' },
        {
          name: 'windowblinds',
          displayName: 'Windowblinds',
          author: 'Fabien Benetou',
        },
        { name: 'windowslice', displayName: 'Windowslice', author: 'gre' },
        { name: 'GridFlip', displayName: 'Grid Flip', author: 'TimDonselaar' },
        { name: 'Mosaic', displayName: 'Mosaic', author: 'Xaychru' },
        {
          name: 'PolkaDotsCurtain',
          displayName: 'Polka Dots Curtain',
          author: 'bobylito',
        },
        {
          name: 'BowTieHorizontal',
          displayName: 'Bow Tie Horizontal',
          author: 'huynx',
        },
        {
          name: 'BowTieVertical',
          displayName: 'Bow Tie Vertical',
          author: 'huynx',
        },
        { name: 'Bounce', displayName: 'Bounce', author: 'Adrian Purser' },
        {
          name: 'InvertedPageCurl',
          displayName: 'Inverted Page Curl',
          author: 'Hewlett-Packard',
        },
      ],
      Blur: [
        { name: 'LinearBlur', displayName: 'Linear Blur', author: 'gre' },
        { name: 'fade', displayName: 'Fade', author: 'gre' },
        { name: 'fadecolor', displayName: 'Fadecolor', author: 'gre' },
        { name: 'fadegrayscale', displayName: 'Fadegrayscale', author: 'gre' },
        { name: 'luma', displayName: 'Luma', author: 'gre' },
        {
          name: 'luminance_melt',
          displayName: 'Luminance_melt',
          author: '0gust1',
        },
        {
          name: 'ColourDistance',
          displayName: 'Colour Distance',
          author: 'P-Seebauer',
        },
        { name: 'colorphase', displayName: 'Colorphase', author: 'gre' },
        { name: 'burn', displayName: 'Burn', author: 'gre' },
        { name: 'Dreamy', displayName: 'Dreamy', author: 'mikolalysenko' },
      ],
      Glitch: [
        {
          name: 'displacement',
          displayName: 'Displacement',
          author: 'Travis Fischer',
        },
        {
          name: 'GlitchDisplace',
          displayName: 'Glitch Displace',
          author: 'Matt DesLauriers',
        },
        {
          name: 'GlitchMemories',
          displayName: 'Glitch Memories',
          author: 'Gunnar Roth',
        },
        { name: 'Swirl', displayName: 'Swirl', author: 'Sergey Kosarevsky' },
        { name: 'ripple', displayName: 'Ripple', author: 'gre' },
        {
          name: 'WaterDrop',
          displayName: 'Water Drop',
          author: 'Paweł Płóciennik',
        },
        { name: 'perlin', displayName: 'Perlin', author: 'Rich Harris' },
        { name: 'angular', displayName: 'Angular', author: 'Fernando Kuteken' },
        {
          name: 'polar_function',
          displayName: 'Polar_function',
          author: 'Fernando Kuteken',
        },
        { name: 'squareswire', displayName: 'Squareswire', author: 'gre' },
        { name: 'randomsquares', displayName: 'Randomsquares', author: 'gre' },
        {
          name: 'multiply_blend',
          displayName: 'Multiply_blend',
          author: 'Fernando Kuteken',
        },
        {
          name: 'undulatingBurnOut',
          displayName: 'Undulating Burn Out',
          author: 'pthrasher',
        },
        { name: 'wind', displayName: 'Wind', author: 'gre' },
      ],
      Geometric: [
        {
          name: 'kaleidoscope',
          displayName: 'Kaleidoscope',
          author: 'nwoeanhinnogaehr',
        },
        { name: 'pinwheel', displayName: 'Pinwheel', author: 'Mr Speaker' },
        { name: 'cube', displayName: 'Cube', author: 'gre' },
        {
          name: 'StereoViewer',
          displayName: 'Stereo Viewer',
          author: 'Ted Schundler',
        },
        { name: 'squeeze', displayName: 'Squeeze', author: 'gre' },
        { name: 'swap', displayName: 'Swap', author: 'gre' },
        {
          name: 'windowblinds',
          displayName: 'Windowblinds',
          author: 'Fabien Benetou',
        },
      ],
      Pattern: [
        {
          name: 'ButterflyWaveScrawler',
          displayName: 'Butterfly Wave Scrawler',
          author: 'mandubian',
        },
        {
          name: 'CrazyParametricFun',
          displayName: 'Crazy Parametric Fun',
          author: 'mandubian',
        },
        {
          name: 'DoomScreenTransition',
          displayName: 'Doom Screen Transition',
          author: 'Zeh Fernando',
        },
        { name: 'morph', displayName: 'Morph', author: 'paniq' },
        { name: 'luma', displayName: 'Luma', author: 'gre' },
        { name: 'heart', displayName: 'Heart', author: 'gre' },
        { name: 'flyeye', displayName: 'Flyeye', author: 'gre' },
        {
          name: 'hexagonalize',
          displayName: 'Hexagonalize',
          author: 'Fernando Kuteken',
        },
        { name: 'Swirl', displayName: 'Swirl', author: 'Sergey Kosarevsky' },
        { name: 'ripple', displayName: 'Ripple', author: 'gre' },
        {
          name: 'rotate_scale_fade',
          displayName: 'Rotate_scale_fade',
          author: 'Fernando Kuteken',
        },
        {
          name: 'cannabisleaf',
          displayName: 'Cannabisleaf',
          author: '@Flexi23',
        },
        { name: 'crosshatch', displayName: 'Crosshatch', author: 'pthrasher' },
        {
          name: 'crosswarp',
          displayName: 'Crosswarp',
          author: 'Eke Péter <peterekepeter@gmail.com>',
        },
        { name: 'pixelize', displayName: 'Pixelize', author: 'gre' },
      ],
    };

    const getFilteredAnimations = () => {
      let animations = [];

      // Handle Active Transitions tab
      if (activeTab === 'active') {
        return getFilteredActiveAnimations();
      }

      // Handle Filters tab - show available filters
      if (activeTab === 'filters') {
        animations = [...filtersConfig];

        // Filter by search query
        if (searchQuery) {
          animations = animations.filter(
            filter =>
              filter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              filter.category.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        return animations;
      }

      // Handle Transitions mode - show GL transitions grouped by categories
      if (panelMode === 'transitions') {
        if (transitionsLoaded) {
          // Create all transitions first for search filtering
          const allTransitions = [
            {
              type: 'none',
              name: 'None',
              category: 'Clear',
              icon: 'NoneIcon',
            },
          ];

          Object.entries(categorizedTransitions).forEach(
            ([categoryName, transitions]) => {
              const categoryTransitions = transitions
                .filter(transition => transition.name !== 'None') // Skip None, we add it separately
                .map(transition => ({
                  type: transition.name,
                  name: transition.displayName,
                  category: categoryName,
                  icon: 'TransitionsIcon',
                  isGLTransition: true,
                  author: transition.author,
                }));

              allTransitions.push(...categoryTransitions);
            }
          );

          // Apply search filter to all transitions
          let filteredTransitions = allTransitions;
          if (searchQuery) {
            filteredTransitions = allTransitions.filter(
              anim =>
                anim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                anim.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          // If search is active, return flat array
          if (searchQuery) {
            return filteredTransitions;
          }

          // Otherwise, return grouped structure
          const groupedTransitions = [
            {
              type: 'category-header',
              name: 'Clear',
              isHeader: true,
              transitions: filteredTransitions.filter(
                t => t.category === 'Clear'
              ),
            },
          ];

          Object.entries(categorizedTransitions).forEach(
            ([categoryName, transitions]) => {
              const categoryTransitions = filteredTransitions.filter(
                t => t.category === categoryName && t.type !== 'none'
              );

              if (categoryTransitions.length > 0) {
                groupedTransitions.push({
                  type: 'category-header',
                  name: categoryName,
                  isHeader: true,
                  transitions: categoryTransitions,
                });
              }
            }
          );

          return groupedTransitions;
        }
      } else {
        // Handle Effects mode - regular animations
        animations = [...animationsConfig];

        // Add GL transitions for two-way tab (now empty since we moved them to transitions mode)
        if (activeTab === 'two-way') {
          animations = [
            { type: 'none', name: 'None', category: 'Clear', icon: 'NoneIcon' },
          ];
        } else {
          // Filter by tab
          if (activeTab === 'in') {
            animations = animations.filter(anim => anim.type.endsWith('In'));
          } else if (activeTab === 'out') {
            animations = animations.filter(anim => anim.type.endsWith('Out'));
          } else if (activeTab === 'effect') {
            animations = animations.filter(
              anim =>
                anim.type.endsWith('Effect') &&
                !['zoomEffect', 'fadeEffect'].includes(anim.type)
            );
          }

          // Add None option for non-GL tabs
          animations = [
            { type: 'none', name: 'None', category: 'Clear', icon: 'NoneIcon' },
            ...animations,
          ];
        }
      }

      // Filter by search query (only for effects mode, transitions mode handles search internally)
      if (searchQuery && panelMode !== 'transitions') {
        animations = animations.filter(anim =>
          anim.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return animations;
    };

    const isAnimationActive = animation => {
      if (animation.type === 'none') {
        // "None" is active when no animations/filters of the current tab type are present
        if (activeTab === 'filters') {
          return !currentFilter || currentFilter === 'none';
        } else if (panelMode === 'transitions') {
          return !transitionType;
        } else if (activeTab === 'two-way') {
          return !transitionType;
        } else if (activeTab === 'in') {
          return !inEffect;
        } else if (activeTab === 'out') {
          return !outEffect;
        } else if (activeTab === 'effect') {
          return !effectType;
        } else if (activeTab === 'all') {
          return !inEffect && !outEffect && !effectType && !transitionType;
        }
        return false;
      }

      // Handle filters
      if (activeTab === 'filters') {
        return animation.type === currentFilter;
      }

      if (animation.isGLTransition) {
        return animation.type === transitionType;
      }

      // Handle unified zoom and fade effects
      if (animation.unifiedType) {
        if (animation.type === 'zoomIn') {
          return inEffect === 'zoom';
        } else if (animation.type === 'zoomOut') {
          return outEffect === 'zoom';
        } else if (animation.type === 'fadeIn') {
          return inEffect === 'fade';
        } else if (animation.type === 'fadeOut') {
          return outEffect === 'fade';
        }
      }

      if (animation.type.endsWith('Effect')) {
        return animation.type === effectType;
      } else if (animation.type.endsWith('In')) {
        return getBaseAnimationType(animation.type) === inEffect;
      } else if (animation.type.endsWith('Out')) {
        return getBaseAnimationType(animation.type) === outEffect;
      }

      return false;
    };

    // Function to get animation count for a specific animation type
    const getAnimationCount = animation => {
      if (!selectedElement || animation.type === 'none') {
        return 0;
      }

      // Handle filters - count applied filters (max 1)
      if (activeTab === 'filters') {
        return animation.type === currentFilter ? 1 : 0;
      }

      // Handle GL transitions
      if (animation.isGLTransition) {
        const glTransitions = store.animations.filter(
          a =>
            a.type === 'glTransition' &&
            a.transitionType === animation.type &&
            (a.fromElementId === selectedElement.id ||
              a.toElementId === selectedElement.id)
        );
        return glTransitions.length;
      }

      // Handle unified effects (zoomIn/Out, fadeIn/Out) - these create zoomEffect/fadeEffect internally
      if (animation.unifiedType) {
        const animationVariant = animation.type.includes('In')
          ? 'in'
          : animation.type.includes('Out')
            ? 'out'
            : 'effect';

        const matchingAnimations = selectedElementAnimations.filter(anim => {
          if (anim.type !== animation.unifiedType) return false;

          const effectVariant =
            anim.effectVariant || determineEffectVariant(anim);
          return effectVariant === animationVariant;
        });

        return matchingAnimations.length;
      }

      // Handle standalone effect animations (zoomEffect, fadeEffect when used directly)
      // Only count them if they're not already counted by unified effects
      if (animation.type === 'zoomEffect' || animation.type === 'fadeEffect') {
        const matchingAnimations = selectedElementAnimations.filter(anim => {
          if (anim.type !== animation.type) return false;

          // Only count effects that are not 'in' or 'out' variants (those are handled by unified effects)
          const effectVariant =
            anim.effectVariant || determineEffectVariant(anim);
          return effectVariant === 'effect';
        });

        return matchingAnimations.length;
      }

      // Handle traditional animations (slide, drop, etc.)
      const matchingAnimations = selectedElementAnimations.filter(
        anim => anim.type === animation.type
      );

      return matchingAnimations.length;
    };

    const handleFilterEditClick = async (filter, event) => {
      // Prevent event bubbling
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (!activeCanvasImage) {
        console.warn('No visible image selected on canvas for filter settings');
        return;
      }

      try {
        // Open DetailPanel for filter configuration
        setSelectedFilter(filter);
        setCurrentFilterConfig(filter);
        setShowDetailPanel(true);
        setIsFilterDetailPanel(true);

        // Store the previous state to know we came from filters
        setPreviousTabState({
          activeTab: 'filters',
          activeSideFilter: activeSideFilter,
          fromFilters: true,
        });
      } catch (error) {
        console.error('Error opening filter settings:', error);
      }
    };

    const handleAnimationClick = animation => {
      if (animation.type === 'none') {
        handleNoneClick();
      } else if (activeTab === 'filters') {
        handleFilterClick(animation, null);
      } else if (animation.isActive && activeTab === 'active') {
        // Handle clicking on active animation - open settings using event system
        if (animation.isGLTransition) {
          const animationToEdit = store.animations.find(
            a =>
              a.type === 'glTransition' &&
              a.transitionType === animation.type &&
              (a.fromElementId === selectedElement?.id ||
                a.toElementId === selectedElement?.id)
          );

          if (animationToEdit) {
            const fromElement = store.editorElements.find(
              el =>
                el.id === animationToEdit.fromElementId &&
                el.type !== 'animation'
            );
            const toElement = store.editorElements.find(
              el =>
                el.id === animationToEdit.toElementId && el.type !== 'animation'
            );

            if (fromElement && toElement) {
              window.dispatchEvent(
                new CustomEvent('openGLTransitionDetail', {
                  detail: {
                    animation: animationToEdit,
                    fromElement,
                    toElement,
                  },
                })
              );
            }
          }
        } else {
          // For regular animations
          const animationToEdit = store.animations.find(
            a => a.type === animation.type && a.targetId === selectedElement?.id
          );

          if (animationToEdit && selectedElement) {
            window.dispatchEvent(
              new CustomEvent('openTransitionPanelWithEffect', {
                detail: {
                  animation: animationToEdit,
                  element: selectedElement,
                },
              })
            );
          }
        }
      } else if (animation.isGLTransition) {
        handleGLTransitionClick(animation);
      } else {
        handleRegularAnimationClick(animation);
      }
    };

    const handleFilterClick = async (filter, event) => {
      // Prevent event bubbling to avoid closing the panel
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (!activeCanvasImage) {
        console.warn(
          'No visible image selected on canvas for filter application'
        );
        return;
      }

      try {
        // Apply filter to the active canvas image
        if (filter.isPixiFilter) {
          // Apply PIXI filters
          if (filter.type === 'glitch') {
            await applyGlitchFilter(activeCanvasImage, filter.properties);
          } else {
            await applyPixiFilter(
              activeCanvasImage,
              filter.type,
              filter.properties
            );
          }
          setCurrentFilter(filter.type);
        } else {
          // Apply existing CSS filters
          activeCanvasImage.set('customFilter', filter.type);
          setCurrentFilter(filter.type);
        }

        // Re-render canvas
        store.canvas.renderAll();

        // Trigger Redux sync
        if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
          window.dispatchSaveTimelineState(store);
        }

        // Filter applied successfully - no auto-open of detail panel
      } catch (error) {
        console.error('Error applying filter:', error);
        // Fallback to no filter on error
        setCurrentFilter(null);
      }
    };

    const handleNoneClick = () => {
      if (activeTab === 'filters') {
        // Remove filter from active canvas image
        if (activeCanvasImage) {
          // Remove both PIXI and CSS filters
          removePixiFilters(activeCanvasImage);

          // Clear all filter properties explicitly
          activeCanvasImage.set('customFilter', 'none');
          if (activeCanvasImage.filters) {
            activeCanvasImage.filters.length = 0;
          }

          // Reset current filter state
          setCurrentFilter('none');

          // Force re-render
          store.canvas.renderAll();
          store.canvas.requestRenderAll();

          // Trigger Redux sync
          if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
            window.dispatchSaveTimelineState(store);
          }
        }
      } else if (panelMode === 'transitions') {
        // Remove GL transitions related to selected element
        if (selectedElement) {
          const glTransitions = store.animations.filter(
            a =>
              a.type === 'glTransition' &&
              (a.fromElementId === selectedElement.id ||
                a.toElementId === selectedElement.id)
          );
          glTransitions.forEach(transition => {
            store.removeGLTransition(transition.id);
          });
          setTransitionType(null);
        }
      } else if (activeTab === 'two-way') {
        // Remove all GL transitions
        const glTransitions = store.animations.filter(
          a => a.type === 'glTransition'
        );
        glTransitions.forEach(transition => {
          store.removeGLTransition(transition.id);
        });
        setTransitionType(null);
      } else {
        // Remove animations from selected element (effects mode)
        if (selectedElement) {
          store.removeAllAnimationsFromElement(selectedElement.id);

          // Update states
          setInEffect(null);
          setOutEffect(null);
          setEffectType(null);
        }
      }

      // Save state
      if (window.dispatchSaveTimelineState && !store.isUndoRedoOperation) {
        window.dispatchSaveTimelineState(store);
      }
    };

    const handleGLTransitionClick = animation => {
      if (store.pendingTransitionData) {
        const { type, fromElement, toElement, gap, transition } =
          store.pendingTransitionData;

        const existingTransition =
          transition ||
          gap?.existingTransition ||
          store.animations.find(
            a =>
              a.type === 'glTransition' &&
              a.fromElementId === fromElement.id &&
              a.toElementId === toElement.id
          );

        if (existingTransition) {
          // Check if it's the same transition type - if so, just remove it (toggle off)
          if (existingTransition.transitionType === animation.type) {
            store.removeGLTransition(existingTransition.id);
            setTransitionType(null);

            store.pendingTransitionData = null;
            return;
          } else {
            // Different transition type - remove old and add new
            store.removeGLTransition(existingTransition.id);
          }
        }

        // Calculate proportional duration based on gap between elements
        const gapDuration =
          toElement.timeFrame.start - fromElement.timeFrame.end;
        const duration =
          existingTransition?.duration ||
          calculateGLTransitionDuration(gapDuration);

        store
          .addGLTransition(
            fromElement.id,
            toElement.id,
            animation.type,
            duration
          )
          .then(transitionId => {
            if (transitionId) {
              setTransitionType(animation.type);

              store.pendingTransitionData = null;
            }
          });
        return;
      }

      // Handle regular GL transition creation
      const currentElement = selectedElement;
      if (
        !currentElement ||
        (currentElement.type !== 'imageUrl' && currentElement.type !== 'video')
      ) {
        return;
      }

      const currentRow = currentElement.row;
      const elementsInRow = store.editorElements
        .filter(
          el =>
            el.row === currentRow &&
            (el.type === 'imageUrl' || el.type === 'video')
        )
        .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

      const currentIndex = elementsInRow.findIndex(
        el => el.id === currentElement.id
      );
      const nextElement = elementsInRow[currentIndex + 1];

      if (!nextElement) {
        return;
      }

      const existingTransition = store.animations.find(
        a =>
          a.type === 'glTransition' &&
          a.fromElementId === currentElement.id &&
          a.toElementId === nextElement.id
      );

      if (existingTransition) {
        // Check if it's the same transition type - if so, just remove it (toggle off)
        if (existingTransition.transitionType === animation.type) {
          // Check if this transition is applied to all gaps and should be removed from all
          const isAppliedToAll = isAnimationAppliedToAllScenes(
            existingTransition,
            store,
            selectedElement
          );

          if (isAppliedToAll) {
            // Remove from all gaps
            const success = removeAnimationFromAllScenes(
              existingTransition,
              store,
              selectedElement
            );
            if (success) {
              setTransitionType(null);
            }
          } else {
            // Remove only current transition
            store.removeGLTransition(existingTransition.id);
            setTransitionType(null);
          }
          return;
        } else {
          // Different transition type - remove old and add new
          store.removeGLTransition(existingTransition.id);
        }
      }

      // Calculate proportional duration based on gap between elements
      const gapDuration =
        nextElement.timeFrame.start - currentElement.timeFrame.end;
      const proportionalDuration = calculateGLTransitionDuration(gapDuration);

      // Add new transition
      store
        .addGLTransition(
          currentElement.id,
          nextElement.id,
          animation.type,
          proportionalDuration
        )
        .then(transitionId => {
          if (transitionId) {
            setTransitionType(animation.type);
          }
        });
    };

    const handleRegularAnimationClick = animation => {
      const currentEffect = getAnimationCurrentState(animation);

      // Check if this exact animation is already active
      const isExactAnimationActive = (() => {
        // Handle unified effects
        if (
          animation.unifiedType &&
          (animation.type === 'zoomIn' ||
            animation.type === 'zoomOut' ||
            animation.type === 'fadeIn' ||
            animation.type === 'fadeOut')
        ) {
          const positionType = animation.type.endsWith('In') ? 'in' : 'out';
          const baseEffect =
            animation.unifiedType === 'zoomEffect' ? 'zoom' : 'fade';

          if (positionType === 'in') {
            return inEffect === baseEffect;
          } else {
            return outEffect === baseEffect;
          }
        }

        // Handle regular animations
        const baseType = getBaseAnimationType(animation.type);
        const positionType = getAnimationPositionType(animation.type);

        if (positionType === 'in') {
          return inEffect === baseType;
        } else if (positionType === 'out') {
          return outEffect === baseType;
        } else if (positionType === 'effect') {
          return effectType === animation.type;
        }

        return false;
      })();

      // Remove toggle behavior - always add animation instead of toggling
      // if (isExactAnimationActive) {
      //   // Toggle logic removed - now we always add animations
      //   return;
      // }

      // Allow multiple animations - don't remove existing ones
      // if (currentEffect) {
      //   removeExistingAnimations(animation, currentEffect);
      // }

      // Handle unified zoom and fade effects
      if (
        animation.unifiedType &&
        (animation.type === 'zoomIn' ||
          animation.type === 'zoomOut' ||
          animation.type === 'fadeIn' ||
          animation.type === 'fadeOut')
      ) {
        const positionType = animation.type.endsWith('In') ? 'in' : 'out';
        const success = addAnimation(
          animation.unifiedType,
          positionType,
          animation
        );

        if (success) {
          // Update states for unified effects
          if (animation.unifiedType === 'zoomEffect') {
            if (positionType === 'in') {
              setInEffect('zoom');
            } else {
              setOutEffect('zoom');
            }
          } else if (animation.unifiedType === 'fadeEffect') {
            if (positionType === 'in') {
              setInEffect('fade');
            } else {
              setOutEffect('fade');
            }
          }
        }
        return;
      }

      // Handle regular animations (slide, drop, and effect animations)
      const baseType = getBaseAnimationType(animation.type);
      const positionType = getAnimationPositionType(animation.type);

      if (baseType) {
        const success = addAnimation(baseType, positionType);
        if (success) {
          updateAnimationStates(animation, baseType);

          // Don't show detail panel immediately - just add the animation
          // The user can click edit button to open settings
        }
      }
    };

    // Add effect to handle openTransitionPanelWithEffect event
    useEffect(() => {
      const handleTransitionPanelOpen = event => {
        if (event.detail && event.detail.animation) {
          const animation = event.detail.animation;

          // Store the target element for DetailPanel to use, but don't change selectedElement
          const targetElement = event.detail.element;

          // Update UI state for effects - set correct tab based on animation type
          if (animation.type === 'zoomEffect') {
            setActiveTab('in'); // zoomEffect is in the "in" tab as zoom
            setActiveSideFilter('zoom');
          } else if (animation.type === 'fadeEffect') {
            setActiveTab('in'); // fadeEffect is in the "in" tab as fade
            setActiveSideFilter('fade');
          } else {
            setActiveTab('effect'); // other effects go to motion tab
          }

          // Find and select the animation
          const animationToEdit = store.animations.find(
            a => a.id === animation.id
          );
          if (animationToEdit) {
            // Add target element to the animation object for DetailPanel
            const animationWithTarget = {
              ...animationToEdit,
              targetElement: targetElement,
            };
            setSelectedAnimation(animationWithTarget);
            setShowDetailPanel(true);
            setIsActiveAnimationDetailsOpen(animation.id || animation.type);
          }
        }
      };

      const handleGLTransitionDetailOpen = event => {
        if (event.detail && event.detail.animation) {
          const animation = event.detail.animation;

          // Don't change selectedElement here for GL transitions either
          // Keep the animation item selected for consistent highlighting
          // if (event.detail.fromElement) {
          //   store.setSelectedElement(event.detail.fromElement);
          // }

          // Switch to transitions tab for GL transitions
          setActiveTab('transitions');

          // Find and select the GL transition animation
          const animationToEdit = store.animations.find(
            a => a.id === animation.id
          );

          if (animationToEdit) {
            // Create a proper selectedAnimation object that getCurrentAnimation can handle
            const glTransitionForDetail = {
              ...animationToEdit,
              isActive: true,
              isGLTransition: true,
              actualAnimation: animationToEdit,
              type: animationToEdit.transitionType, // Use transitionType for display
            };

            setSelectedAnimation(glTransitionForDetail);

            setShowDetailPanel(true);

            setIsActiveAnimationDetailsOpen(animation.id);
          } else {
            console.error(
              '[TransitionPanel] Animation not found in store for ID:',
              animation.id
            );
          }
        } else {
          console.error(
            '[TransitionPanel] Invalid event detail:',
            event.detail
          );
        }
      };

      window.addEventListener(
        'openTransitionPanelWithEffect',
        handleTransitionPanelOpen
      );
      window.addEventListener(
        'openGLTransitionDetail',
        handleGLTransitionDetailOpen
      );
      return () => {
        window.removeEventListener(
          'openTransitionPanelWithEffect',
          handleTransitionPanelOpen
        );
        window.removeEventListener(
          'openGLTransitionDetail',
          handleGLTransitionDetailOpen
        );
      };
    }, [store]);

    // Add effect to handle transitionPanelSetEffect event
    useEffect(() => {
      const handleSetEffect = event => {
        if (event.detail && event.detail.animation) {
          const animation = event.detail.animation;

          // Update UI state for effects
          setActiveTab('effect');
          if (animation.type === 'zoomEffect') {
            setActiveSideFilter('zoom');
          } else if (animation.type === 'fadeEffect') {
            setActiveSideFilter('fade');
          }

          // Find and select the animation
          const animationToEdit = store.animations.find(
            a => a.id === animation.id
          );
          if (animationToEdit) {
            setSelectedAnimation(animationToEdit);
            setShowDetailPanel(true);
            setIsActiveAnimationDetailsOpen(animation.id || animation.type);
          }
        }
      };

      window.addEventListener('transitionPanelSetEffect', handleSetEffect);
      return () => {
        window.removeEventListener('transitionPanelSetEffect', handleSetEffect);
      };
    }, [store]);

    // Update handleEditAnimation to handle effects properly
    const handleEditAnimation = animation => {
      // Save current tab state before opening detail panel
      setPreviousTabState({
        activeTab: activeTab,
        activeSideFilter: activeSideFilter,
      });
      // For GL transitions, handle differently
      if (animation.isGLTransition) {
        // Find the actual GL transition in store
        const glTransition = store.animations.find(
          a =>
            a.type === 'glTransition' &&
            (a.fromElementId === selectedElement?.id ||
              a.toElementId === selectedElement?.id)
        );

        const glAnimationWithConfig = glTransition
          ? {
              ...animation,
              id: glTransition.id,
              actualAnimation: glTransition,
            }
          : animation;

        // Force update by clearing selection first if panel is already open
        if (showDetailPanel) {
          setSelectedAnimation(null);
          // Use setTimeout to ensure state update is processed
          setTimeout(() => {
            setSelectedAnimation(glAnimationWithConfig);
            setIsActiveAnimationDetailsOpen(animation.id || animation.type);
          }, 0);
        } else {
          setSelectedAnimation(glAnimationWithConfig);
          setIsActiveAnimationDetailsOpen(animation.id || animation.type);
        }

        setShowDetailPanel(true);
        // For GL transitions, we need to ensure activeTab !== 'active' for DetailPanel to render
        if (activeTab === 'active') {
          setActiveTab('transitions');
        }

        return;
      }

      // For regular animations, we need to find the actual animation in the store
      let animationToEdit = null;

      // First, try to find by ID if it exists (for animations from active tab)
      if (animation.id) {
        animationToEdit = store.animations.find(a => a.id === animation.id);
      }

      // If not found by ID, find by type and targetId
      if (!animationToEdit && selectedElement) {
        animationToEdit = store.animations.find(
          a => a.type === animation.type && a.targetId === selectedElement.id
        );
      }

      // If still not found, this might be a config from animationsConfig, find the matching store animation
      if (!animationToEdit && selectedElement) {
        // For unified effects, check if there's a matching animation
        if (animation.unifiedType) {
          // Determine the effect variant for this animation
          const animationVariant = animation.type.includes('In')
            ? 'in'
            : animation.type.includes('Out')
              ? 'out'
              : 'effect';

          // Find all matching animations for debugging
          const allMatchingAnimations = store.animations.filter(
            a =>
              a.type === animation.unifiedType &&
              a.targetId === selectedElement.id
          );

          animationToEdit = store.animations.find(
            a =>
              a.type === animation.unifiedType &&
              a.targetId === selectedElement.id &&
              (a.effectVariant === animationVariant ||
                determineEffectVariant(a) === animationVariant)
          );
        }
      }
      if (!animationToEdit) {
        console.error('Could not find animation to edit in store');
        return;
      }

      // Find the matching config for the animation
      const matchedConfig = animationsConfig.find(
        config =>
          config.type === animationToEdit.type ||
          config.unifiedType === animationToEdit.type
      );

      const animationWithConfig = {
        ...animationToEdit,
        config: matchedConfig || animation.config,
        // Ensure unifiedType is preserved from the original animation config
        unifiedType: animation.unifiedType,
        // Also preserve the original display type for reference (zoomIn/zoomOut)
        displayType: animation.type,
        // Keep the effectVariant from store animation
        effectVariant: animationToEdit.effectVariant,
      };

      // Force update by clearing selection first if panel is already open
      if (showDetailPanel) {
        setSelectedAnimation(null);
        // Use setTimeout to ensure state update is processed
        setTimeout(() => {
          setSelectedAnimation(animationWithConfig);
          setIsActiveAnimationDetailsOpen(animationToEdit.id || animation.type);
        }, 0);
      } else {
        setSelectedAnimation(animationWithConfig);
        setIsActiveAnimationDetailsOpen(animationToEdit.id || animation.type);
      }

      setShowDetailPanel(true);

      // Update UI state based on animation type - COMMENTED OUT TO PREVENT TAB SWITCHING
      // if (animationToEdit.type.endsWith('Effect')) {
      //   setActiveTab('effect');
      //   if (animationToEdit.type === 'zoomEffect') {
      //     setActiveSideFilter('zoom');
      //   } else if (animationToEdit.type === 'fadeEffect') {
      //     setActiveSideFilter('fade');
      //   } else if (animationToEdit.type === 'slideEffect') {
      //     setActiveSideFilter('slide');
      //   }
      // } else if (animationToEdit.type.endsWith('In')) {
      //   setActiveTab('in');
      //   const baseType = animationToEdit.type.replace('In', '').toLowerCase();
      //   setActiveSideFilter(baseType);
      // } else if (animationToEdit.type.endsWith('Out')) {
      //   setActiveTab('out');
      //   const baseType = animationToEdit.type.replace('Out', '').toLowerCase();
      //   setActiveSideFilter(baseType);
      // }
    };

    // Add effect to handle openFrameEditingPanel event
    useEffect(() => {
      if (activeTab === 'filters') {
        logAllPixiFilters();
      }

      const handleFrameEditingPanelOpen = event => {
        if (event.detail && event.detail.animation) {
          handleEditAnimation(event.detail.animation);
        }
      };

      const handleTransitionPanelClosed = () => {
        // Close detail panel when external close event is received
        setShowDetailPanel(false);
        setSelectedAnimation(null);
        setIsActiveAnimationDetailsOpen(null);
      };

      window.addEventListener(
        'openFrameEditingPanel',
        handleFrameEditingPanelOpen
      );
      window.addEventListener(
        'transitionPanelClosed',
        handleTransitionPanelClosed
      );

      return () => {
        window.removeEventListener(
          'openFrameEditingPanel',
          handleFrameEditingPanelOpen
        );
        window.removeEventListener(
          'transitionPanelClosed',
          handleTransitionPanelClosed
        );
      };
    }, [activeTab]);

    const getAnimationCurrentState = animation => {
      if (animation.type.endsWith('Effect')) {
        return effectType;
      } else if (animation.type.endsWith('In')) {
        return inEffect;
      } else if (animation.type.endsWith('Out')) {
        return outEffect;
      }
      return null;
    };

    const removeExistingAnimations = (animation, currentEffect) => {
      // First check if the animation being removed is applied to all scenes
      let storeAnimationBeingRemoved = null;

      if (selectedElement) {
        if (animation.unifiedType) {
          // For unified effects, also check effectVariant
          const animationVariant = animation.type.includes('In')
            ? 'in'
            : animation.type.includes('Out')
              ? 'out'
              : 'effect';
          storeAnimationBeingRemoved = store.animations.find(
            a =>
              a.type === animation.unifiedType &&
              a.targetId === selectedElement.id &&
              (a.effectVariant === animationVariant ||
                determineEffectVariant(a) === animationVariant)
          );
        } else {
          storeAnimationBeingRemoved = store.animations.find(
            a => a.type === animation.type && a.targetId === selectedElement.id
          );
        }
      }

      // Check if this animation is applied to all scenes
      const isAppliedToAllScenes =
        storeAnimationBeingRemoved &&
        selectedElement &&
        isAnimationAppliedToAllScenes(
          storeAnimationBeingRemoved,
          store,
          selectedElement
        );
      const isSyncEnabled =
        storeAnimationBeingRemoved?.syncToAllScenes !== false;

      if (isAppliedToAllScenes && isSyncEnabled) {
        // Remove from all scenes (including current) only if sync is enabled
        const success = removeAnimationFromAllScenes(
          storeAnimationBeingRemoved,
          store,
          selectedElement
        );
        if (success) {
        }
        return;
      } else if (isAppliedToAllScenes && !isSyncEnabled) {
        // If sync is disabled, remove only from current scene
        store.removeAnimation(storeAnimationBeingRemoved.id);

        return;
      }

      // Remove from selected element only
      const animationsToRemove = selectedElementAnimations.filter(anim => {
        // Handle unified effects
        if (
          animation.unifiedType &&
          (animation.type === 'zoomIn' ||
            animation.type === 'zoomOut' ||
            animation.type === 'fadeIn' ||
            animation.type === 'fadeOut')
        ) {
          const positionType = animation.type.endsWith('In') ? 'in' : 'out';

          if (
            animation.unifiedType === 'zoomEffect' &&
            anim.type === 'zoomEffect'
          ) {
            // Use effectVariant for comparison
            const animEffectVariant =
              anim.effectVariant || determineEffectVariant(anim);
            return animEffectVariant === positionType;
          } else if (
            animation.unifiedType === 'fadeEffect' &&
            anim.type === 'fadeEffect'
          ) {
            // Use effectVariant for comparison
            const animEffectVariant =
              anim.effectVariant || determineEffectVariant(anim);
            return animEffectVariant === positionType;
          }
          return false;
        }

        // Handle traditional animations
        if (animation.type.endsWith('Effect')) {
          return anim.type === currentEffect;
        } else {
          const baseType = getBaseAnimationType(anim.type);
          const positionType = getAnimationPositionType(animation.type);
          return (
            baseType === currentEffect &&
            anim.type.toLowerCase().includes(positionType)
          );
        }
      });

      animationsToRemove.forEach(anim => {
        store.removeAnimation(anim.id);
      });
    };

    const getAnimationPositionType = type => {
      if (type.endsWith('Effect')) return 'effect';
      if (type.endsWith('In')) return 'in';
      if (type.endsWith('Out')) return 'out';
      return '';
    };

    const updateAnimationStates = (animation, baseType) => {
      if (animation.type.endsWith('Effect')) {
        setEffectType(animation.type);
      } else if (animation.type.endsWith('In')) {
        setInEffect(baseType);
      } else if (animation.type.endsWith('Out')) {
        setOutEffect(baseType);
      }
    };

    const handleBackToMain = () => {
      setShowDetailPanel(false);
      setSelectedAnimation(null);
      setIsActiveAnimationDetailsOpen(null);
      setSelectedFilter(null);
      setCurrentFilterConfig(null);
      setIsFilterDetailPanel(false);

      // Check if we came from filters
      if (previousTabState.fromFilters) {
        // Return to filters tab
        setActiveTab('filters');
        setActiveSideFilter(previousTabState.activeSideFilter);
        // Reset the flag
        setPreviousTabState(prev => ({ ...prev, fromFilters: false }));
      } else {
        // Restore previous tab state
        setActiveTab(previousTabState.activeTab);
        setActiveSideFilter(previousTabState.activeSideFilter);
      }

      // Dispatch event that detail panel was closed
      window.dispatchEvent(new CustomEvent('transitionPanelClosed'));
    };

    // Animation preview handler - same logic as in AnimationResource
    const handleAnimationPreview = animation => {
      if (!selectedElement || !selectedElement.timeFrame) {
        console.warn('No visible image element or timeFrame for preview');
        return;
      }
      const { start, end } = selectedElement.timeFrame;
      const duration = end - start;

      // Set current time to the start of the element
      store.updateTimeTo(start);
      // Start playing
      store.setPlaying(true);

      // Stop playing after element duration
      setTimeout(() => {
        store.setPlaying(false);
        // Set time back to start
        store.updateTimeTo(start);
      }, duration);
    };

    const handleBackToAllTransitions = () => {
      setActiveTab('all');
      setSearchQuery('');
      setActiveSideFilter('zoom');
      setShowDetailPanel(false);
      setIsActiveAnimationDetailsOpen(null);
    };

    const handleTransitionNameBoxClick = () => {
      if (isTransitionNameCollapsed) {
        setIsTransitionNameCollapsed(false);
        setIsTransitionNameIndeterminate(false);
        setSelectedCheckboxes(new Set());
      } else if (isTransitionNameIndeterminate) {
        setIsTransitionNameCollapsed(true);
        setIsTransitionNameIndeterminate(false);
        const activeAnimations = getFilteredActiveAnimations();
        const allAnimationIds = activeAnimations.map(
          anim => anim.id || anim.type
        );
        setSelectedCheckboxes(new Set(allAnimationIds));
      } else {
        setIsTransitionNameCollapsed(true);
        setIsTransitionNameIndeterminate(false);
        const activeAnimations = getFilteredActiveAnimations();
        const allAnimationIds = activeAnimations.map(
          anim => anim.id || anim.type
        );
        setSelectedCheckboxes(new Set(allAnimationIds));
      }
    };

    const handleThreeDotsClick = (e, animationId) => {
      e.stopPropagation();

      // Клік працює тільки якщо мишка не над панеллю і не над кнопкою
      if (
        !isMouseOverActionPanelRef.current &&
        !isMouseOverThreeDotsRef.current
      ) {
        const rect = e.currentTarget.getBoundingClientRect();
        setPanelPosition({
          x: rect.right + 10,
          y: rect.top + rect.height / 2,
        });
        setActivePanelAnimationId(animationId);
        setShowActionPanel(!showActionPanel);
      }
    };

    const handleThreeDotsHover = (animationId, e) => {
      // Очищаємо таймер закриття при наведенні
      if (actionPanelTimeoutRef.current) {
        clearTimeout(actionPanelTimeoutRef.current);
      }

      isMouseOverThreeDotsRef.current = true;

      // Закриваємо інші панелі
      if (openActionPanelId && openActionPanelId !== animationId) {
        document.dispatchEvent(
          new CustomEvent('closeActionPanel', {
            detail: { exceptId: animationId },
          })
        );
      }

      // Розраховуємо позицію панелі
      const element = e.currentTarget;
      if (!element || !element.getBoundingClientRect) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Оцінюємо розміри панелі
      const estimatedPanelWidth = 150;
      const estimatedPanelHeight = 120;

      // Розраховуємо початкову позицію
      let panelX = rect.right + 10;
      let panelY = rect.top + rect.height / 2;

      // Перевіряємо чи панель виходить за праву межу
      if (panelX + estimatedPanelWidth > viewportWidth) {
        panelX = rect.left - estimatedPanelWidth; // Показуємо панель зліва від кнопки
      }

      // Перевіряємо чи панель виходить за нижню межу
      if (panelY + estimatedPanelHeight > viewportHeight) {
        if (rect.top - estimatedPanelHeight > 0) {
          panelY = rect.top - estimatedPanelHeight + rect.height / 2;
        } else {
          panelY = Math.max(0, viewportHeight - estimatedPanelHeight);
        }
      }

      // Перевіряємо чи панель виходить за верхню межу
      if (panelY < 0) {
        panelY = 0;
      }

      setPanelPosition({
        x: panelX,
        y: panelY,
      });
      setActivePanelAnimationId(animationId);
      setHoveredAnimationId(animationId);
      openActionPanelId = animationId;
      setShowActionPanel(true);
    };

    const handleThreeDotsLeave = () => {
      isMouseOverThreeDotsRef.current = false;

      // Запускаємо таймер закриття
      actionPanelTimeoutRef.current = setTimeout(() => {
        if (
          !isMouseOverActionPanelRef.current &&
          !isMouseOverThreeDotsRef.current
        ) {
          openActionPanelId = null;
          setShowActionPanel(false);
          setActivePanelAnimationId(null);
          setHoveredAnimationId(null);
        }
      }, 500); // Збільшуємо затримку до 500мс як у бургер меню
    };

    const handleActionPanelEnter = () => {
      // Очищаємо таймер закриття при наведенні на панель
      if (actionPanelTimeoutRef.current) {
        clearTimeout(actionPanelTimeoutRef.current);
      }

      isMouseOverActionPanelRef.current = true;
      setShowActionPanel(true);
    };

    const handleActionPanelLeave = () => {
      isMouseOverActionPanelRef.current = false;

      // Запускаємо таймер закриття
      actionPanelTimeoutRef.current = setTimeout(() => {
        if (
          !isMouseOverActionPanelRef.current &&
          !isMouseOverThreeDotsRef.current
        ) {
          openActionPanelId = null;
          setShowActionPanel(false);
          setActivePanelAnimationId(null);
          setHoveredAnimationId(null);
        }
      }, 500); // Збільшуємо затримку до 500мс як у бургер меню
    };

    const handleActionButtonClick = buttonId => {
      if (buttonId === 'edit') {
        const activeAnimations = getFilteredActiveAnimations();
        if (activeAnimations.length > 0) {
          const firstActiveAnimation = activeAnimations[0];
          handleEditAnimation(firstActiveAnimation);
        }
      } else if (buttonId === 'duplicate') {
      } else if (buttonId === 'remove') {
        if (activePanelAnimationId) {
          let animationToRemove = store.animations.find(
            anim => anim.id === activePanelAnimationId
          );

          if (!animationToRemove) {
            animationToRemove = store.animations.find(
              anim => anim.type === activePanelAnimationId
            );
          }

          if (animationToRemove) {
            store.removeAnimation(animationToRemove.id);
          } else {
            const glTransition = store.animations.find(
              a =>
                a.type === 'glTransition' &&
                (a.fromElementId === selectedElement?.id ||
                  a.toElementId === selectedElement?.id)
            );
            if (glTransition) {
              // Check if this transition is applied to all gaps and should be removed from all
              const isAppliedToAll = isAnimationAppliedToAllScenes(
                glTransition,
                store,
                selectedElement
              );

              if (isAppliedToAll) {
                // Remove from all gaps
                const success = removeAnimationFromAllScenes(
                  glTransition,
                  store,
                  selectedElement
                );
                if (success) {
                  setTransitionType(null);
                }
              } else {
                // Remove only current transition
                store.removeGLTransition(glTransition.id);
                setTransitionType(null);
              }
            }
          }
        } else {
        }
      }

      setShowActionPanel(false);
      setActivePanelAnimationId(null);
    };

    useEffect(() => {
      const handleClickOutside = event => {
        if (
          showActionPanel &&
          panelRef.current &&
          !panelRef.current.contains(event.target)
        ) {
          setShowActionPanel(false);
          setActivePanelAnimationId(null);
        }
      };

      const handleCloseActionPanel = event => {
        const { exceptId } = event.detail;
        if (activePanelAnimationId && activePanelAnimationId !== exceptId) {
          setShowActionPanel(false);
          setActivePanelAnimationId(null);
          setHoveredAnimationId(null);
        }
      };

      if (showActionPanel) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      document.addEventListener('closeActionPanel', handleCloseActionPanel);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener(
          'closeActionPanel',
          handleCloseActionPanel
        );
      };
    }, [showActionPanel, activePanelAnimationId]);

    const getScenesForAnimation = animationType => {
      const scenes = new Set();

      store.animations.forEach(anim => {
        if (anim.type === animationType) {
          const element = store.editorElements.find(
            el => el.id === anim.targetId
          );
          if (element) {
            scenes.add(element.row + 1);
          }
        }
      });

      const sortedScenes = Array.from(scenes).sort((a, b) => a - b);

      if (sortedScenes.length === 0) {
        const currentScene = (store.selectedElement?.row || 0) + 1;
        return `Scene ${currentScene}`;
      }

      if (sortedScenes.length === 1) {
        return `Scene ${sortedScenes[0]}`;
      }

      const sceneNumbers = sortedScenes.join(', ');
      return `Scene ${sceneNumbers}`;
    };

    const getGroupedActiveAnimations = () => {
      const groupedAnimations = new Map();

      selectedElementAnimations.forEach(anim => {
        const matchedConfig = animationsConfig.find(
          config => config.type === anim.type
        );
        if (matchedConfig) {
          if (!groupedAnimations.has(anim.type)) {
            groupedAnimations.set(anim.type, {
              ...matchedConfig,
              isActive: true,
              scene: getScenesForAnimation(anim.type),
              startTime: store.selectedElement?.timeFrame?.start || 0,
              endTime: store.selectedElement?.timeFrame?.end || 0,
              selectedElement: store.selectedElement,
            });
          }
        }
      });

      const glTransitions = store.animations.filter(
        anim =>
          anim.type === 'glTransition' &&
          (anim.fromElementId === selectedElement?.id ||
            anim.toElementId === selectedElement?.id)
      );

      glTransitions.forEach(glAnim => {
        const glTransition = availableTransitions.find(
          t => t.name === glAnim.transitionType
        );
        if (glTransition) {
          groupedAnimations.set(`glTransition-${glAnim.id}`, {
            type: glAnim.transitionType,
            name: glTransition.displayName,
            category: 'GL Transition',
            icon: 'TransitionsIcon',
            isGLTransition: true,
            isActive: true,
            scene: getScenesForAnimation('glTransition'),
            selectedElement: store.selectedElement,
            glAnimationId: glAnim.id,
          });
        }
      });

      if (transitionType) {
        const glTransition = availableTransitions.find(
          t => t.name === transitionType
        );
        // Check if this transition type is not already added from existing glTransitions
        const existingGLTransition = Array.from(
          groupedAnimations.values()
        ).find(anim => anim.isGLTransition && anim.type === transitionType);

        if (glTransition && !existingGLTransition) {
          groupedAnimations.set('glTransition', {
            type: transitionType,
            name: glTransition.displayName,
            category: 'GL Transition',
            icon: 'TransitionsIcon',
            isGLTransition: true,
            isActive: true,
            scene: getScenesForAnimation('glTransition'),
            selectedElement: store.selectedElement,
          });
        }
      }

      return Array.from(groupedAnimations.values());
    };

    const getFilteredActiveAnimations = () => {
      const activeAnimations = getGroupedActiveAnimations();

      let filteredAnimations = activeAnimations;

      if (activeFilter === 'in') {
        filteredAnimations = activeAnimations.filter(
          anim => anim.type && anim.type.endsWith('In')
        );
      } else if (activeFilter === 'out') {
        filteredAnimations = activeAnimations.filter(
          anim => anim.type && anim.type.endsWith('Out')
        );
      } else if (activeFilter === 'effect') {
        filteredAnimations = activeAnimations.filter(
          anim => anim.type && anim.type.endsWith('Effect')
        );
      } else if (activeFilter === 'two-way') {
        filteredAnimations = activeAnimations.filter(
          anim => anim.isGLTransition
        );
      }

      if (!searchQuery.trim()) {
        return filteredAnimations;
      }

      const query = searchQuery.toLowerCase().trim();

      return filteredAnimations.filter(animation => {
        if (animation.name && animation.name.toLowerCase().includes(query)) {
          return true;
        }

        if (animation.scene && animation.scene.toLowerCase().includes(query)) {
          return true;
        }

        if (
          animation.category &&
          animation.category.toLowerCase().includes(query)
        ) {
          return true;
        }

        if (animation.type && animation.type.toLowerCase().includes(query)) {
          return true;
        }

        return false;
      });
    };

    // Auto-close detail panel when no active animations
    useEffect(() => {
      // Only run auto-close logic if panel has been open for a while
      if (!showDetailPanel) return;

      const timer = setTimeout(() => {
        // Double-check that panel is still open and we have meaningful state
        if (!showDetailPanel || !selectedElement) {
          return;
        }

        // Only close if selected animation no longer exists in store
        if (selectedAnimation) {
          const animationExists = store.animations.find(
            anim => anim.id === selectedAnimation.id
          );

          if (!animationExists) {
            setShowDetailPanel(false);
            setSelectedAnimation(null);
            setIsActiveAnimationDetailsOpen(null);
          }
        }
      }, 500); // Longer delay to ensure stability

      return () => clearTimeout(timer);
    }, [selectedAnimation?.id, store.animations.length]); // More specific dependencies

    // Separate effect to handle element deletion (immediate close)
    useEffect(() => {
      if (showDetailPanel && !selectedElement) {
        setShowDetailPanel(false);
        setSelectedAnimation(null);
        setIsActiveAnimationDetailsOpen(null);
      }
    }, [selectedElement]); // Only depends on selectedElement

    // Removed handleSceneSelectionChange - working with visible canvas images now

    const getCurrentAnimation = () => {
      // Handle filter selection
      if (selectedFilter && isFilterDetailPanel) {
        return selectedFilter;
      }

      if (!selectedAnimation) return null;

      // Get animations for the target element (either from selectedAnimation.targetElement or selectedElement)
      const targetElementForAnimations =
        selectedAnimation.targetElement || selectedElement;
      const targetElementAnimations = targetElementForAnimations
        ? store.animations.filter(animation => {
            const targetIds =
              animation.targetIds ||
              (animation.targetId ? [animation.targetId] : []);
            return (
              targetIds.includes(targetElementForAnimations.id) &&
              animation?.type !== 'glTransition'
            );
          })
        : [];

      if (selectedAnimation.isActive) {
        if (selectedAnimation.id) {
          return store.animations.find(
            anim => anim.id === selectedAnimation.id
          );
        }
        if (selectedAnimation.isGLTransition) {
          // Find the actual GL transition in store
          const glTransition = store.animations.find(
            a =>
              a.type === 'glTransition' &&
              (a.fromElementId === selectedElement?.id ||
                a.toElementId === selectedElement?.id)
          );

          if (glTransition) {
            return glTransition;
          }

          // Fallback if not found in store
          return {
            id: selectedAnimation.actualAnimation?.id || 'gl-transition',
            type: 'glTransition',
            transitionType: selectedAnimation.type,
            duration: selectedAnimation.actualAnimation?.duration || 1000,
            startTime: selectedAnimation.actualAnimation?.startTime || 0,
            endTime: selectedAnimation.actualAnimation?.endTime || 1000,
            fromElementId: selectedAnimation.actualAnimation?.fromElementId,
            toElementId: selectedAnimation.actualAnimation?.toElementId,
            properties: selectedAnimation.actualAnimation?.properties || {},
          };
        }
      }

      // If we have the animation ID, find it directly
      if (selectedAnimation.id) {
        const foundById = targetElementAnimations.find(
          anim => anim.id === selectedAnimation.id
        );

        if (foundById) {
          return foundById;
        }
      }

      // For unified effects, we need to find by unifiedType and effectVariant
      if (selectedAnimation.unifiedType) {
        // Use displayType if available, otherwise fall back to type
        const typeToCheck =
          selectedAnimation.displayType || selectedAnimation.type;
        const animationVariant = typeToCheck.includes('In')
          ? 'in'
          : typeToCheck.includes('Out')
            ? 'out'
            : 'effect';

        const foundAnimation = targetElementAnimations.find(anim => {
          const matches =
            anim.type === selectedAnimation.unifiedType &&
            (anim.effectVariant === animationVariant ||
              determineEffectVariant(anim) === animationVariant);

          return matches;
        });

        return foundAnimation;
      }

      // For traditional animations
      const traditionalResult = targetElementAnimations.find(anim => {
        if (selectedAnimation.type.endsWith('Effect')) {
          return anim.type === selectedAnimation.type;
        } else if (selectedAnimation.type.endsWith('In')) {
          return anim.type === selectedAnimation.type;
        } else if (selectedAnimation.type.endsWith('Out')) {
          return anim.type === selectedAnimation.type;
        }
        return false;
      });

      return traditionalResult;
    };

    const scrollToCategory = useCallback(
      category => {
        if (!contentRef.current) return;

        // Find the category element by ID
        const categoryElement = contentRef.current.querySelector(
          `#category-${category}`
        );

        if (categoryElement) {
          // Find the scrollable container
          let scrollableContainer = contentRef.current;

          // If we're in preview mode, we need to find the correct scrollable parent
          if (isPreview) {
            const animationsGrid = contentRef.current.querySelector(
              `.${styles.animationsGrid}`
            );
            if (animationsGrid) {
              scrollableContainer = animationsGrid;
            }
          }

          // Use scrollIntoView to scroll to the category
          categoryElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });

          // If we're in preview mode and the scroll didn't work as expected,
          // try to manually scroll the container
          if (
            isPreview &&
            scrollableContainer &&
            scrollableContainer !== contentRef.current
          ) {
            const elementRect = categoryElement.getBoundingClientRect();
            const containerRect = scrollableContainer.getBoundingClientRect();

            if (
              elementRect.top < containerRect.top ||
              elementRect.bottom > containerRect.bottom
            ) {
              const scrollTop =
                scrollableContainer.scrollTop +
                (elementRect.top - containerRect.top) -
                20; // Add some padding from top
              scrollableContainer.scrollTo({
                top: scrollTop,
                behavior: 'smooth',
              });
            }
          }
        }
      },
      [isPreview, styles.animationsGrid]
    );

    // Get filtered transition tabs based on preview mode
    const getFilteredTransitionTabs = () => {
      if (isPreview) {
        return transitionTabs.filter(tab => tab.id !== 'active');
      }
      return transitionTabs;
    };

    // For active tab, keep the original behavior (DetailPanel replaces main panel)
    if (
      showDetailPanel &&
      (selectedAnimation || (selectedFilter && isFilterDetailPanel)) &&
      activeTab === 'active'
    ) {
      const currentAnimation = getCurrentAnimation();

      if (!currentAnimation) {
        setShowDetailPanel(false);
        setSelectedAnimation(null);
        setSelectedFilter(null);
        setIsFilterDetailPanel(false);
        return null;
      }

      return (
        <div
          className={`${styles.transitionPanel} ${
            isPreview ? styles.preview : ''
          }`}
          data-testid="transition-panel"
          data-panel-mode={panelMode}
        >
          <DetailPanel
            selectedAnimation={selectedAnimation}
            currentAnimation={currentAnimation}
            selectedFilter={selectedFilter}
            currentFilter={currentFilterConfig}
            activeCanvasImage={activeCanvasImage}
            onBackToMain={handleBackToMain}
            isFilterPanel={isFilterDetailPanel}
          />
        </div>
      );
    }

    return (
      <>
        <div className={styles.transitionPanelContainer}>
          <div
            className={`${styles.transitionPanel} ${
              isPreview ? styles.preview : ''
            } ${
              showDetailPanel && activeTab !== 'active'
                ? styles.hiddenForDetail
                : ''
            }`}
            data-testid="transition-panel"
            data-active-tab={activeTab}
            data-panel-mode={panelMode}
          >
            <div className={styles.header}>
              {activeTab === 'active' ? (
                <>
                  <button
                    className={styles.backButton}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleBackToAllTransitions();
                    }}
                    title="Back to all transitions"
                    aria-label="Back to all transitions"
                  >
                    <ArrowLeftIcon size="12" color="#FFF" />
                  </button>
                  <span className={styles.headerText}>Active Transitions</span>
                </>
              ) : (
                <div className={styles.headerToggle}>
                  <ButtonWithIcon
                    className={`${styles.toggleButton} ${
                      panelMode === 'effects' && activeTab !== 'filters'
                        ? styles.toggleActive
                        : ''
                    }`}
                    onClick={() => {
                      setPanelMode('effects');
                      // When switching to effects mode, set activeTab to 'all' if currently on filters
                      if (activeTab === 'filters') {
                        setActiveTab('all');
                      }
                      // Clear search input when switching modes
                      setSearchQuery('');
                    }}
                    text="Effects"
                    icon="TransitionsIcon"
                    size="16"
                    color={
                      panelMode === 'effects' && activeTab !== 'filters'
                        ? 'var(--accent-color)'
                        : '#6A6D74'
                    }
                    accentColor={
                      panelMode === 'effects' && activeTab !== 'filters'
                        ? 'var(--accent-color)'
                        : 'rgba(255, 255, 255, 0.8)'
                    }
                    marginLeft="0"
                  />
                  <ButtonWithIcon
                    className={`${styles.toggleButton} ${
                      panelMode === 'transitions' && activeTab !== 'filters'
                        ? styles.toggleActive
                        : ''
                    }`}
                    onClick={() => {
                      setPanelMode('transitions');
                      // When switching to transitions mode, set activeTab to 'all' if currently on filters
                      if (activeTab === 'filters') {
                        setActiveTab('all');
                      }
                      // Clear search input when switching modes
                      setSearchQuery('');
                    }}
                    text="Transitions"
                    icon="EffectsIcon"
                    size="16"
                    color={
                      panelMode === 'transitions' && activeTab !== 'filters'
                        ? 'var(--accent-color)'
                        : '#6A6D74'
                    }
                    accentColor={
                      panelMode === 'transitions' && activeTab !== 'filters'
                        ? 'var(--accent-color)'
                        : 'rgba(255, 255, 255, 0.8)'
                    }
                    marginLeft="0"
                  />
                  <ButtonWithIcon
                    className={`${styles.toggleButton} ${
                      activeTab === 'filters' ? styles.toggleActive : ''
                    }`}
                    onClick={() => {
                      setActiveTab('filters');
                      // When switching to filters, we work independently of panel mode
                      // Clear search input when switching modes
                      setSearchQuery('');
                    }}
                    text="Filters"
                    icon="FadeIcon"
                    size="16"
                    color={
                      activeTab === 'filters'
                        ? 'var(--accent-color)'
                        : '#6A6D74'
                    }
                    accentColor={
                      activeTab === 'filters'
                        ? 'var(--accent-color)'
                        : 'rgba(255, 255, 255, 0.8)'
                    }
                    marginLeft="0"
                  />
                </div>
              )}
              <button
                className={styles.closeButton}
                onClick={onClose}
                title="Close panel"
                aria-label="Close panel"
              >
                <CloseIcon size="8" color="#42454f" />
              </button>
            </div>
            <div className={styles.contentWraper}>
              {/* <div className={styles.leftSideTabs}>
              {activeTab !== 'active' && (
                <div className={styles.sideFilters}>
                  {sideFilters.map(filter => (
                    <button
                      key={filter.id}
                      className={`${styles.sideFilter} ${
                        activeSideFilter === filter.id
                          ? styles.sideFilterActive
                          : ''
                      }`}
                      onClick={() => {
                        setActiveSideFilter(filter.id);
                        scrollToCategory(filter.id);
                      }}
                      title={filter.name}
                    >
                      <div className={styles.sideFilterName}>{filter.name}</div>
                    </button>
                  ))}
                  <button className={styles.sideFilter} title="Add">
                    <ButtonWithIcon icon="PlusIcon" size="14px" color="#6A6F76" />
                  </button>
                  <button className={styles.sideFilter} title="More">
                    <ButtonWithIcon
                      icon="ThreeDotsIcon"
                      size="14"
                      color="#6A6F76"
                    />
                  </button>
                </div>
              )}
            </div> */}
              <div
                className={`${styles.mainContent} ${
                  isPreview ? styles.preview : ''
                }`}
              >
                <div className={styles.searchContainer}>
                  <ButtonWithIcon
                    icon="SearchIcon"
                    size="11"
                    color="#FFFFFF66"
                    classNameButton={styles.searchIcon}
                  />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'active'
                        ? 'Search transitions...'
                        : 'Search transitions...'
                    }
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.mainContentHeader}>
                  {activeTab !== 'active' && activeTab !== 'filters' && (
                    <div className={styles.tabsWrapper} ref={tabsWrapperRef}>
                      {panelMode === 'effects' && (
                        <div className={styles.tabs}>
                          {getFilteredTransitionTabs()
                            .filter(
                              tab => tab.id !== 'active' && tab.id !== 'filters'
                            )
                            .map(tab => (
                              <button
                                key={tab.id}
                                className={`${styles.tab} ${
                                  activeTab === tab.id ? styles.tabActive : ''
                                }`}
                                onClick={() => {
                                  setActiveTab(tab.id);
                                  if (tab.id !== 'active') {
                                    setActiveFilter('all');
                                  }
                                }}
                              >
                                {tab.name}
                              </button>
                            ))}
                        </div>
                      )}

                      {activeTab !== 'filters' && (
                        <div className={styles.applyToAllContainer}>
                          <button
                            className={`${styles.applyToAllButton} ${
                              !selectedElement ||
                              (selectedElement.type !== 'imageUrl' &&
                                selectedElement.type !== 'video')
                                ? styles.applyToAllButtonDisabled
                                : ''
                            }`}
                            onClick={handleApplyToAll}
                            disabled={
                              !selectedElement ||
                              (selectedElement.type !== 'imageUrl' &&
                                selectedElement.type !== 'video')
                            }
                            title="Make all visual elements have the same animations as the selected element (including none)"
                          >
                            Apply to All
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category filters for transitions mode - separate row */}
                  {panelMode === 'transitions' && activeTab !== 'active' && (
                    <div className={styles.tabsWrapper}>
                      <div className={styles.tabs}>
                        {[
                          { id: 'clear', name: 'Clear' },
                          { id: 'zoom', name: 'Zoom' },
                          { id: 'directional', name: 'Directional' },
                          { id: 'blur', name: 'Blur' },
                          { id: 'glitch', name: 'Glitch' },
                          { id: 'geometric', name: 'Geometric' },
                          { id: 'pattern', name: 'Pattern' },
                        ].map(category => (
                          <button
                            key={category.id}
                            className={`${styles.tab} ${
                              activeVisibleCategory === category.id
                                ? styles.tabActive
                                : ''
                            }`}
                            onClick={() => {
                              scrollToCategory(category.id);
                              setActiveVisibleCategory(category.id);
                            }}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'active' && (
                    <div className={styles.quickFilterButtons}>
                      {[
                        { id: 'all', name: 'All' },
                        { id: 'in', name: 'In' },
                        { id: 'out', name: 'Out' },
                        { id: 'effect', name: 'Effect' },
                        { id: 'two-way', name: 'Two-way' },
                      ].map(button => (
                        <button
                          key={button.id}
                          className={`${styles.quickFilterButton} ${
                            activeFilter === button.id
                              ? styles.quickFilterButtonActive
                              : ''
                          }`}
                          onClick={() => {
                            setActiveFilter(button.id);
                            setSearchQuery('');
                          }}
                        >
                          <span>{button.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'active' && (
                    <div className={styles.transitionNameContainer}>
                      <div className={styles.transitionNameContent}>
                        <div
                          className={styles.transitionNameBox}
                          onClick={handleTransitionNameBoxClick}
                        >
                          {isTransitionNameCollapsed ? (
                            <CheckIcon
                              size="8"
                              color="rgba(255, 255, 255, 0.9)"
                            />
                          ) : (
                            ''
                          )}
                        </div>
                        <span className={styles.transitionNameText}>
                          Transition Name
                        </span>
                      </div>
                      <div className={styles.transitionTimeContent}>
                        {['Start', 'End'].map((text, index) => (
                          <>
                            <span
                              key={`text-${text}`}
                              className={styles.transitionTimeText}
                            >
                              {text}
                            </span>
                            {index === 0 && (
                              <ClockIcon
                                key="clock"
                                size="13"
                                color="rgba(255, 255, 255, 0.6"
                              />
                            )}
                          </>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {isPreview ? (
                  <AnimationGridPreview
                    animationList={getFilteredAnimations()}
                    activeAnimation={activeAnimation}
                  />
                ) : (
                  <div className={styles.content}>
                    <div
                      ref={contentRef}
                      className={`${styles.animationsGrid} ${
                        activeTab === 'active'
                          ? styles.activeTransitionsList
                          : ''
                      } ${hasTopShadow ? styles.hasTopShadow : ''} ${
                        hasBottomShadow ? styles.hasBottomShadow : ''
                      } ${isPreview ? styles.preview : ''}`}
                      data-panel-mode={panelMode}
                      data-active-tab={activeTab}
                    >
                      {(() => {
                        const animationsOrGroups =
                          activeTab === 'active'
                            ? getFilteredActiveAnimations()
                            : getFilteredAnimations();

                        // Check if we have grouped data (transitions mode) and no search
                        const isGroupedData =
                          animationsOrGroups.length > 0 &&
                          animationsOrGroups[0].isHeader &&
                          !searchQuery;

                        if (isGroupedData) {
                          // Render grouped transitions
                          return animationsOrGroups.map(group => (
                            <div
                              key={group.name}
                              className={styles.transitionGroup}
                              id={`category-${group.name.toLowerCase()}`}
                            >
                              <div className={styles.categoryHeader}>
                                <h3 className={styles.categoryTitle}>
                                  {group.name}
                                </h3>
                              </div>
                              <div className={styles.categoryTransitions}>
                                {group.transitions.map(animation => {
                                  // In transitions mode, use GL Transition Card for all transitions except 'none'
                                  const CardComponent = animation.type !== 'none' 
                                    ? DraggableGLTransitionCard 
                                    : DraggableAnimationCard;
                                  
                                  return (
                                    <CardComponent
                                      key={animation.id || animation.type}
                                      animation={animation}
                                      className={`${styles.animationCard} ${
                                        animation.isActive
                                          ? styles.animationCardActiveTransition
                                          : ''
                                      } ${
                                        hoveredAnimationId ===
                                          (animation.id || animation.type) &&
                                        showActionPanel
                                          ? styles.hoverActive
                                          : ''
                                      }`}
                                      onClick={() =>
                                        handleAnimationClick(animation)
                                      }
                                      data-animation-type={animation.type}
                                    >
                                    {/* Animation card content same as below */}
                                    <>
                                      <div
                                        className={`${
                                          styles.animationPreview
                                        } ${
                                          animation.type === 'none'
                                            ? styles.noneAnimation
                                            : ''
                                        } ${isPreview ? styles.preview : ''}`}
                                      >
                                        {animation.image && (
                                          <img
                                            src={animation.image}
                                            alt={animation.name}
                                            className={`${
                                              styles.previewImage
                                            } ${
                                              isPreview ? styles.preview : ''
                                            }`}
                                          />
                                        )}
                                        {/* Animation count badge */}
                                        {(() => {
                                          const count =
                                            getAnimationCount(animation);
                                          return count > 0 ? (
                                            <div
                                              className={styles.animationBadge}
                                            >
                                              {count}
                                            </div>
                                          ) : null;
                                        })()}
                                        {isAnimationActive(animation) &&
                                          animation.type !== 'none' && (
                                            <div
                                              className={styles.actionButtons}
                                            >
                                              <div
                                                className={styles.editButton}
                                              >
                                                <ButtonWithIcon
                                                  icon="EditSceneIcon"
                                                  size="9"
                                                  color="#DFDFDF"
                                                  accentColor="#DFDFDF"
                                                  onClick={e => {
                                                    e.stopPropagation();

                                                    // For GL transitions, use the event-based approach
                                                    if (
                                                      animation.isGLTransition
                                                    ) {
                                                      const animationToEdit =
                                                        store.animations.find(
                                                          a =>
                                                            a.type ===
                                                              'glTransition' &&
                                                            a.transitionType ===
                                                              animation.type &&
                                                            (a.fromElementId ===
                                                              selectedElement?.id ||
                                                              a.toElementId ===
                                                                selectedElement?.id)
                                                        );

                                                      if (animationToEdit) {
                                                        const fromElement =
                                                          store.editorElements.find(
                                                            el =>
                                                              el.id ===
                                                                animationToEdit.fromElementId &&
                                                              el.type !==
                                                                'animation'
                                                          );
                                                        const toElement =
                                                          store.editorElements.find(
                                                            el =>
                                                              el.id ===
                                                                animationToEdit.toElementId &&
                                                              el.type !==
                                                                'animation'
                                                          );

                                                        if (
                                                          fromElement &&
                                                          toElement
                                                        ) {
                                                          window.dispatchEvent(
                                                            new CustomEvent(
                                                              'openGLTransitionDetail',
                                                              {
                                                                detail: {
                                                                  animation:
                                                                    animationToEdit,
                                                                  fromElement,
                                                                  toElement,
                                                                },
                                                              }
                                                            )
                                                          );
                                                        }
                                                      }
                                                    } else {
                                                      // For regular animations, use event-based approach
                                                      const animationToEdit =
                                                        store.animations.find(
                                                          a =>
                                                            a.type ===
                                                              animation.type &&
                                                            a.targetId ===
                                                              selectedElement?.id
                                                        );

                                                      if (
                                                        animationToEdit &&
                                                        selectedElement
                                                      ) {
                                                        window.dispatchEvent(
                                                          new CustomEvent(
                                                            'openTransitionPanelWithEffect',
                                                            {
                                                              detail: {
                                                                animation:
                                                                  animationToEdit,
                                                                element:
                                                                  selectedElement,
                                                              },
                                                            }
                                                          )
                                                        );
                                                      }
                                                    }
                                                  }}
                                                  classNameButton={
                                                    styles.editButtonIcon
                                                  }
                                                />
                                              </div>
                                            </div>
                                          )}
                                      </div>

                                      <div className={styles.animationInfo}>
                                        <span className={styles.animationName}>
                                          {animation.name}
                                        </span>
                                      </div>
                                    </>
                                  </CardComponent>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        }

                        // Regular flat list for effects mode and active tab
                        const animations = animationsOrGroups;
                        return animations.length > 0 ? (
                          animations.map(animation => {
                            // Use GL Transition Card for GL transitions in transitions mode, regular card for effects mode
                            const CardComponent = (panelMode === 'transitions' && animation.type !== 'none')
                              ? DraggableGLTransitionCard 
                              : DraggableAnimationCard;
                            
                            return (
                              <CardComponent
                                key={animation.id || animation.type}
                                animation={animation}
                                className={`${styles.animationCard} ${
                                  animation.isActive
                                    ? styles.animationCardActiveTransition
                                    : ''
                                } ${
                                  hoveredAnimationId ===
                                    (animation.id || animation.type) &&
                                  showActionPanel
                                    ? styles.hoverActive
                                    : ''
                                }`}
                                onClick={e => {
                                  if (activeTab === 'filters') {
                                    if (animation.type === 'none') {
                                      handleNoneClick();
                                    } else {
                                      handleFilterClick(animation, e);
                                    }
                                  } else {
                                    handleAnimationClick(animation);
                                  }
                                }}
                                data-animation-type={animation.type}
                              >
                              {activeTab === 'active' ? (
                                <ActiveAnimationItem
                                  animation={animation}
                                  onEditAnimation={handleEditAnimation}
                                  // Removed scene selection props
                                  selectedAnimation={selectedAnimation}
                                  setSelectedAnimation={setSelectedAnimation}
                                  setIsActiveAnimationDetailsOpen={
                                    setIsActiveAnimationDetailsOpen
                                  }
                                  isActiveAnimationDetailsOpen={
                                    isActiveAnimationDetailsOpen
                                  }
                                  onCheckboxChange={newSelectedCheckboxes => {
                                    setSelectedCheckboxes(
                                      newSelectedCheckboxes
                                    );

                                    const activeAnimations =
                                      getFilteredActiveAnimations();
                                    const allAnimationIds =
                                      activeAnimations.map(
                                        anim => anim.id || anim.type
                                      );

                                    if (newSelectedCheckboxes.size === 0) {
                                      setIsTransitionNameCollapsed(false);
                                      setIsTransitionNameIndeterminate(false);
                                    } else if (
                                      newSelectedCheckboxes.size ===
                                      allAnimationIds.length
                                    ) {
                                      setIsTransitionNameCollapsed(true);
                                      setIsTransitionNameIndeterminate(false);
                                    } else {
                                      setIsTransitionNameCollapsed(false);
                                      setIsTransitionNameIndeterminate(true);
                                    }
                                  }}
                                  selectedCheckboxes={selectedCheckboxes}
                                  onTransitionNameStateChange={(
                                    collapsed,
                                    indeterminate
                                  ) => {
                                    setIsTransitionNameCollapsed(collapsed);
                                    setIsTransitionNameIndeterminate(
                                      indeterminate
                                    );
                                  }}
                                />
                              ) : (
                                <>
                                  <div
                                    className={`${styles.animationPreview} ${
                                      animation.type === 'none'
                                        ? styles.noneAnimation
                                        : ''
                                    } ${isPreview ? styles.preview : ''}`}
                                  >
                                    {animation.image && (
                                      <img
                                        src={animation.image}
                                        alt={animation.name}
                                        className={`${styles.previewImage} ${
                                          isPreview ? styles.preview : ''
                                        }`}
                                      />
                                    )}
                                    {/* Animation count badge */}
                                    {(() => {
                                      const count =
                                        getAnimationCount(animation);
                                      return count > 0 ? (
                                        <div className={styles.animationBadge}>
                                          {count}
                                        </div>
                                      ) : null;
                                    })()}

                                    {/* Action buttons for active animations and applied filters */}
                                    {((isAnimationActive(animation) &&
                                      activeTab !== 'filters') ||
                                      (activeTab === 'filters' &&
                                        isAnimationActive(animation))) &&
                                      animation.type !== 'none' && (
                                        <div className={styles.actionButtons}>
                                          {/* Play button */}
                                          {/* <div className={styles.playButton}>
                                            <ButtonWithIcon
                                              icon="PlayIcon"
                                              size="12"
                                              color="#3AFCEA"
                                              accentColor="#3AFCEA"
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleAnimationPreview(
                                                  animation
                                                );
                                              }}
                                              classNameButton={
                                                styles.playButtonIcon
                                              }
                                            />
                                          </div> */}
                                          {/* Edit button */}
                                          <div className={styles.editButton}>
                                            <ButtonWithIcon
                                              icon="EditSceneIcon"
                                              size="9"
                                              color="#DFDFDF"
                                              accentColor="#DFDFDF"
                                              onClick={e => {
                                                e.stopPropagation();

                                                // Handle filter edit click
                                                if (activeTab === 'filters') {
                                                  handleFilterEditClick(
                                                    animation,
                                                    e
                                                  );
                                                  return;
                                                }

                                                // Use the same event-based approach as the first edit button

                                                if (animation.isGLTransition) {
                                                  const animationToEdit =
                                                    store.animations.find(
                                                      a =>
                                                        a.type ===
                                                          'glTransition' &&
                                                        a.transitionType ===
                                                          animation.type &&
                                                        (a.fromElementId ===
                                                          selectedElement?.id ||
                                                          a.toElementId ===
                                                            selectedElement?.id)
                                                    );

                                                  if (animationToEdit) {
                                                    const fromElement =
                                                      store.editorElements.find(
                                                        el =>
                                                          el.id ===
                                                            animationToEdit.fromElementId &&
                                                          el.type !==
                                                            'animation'
                                                      );
                                                    const toElement =
                                                      store.editorElements.find(
                                                        el =>
                                                          el.id ===
                                                            animationToEdit.toElementId &&
                                                          el.type !==
                                                            'animation'
                                                      );

                                                    if (
                                                      fromElement &&
                                                      toElement
                                                    ) {
                                                      window.dispatchEvent(
                                                        new CustomEvent(
                                                          'openGLTransitionDetail',
                                                          {
                                                            detail: {
                                                              animation:
                                                                animationToEdit,
                                                              fromElement,
                                                              toElement,
                                                            },
                                                          }
                                                        )
                                                      );
                                                    }
                                                  }
                                                } else {
                                                  // For regular animations, use event-based approach
                                                  let animationToEdit = null;

                                                  if (animation.unifiedType) {
                                                    // For unified effects (zoomIn -> zoomEffect)
                                                    const animationVariant =
                                                      animation.type.includes(
                                                        'In'
                                                      )
                                                        ? 'in'
                                                        : animation.type.includes(
                                                              'Out'
                                                            )
                                                          ? 'out'
                                                          : 'effect';

                                                    animationToEdit =
                                                      store.animations.find(
                                                        a =>
                                                          a.type ===
                                                            animation.unifiedType &&
                                                          a.targetId ===
                                                            selectedElement?.id &&
                                                          (a.effectVariant ===
                                                            animationVariant ||
                                                            determineEffectVariant(
                                                              a
                                                            ) ===
                                                              animationVariant)
                                                      );
                                                  } else {
                                                    // For traditional animations
                                                    animationToEdit =
                                                      store.animations.find(
                                                        a =>
                                                          a.type ===
                                                            animation.type &&
                                                          a.targetId ===
                                                            selectedElement?.id
                                                      );
                                                  }

                                                  if (
                                                    animationToEdit &&
                                                    selectedElement
                                                  ) {
                                                    window.dispatchEvent(
                                                      new CustomEvent(
                                                        'openTransitionPanelWithEffect',
                                                        {
                                                          detail: {
                                                            animation:
                                                              animationToEdit,
                                                            element:
                                                              selectedElement,
                                                          },
                                                        }
                                                      )
                                                    );
                                                  }
                                                }
                                              }}
                                              classNameButton={
                                                styles.editButtonIcon
                                              }
                                            />
                                          </div>
                                          {/* Apply to all switch */}
                                        </div>
                                      )}
                                    {/* Active indicator (checkmark) */}
                                    {/* {isAnimationActive(animation) && (
                                      <div className={styles.activeIndicator}>
                                        <ButtonWithIcon
                                          icon="CheckedIcon"
                                          size="12"
                                          color="var(--accent-color)"
                                        />
                                      </div>
                                    )} */}
                                  </div>

                                  <div className={styles.animationInfo}>
                                    <span className={styles.animationName}>
                                      {animation.name}
                                    </span>
                                  </div>
                                </>
                              )}
                            </CardComponent>
                            );
                          })
                        ) : (
                          <div className={styles.emptyState}>
                            <span className={styles.emptyStateText}>
                              {activeTab === 'active'
                                ? (() => {
                                    const filterNames = {
                                      all: 'All',
                                      in: 'In',
                                      out: 'Out',
                                      'two-way': 'Motion',
                                      effect: 'Type',
                                    };
                                    return `No active transitions found for "${
                                      filterNames[activeFilter] || activeFilter
                                    }" filter`;
                                  })()
                                : 'No transitions found'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DetailPanel for non-active tabs - shows side by side */}
          {(() => {
            if (
              showDetailPanel &&
              (selectedAnimation || (selectedFilter && isFilterDetailPanel)) &&
              activeTab !== 'active'
            ) {
              const currentAnimation = getCurrentAnimation();

              if (!currentAnimation) {
                setShowDetailPanel(false);
                setSelectedAnimation(null);
                setSelectedFilter(null);
                setIsFilterDetailPanel(false);
                return null;
              }

              return (
                <div className={styles.detailPanelSidebar}>
                  <DetailPanel
                    selectedAnimation={selectedAnimation}
                    currentAnimation={currentAnimation}
                    selectedFilter={selectedFilter}
                    currentFilter={currentFilterConfig}
                    activeCanvasImage={activeCanvasImage}
                    onBackToMain={handleBackToMain}
                    isFilterPanel={isFilterDetailPanel}
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      </>
    );
  }
);

export { TransitionPanel };
