import { useState } from 'react';
import styles from './GenerationPromptFullSizeRedesign.module.scss';

const GenerationPromptFullSizeRedesign = ({
  initialPrompt = '',
  initialNegativePrompt = '',
  onPromptsChange,
}) => {
  const [similarityPrompt, setSimilarityPrompt] = useState(initialPrompt);
  const [similarityNegativePrompt, setSimilarityNegativePrompt] = useState(
    initialNegativePrompt
  );

  const handlePromptChange = e => {
    setSimilarityPrompt(e.target.value);
    onPromptsChange(e.target.value, similarityNegativePrompt);
  };

  const handleNegativePromptChange = e => {
    setSimilarityNegativePrompt(e.target.value);
    onPromptsChange(similarityPrompt, e.target.value);
  };

  return (
    <div className={styles.prompts_container}>
      <div className={styles.input_wrap}>
        <div className={styles.floating_label_group}>
          <textarea
            className={styles.prompt}
            id="input-area"
            type="text"
            maxLength={980}
            value={similarityPrompt}
            onChange={handlePromptChange}
          />
          <label
            className={`${styles.floating_label} ${
              similarityPrompt ? styles.has_value : ''
            }`}
            htmlFor="input-area"
          >
            Prompt
          </label>
        </div>
      </div>
      <div className={styles.input_wrap}>
        <div className={styles.floating_label_group}>
          <textarea
            className={styles.prompt}
            id="negative-prompt-area"
            type="text"
            maxLength={980}
            value={similarityNegativePrompt}
            onChange={handleNegativePromptChange}
          />
          <label
            className={`${styles.floating_label} ${
              similarityNegativePrompt ? styles.has_value : ''
            }`}
            htmlFor="negative-prompt-area"
          >
            Negative prompt
          </label>
        </div>
      </div>
    </div>
  );
};

export default GenerationPromptFullSizeRedesign;
