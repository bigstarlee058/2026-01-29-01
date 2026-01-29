import { useEffect, useRef, forwardRef, useState } from 'react';
import styles from './VerticalGallery.module.scss';
import { LoaderDots } from 'components/reusableComponents/LoaderDots';
import { PlayIcon } from 'components/Icons';

const VerticalGallery = forwardRef(({
  images,
  activeImage = { id: null, index: 0 },
  onImageClick,
  loadMoreImages,
  hasMore = false,
  isLoading = false,
  isGenerated = false,
}, ref) => {
  const internalGalleryRef = useRef(null);
  const galleryRef = ref || internalGalleryRef;
  const activeItemRef = useRef(null);
  const loadingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const wheelTimeoutRef = useRef(null);
  const isScrollingRef = useRef(false);

  const smoothScrollTo = (element, targetPosition, duration = 600) => {
    // Prevent multiple scroll animations from running simultaneously
    if (isScrollingRef.current) return;

    isScrollingRef.current = true;

    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;

    // Clear any existing scroll timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const animation = currentTime => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      element.scrollTop = startPosition + distance * easeOutQuart;

      if (progress < 1) {
        requestAnimationFrame(animation);
      } else {
        // Animation complete - add a small delay before allowing new scrolls
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    };

    requestAnimationFrame(animation);
  };

  const scrollToActiveItem = () => {
    if (activeItemRef.current && galleryRef.current) {
      const gallery = galleryRef.current;
      const activeItem = activeItemRef.current;

      const galleryRect = gallery.getBoundingClientRect();
      const activeItemRect = activeItem.getBoundingClientRect();

      const scrollPosition =
        activeItem.offsetTop -
        galleryRect.height / 2 +
        activeItemRect.height / 2;

      gallery.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      });
    }
  };

  // Simple function to move to next/previous image (same as keyboard navigation)
  const moveToAdjacentImage = direction => {
    if (!images.length) {
      return;
    }

    // Find current index based on active image ID
    const currentIndex = images.findIndex(img => img.id === activeImage.id);

    // If current image not found, use the activeImage.index as fallback
    const index = currentIndex !== -1 ? currentIndex : activeImage.index || 0;
    let newIndex;

    if (direction === 'next') {
      newIndex = Math.min(images.length - 1, index + 1);
    } else {
      newIndex = Math.max(0, index - 1);
    }

    const newImage = images[newIndex];
    if (newImage && newImage.id !== activeImage.id) {
      onImageClick({
        id: newImage.id,
        index: newIndex,
      });
    }
  };

  // Mouse wheel handler that moves one image at a time
  const handleWheel = e => {
    if (galleryRef.current) {
      e.preventDefault();

      // Determine scroll direction
      const direction = e.deltaY > 0 ? 'next' : 'prev';

      // Move to adjacent image (same as keyboard navigation)
      moveToAdjacentImage(direction);
    }
  };

  const handleScroll = () => {
    if (
      !galleryRef.current ||
      loadingRef.current ||
      !hasMore ||
      !loadMoreImages
    )
      return;

    const gallery = galleryRef.current;
    const scrollHeight = gallery.scrollHeight;
    const scrollTop = gallery.scrollTop;
    const clientHeight = gallery.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < 500) {
      loadingRef.current = true;
      loadMoreImages().finally(() => {
        loadingRef.current = false;
      });
    }

    // Removed smart scroll functionality to prevent jumping
  };

  const handleKeyDown = e => {
    if (!images.length) return;

    // Find current index based on active image ID
    const currentIndex = images.findIndex(img => img.id === activeImage.id);

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(0, currentIndex - 1);
      const newImage = images[newIndex];
      if (newImage) {
        onImageClick({
          id: newImage.id,
          index: newIndex,
        });
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(images.length - 1, currentIndex + 1);
      const newImage = images[newIndex];
      if (newImage) {
        onImageClick({
          id: newImage.id,
          index: newIndex,
        });
      }
    }
  };

  useEffect(() => {
    if (activeImage?.id && images.length > 0 && !isScrollingRef.current) {
      setTimeout(scrollToActiveItem, 50);
    }
  }, [activeImage?.id]);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (gallery) {
      gallery.addEventListener('wheel', handleWheel, { passive: false });
      gallery.addEventListener('scroll', handleScroll);

      return () => {
        gallery.removeEventListener('wheel', handleWheel);
        gallery.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }
      };
    }
  }, [hasMore, loadMoreImages, images, activeImage, onImageClick]);

  useEffect(() => {
    // Add keyboard event listener to the document
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [images, activeImage, onImageClick]);

  // Helper function to determine if item is video
  const isVideo = (item) => {
    return item.type === 'video' || item.s3Url || item.taskId || 
           (item.url && (item.url.includes('.mp4') || item.url.includes('.mov') || item.url.includes('.webm')));
  };

  return (
    <ul className={styles.vertical_gallery} ref={galleryRef}>
      {images.map((item, index) => {
        // Check if this item is currently selected
        const isSelected = item.id === activeImage.id;
        const itemIsVideo = isVideo(item);

        return (
          <li
            className={`${styles.gallery_item} ${
              isSelected ? styles.selected : ''
            } ${itemIsVideo ? styles.video_item : ''}`}
            key={`${item.id}-${index}`}
            data-index={index}
            ref={isSelected ? activeItemRef : null}
            onClick={() => {
              onImageClick({
                id: item.id,
                index: images.findIndex(img => img.id === item.id),
              });
            }}
          >
            {itemIsVideo ? (
              <div className={styles.video_container}>
                <video
                  src={item.s3Url || item.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <div className={styles.play_overlay}>
                  <PlayIcon width={20} height={20} color="white" />
                </div>
              </div>
            ) : (
              <img
                src={item.url ? `${item.url}?w=512` : item.minGoogleCloudUrl}
                alt={item.prompt}
                loading="lazy"
              />
            )}
          </li>
        );
      })}
      {isLoading && hasMore && loadMoreImages && (
        <div className={styles.loading_dots}>
          <LoaderDots size="10px" />
        </div>
      )}
    </ul>
  );
});

export default VerticalGallery;
