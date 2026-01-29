import React, { useState, useEffect } from 'react';
import styles from './PromptGenerationStatus.module.scss';

const defaultMessages = [
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because every frame deserves intention.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because great stories start with clarity.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because vision needs structure.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because storytelling begins before the first word.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: "Because what's unseen shapes what's felt.",
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because directing starts long before action.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because emotion lives in the setup.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because every story deserves a strong first move.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because precision is the soul of creativity.',
  },
  {
    main: 'Generating prompts and scenes...',
    sub: 'Because magic begins with the blueprint.',
  },
];

const voiceoverMessages = [
  {
    main: 'Generating voiceovers...',
    sub: 'Because every word needs its perfect voice.',
  },
  {
    main: 'Generating voiceovers...',
    sub: 'Because stories come alive through sound.',
  },
  {
    main: 'Generating voiceovers...',
    sub: 'Because emotion flows through the spoken word.',
  },
  {
    main: 'Generating voiceovers...',
    sub: 'Because narration is the soul of storytelling.',
  },
  {
    main: 'Generating voiceovers...',
    sub: 'Because the right voice brings magic to life.',
  },
];

const wrapTextInSpans = (text) => {
  return text.split('').map((char, index) => (
    <span
      key={index}
      className={styles.animatedLetter}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {char}
    </span>
  ));
};

const PromptGenerationStatus = ({
  isGenerating,
  progress,
  completedScenes,
  totalScenes,
  inline = false,
  size = 'large',
  message = null,
  type = 'prompts', // 'prompts' or 'voiceover'
}) => {
  const [currentMessage, setCurrentMessage] = useState(null);

  useEffect(() => {
    if (isGenerating) {
      if (message) {
        // Use custom message if provided
        setCurrentMessage({
          main: message,
          sub: '',
        });
      } else {
        // Use predefined messages based on type
        const messages = type === 'voiceover' ? voiceoverMessages : defaultMessages;
        const randomIndex = Math.floor(Math.random() * messages.length);
        setCurrentMessage(messages[randomIndex]);
      }
    }
  }, [isGenerating, message, type]);

  if (!isGenerating) return null;

  const mainText = currentMessage?.main || 'Processing...';
  const subText = currentMessage?.sub || '';
  
  // Ensure progress is a valid number
  const safeProgress = isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));
  const safeCompletedScenes = isNaN(completedScenes) ? 0 : completedScenes;
  const safeTotalScenes = isNaN(totalScenes) ? 0 : totalScenes;

  return (
    <div
      className={`${styles.container} ${inline ? styles.inline : ''} ${
        styles[size]
      }`}
    >
      <div className={styles.content}>
        <div className={styles.textContainer}>
          <span className={styles.mainText}>
            {wrapTextInSpans(mainText)}
          </span>
          {subText && (
            <span className={styles.subText}>
              {wrapTextInSpans(subText)}
            </span>
          )}
        </div>
      </div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
        <span className={styles.progress}>
          {safeCompletedScenes}/{safeTotalScenes} ({Math.round(safeProgress)}%)
        </span>
      </div>
    </div>
  );
};

export { PromptGenerationStatus };
