import styles from './PromptsTextArea.module.scss';
import { LoaderDots } from 'components/reusableComponents/LoaderDots';
import { ChatGptIconButton } from 'components/reusableComponents/ChatGptIconButton/ChatGptIconButton';
import { useState, useEffect } from 'react';
import { usePromptManager } from 'hooks/story/usePromptManager';
import { setActiveScene } from '../../../redux/scene/sceneSlice';
import { useDispatch } from 'react-redux';

const PromptTextArea = ({ sceneData, storyData, sentenceId, style }) => {
  const [localPrompt, setLocalPrompt] = useState(sceneData?.prompt || '');
  const [localNegativePrompt, setLocalNegativePrompt] = useState(
    sceneData?.negative_prompt || ''
  );
  const dispatch = useDispatch();

  const {
    onUpdatePrompt,
    onUpdateNegativePrompt,
    onGenerateNegativePrompt,
    onGeneratePrompt,
    isPromptLoading,
    isNegativePromptLoading,
  } = usePromptManager();

  useEffect(() => {
    if (sceneData?.prompt !== undefined && localPrompt !== sceneData.prompt) {
      setLocalPrompt(sceneData.prompt);
    }
  }, [sceneData?.prompt]);

  useEffect(() => {
    if (
      sceneData?.negative_prompt !== undefined &&
      localNegativePrompt !== sceneData.negative_prompt
    ) {
      setLocalNegativePrompt(sceneData.negative_prompt);
    }
  }, [sceneData?.negative_prompt]);

  const onGeneratePrompts = async isNegativePrompt => {
    if (isNegativePrompt) {
      const result = await onGenerateNegativePrompt({
        storyId: storyData._id,
        sceneData: sceneData,
        sentenceId: sceneData.sentenceId || sentenceId,
        storyText: storyData.text,
      });
      setLocalNegativePrompt(result.data.negative_prompt);
      dispatch(
        setActiveScene({
          ...sceneData,
          negative_prompt: result.data.negative_prompt,
        })
      );
    } else {
      const result = await onGeneratePrompt({
        storyId: storyData._id,
        sceneData: sceneData,
        sentenceId: sceneData.sentenceId || sentenceId,
        storyText: storyData.text,
      });
      setLocalPrompt(result.data.prompt);
      dispatch(
        setActiveScene({
          ...sceneData,
          prompt: result.data.prompt,
        })
      );
    }
  };

  const onPromptInputChange = e => {
    const value = e.target.value;
    setLocalPrompt(value);
  };

  const onPromptBlur = () => {
    if (localPrompt !== sceneData.prompt) {
      onUpdatePrompt({
        sentenceId: sceneData.sentenceId || sentenceId,
        storyId: storyData._id,
        sceneId: sceneData._id,
        value: localPrompt,
      });
    }
  };

  const onNegativeInputChange = e => {
    const value = e.target.value;
    setLocalNegativePrompt(value);
  };

  const onNegativePromptBlur = () => {
    if (localNegativePrompt !== sceneData.negative_prompt) {
      onUpdateNegativePrompt({
        sentenceId: sceneData.sentenceId || sentenceId,
        storyId: storyData._id,
        sceneId: sceneData._id,
        value: localNegativePrompt,
      });
    }
  };

  return (
    <form style={style}>
      <label htmlFor="prompt" className={styles.title}>
        Prompt
      </label>
      <div className={styles.prompt_content}>
        <textarea
          className={styles.prompt}
          name="prompt"
          id="prompt"
          value={localPrompt}
          maxLength={980}
          onChange={e => onPromptInputChange(e)}
          onBlur={onPromptBlur}
        ></textarea>
        {isPromptLoading ? (
          <div className={styles.icon}>
            <LoaderDots />
          </div>
        ) : (
          <div className={styles.icon}>
            <ChatGptIconButton
              onGenerate={onGeneratePrompts}
              isLoading={isPromptLoading}
            />
          </div>
        )}
      </div>
      <label htmlFor="negative-prompt" className={styles.title}>
        Negative prompt
      </label>
      <div className={styles.prompt_content}>
        <textarea
          className={styles.prompt}
          name="negative-prompt"
          id="negative-prompt"
          value={localNegativePrompt}
          maxLength={980}
          onChange={e => onNegativeInputChange(e)}
          onBlur={onNegativePromptBlur}
        ></textarea>
        {isNegativePromptLoading ? (
          <div className={styles.icon}>
            <LoaderDots />
          </div>
        ) : (
          <div className={styles.icon}>
            <ChatGptIconButton
              onGenerate={onGeneratePrompts}
              isLoading={isNegativePromptLoading}
              isNegativePrompt="true"
            />
          </div>
        )}
      </div>
    </form>
  );
};

export { PromptTextArea };
