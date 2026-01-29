import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { user } from '../redux/auth';
import { createPrompt } from 'utils/prompts';

export const useStory = () => {
  const { username, type, id } = useSelector(user);
  const { storyId: urlStoryId } = useParams();
  const [sentenceId, setSentenceId] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [isImagesLoading, setIsImagesLoading] = useState(false);
  const [isDivideLoading, setIsDivideLoading] = useState(false);
  const [audio, setAudio] = useState(null);
  const [selections, setSelections] = useState([]);

  const onCheckedImageToggle = (url, sceneId) => {};

  const getImagesBySceneId = (storyData, id) => {
    const images =
      storyData.images.length > 0 &&
      storyData.images.filter(image => image.owner === id && image.status);
    return images;
  };

  const onGenerateImageByBot = async (sentences, size) => {
    try {
      setIsImagesLoading(true);

      const [width, height] = size.split(',');

      const points = sentences.map(({ points }) => points).flat();

      for (const point of points) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await createPrompt({
          pointId: point._id,
          point: point.point,
          prompt: point.prompt.trim(),
          negative_prompt: point.negative_prompt.trim(),
          width: Number(width),
          height: Number(height),
          status: 'NEW',
          storyId: urlStoryId,
        });
      }

      setIsImagesLoading(true);
    } catch (error) {
      setIsImagesLoading(false);
    }
  };

  const onGetImageByPromptByBot = async (sentences, size) => {
    try {
      const [width, height] = size.split(',');
      const sentence = sentences.find(sentence => sentence._id === sentenceId);
      const scene = sentence.points?.find(point => point._id === sceneId);
      await createPrompt({
        pointId: sceneId,
        point: scene.point,
        prompt: scene.prompt,
        negative_prompt: scene.negative_prompt,
        width: scene.width || Number(width),
        height: scene.height || Number(height),
        status: 'NEW',
        storyId: urlStoryId,
      });
    } catch (error) {}
  };



  return {
    username,
    sentenceId,
    getImagesBySceneId,
    onCheckedImageToggle,
    onGetImageByPromptByBot,
    isDivideLoading,
    storyId: urlStoryId,
  };
};
