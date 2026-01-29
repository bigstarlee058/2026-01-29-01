import { useState } from 'react';
import styles from './ItemContent.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import aiToolsData from 'data/aiTools.json';
import { FieldRenderer } from '../FieldRenderer/FieldRenderer';
import * as imageEditingApi from 'utils/imageEditingApi';
import { useParams } from 'react-router-dom';
import { StoreContext } from '../../../mobx';
import { useContext } from 'react';
import { observer } from 'mobx-react';
import { useError } from 'contexts/ErrorContext';
import ICON_SIZE from 'components/Icons/IconSize';
import StarsIcon from 'components/Icons/StarsIcon';
import { LoadingOverlay } from 'components/LoadingOverlay/LoadingOverlay';

// Add image imports
import backgroundImg from 'images/AIToolsImagea/backgroundImg.jpg';
import outpaintingImg from 'images/AIToolsImagea/outpaintingImg.jpg';
import inpaintingImg from 'images/AIToolsImagea/inpaintingImg.jpg';
import objectRemovalImg from 'images/AIToolsImagea/objectRemovalImg.jpg';
import relightImageImg from 'images/AIToolsImagea/relightImageImg.jpg';
import superResolutionImg from 'images/AIToolsImagea/superResolutionImg.jpg';
import faceGenerationImg from 'images/AIToolsImagea/faceGenerationImg.jpg';

// Create imageMap
const imageMap = {
  '/images/AIToolsImagea/backgroundImg.jpg': backgroundImg,
  '/images/AIToolsImagea/outpaintingImg.jpg': outpaintingImg,
  '/images/AIToolsImagea/inpaintingImg.jpg': inpaintingImg,
  '/images/AIToolsImagea/objectRemovalImg.jpg': objectRemovalImg,
  '/images/AIToolsImagea/relightImageImg.jpg': relightImageImg,
  '/images/AIToolsImagea/superResolutionImg.jpg': superResolutionImg,
  '/images/AIToolsImagea/faceGenerationImg.jpg': faceGenerationImg,
};

