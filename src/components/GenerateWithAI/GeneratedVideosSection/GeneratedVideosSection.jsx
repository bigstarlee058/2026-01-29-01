import { GenerationSkeleton } from 'features/GallerySectionRedesign/components/GenerationSkeleton/GenerationSkeleton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useUploadFileMutation } from '../../../redux/gallery/galleryApi';
import { selectCurrentStory } from '../../../redux/stories/storiesSlice';
import styles from './GeneratedVideosSection.module.scss';

// Calculate grid layout similar to VideoGallery
const calculateGridLayout = containerWidth => {
  let columns;
  let itemWidth;
  const gap = 1;

  if (containerWidth === 0) {
    columns = 2; // fallback
  } else if (containerWidth <= 480) {
    columns = 1;
  } else if (containerWidth <= 768) {
    columns = 2;
  } else {
    columns = 3; // максимум 3 колонки для generated videos
  }

  itemWidth =
    containerWidth > 0
      ? Math.floor((containerWidth - gap * (columns - 1)) / columns)
      : 200;

  return {
    columns,
    itemWidth,
    gap,
  };
};

const GeneratedVideosSection = ({
  storyData,
  activeScene,
  showSkeletons,
  onVideoSelect,
  hasMaxHeight = false,
  videoGenerationType = 'text',
  setVideoGenerationType,
  selectedImageForVideo,
  selectedImageTail,
  onSelectImageForVideo,
  onSelectImageTail,
  onRemoveImageFromVideo,
  videoLength = 5,
  setVideoLength,
  pointImages = [],
}) => {
  const currentStory = useSelector(selectCurrentStory);
  const reactiveStoryData = currentStory || storyData;
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadFile] = useUploadFileMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  // Get videos for the current scene
  const getVideosByOwner = useMemo(() => {
    if (!activeScene || !reactiveStoryData?.video?.length) return [];

    return reactiveStoryData.video
      .filter(video => video.sceneId === activeScene._id)
      .reverse();
  }, [activeScene, reactiveStoryData?.video]);

  // Transform videos to include skeleton state for processing videos
  const processedVideos = useMemo(() => {
    return getVideosByOwner.map(video => {
      // If video is still waiting or processing, treat it as a skeleton
      if (video.status === 'waiting' || video.status === 'processing') {
        return {
          ...video,
          isSkeleton: true,
        };
      }
      return video;
    });
  }, [getVideosByOwner]);

  // Calculate grid layout
  const gridLayout = useMemo(() => {
    return calculateGridLayout(containerWidth);
  }, [containerWidth]);

  // Create masonry columns for tight packing
  const masonryColumns = useMemo(() => {
    const numColumns = gridLayout.columns;

    // Initialize columns
    const columns = Array(numColumns)
      .fill(null)
      .map(() => []);

    // Distribute videos across columns for balanced heights
    processedVideos.forEach((video, index) => {
      const columnIndex = index % numColumns;
      columns[columnIndex].push(video);
    });

    return columns;
  }, [processedVideos, gridLayout.columns]);

  // Calculate container width
  const calculateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const newWidth = containerRef.current.offsetWidth;
      if (newWidth !== containerWidth) {
        setContainerWidth(newWidth);
      }
    }
  }, [containerWidth]);

  // Initial width calculation and resize handler
  useEffect(() => {
    calculateContainerWidth();

    const handleResize = () => {
      calculateContainerWidth();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateContainerWidth]);

  const handleVideoSelect = video => {
    if (
      video.isSkeleton ||
      video.status === 'waiting' ||
      video.status === 'processing'
    ) {
      return;
    }

    if (onVideoSelect) {
      onVideoSelect(video);
    }
  };

  // Handle file upload from PC
  const handleFileUpload = useCallback(
    async event => {
      const file = event.target.files[0];
      if (!file) return;

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      try {
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'image');
        formData.append('name', file.name);
        formData.append('description', 'Uploaded for video generation');

        const result = await uploadFile(formData);

        if (result.data && result.data.url) {
          const uploadedImage = {
            _id: result.data._id || Date.now().toString(),
            id: result.data._id || Date.now().toString(), // Ensure both id and _id are set
            url: result.data.url,
            googleCloudUrl: result.data.url,
            minUrl: result.data.thumbnailUrl || result.data.url,
            minGoogleCloudUrl: result.data.thumbnailUrl || result.data.url,
            name: file.name,
            prompt: 'Uploaded from PC',
            imageWidth: 1920,
            imageHeight: 1080,
          };

          // Auto-select as main image if none selected
          if (!selectedImageForVideo) {
            onSelectImageForVideo(uploadedImage);
          } else if (!selectedImageTail) {
            onSelectImageTail(uploadedImage);
          }
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Upload failed. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [
      uploadFile,
      selectedImageForVideo,
      selectedImageTail,
      onSelectImageForVideo,
      onSelectImageTail,
    ]
  );

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Helper function to get unique image ID (same logic as GeneratedImagesSection)
  const getImageId = useCallback(image => {
    if (!image) return null;
    return image.id || image._id;
  }, []);

  const getStatusLabel = status => {
    switch (status) {
      case 'waiting':
        return 'Waiting...';
      case 'processing':
        return 'Processing...';
      case 'succeed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'waiting':
        return '#FFA500';
      case 'processing':
        return 'var(--accent-color)';
      case 'succeed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const renderVideoItem = useCallback(
    video => {
      const isSelected = activeScene?.selectedVideo?.taskId === video.taskId;

      return (
        <li
          key={video.id || video.taskId}
          className={`${styles.img_item} ${isSelected ? styles.selected : ''} ${
            video.isSkeleton ||
            video.status === 'waiting' ||
            video.status === 'processing'
              ? styles.disabled
              : ''
          } ${styles.visible}`}
          onClick={() => handleVideoSelect(video)}
        >
          <div className={styles.card_container}>
            {video.isSkeleton ||
            video.status === 'waiting' ||
            video.status === 'processing' ? (
              <div className={styles.skeleton_wrapper}>
                <GenerationSkeleton mode="generation" />
              </div>
            ) : (
              <div
                className={styles.mediaContainer}
                onMouseEnter={e => {
                  const videoElement = e.currentTarget.querySelector('video');
                  if (videoElement) {
                    videoElement.play().catch(error => {
                      console.warn('Failed to play video:', error);
                    });
                  }
                }}
                onMouseLeave={e => {
                  const videoElement = e.currentTarget.querySelector('video');
                  if (videoElement) {
                    videoElement.pause();
                    videoElement.currentTime = 0;
                  }
                }}
              >
                {video.s3Url ? (
                  <video
                    className={styles.card}
                    src={video.s3Url}
                    controls={false}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className={styles.videoPlaceholder}>
                    <span>Video not available</span>
                  </div>
                )}

                <div className={styles.videoOverlay}></div>

                {isSelected && (
                  <div className={styles.selectedIndicator}>
                    <div className={styles.checkmark}>✓</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </li>
      );
    },
    [
      activeScene?.selectedVideo?.taskId,
      handleVideoSelect,
      getStatusColor,
      getStatusLabel,
    ]
  );

  // Masonry renderer
  const masonryRenderer = useCallback(() => {
    return (
      <div
        className={styles.masonryGrid}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          gap: `${gridLayout.gap}px`,
        }}
      >
        {masonryColumns.map((column, columnIndex) => (
          <ul
            key={`column-${columnIndex}`}
            className={styles.masonryColumn}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${gridLayout.gap}px`,
              flex: 1,
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {column.map((video, itemIndex) => {
              const globalIndex =
                columnIndex *
                  Math.ceil(processedVideos.length / gridLayout.columns) +
                itemIndex;

              return renderVideoItem(video);
            })}
          </ul>
        ))}
      </div>
    );
  }, [masonryColumns, gridLayout, processedVideos, renderVideoItem]);

  // Calculate masonry height similar to VideoGallery
  const masonryHeight = useMemo(() => {
    if (hasMaxHeight) {
      return '100%'; // Use full available height in flex container
    }
    return 'calc(50vh - 100px)'; // Dynamic height when not constrained
  }, [hasMaxHeight]);

  return (
    <div
      className={`${styles.container} ${hasMaxHeight ? styles.maxHeight : ''}`}
      ref={containerRef}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Generated Videos</h3>
          {processedVideos.length > 0 && (
            <span className={styles.count}>
              {processedVideos.filter(v => !v.isSkeleton).length} video
              {processedVideos.filter(v => !v.isSkeleton).length !== 1
                ? 's'
                : ''}
            </span>
          )}
        </div>
      </div>

      <div className={styles.videosContainer}>
        {masonryColumns.length > 0 &&
        masonryColumns.some(col => col.length > 0) ? (
          <div
            className={styles.masonryScrollContainer}
            style={{
              height: masonryHeight,
              overflowY: 'auto',
              width: '100%',
            }}
          >
            {masonryRenderer()}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No videos generated yet</p>
            <p className={styles.emptySubtext}>
              Generate your first video using the prompt above
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export { GeneratedVideosSection };
