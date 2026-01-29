import React, { useRef, useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import styles from './GeneratedImagesItem.module.scss';
import { downloadSingleImage } from 'utils/downloadImage';
import { saveAs } from 'file-saver';
import { useDrag, DragPreviewImage } from 'react-dnd';
import { ImageActions } from 'components/ImageActions/ImageActions';
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteImage,
  toggleImageReaction,
  selectCurrentStory,
} from '../../../redux/stories/storiesSlice';
import { user } from '../../../redux/auth';
import { CircleIcon, CheckedBtnIcon } from 'components/Icons';

const GeneratedImagesItem = memo(function GeneratedImagesItem({
  image: initialImage,
  isSelected,
  onClick,
  onImageClick,
  selectedImage,
  onAsignImageToScene,
  asignedImage,
  generationId,
  onImageDeleted,
}) {
  const dispatch = useDispatch();
  const [isDownLoaded, setIsDownloaded] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [imageAspect, setImageAspect] = useState('portrait');
  const { username } = useSelector(user);
  const currentStory = useSelector(selectCurrentStory);

  // Get the latest image data from Redux store
  const imageGeneration = currentStory?.images?.find(
    gen => gen.id === generationId
  );

  const image =
    imageGeneration?.generated_images?.find(
      img => img.id === initialImage.id
    ) || initialImage;

  const tooltipId = useRef(
    `checkbox-tooltip-${image._id}-${Math.random().toString(36).substr(2, 9)}`
  ).current;
  const previewRef = useRef(null);

  const [{ isDragging }, dragRef, preview] = useDrag({
    type: 'scene-image',
    item: {
      type: 'scene-image',
      image: {
        id: image.id,
        url: image.googleCloudUrl || image.url,
        minUrl: image.minGoogleCloudUrl || image.minUrl,
        prompt: imageGeneration.prompt,
        negativePrompt: imageGeneration.negative_prompt,
        imageHeight: imageGeneration.imageHeight,
        imageWidth: imageGeneration.imageWidth,
      },
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (previewRef.current) {
      preview(previewRef.current, {
        captureDraggingState: true,
        offsetX: 0,
        offsetY: 0,
      });
    }
  }, [preview]);

  const handleImageLoad = e => {
    const { naturalWidth, naturalHeight } = e.target;
    setIsLandscape(naturalWidth > naturalHeight);
    if (naturalWidth === naturalHeight) {
      setImageAspect('square');
    } else if (naturalWidth > naturalHeight) {
      setImageAspect('landscape');
    } else {
      setImageAspect('portrait');
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteImage({ imageId: image.id, generationId }));
      onImageDeleted(image.id);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleDownLoad = async () => {
    try {
      setIsDownloaded(false);
      const result = await downloadSingleImage({ image: image.googleCloudUrl });
      saveAs(result, `${image.id || 'generated'}.jpg`);
      setIsDownloaded(true);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleReaction = (image, reactionType) => {
    dispatch(
      toggleImageReaction({
        imageId: image.id,
        generationId,
        username,
        reactionType,
      })
    );
  };

  return (
    <>
      <li
        className={`${styles.img_item} ${
          isSelected || asignedImage === image.googleCloudUrl
            ? styles.selected
            : ''
        } ${isLandscape ? styles.landscape : ''} ${
          isDragging ? styles.dragging : ''
        }`}
        ref={dragRef}
      >
        <div
          ref={previewRef}
          className={`${styles.preview_wrapper} ${
            imageAspect === 'landscape' ? styles.landscape : ''
          } ${imageAspect === 'square' ? styles.square : ''}`}
        >
          <img
            src={image.googleCloudUrl}
            alt={image.prompt || 'Preview'}
            className={styles.preview_image}
          />
        </div>
        <div
          className={styles.card_container}
          onClick={() => onImageClick(image)}
        >
          <img
            src={image.googleCloudUrl}
            alt={image.prompt || 'Generated image'}
            loading="lazy"
            onLoad={handleImageLoad}
            className={styles.card}
          />
          <div className={styles.checkBox_container}>
            <div
              className={styles.checkBox}
              onClick={e => {
                e.stopPropagation();
                onAsignImageToScene(image);
              }}
            >
              {asignedImage === image.googleCloudUrl ? (
                <CheckedBtnIcon size="14px" />
              ) : (
                <CircleIcon size="14px" />
              )}
            </div>
          </div>
          <div className={styles.btn_container}>
            <ImageActions
              image={{
                ...image,
                prompt: imageGeneration.prompt,
                negative_prompt: imageGeneration.negative_prompt,
                imageHeight: imageGeneration.imageHeight,
                imageWidth: imageGeneration.imageWidth,
              }}
              isDownloaded={isDownLoaded}
              onDownload={handleDownLoad}
              onDelete={handleDelete}
              username={username}
              onReaction={handleReaction}
              className={styles.generated_icons_box}
              hideCheckbox={true}
            />
          </div>
        </div>
      </li>
    </>
  );
});

GeneratedImagesItem.displayName = 'GeneratedImagesItem';

GeneratedImagesItem.propTypes = {
  image: PropTypes.shape({
    id: PropTypes.string,
    url: PropTypes.string,
    googleCloudUrl: PropTypes.string.isRequired,
    prompt: PropTypes.string,
    likes: PropTypes.arrayOf(PropTypes.string),
    dislikes: PropTypes.arrayOf(PropTypes.string),
  }),
  isSelected: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onAsignImageToScene: PropTypes.func.isRequired,
  asignedImage: PropTypes.string,
  generationId: PropTypes.string,
  onImageDeleted: PropTypes.func.isRequired,
};

export { GeneratedImagesItem };