const ItemContent = observer(({ selectedTool, onGoBack }) => {
  const store = useContext(StoreContext);
  const { storyId } = useParams();
  const { showError, showInfoNeutral, showInfoPositive } = useError();

  const [inputFields, setInputFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const rawToolData = aiToolsData.tools.find(t => t.name === selectedTool);
  // Resolve the image path to the imported module
  const tool = {
    ...rawToolData,
    image: rawToolData ? imageMap[rawToolData.image] : null,
  };

  const { fields } = tool;

  const handleBack = () => {
    onGoBack(false);
  };

  const exportAsMask = () => {
    if (!store.canvas) return;

    // Create a copy of the canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    // Set export canvas dimensions
    exportCanvas.width = store.canvas.width;
    exportCanvas.height = store.canvas.height;

    // Fill background with black color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Find all lines on the canvas
    const lineObjects = store.canvas
      .getObjects()
      .filter(obj => obj.type === 'line' || obj.type === 'path');

    // Draw all lines with white color and increased thickness for better visibility
    lineObjects.forEach(line => {
      // Save current context state
      ctx.save();

      // Set drawing parameters
      ctx.strokeStyle = '#FFFFFF'; // White color for all lines
      ctx.lineWidth = line.strokeWidth * 1.5; // Increase thickness for better visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.type === 'path' && line.path) {
        // Draw path
        ctx.beginPath();

        for (let i = 0; i < line.path.length; i++) {
          const point = line.path[i];
          const command = point[0];
          const x = point[1];
          const y = point[2];

          if (command === 'M') {
            ctx.moveTo(x, y);
          } else if (command === 'L') {
            ctx.lineTo(x, y);
          } else if (command === 'Q') {
            const x2 = point[3];
            const y2 = point[4];
            ctx.quadraticCurveTo(x, y, x2, y2);
          } else if (command === 'C') {
            const x2 = point[3];
            const y2 = point[4];
            const x3 = point[5];
            const y3 = point[6];
            ctx.bezierCurveTo(x, y, x2, y2, x3, y3);
          }
        }

        ctx.stroke();
      } else if (line.type === 'line') {
        // Get line coordinates considering canvas scaling and offset
        const x1 = line.x1;
        const y1 = line.y1;
        const x2 = line.x2;
        const y2 = line.y2;

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Restore context state
      ctx.restore();
    });

    // Add blur for edge smoothing (optional)
    try {
      ctx.filter = 'blur(1px)';
      ctx.drawImage(exportCanvas, 0, 0);
      ctx.filter = 'none';
    } catch (e) {
}

    return exportCanvas.toDataURL('image/png');
  };

  const getCanvasImage = () => {
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
          imageId: imageElement.id,
          imageUrl:
            imageElement.properties.googleCloudUrl ||
            imageElement.properties.src,
        };
      })
      .filter(Boolean); // Remove any null values

    // If there are multiple images, return the last one because it is on highest layer
    return imageData.length > 1
      ? imageData[imageData.length - 1]
      : imageData[0];
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      if (!tool.apiCall) return;
      setIsLoading(true);
      let updatedFields = { ...inputFields };

      if (tool.fields.includes('brush')) {
        const maskDataUrl = exportAsMask();

        // Convert base64 to File object
        const base64Response = await fetch(maskDataUrl);
        const blob = await base64Response.blob();
        const maskFile = new File([blob], 'mask.png', { type: 'image/png' });
        updatedFields = {
          ...updatedFields,
          maskImage: maskFile,
        };
      }

      const apiFunction = imageEditingApi[tool.apiCall];
      if (!apiFunction) return;

      const canvasImage = getCanvasImage();
      if (canvasImage) {
        showInfoNeutral(tool.processingMessage);

        const response = await apiFunction({
          ...updatedFields,
          imageUrl: canvasImage.imageUrl,
          storyId: storyId,
          imageId: canvasImage.imageId,
        });

        if (response?.result?.url) {
          // Use the store method to update the matching element
          await store.updateCanvasImage({
            url: response?.result?.url,
            minUrl: response?.result?.url,
            pointId: null,
            id: canvasImage?.imageId,
          });
          showInfoPositive(tool.successMessage);
        } else {
          showError('Image update failed', 'An error occurred while updating the image. Please try again.');
        }
      } else {
        showError(tool.errorMessage);
      }
    } catch (error) {
      console.error(`Error in ${tool.apiCall}:`, error);
      showError('Image processing error', 'Something went wrong while processing the image. Please retry later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadImage = image => {
    setInputFields(prev => ({
      ...prev,
      file: image,
    }));
  };

  const onDeleteImage = () => {
    setInputFields(prev => ({
      ...prev,
      file: null,
    }));
  };

  return (
    <form onSubmit={e => onSubmit(e)} className={styles.aiTool}>
      {isLoading && <LoadingOverlay text="Generating image..." />}
      <div className={styles.aiTool__topSection}>
        <div className={styles.aiTool__header}>
          <h1 className={styles.aiTool__title}>{tool.title}</h1>
          <ButtonWithIcon
            icon="CloseAiIcon"
            classNameButton={styles.aiTool__closeBtn}
            onClick={handleBack}
            dataTestid="image-editing-close-btn"
            size={ICON_SIZE.REGULAR}
            color="#42454F"
          />
        </div>
        <img
          src={tool.image}
          alt={tool.title}
          className={styles.aiTool__image}
        />
        {fields.length > 0 && (
          <FieldRenderer
            tool={tool}
            inputFields={inputFields}
            setInputFields={setInputFields}
            onUpload={handleUploadImage}
            onDeleteImage={onDeleteImage}
            uploadedImg={inputFields.file}
          />
        )}
      </div>
      <div className={styles.aiTool__bottomSection}>
        <button 
          className={styles.aiTool__applyButton} 
          type="submit"
          disabled={isLoading}
        >
          <StarsIcon />
          {tool.applyBtnText}
        </button>
      </div>
    </form>
  );
});

export { ItemContent };
