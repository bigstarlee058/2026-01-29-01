import styles from './GeneratedImagesSection.module.scss';
import { GeneratedImagesItem } from 'components/GenerateWithAI/GeneratedImagesItem/GeneratedImagesItem';
import {
  useState,
  useEffect,
  Fragment,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAddImageMutation } from '../../../redux/stories/storyApi';
import { regenerateImage } from 'utils/ai/leonardoApi';
import { useSceneManager } from 'hooks/story/useSceneManager';
import { useDispatch, useSelector } from 'react-redux';
import { useContext } from 'react';
import { StoreContext } from '../../../mobx';
import { AiStarsIcon } from 'components/Icons';
import { updateSelectedImage } from '../../../redux/scene/sceneSlice';
import { selectCurrentStory } from '../../../redux/stories/storiesSlice';
import { saveTimelineState } from '../../../redux/timeline/timelineSlice';
import { NewGalleryVirtuoso } from 'features/GallerySectionRedesign/components/NewGallery/NewGalleryVirtuoso';

// Custom hook to provide unified gallery data (images + videos) to NewGalleryVirtuoso
const useUnifiedGalleryData = (
  pointImages,
  getImagesByOwner,
  localPending,
  pendingId,
  activeImage,
  regenerationStartTime,
  onRateImg, // Add onRateImg parameter
  onImageDeleted, // Add onImageDeleted parameter
  // Video data
  activeGalleryTab = 'All',
  storyData,
  activeScene,
  showVideoSkeletons = false,
  onVideoSelect,
  // Generation quantity for skeletons
  generationQuantity = 1
) => {
  const currentStory = useSelector(selectCurrentStory);
  const reactiveStoryData = currentStory || storyData;

  // Get videos for the current scene
  const getVideosByOwner = useMemo(() => {
    if (!activeScene || !reactiveStoryData?.video?.length) return [];

    return reactiveStoryData.video
      .filter(video => video.sceneId === activeScene._id)
      .reverse();
  }, [activeScene, reactiveStoryData?.video]);

  // Transform videos to match gallery format
  const transformedVideos = useMemo(() => {
    return getVideosByOwner.map((video, index) => {
      const uniqueId = video.id || video.taskId || `video-${index}`;

      return {
        _id: uniqueId,
        id: uniqueId,
        url: video.s3Url || '',
        minUrl: video.s3Url || '',
        googleCloudUrl: video.s3Url || '',
        minGoogleCloudUrl: video.s3Url || '',
        prompt: video.prompt || '',
        negativePrompt: '',
        imageHeight: 720,
        imageWidth: 1280,
        likes: [],
        dislikes: [],
        provider: 'video',
        type: 'video',
        status: video.status,
        isSkeleton: video.status === 'waiting' || video.status === 'processing',
        createdAt: video.createdAt,
        // Video specific fields
        taskId: video.taskId,
        s3Url: video.s3Url,
        duration: video.duration || '5s',
      };
    });
  }, [getVideosByOwner]);

  // Create skeleton data for pending generations
  const skeletonData = useMemo(() => {
    // Create skeletons based on generation quantity
    const skeletons = Array.from(
      { length: generationQuantity },
      (_, index) => ({
        isSkeleton: true,
        id: `regeneration-skeleton-${index + 1}`,
        startTime: regenerationStartTime,
        type: 'regeneration',
      })
    );

    // Only show skeletons if there are pending generations or local pending state
    const hasPendingGenerations = getImagesByOwner.some(
      generation => generation.status === 'PENDING'
    );

    // Check if any new images were generated during regeneration
    const hasNewGeneratedImages = getImagesByOwner.some(
      generation =>
        generation.initial_image &&
        generation.generated_images &&
        generation.generated_images.length > 0 &&
        generation.status !== 'PENDING'
    );

    // Show skeletons if there are pending generations or local pending state
    if (hasPendingGenerations || localPending) {
      return skeletons;
    }

    return [];
  }, [
    getImagesByOwner,
    localPending,
    regenerationStartTime,
    generationQuantity,
  ]);

  // Transform pointImages to match the format expected by NewGalleryMasonic
  const transformedImages = useMemo(() => {
    return pointImages.map((image, index) => {
      // Find the generation data for this image
      const imageGeneration = currentStory?.images?.find(
        gen => gen.id === image.generationId
      );

      // Ensure we have a unique ID for each image
      const uniqueId =
        image.id || image._id || `generated-${image.generationId}-${index}`;

      const finalCreatedAt = imageGeneration?.createdAt || image.createdAt;

      const transformedImage = {
        _id: uniqueId,
        id: uniqueId,
        url: image.googleCloudUrl || image.url,
        minUrl: image.minGoogleCloudUrl || image.minUrl,
        googleCloudUrl: image.googleCloudUrl,
        minGoogleCloudUrl: image.minGoogleCloudUrl,
        prompt: imageGeneration?.prompt || image.prompt,
        negativePrompt:
          imageGeneration?.negative_prompt || image.negative_prompt,
        imageHeight: imageGeneration?.imageHeight || image.imageHeight,
        imageWidth: imageGeneration?.imageWidth || image.imageWidth,
        likes: image.likes || [],
        dislikes: image.dislikes || [],
        provider: 'leonardo',
        generationId: image.generationId,
        isGenerated: true,
        createdAt: finalCreatedAt,
        type: 'image',
      };

      return transformedImage;
    });
  }, [pointImages, currentStory]);

  // Combine skeleton and actual content based on activeGalleryTab
  const allContent = useMemo(() => {
    let content = [];

    if (activeGalleryTab === 'All') {
      // Combine images and videos, then sort by createdAt (newest first)
      const combinedContent = [...transformedImages, ...transformedVideos];

      const sortedContent = combinedContent.sort((a, b) => {
        // Normalize dates - ensure both are treated as UTC
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);

        // If date doesn't have timezone info, treat as local time
        const normalizedA = a.createdAt?.endsWith('Z')
          ? dateA
          : new Date(a.createdAt + 'Z');
        const normalizedB = b.createdAt?.endsWith('Z')
          ? dateB
          : new Date(b.createdAt + 'Z');

        return normalizedB - normalizedA; // Newest first
      });

      content = [...skeletonData, ...sortedContent];
    } else if (activeGalleryTab === 'Image') {
      // Show only images, sorted by createdAt
      const sortedImages = [...transformedImages].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Newest first
      });
      content = [...skeletonData, ...sortedImages];
    } else if (activeGalleryTab === 'Video') {
      // Show only videos, sorted by createdAt
      const videoSkeletons = showVideoSkeletons
        ? Array.from({ length: generationQuantity }, (_, index) => ({
            isSkeleton: true,
            id: `video-skeleton-${index + 1}`,
            type: 'video-generation',
          }))
        : [];
      const sortedVideos = [...transformedVideos].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Newest first
      });
      content = [...videoSkeletons, ...sortedVideos];
    }

    return content;
  }, [
    skeletonData,
    transformedImages,
    transformedVideos,
    activeGalleryTab,
    showVideoSkeletons,
    generationQuantity,
  ]);

  return {
    images: allContent,
    isLoading: false,
    hasMore: false,
    loadMoreImages: () => {},
    onRateImg,
    onImageDeleted,
    onVideoSelect,
  };
};

