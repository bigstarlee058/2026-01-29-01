import { useEffect } from 'react';

export const useImageSync = (storyData, store) => {
  useEffect(() => {
    if (!storyData?.sentences || !store?.canvas) return;

    const allPoints = storyData.sentences.flatMap(sentence => sentence.points);

    // Check each point for new or updated images
    allPoints.forEach(point => {
      const pointImage = storyData.images?.find(
        img => img.owner === point._id && img.generated_images?.length > 0
      );

      if (pointImage?.generated_images?.[0]?.url) {
        store.updateCanvasImage({
          url: pointImage.generated_images[0].url,
          pointId: point._id,
          imageId: pointImage.id,
        });
      }
    });
  }, [storyData?.images, store]);
};
