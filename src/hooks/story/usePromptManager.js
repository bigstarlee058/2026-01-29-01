import {
  useUpdatePromptMutation,
  useUpdateNegativePromptMutation,
  useGeneratePromptMutation,
  useGenerateNegativePromptMutation,
} from '../../redux/stories/storyApi';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateScene, setActiveScene, addPromptVersion } from '../../redux/scene/sceneSlice';

export const usePromptManager = () => {
  const dispatch = useDispatch();
  const [updatePrompt] = useUpdatePromptMutation();
  const [updateNegativePrompt] = useUpdateNegativePromptMutation();
  const [generatePrompt] = useGeneratePromptMutation();
  const [generateNegativePrompt] = useGenerateNegativePromptMutation();
  const [isNegativePromptLoading, setIsNegativePromptLoading] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  const onUpdatePrompt = async ({ storyId, sceneId, value }) => {
    try {
      const result = await updatePrompt({
        storyId,
        sceneId,
        newPrompt: value,
      }).unwrap();

      // Add the new prompt version
      dispatch(addPromptVersion({
        sceneId,
        prompt: value,
        isNegative: false
      }));

      // Update both the scene and activeScene in Redux
      dispatch(
        updateScene({
          sceneId,
          updates: { prompt: value },
        })
      );
      dispatch(
        setActiveScene({
          _id: sceneId,
          prompt: value,
        })
      );
    } catch (error) {
}
  };

  const onUpdateNegativePrompt = async ({ storyId, sceneId, value }) => {
    try {
      const result = await updateNegativePrompt({
        storyId,
        sceneId,
        newPrompt: value,
      }).unwrap();

      // Add the new prompt version
      dispatch(addPromptVersion({
        sceneId,
        prompt: value,
        isNegative: true
      }));

      // Update both the scene and activeScene in Redux
      dispatch(
        updateScene({
          sceneId,
          updates: { negative_prompt: value },
        })
      );
      dispatch(
        setActiveScene({
          _id: sceneId,
          negative_prompt: value,
        })
      );
    } catch (error) {
}
  };

  const onGenerateNegativePrompt = async ({
    storyId,
    sceneData,
    storyText,
  }) => {
    try {
      setIsNegativePromptLoading(true);

      // Save current prompt as version before generating new one
      if (sceneData.negative_prompt && sceneData.negative_prompt.trim() !== '') {
        dispatch(addPromptVersion({
          sceneId: sceneData._id,
          prompt: sceneData.negative_prompt,
          isNegative: true
        }));
      }

      const result = await generateNegativePrompt({
        storyId,
        sceneId: sceneData._id,
        scene: sceneData.point,
        story: storyText,
      });

      // Add the new generated prompt as version
      dispatch(addPromptVersion({
        sceneId: sceneData._id,
        prompt: result.data.negative_prompt,
        isNegative: true,
        isGenerated: true
      }));

      // Update both the scene and activeScene in Redux
      dispatch(
        updateScene({
          sceneId: sceneData._id,
          updates: { negative_prompt: result.data.negative_prompt },
        })
      );
      dispatch(
        setActiveScene({
          ...sceneData,
          negative_prompt: result.data.negative_prompt,
        })
      );

      return result;
    } catch (error) {
      setIsNegativePromptLoading(false);
} finally {
      setIsNegativePromptLoading(false);
    }
  };

  const onGeneratePrompt = async ({
    storyId,
    sceneData,
    storyText,
    sentenceId,
  }) => {
    try {
      setIsPromptLoading(true);

      // Save current prompt as version before generating new one
      if (sceneData.prompt && sceneData.prompt.trim() !== '') {
        dispatch(addPromptVersion({
          sceneId: sceneData._id,
          prompt: sceneData.prompt,
          isNegative: false
        }));
      }

      const result = await generatePrompt({
        storyId,
        sceneId: sceneData._id,
        scene: sceneData.point,
        story: storyText,
      });

      // Add the new generated prompt as version
      dispatch(addPromptVersion({
        sceneId: sceneData._id,
        prompt: result.data.prompt,
        isNegative: false,
        isGenerated: true
      }));

      // Update both the scene and activeScene in Redux
      dispatch(
        updateScene({
          sceneId: sceneData._id,
          updates: { prompt: result.data.prompt },
        })
      );
      dispatch(
        setActiveScene({
          ...sceneData,
          prompt: result.data.prompt,
        })
      );

      return result;
    } catch (error) {
      setIsPromptLoading(false);
} finally {
      setIsPromptLoading(false);
    }
  };

  return {
    onUpdatePrompt,
    onUpdateNegativePrompt,
    onGenerateNegativePrompt,
    onGeneratePrompt,
    isPromptLoading,
    isNegativePromptLoading,
  };
};
