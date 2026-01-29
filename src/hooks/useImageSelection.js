import { useCallback } from 'react';
import { setActiveScene, updateSelectedImage } from '../redux/scene/sceneSlice';

export function useImageSelection({ activeScene, store, onCheckedImageToggle, dispatch }) {
  return useCallback(
    image => {
      if (!activeScene) return;

      const isImageAssigned = activeScene?.selectedImage?.url === image.url;

      if (isImageAssigned) {
        dispatch(
          updateSelectedImage({
            sceneId: activeScene._id,
            selectedImage: {
              id: null,
              url: null,
              minUrl: null,
              prompt: null,
              negativePrompt: null,
              imageHeight: null,
              imageWidth: null,
            },
          })
        );
        dispatch(
          setActiveScene({
            ...activeScene,
            selectedImage: null,
          })
        );

        store.updateCanvasImage({
          pointId: activeScene._id,
          url: null,
          id: null,
        });
      } else {
        dispatch(
          updateSelectedImage({
            sceneId: activeScene._id,
            selectedImage: {
              id: image._id || image.id,
              url: image.url || image.googleCloudUrl,
              minUrl: image.minUrl || image.googleCloudUrl,
              prompt: image.prompt,
              negativePrompt: image.negativePrompt || image.negative_prompt,
              imageHeight: image.imageHeight || image.height,
              imageWidth: image.imageWidth || image.width,
            },
          })
        );

        store.updateCanvasImage({
          url: image.googleCloudUrl || image.url,
          minUrl: image.minGoogleCloudUrl || image.minUrl,
          pointId: activeScene._id,
          id: image._id || image.id,
        });

        dispatch(
          setActiveScene({
            ...activeScene,
            selectedImage: image,
          })
        );
      }

      if (typeof onCheckedImageToggle === 'function') {
        onCheckedImageToggle(image.url);
      }
    },
    [activeScene, dispatch, onCheckedImageToggle, store]
  );
}


