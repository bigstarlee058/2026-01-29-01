/**
 * Utility to synchronize scene images with timeline elements
 * Updates placeholder images with actual scene images from storyboard
 */
const syncSceneImages = async (storyData, store, scenes) => {
  if (!storyData?.scenes || !store || !scenes) {
    return;
  }

  try {
    // Find all media elements in the timeline (images, videos, audio)
    const mediaElements = store.editorElements.filter(
      element => element.type === 'imageUrl' || element.type === 'image' || element.type === 'video' || element.type === 'audio'
    );

    // Get all valid scene IDs from current scenes
    const validSceneIds = new Set(scenes.map(scene => scene._id));

    // Remove elements for deleted scenes
    const elementsToRemove = [];
    
    // Process each media element
    for (const element of mediaElements) {
      if (!element.pointId) {
        continue; // Skip elements without pointId
      }

      // Check if this element belongs to a deleted scene
      const isMainScene = validSceneIds.has(element.pointId);
      const isSplitScene = element.pointId.includes('_split_') && 
        validSceneIds.has(element.pointId.split('_split_')[0]);
      
      if (!isMainScene && !isSplitScene) {
        // This element belongs to a deleted scene, mark for removal
        elementsToRemove.push(element.id);
        continue;
      }

      // Only sync imageUrl elements with scene data, skip other media types
      if (element.type === 'imageUrl') {
        // Find corresponding scene in storyData
        const scene = storyData.scenes.find(s => s._id === element.pointId);
        if (!scene) {
          continue;
        }

        // Check if scene has a selected image
        const sceneImageUrl = scene.selectedImage?.googleCloudUrl || scene.selectedImage?.url;
        const sceneMinImageUrl = scene.selectedImage?.minGoogleCloudUrl || 
          (scene.selectedImage?.url ? `${scene.selectedImage.url}?w=512` : null);

        // Get current element image URL
        const currentImageUrl = element.properties?.src;
        const currentMinImageUrl = element.properties?.minUrl;

        // Check if images need to be updated
        const needsUpdate = 
          (sceneImageUrl && sceneImageUrl !== currentImageUrl) ||
          (sceneMinImageUrl && sceneMinImageUrl !== currentMinImageUrl) ||
          (!sceneImageUrl && currentImageUrl && element.subType !== 'placeholder');

        if (needsUpdate) {
          try {
            // Update canvas image using store method
            await store.updateCanvasImage({
              url: sceneImageUrl,
              minUrl: sceneMinImageUrl,
              pointId: element.pointId,
              id: element.id,
            });
          } catch (error) {
            // Silently handle errors
          }
        }
      }
    }

    // Remove elements for deleted scenes
    for (const elementId of elementsToRemove) {
      try {
        await store.removeEditorElement(elementId);
      } catch (error) {
        // Silently handle errors
      }
    }

    // Force canvas render to ensure all changes are visible
    if (store.canvas) {
      store.canvas.requestRenderAll();
    }

  } catch (error) {
    // Silently handle errors
  }
};

const checkIfImageSyncNeeded = (storyData, store, scenes = []) => {
  if (!storyData?.scenes || !store) {
    return false;
  }

  const mediaElements = store.editorElements.filter(
    element => element.type === 'imageUrl' || element.type === 'image' || element.type === 'video' || element.type === 'audio'
  );

  // Get all valid scene IDs from current scenes
  const validSceneIds = new Set(scenes.map(scene => scene._id));

  for (const element of mediaElements) {
    if (!element.pointId) continue;

    // Check if this element belongs to a deleted scene
    const isMainScene = validSceneIds.has(element.pointId);
    const isSplitScene = element.pointId.includes('_split_') && 
      validSceneIds.has(element.pointId.split('_split_')[0]);
    
    if (!isMainScene && !isSplitScene) {
      // This element belongs to a deleted scene, sync needed to remove it
      return true;
    }

    // Only check imageUrl elements for scene sync
    if (element.type === 'imageUrl') {
      const scene = storyData.scenes.find(s => s._id === element.pointId);
      if (!scene) continue;

      const sceneImageUrl = scene.selectedImage?.googleCloudUrl || scene.selectedImage?.url;
      const sceneMinImageUrl = scene.selectedImage?.minGoogleCloudUrl || 
        (scene.selectedImage?.url ? `${scene.selectedImage.url}?w=512` : null);
      const currentImageUrl = element.properties?.src;
      const currentMinImageUrl = element.properties?.minUrl;

      // Check if main URL or min URL differs, or if placeholder needs to be replaced with actual image
      if (
        sceneImageUrl !== currentImageUrl ||
        sceneMinImageUrl !== currentMinImageUrl ||
        (!sceneImageUrl && currentImageUrl && element.subType !== 'placeholder') ||
        (sceneImageUrl && element.subType === 'placeholder')
      ) {
        return true;
      }
    }
  }

  return false;
};

const syncSingleSceneImage = async (scene, element, store) => {
  if (!scene || !element || !store) {
    return false;
  }

  const sceneImageUrl = scene.selectedImage?.googleCloudUrl || scene.selectedImage?.url;
  const sceneMinImageUrl = scene.selectedImage?.minGoogleCloudUrl || 
    (scene.selectedImage?.url ? `${scene.selectedImage.url}?w=512` : null);
  const currentImageUrl = element.properties?.src;
  const currentMinImageUrl = element.properties?.minUrl;

  // Check if update is needed
  const needsUpdate = 
    sceneImageUrl !== currentImageUrl ||
    sceneMinImageUrl !== currentMinImageUrl ||
    (!sceneImageUrl && currentImageUrl && element.subType !== 'placeholder') ||
    (sceneImageUrl && element.subType === 'placeholder');

  if (!needsUpdate) {
    return false;
  }

  try {
    await store.updateCanvasImage({
      url: sceneImageUrl,
      minUrl: sceneMinImageUrl,
      pointId: element.pointId,
      id: element.id,
    });
    return true;
  } catch (error) {
    return false;
  }
};

const removeElementsForDeletedScenes = async (store, scenes) => {
  if (!store || !scenes) {
    return 0;
  }

  try {
    // Find all media elements in the timeline
    const mediaElements = store.editorElements.filter(
      element => element.type === 'imageUrl' || element.type === 'image' || element.type === 'video' || element.type === 'audio'
    );

    // Get all valid scene IDs from current scenes
    const validSceneIds = new Set(scenes.map(scene => scene._id));

    // Find elements to remove
    const elementsToRemove = [];
    
    for (const element of mediaElements) {
      if (!element.pointId) {
        continue; // Skip elements without pointId
      }

      // Check if this element belongs to a deleted scene
      const isMainScene = validSceneIds.has(element.pointId);
      const isSplitScene = element.pointId.includes('_split_') && 
        validSceneIds.has(element.pointId.split('_split_')[0]);
      
      if (!isMainScene && !isSplitScene) {
        // This element belongs to a deleted scene, mark for removal
        elementsToRemove.push(element.id);
      }
    }

    // Remove elements for deleted scenes
    for (const elementId of elementsToRemove) {
      try {
        await store.removeEditorElement(elementId);
      } catch (error) {
        // Silently handle errors
      }
    }

    // Force canvas render to ensure all changes are visible
    if (store.canvas && elementsToRemove.length > 0) {
      store.canvas.requestRenderAll();
    }

    return elementsToRemove.length;

  } catch (error) {
    return 0;
  }
};

export { syncSceneImages, checkIfImageSyncNeeded, syncSingleSceneImage, removeElementsForDeletedScenes };
