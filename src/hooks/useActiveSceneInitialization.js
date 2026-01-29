import { useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { setActiveScene, setActiveSentence } from '../redux/scene/sceneSlice';
import { StoreContext } from '../mobx';

export const useActiveSceneInitialization = (
  storyData,
  activeScene,
  screen
) => {
  const dispatch = useDispatch();
  const store = useContext(StoreContext);

  useEffect(() => {
    if (!storyData?.scenes?.length || activeScene) {
      return;
    }

    // Only set the first scene as active when entering prompt section and there's no active scene
    if (!activeScene && screen === 'prompt') {
      const firstScene = storyData.scenes[0];
      if (firstScene) {
        dispatch(setActiveScene(firstScene));
      }
    }

    // If there's a selected element in the store, make sure its scene is active
    if (store?.selectedElement?.pointId) {
      const scene = storyData.scenes.find(
        s => s._id === store.selectedElement.pointId
      );
      if (scene && (!activeScene || activeScene._id !== scene._id)) {
        // Dispatch setActiveScene without including store в payload
        dispatch(
          setActiveScene({
            ...scene,
          })
        );
        
        // Handle the store operations separately
        const selectedElement = store.editorElements
          .map(el => ({ ...el }))
          .find(el => el.pointId === scene._id && el.type === 'imageUrl');
        
        if (selectedElement) {
          store.setSelectedElement(selectedElement);
        }
      }
    }
  }, [storyData, screen, activeScene, dispatch, store]);
};
