import {
  useAddSceneMutation,
  useDeleteSceneMutation,
  useUpdateSceneMutation,
} from '../../redux/stories/storyApi';
import { StoreContext } from '../../mobx';
import React, { useState } from 'react';
import { createPrompt } from '../../utils/prompts';
import { deletePointPrompts } from '../../utils/prompts';
// import { useDispatch, useSelector } from 'react-redux';
// import  { setActiveScene, setActiveSentence } from 'state/scene/sceneSlice';

export const useSceneManager = () => {
  // const activeSentence = useSelector(state => state.scene.activeSentence);
  // const activeScene = useSelector(state => state.scene.activeScene);

  const [deleteScene] = useDeleteSceneMutation();
  const [addScene] = useAddSceneMutation();
  const [updateScene] = useUpdateSceneMutation();
  const store = React.useContext(StoreContext);

  const [isGenerationLoading, setGenerateLoading] = useState(false);

  // const onUpdateActiveScene = (sceneId, sentenceId) => {
  //   dispatch(setActiveScene(sceneId));
  //   dispatch(setActiveSentence(sentenceId));
  // };

  const onUpdateScene = async ({
    storyId,
    sceneId,
    value,
    prompt,
    negative_prompt,
    selectedImage,
  }) => {
    try {
await updateScene({
        storyId,
        sceneId,
        text: value,
        prompt,
        negative_prompt,
        selectedImage,
      }).unwrap();
    } catch (error) {
      console.error('Error in onChangeScene:', error);
    }
  };

  const onSceneDelete = async ({ storyId, sceneId }) => {
    try {
await deleteScene({
        storyId: storyId,
        sceneId: sceneId,
      }).unwrap();

      const elementsToDelete = store.editorElements.filter(
        el => el.pointId === sceneId
      );

      for (const element of elementsToDelete) {
        await store.removeEditorElement(element.id);
      }
    } catch (error) {
}
  };

  const onMergeScenes = async ({ storyData, sceneId, index }) => {
    try {
      const currentScene = storyData.scenes[index];
      const nextScene = storyData.scenes[index + 1];

      if (!currentScene || !nextScene) {
        console.error('Current scene or next scene not found');
        return;
      }

      updateScene({
        storyId: storyData._id,
        sceneId: sceneId,
        text: `${currentScene.text} ${nextScene.text}`,
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      deleteScene({
        storyId: storyData._id,
        sceneId: nextScene._id,
      });
    } catch (error) {
      console.error('Error in onMergePoints:', error);
    }
  };

  const onAddScene = async ({ storyId, sentenceId, sceneId, place }) => {
    try {
      const result = await addScene({
        storyId,
        scene: '',
        position: {
          id: sceneId,
          place,
        },
      }).unwrap();

      if (result && result.point) {
        store.createElementForNewPoint(result.point, sentenceId);

        store.recalculateElementsForSentence(sentenceId, result.point._id);
      }
    } catch (error) {
      console.error('Error in onAddScene:', error);
    }
  };
  const onUpdateSceneSize = ({ storyId, newSize, sceneData, sentenceId }) => {
    if (
      sceneData.width !== newSize.size.width ||
      sceneData.height !== newSize.size.height
    ) {
      updateScene({
        storyId: storyId,
        sceneId: sceneData._id,
        width: Number(newSize.size.width),
        height: Number(newSize.size.height),
      });
    }
  };

  const onGenerateImageByBot = async ({
    storyData,
    sceneId,
    prompt,
    negative_prompt,
  }) => {
    const sceneData = storyData.scenes.find(scene => scene._id === sceneId);

    try {
      setGenerateLoading(true);

      await createPrompt({
        pointId: sceneData._id,
        point: sceneData.text,
        prompt: prompt,
        negative_prompt: negative_prompt,
        width: storyData.resolution.width,
        height: storyData.resolution.height,
        status: 'NEW',
        storyId: storyData._id,
        sentenceId: sceneData.sentenceId,
      });
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGenerateLoading(false);
    }
  };

  const onDeleteGenerations = async ({ sceneId }) => {
    try {
      await deletePointPrompts(sceneId);
      setGenerateLoading(false);
    } catch (error) {
}
  };

  // const onUpdateActiveScene = (storyData, sceneItem, sentenceId) => {
  //   let scene = sceneItem;
  //   let foundSentenceId = sentenceId;

  //   if (sentenceId) {
  //     const selectedElement = store.editorElements.find(
  //       el => el.pointId === scene._id && el.type === 'imageUrl'
  //     );

  //     setActiveSentence(sentenceId);
  //     store.setSelectedElement(selectedElement);
  //   } else {
  //     if (!scene._id) {
  //       scene = [...storyData.sentences]
  //         .map(sentence => sentence.points)
  //         .flat()
  //         .find(point => point._id === sceneItem);
  //     }

  //     foundSentenceId = [...storyData.sentences].find(sentence =>
  //       sentence.points.find(point => point._id === scene._id)
  //     )?._id;

  //     setActiveSentence(foundSentenceId);
  //   }

  //   setActiveScene({
  //     ...scene,
  //     sentenceId: foundSentenceId,
  //   });
  // };

  return {
    onAddScene,
    onMergeScenes,
    onSceneDelete,
    onUpdateScene,
    onUpdateSceneSize,
    onGenerateImageByBot,
    isGenerationLoading,
    onDeleteGenerations,
    // onUpdateActiveScene,
  };
};
