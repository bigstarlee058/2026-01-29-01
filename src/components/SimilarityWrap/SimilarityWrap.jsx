import { useState } from 'react';
import icons from '../../images/icons.svg';
import styles from './SimilarityWrap.module.scss';
import SimilaritySwitch from '../SimilaritySwitch/SimilaritySwitch';
import GenerationPromptFullSize from '../../pages/VideoCreationPage/GenerationPromptFullSize/GenerationPromptFullSize';

const SimilarityWrap = ({
  image,
  onRegenerate,
  regenerateLoading,
  apiTokens,
  range,
  onRangeChange,
}) => {
  const [prompts, setPrompts] = useState({
    prompt: image.prompt || '',
    negativePrompt: image.negativePrompt || '',
  });

  const handlePromptsChange = (prompt, negativePrompt) => {
    setPrompts({ prompt, negativePrompt });
  };

  return (
    <div className={styles.similarity_wrap}>
      <GenerationPromptFullSize
        initialPrompt={image.prompt}
        initialNegativePrompt={image.negativePrompt}
        onPromptsChange={handlePromptsChange}
      />
      <SimilaritySwitch range={range} onChange={onRangeChange} />
      <div className={styles.button_wrap}>
        <button
          className={`${styles.range_btn} primary_btn`}
          onClick={() =>
            onRegenerate(image, prompts.prompt, prompts.negativePrompt)
          }
          type="button"
          disabled={regenerateLoading}
        >
          Regenerate
          {regenerateLoading && (
            <svg className={styles.load_icon} width="16px" height="13px">
              <use href={icons + `#icon-load`}></use>
            </svg>
          )}
        </button>
        <span
          className={`${styles.api_tokens} ${
            apiTokens > 500
              ? styles.green
              : apiTokens < 500 && apiTokens > 0
              ? styles.yellow
              : apiTokens < 0 && styles.red
          }`}
        >
          Api Tokens: {apiTokens}
        </span>
      </div>
    </div>
  );
};

export default SimilarityWrap;
