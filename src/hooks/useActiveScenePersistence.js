import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveScene, selectActiveScene } from '../redux/scene/sceneSlice';

export const useActiveScenePersistence = storyData => {
  const dispatch = useDispatch();
  const activeScene = useSelector(selectActiveScene);

  // Save active scene to localStorage whenever it changes
  useEffect(() => {
    if (activeScene) {
      localStorage.setItem('activeScene', JSON.stringify(activeScene));
    } else {
      localStorage.removeItem('activeScene');
    }
  }, [activeScene]);

  // Restore active scene from localStorage on initial load
  useEffect(() => {
    if (!activeScene && storyData?.scenes?.length > 0) {
      const savedScene = localStorage.getItem('activeScene');
      if (savedScene) {
        const parsedScene = JSON.parse(savedScene);
        // Verify the saved scene still exists in the current story
        const sceneExists = storyData.scenes.some(
          scene => scene._id === parsedScene._id
        );
        if (sceneExists) {
          dispatch(setActiveScene(parsedScene));
        } else {
          // If saved scene doesn't exist, set first scene as active
          dispatch(setActiveScene(storyData.scenes[0]));
        }
      } else {
        // If no saved scene, set first scene as active
        dispatch(setActiveScene(storyData.scenes[0]));
      }
    }
  }, [storyData, activeScene, dispatch]);
};
