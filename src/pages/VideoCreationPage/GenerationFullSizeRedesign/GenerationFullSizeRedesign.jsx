import { Fragment, useState, useEffect, useRef } from 'react';
import { ImageSkeleton } from 'components/reusableComponents/ImageSkeleton/ImageSkeleton';
import SimilaritySwitchRegenerate from '../../VideoCreationPage/SimilaritySwitchRegenerate/SimilaritySwitchRegenerate';
import GenerationPromptFullSizeRedesign from '../GenerationPromptFullSizeRedesign/GenerationPromptFullSizeRedesign';
import icons from '../../../images/icons.svg';
import styles from './GenerationFullSizeRedesign.module.scss';
import GenerationImagesListFullSize from 'components/ImageGenerations/GenerationImagesListFullSize';
import VerticalGallery from 'components/VerticalGallery/VerticalGallery';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { downloadSingleImage } from 'utils/downloadImage';
import { saveAs } from 'file-saver';
import { SceneTags } from 'components/StoryBoardNew/SceneTags';
import PropTypes from 'prop-types';

const GenerationFullSizeRedesign = ({
  pointImages,
  activeImage,
  overlayRef,
  onCloseModal,
  handleImageLoad,
  getImagesByOwner,
  onRegenerateBtnClick,
  apiTokens,
  setActiveImage,
  isImageLoading,
  showSkeletons,
  storyData,
  scene,
  isEditing = false,
  onToggleEditMode = () => {},
  index = 0,
  onUpdateScene = () => {},
  onAddScene = () => {},
  onMergeScenes = () => {},
  onAsignImageToScene,
  image,
  asignedImage,
}) => {
  const currentImageIndex = pointImages.findIndex(
    img => img.id === activeImage.id
  );
  const currentImage = pointImages[currentImageIndex];

  const [range, setRange] = useState('0.30');
  const [prompts, setPrompts] = useState({
    prompt: currentImage?.prompt || '',
    negativePrompt: currentImage?.negativePrompt || '',
  });

  const [sceneText, setSceneText] = useState(scene?.text || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (sceneText !== scene?.text && scene?.text !== undefined) {
      setSceneText(scene.text);
    }
  }, [scene?.text]);

  const onTextChange = e => {
    setSceneText(e.target.value);
  };

  const onTextBlur = () => {
    if (sceneText !== scene?.text && storyData && scene) {
      onUpdateScene({
        storyId: storyData._id,
        sceneId: scene._id,
        value: sceneText,
      });
    }
  };

  const onKeyPress = event => {
    if (event.key === 'Enter' && storyData && scene) {
      const cursorPosition = inputRef?.current?.selectionStart;
      const splitedInput = sceneText.slice(0, cursorPosition).trim();
      const newInput = sceneText.slice(cursorPosition).trim();

      setSceneText(splitedInput);

      onUpdateScene({
        storyId: storyData._id,
        sceneId: scene._id,
        value: splitedInput,
      });

      onAddScene({
        storyId: storyData._id,
        sceneId: scene._id,
        place: 'AFTER',
        text: newInput,
      });
    }
  };

  const onKeyDown = event => {
    if (event.key === 'Backspace' && index > 0) {
      const cursorPosition = inputRef?.current?.selectionStart;
      if (cursorPosition === 0) {
        onMergeScenes({
          storyId: storyData._id,
          sceneId: scene._id,
          place: 'BEFORE',
        });
      }
    }
  };

  const handleDownLoad = async image => {
    try {
      const result = await downloadSingleImage({ image: image.url });
      saveAs(result, `${image._id || 'generated'}.jpg`);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const getApiTokensClassName = tokens => {
    if (tokens > 500) return styles.green;
    if (tokens < 500 && tokens > 0) return styles.yellow;
    if (tokens < 0) return styles.red;
    return '';
  };

  const handlePromptsChange = (prompt, negativePrompt) => {
    setPrompts({ prompt, negativePrompt });
  };

  const handleRegenerateBtnClick = image => {
    onRegenerateBtnClick(image, range, prompts.prompt, prompts.negativePrompt);
  };

  const hasPreviousImage = currentImageIndex > 0;
  const hasNextImage = currentImageIndex < pointImages.length - 1;

  const getImageSize = image => {
    if (image.imageHeight > image.imageWidth) {
      return 'high';
    }
  };

  const handleContentClick = e => {
    e.stopPropagation();
  };

  const handleBackdropClick = e => {
    if (e.currentTarget === e.target) {
      onCloseModal();
    }
  };

  if (!image || !image.googleCloudUrl) {
    console.warn('Invalid image data:', image);
    return null;
  }

  return (
    <>
      <div
        ref={overlayRef}
        className={styles.overlay}
        onClick={handleBackdropClick}
      >
        <div className={styles.modal_wrap} onClick={handleContentClick}>
          <div className={styles.borderEffect}>
            <div className={styles.borderTop}></div>
            <div className={styles.borderRight}></div>
            <div className={styles.borderBottom}></div>
            <div className={styles.borderLeft}></div>

            <div className={styles.cornerTopLeft}></div>
            <div className={styles.cornerTopRight}></div>
            <div className={styles.cornerBottomLeft}></div>
            <div className={styles.cornerBottomRight}></div>

            <div className={styles.leftTop}></div>
            <div className={styles.rightTop}></div>
            <div className={styles.leftBottom}></div>
            <div className={styles.rightBottom}></div>

            <div className={styles.topleft}></div>
            <div className={styles.bottomleft}></div>
            <div className={styles.bottomright}></div>
            <div className={styles.rightleft}></div>
            <div className={styles.topright}></div>
          </div>

          {/* Эффекты свечения в отдельном контейнере */}
          <div className={styles.glow_container}>
            <div className={styles.stain}></div>
            <div className={styles.stainBottom}></div>
          </div>

          {hasPreviousImage && (
            <ButtonWithIcon
              icon="SwitchIcon"
              classNameButton={styles.switch_btn_left}
              tooltipText="Previous image"
              onClick={() => {
                const newIndex = currentImageIndex - 1;
                const newImage = pointImages[newIndex];
                setActiveImage({
                  id: newImage.id,
                  index: newIndex,
                });
              }}
            />
          )}
          <ButtonWithIcon
            icon="CloseIcon"
            classNameButton={styles.close_btn}
            onClick={onCloseModal}
            tooltipText="Close"
            size="7px"
            color="#BABABA"
            accentColor="#3AFCEA"
          />
          <div className={styles.image_box}>
            <div className={styles.image_wrap}>
              <img
                className={styles.modal_image}
                src={
                  currentImage.url
                    ? `${currentImage.url}?w=512`
                    : currentImage.googleCloudUrl
                }
                alt={`Generated ${currentImageIndex + 1}`}
                onLoad={handleImageLoad}
              />
              <ButtonWithIcon
                icon="DownloadIcon"
                color="#fff"
                onClick={() => handleDownLoad(currentImage)}
                classNameButton={styles.download_btn}
                tooltipText="Download"
              />
            </div>
            {getImageSize(currentImage) !== 'high' && (
              <GenerationImagesListFullSize
                getImagesByOwner={getImagesByOwner}
                currentImageId={currentImage.id}
                onImageClick={setActiveImage}
                size="72px"
                isImageLoading={isImageLoading}
                showSkeletons={showSkeletons}
              />
            )}
          </div>
          <div className={styles.regenerate_wrap}>
            <div className={styles.content}>
              <div className={styles.sceneInfo}>
                <h3 className={styles.sceneTitle}>
                  Scene {scene?.id}{' '}
                  <span className={styles.sceneNumber}>{index + 1}</span>
                </h3>
                {isEditing ? (
                  <input
                    type="text"
                    className={styles.sceneDescriptionEdit}
                    value={sceneText}
                    onChange={onTextChange}
                    onBlur={onTextBlur}
                    onKeyPress={onKeyPress}
                    onKeyDown={onKeyDown}
                    ref={inputRef}
                  />
                ) : (
                  <div className={styles.sceneDescription}>{sceneText}</div>
                )}
              </div>
              <div className={styles.tagsContainer}>
                <SceneTags
                  tagsList={scene?.tags || []}
                  editMode={true}
                  storyData={storyData}
                  sceneId={scene?._id}
                />
              </div>
            </div>
            <div className={styles.similarity_wrap}>
              <GenerationPromptFullSizeRedesign
                initialPrompt={currentImage?.prompt}
                initialNegativePrompt={currentImage?.negativePrompt}
                onPromptsChange={handlePromptsChange}
              />
              <div className={styles.button_wrap}>
                <SimilaritySwitchRegenerate range={range} onChange={setRange} />
                <ButtonWithIcon
                  icon={
                    asignedImage === image.googleCloudUrl
                      ? 'DeleteIcon'
                      : 'PlusIcon'
                  }
                  text={
                    asignedImage === image.googleCloudUrl
                      ? 'Remove'
                      : 'Add to scene'
                  }
                  color="#f1f1f1"
                  accentColor="white"
                  size="18px"
                  classNameButton={`${styles.range_btn} ${styles.action_btn} ${
                    asignedImage === image.googleCloudUrl ? styles.selected : ''
                  }`}
                  onClick={() => onAsignImageToScene(image)}
                />
                <ButtonWithIcon
                  icon="RegenerateIcon"
                  size="18px"
                  text="Regenerate"
                  color="#f1f1f1"
                  accentColor="white"
                  onClick={() => handleRegenerateBtnClick(currentImage)}
                  classNameButton={`${styles.range_btn} ${styles.action_btn}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

GenerationFullSizeRedesign.propTypes = {
  pointImages: PropTypes.array.isRequired,
  activeImage: PropTypes.object.isRequired,
  overlayRef: PropTypes.object.isRequired,
  onCloseModal: PropTypes.func.isRequired,
  handleImageLoad: PropTypes.func.isRequired,
  getImagesByOwner: PropTypes.func.isRequired,
  onRegenerateBtnClick: PropTypes.func.isRequired,
  apiTokens: PropTypes.number.isRequired,
  setActiveImage: PropTypes.func.isRequired,
  isImageLoading: PropTypes.bool.isRequired,
  showSkeletons: PropTypes.bool.isRequired,
  storyData: PropTypes.object.isRequired,
  scene: PropTypes.object.isRequired,
  isEditing: PropTypes.bool,
  onToggleEditMode: PropTypes.func,
  index: PropTypes.number,
  onUpdateScene: PropTypes.func.isRequired,
  onAddScene: PropTypes.func.isRequired,
  onMergeScenes: PropTypes.func.isRequired,
  onAsignImageToScene: PropTypes.func.isRequired,
  image: PropTypes.object.isRequired,
  asignedImage: PropTypes.string.isRequired,
};

export default GenerationFullSizeRedesign;