function GeneratedImagesSection({
  storyData,
  activeScene,
  selectedImages,
  getImagesByOwner,
  pointImages: initialPointImages,
  onRateImg,
  hasMaxHeight = true,
  // Gallery filtering
  activeGalleryTab = 'All',
  // Generation quantity for skeletons
  generationQuantity = 1,
  // Video data
  showVideoSkeletons = false,
  onVideoSelect,
  videoGenerationType,
  setVideoGenerationType,
  selectedImageForVideo,
  selectedImageTail,
  onSelectImageForVideo,
  onSelectImageTail,
  onRemoveImageFromVideo,
  videoLength,
  setVideoLength,
  // Other existing props
  promptsStatuses = [],
  apiTokens = 0,
  showGeneration = true,
  onCheckedButtonClick,
  handleImageSelection,
  showSkeletons = false,
  tagHistory = [],
  galleryColumns,
}) {
  const [selectedImage, setSelectedImage] = useState();
  const [activeImage, setActiveImage] = useState({ id: null, index: 0 });
  const [asignedImage, setAsignedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [editingScenes, setEditingScenes] = useState([]);
  const [pointImages, setPointImages] = useState(initialPointImages);
  const overlayRef = useRef(null);
  const [localPending, setLocalPending] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [lastRealId, setLastRealId] = useState(null);
  const [regenerationStartTime, setRegenerationStartTime] = useState(null);
  const [hasScroll, setHasScroll] = useState(false);
  const imagesContainerRef = useRef(null);
  const checkScrollTimeoutRef = useRef(null);

  const [addImage] = useAddImageMutation();
  const { onGenerateImageByBot, isGenerationLoading } = useSceneManager();

  const dispatch = useDispatch();
  const store = useContext(StoreContext);

  // Debounced function to check if container has scrollable content
  const debouncedCheckForScroll = useCallback(() => {
    if (checkScrollTimeoutRef.current) {
      clearTimeout(checkScrollTimeoutRef.current);
    }

    checkScrollTimeoutRef.current = setTimeout(() => {
      checkForScrollInternal();
    }, 150); // Debounce delay
  }, []);

  // Internal function to check if container has scrollable content
  const checkForScrollInternal = useCallback(() => {
    // Try multiple selectors to find the masonry container
    const selectors = [
      `.${styles.images_container} [class*="masonryContainer"]`,
      `.${styles.images_container} [class*="masonry"]`,
      `.${styles.images_container} [style*="overflow: auto"]`,
      `.${styles.images_container} [style*="overflow:auto"]`,
    ];

    let masonryContainer = null;
    for (const selector of selectors) {
      masonryContainer = document.querySelector(selector);
      if (masonryContainer) break;
    }

    if (masonryContainer) {
      const hasScrollableContent =
        masonryContainer.scrollHeight > masonryContainer.clientHeight;

      setHasScroll(hasScrollableContent);
    } else {
      // Fallback: check if our container itself has scroll
      if (imagesContainerRef.current) {
        const container = imagesContainerRef.current;
        const hasScrollableContent =
          container.scrollHeight > container.clientHeight;

        setHasScroll(hasScrollableContent);
      }
    }
  }, []);

  // Check for scroll when images change or component mounts
  useEffect(() => {
    // Add a longer delay to ensure NewGalleryMasonic has rendered
    const timer = setTimeout(() => {
      debouncedCheckForScroll();
    }, 300);
    return () => clearTimeout(timer);
  }, [pointImages, debouncedCheckForScroll]);

  // Check for scroll after a short delay to ensure content is rendered
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedCheckForScroll();
    }, 500);
    return () => clearTimeout(timer);
  }, [debouncedCheckForScroll]);

  // Add mutation observer to detect when NewGalleryMasonic content changes
  useEffect(() => {
    if (!imagesContainerRef.current) return;

    const observer = new MutationObserver(() => {
      // Check for scroll after DOM changes with debouncing
      debouncedCheckForScroll();
    });

    observer.observe(imagesContainerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [debouncedCheckForScroll]);

  // Add resize observer to check for scroll when container size changes
  useEffect(() => {
    if (!imagesContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Check for scroll after resize with debouncing
      debouncedCheckForScroll();
    });

    resizeObserver.observe(imagesContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [debouncedCheckForScroll]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPointImages(initialPointImages);
  }, [initialPointImages]);

  useEffect(() => {
    if (activeScene?.selectedImage?.url) {
      setAsignedImage(
        activeScene.selectedImage.googleCloudUrl ||
          activeScene.selectedImage.url
      );
    } else {
      setAsignedImage(null);
    }
  }, [activeScene?.selectedImage?.url]);

  const onAsignImageToScene = async image => {
    const currentIndex = pointImages.findIndex(img => img.id === image.id);
    setActiveImage({
      id: image.id,
      index: currentIndex,
    });

    if (activeScene._id) {
      if (asignedImage === image.googleCloudUrl) {
        dispatch(
          updateSelectedImage({
            sceneId: activeScene._id,
            selectedImage: null,
          })
        );

        store.updateCanvasImage({
          url: null,
          minUrl: null,
          pointId: activeScene._id,
          imageId: null,
          id: null,
        });

        setAsignedImage(null);
      } else {
        dispatch(
          updateSelectedImage({
            sceneId: activeScene._id,
            selectedImage: {
              _id: image._id,
              id: image._id,
              url: image.googleCloudUrl,
              minUrl: image.minGoogleCloudUrl,
              prompt: image.prompt,
              negativePrompt: image.negative_prompt,
              imageHeight: image.imageHeight,
              imageWidth: image.imageWidth,
            },
          })
        );
        setAsignedImage(image.googleCloudUrl);

        await store.updateCanvasImage({
          url: image.googleCloudUrl,
          minUrl: image.minGoogleCloudUrl,
          pointId: activeScene._id,
          imageId: image._id,
          id: image._id,
        });
      }
    }
  };

  const scrollToImage = index => {
    const container = document.querySelector(`.${styles.vertical_gallery}`);
    const element = document.querySelector(`[data-index="${index}"]`);

    if (container && element) {
      const containerHeight = container.clientHeight;
      const elementOffset = element.offsetTop;
      const scrollPosition = Math.max(0, elementOffset - containerHeight / 3);

      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      scrollToImage(activeImage.index);
    }
  }, [activeImage.index, isModalOpen]);

  const handleWheel = event => {
    if (
      event.target.closest('textarea') ||
      event.target.closest('.prompt') ||
      event.target.closest('[class*="Dropdown_sizePopup"]') ||
      event.target.closest('[class*="dropdownContent"]') ||
      event.target.closest('[class*="sizePopup"]')
    ) {
      return;
    }
    event.preventDefault();

    if (
      event.target.closest(`.${styles.filter_container}`) ||
      event.target.closest(`.${styles.container}`)
    ) {
      return;
    }

    if (!pointImages || pointImages.length === 0 || isImageLoading) return;

    const delta = event.deltaY;
    const threshold = 50;

    if (Math.abs(delta) < threshold) return;

    const currentIndex = pointImages.findIndex(
      img => img.id === activeImage.id
    );
    const nextIndex = delta > 0 ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= pointImages.length) return;

    setIsImageLoading(true);
    setActiveImage({
      id: pointImages[nextIndex].id,
      index: nextIndex,
    });
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      overlay.removeEventListener('wheel', handleWheel);
    };
  }, [isModalOpen, activeImage.index, isImageLoading]);

  const handleImageClick = (image, index) => {
    setActiveImage({
      id: image.id,
      index: pointImages.findIndex(img => img.id === image.id),
    });
    setIsModalOpen(true);
  };

  const onRegenerateImage = async (
    strength,
    imageId,
    prompt,
    negativePrompt = ''
  ) => {
    try {
      let image = null;
      setLocalPending(true);
      setPendingId(`pending-${Date.now()}`);
      setRegenerationStartTime(Date.now());

      image = await regenerateImage({
        owner: activeScene._id,
        point: activeScene.point,
        prompt: prompt,
        imageId,
        width: storyData.resolution.width,
        height: storyData.resolution.height,
        strength,
        negative_prompt: negativePrompt,
        generationId: 'bff438f1-035b-4af3-b294-353b5063bebe',
      });

      if (image) {
        addImage({
          image: {
            ...image,
            initial_image: imageId,
            owner: activeScene._id,
            storyId: storyData._id,
          },
        });
      }
    } catch (error) {
      console.error('Error during image regeneration:', error);
      setLocalPending(false);
      setPendingId(null);
      setRegenerationStartTime(null);
      setTimeout(() => setIsImageLoading(false), 3000);
    }
  };

  const onRegenerateBtnClick = (image, range, prompt, negativePrompt) => {
    onRegenerateImage(parseFloat(range), image.id, prompt, negativePrompt);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  const checkIfSelected = image => {
    return selectedImages.some(
      selectedImage => selectedImage.url === image.url
    );
  };

  const getImagesByOwnerWithPending = getImagesByOwner;

  useEffect(() => {
    if (!localPending) return;

    // Check if any new images were generated during regeneration
    const hasNewGeneratedImages = getImagesByOwner.some(
      generation =>
        generation.initial_image &&
        generation.generated_images &&
        generation.generated_images.length > 0 &&
        generation.status !== 'PENDING'
    );

    // Also check for the specific image that was being regenerated
    const specificImage = getImagesByOwner.find(
      img =>
        img.initial_image === activeImage.id &&
        (img.status === 'PENDING' ||
          (img.generated_images && img.generated_images.length > 0))
    );

    // Clear pending state if any new image was generated or the specific image was found
    if (
      hasNewGeneratedImages ||
      (specificImage &&
        specificImage.id !== pendingId &&
        specificImage.id !== lastRealId)
    ) {
      if (specificImage) {
        setLastRealId(specificImage.id);
      }
      const timeout = setTimeout(() => {
        setLocalPending(false);
        setPendingId(null);
        setRegenerationStartTime(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [getImagesByOwner, activeImage.id, localPending, pendingId, lastRealId]);

  // Fallback timeout to clear pending state after 30 seconds
  useEffect(() => {
    if (!localPending) return;

    const fallbackTimeout = setTimeout(() => {
      setLocalPending(false);
      setPendingId(null);
      setRegenerationStartTime(null);
    }, 30000);

    return () => clearTimeout(fallbackTimeout);
  }, [localPending]);

  const handleImageDeleted = imageId => {
    setPointImages(prevImages => prevImages.filter(img => img.id !== imageId));
  };

  const imageData = pointImages[activeImage.index];

  // Use custom hook to get unified gallery data (images + videos)
  const generatedImagesData = useUnifiedGalleryData(
    pointImages,
    getImagesByOwner,
    localPending,
    pendingId,
    activeImage,
    regenerationStartTime,
    onRateImg,
    handleImageDeleted,
    // Video data
    activeGalleryTab,
    storyData,
    activeScene,
    showVideoSkeletons,
    onVideoSelect,
    // Generation quantity for skeletons
    generationQuantity
  );

  return (
    <>
      <div
        className={`${styles.images_container} ${
          !hasMaxHeight ? styles.noMaxHeight : ''
        } ${hasScroll ? styles.hasScroll : ''}`}
        style={{
          minHeight: pointImages.length > 0 ? '230px' : '0',
        }}
        ref={imagesContainerRef}
      >
        {generatedImagesData.images.length > 0 ? (
          <NewGalleryVirtuoso
            hasScene={true}
            activeScene={activeScene}
            storyData={storyData}
            height={'50dvh'}
            hideSearchBar={true}
            // Override the useVirtuosoImages hook data with our custom data
            customImagesData={generatedImagesData}
            onRegenerateBtnClick={onRegenerateBtnClick}
            getImagesByOwner={getImagesByOwner}
            isGenerated={true}
            galleryColumns={galleryColumns}
          />
        ) : (
          <div className={styles.empty_state}>
            Your visuals will appear here once generated
            <AiStarsIcon color="var(--accent-color)" width={24} height={24} />
          </div>
        )}
      </div>
    </>
  );
}

export { GeneratedImagesSection };
