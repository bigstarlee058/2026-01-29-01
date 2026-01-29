import React, { useState } from 'react';
import styles from './PromptEditor.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { LoaderDots } from 'components/reusableComponents/LoaderDots';
import ChevronRightIcon from 'components/Icons/ChevronRightIcon';

const PromptEditor = ({ defaultPrompt, onPromptChange, storyText, onTest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isTesting, setIsTesting] = useState(false);
  const [testScenes, setTestScenes] = useState([]);
  const [isResultsOpen, setIsResultsOpen] = useState(true);

  const handlePromptChange = e => {
    setPrompt(e.target.value);
    onPromptChange(e.target.value);
  };

  const handleTest = async () => {
    if (!storyText?.trim()) {
      alert('Please enter story text first');
      return;
    }

    setIsTesting(true);
    setTestScenes([]);
    setIsResultsOpen(true);

    try {
      await onTest(prompt, newScenes => {
        setTestScenes(prevScenes => [...prevScenes, ...newScenes]);
      });
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const checkMissedWords = () => {
    const missedWords = new Set();

    // Remove all special characters and extra spaces, convert to lowercase
    const cleanText = text => {
      return text
        .toLowerCase()
        .replace(/—/g, ' ') // Replace em dashes with space
        .replace(/-/g, ' ') // Replace hyphens with space
        .replace(/[^a-zа-яіїєґ0-9\s]/gi, '') // Remove everything except letters, numbers and spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing spaces
    };

    const storyWords = cleanText(storyText).split(' ');
    const scenesWords = cleanText(
      testScenes.map(scene => scene.scene || scene.text).join(' ')
    ).split(' ');

    // Collect unique missed words
    storyWords.forEach(word => {
      if (!scenesWords.includes(word)) {
        missedWords.add(word);
      }
    });

    return {
      words: Array.from(missedWords),
      total: missedWords.size,
    };
  };

  return (
    <div className={styles.promptEditor}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <h3>Scenes Generation Testing</h3>
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
          <ChevronRightIcon color="rgba(255, 255, 255, 0.8)" />
        </span>
      </div>
      {isOpen && (
        <div className={styles.content}>
          <div className={styles.promptField}>
            <label>Scene Generation Prompt</label>
            <textarea
              value={prompt}
              onChange={handlePromptChange}
              className={styles.textarea}
              placeholder="Enter custom prompt for scene generation..."
            />
            <div className={styles.actions}>
              <button
                className={styles.resetButton}
                onClick={() => {
                  setPrompt(defaultPrompt);
                  onPromptChange(defaultPrompt);
                  setTestScenes([]);
                }}
              >
                Reset to Default
              </button>
              <button
                className={`${styles.testButton} ${
                  isTesting ? styles.testing : ''
                }`}
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? <LoaderDots /> : 'Test Prompt'}
              </button>
            </div>
          </div>
          {(testScenes.length > 0 || isTesting) && (
            <div className={styles.testResults}>
              <div
                className={styles.resultsHeader}
                onClick={() => setIsResultsOpen(!isResultsOpen)}
              >
                <h4>
                  Test Results
                  {isTesting && (
                    <span className={styles.processingIndicator}>
                      Processing text... <LoaderDots />
                    </span>
                  )}
                </h4>
              </div>
              {isResultsOpen && (
                <div className={styles.scenes}>
                  <div className={styles.missedWords}>
                    <div className={styles.missedWordsHeader}>
                      Missed words: {checkMissedWords().total}
                    </div>
                    {checkMissedWords().words.map((word, index) => (
                      <span key={index} className={styles.missedWord}>
                        {word}
                      </span>
                    ))}
                  </div>
                  {testScenes.map((scene, index) => (
                    <div
                      key={index}
                      className={`${styles.scene} ${styles.fadeIn}`}
                    >
                      <span className={styles.sceneNumber}>{index + 1}.</span>
                      <p>{scene.scene || scene.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { PromptEditor };
