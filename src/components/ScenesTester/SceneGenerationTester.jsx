import React, { useState, useEffect } from 'react';
import styles from './SceneGenerationTester.module.scss';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { LoaderDots } from 'components/reusableComponents/LoaderDots';
import ChevronRightIcon from 'components/Icons/ChevronRightIcon';
import {
  getSentenceWithScenes,
  getScenesDescription,
  getScenesBreakdown,
  getCharacters,
} from 'utils/ai/gptApi';
import {
  DEFAULT_CHARACTER_PROMPT,
  DEFAULT_SCENE_PROMPT,
  DEFAULT_DESCRIPTION_PROMPT,
  DEFAULT_BREAKDOWN_PROMPT,
  DEFAULT_REGENERATION_PROMPT,
} from 'data/prompts';

const SceneGenerationTester = ({
  storyText: initialStoryText = '',
  characters: initialCharacters = [],
  mood,
  purpose,
  style,
  onRegenerationPromptChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [characterPrompt, setCharacterPrompt] = useState(
    DEFAULT_CHARACTER_PROMPT
  );
  const [storyText, setStoryText] = useState(initialStoryText);
  const [generatedCharacters, setGeneratedCharacters] =
    useState(initialCharacters);
  const [scenes, setScenes] = useState([]);
  const [scenesWithDescriptions, setScenesWithDescriptions] = useState([]);
  const [scenesWithBreakdowns, setScenesWithBreakdowns] = useState([]);
  const [scenePrompt, setScenePrompt] = useState(DEFAULT_SCENE_PROMPT);
  const [descriptionPrompt, setDescriptionPrompt] = useState(
    DEFAULT_DESCRIPTION_PROMPT
  );
  const [breakdownPrompt, setBreakdownPrompt] = useState(
    DEFAULT_BREAKDOWN_PROMPT
  );
  const [isResultsOpen, setIsResultsOpen] = useState(true);
  const [regenerationPrompt, setRegenerationPrompt] = useState(
    DEFAULT_REGENERATION_PROMPT
  );

  const checkMissedWords = () => {
    const missedWords = new Set();
    const cleanText = text => {
      return text
        .toLowerCase()
        .replace(/—/g, ' ')
        .replace(/-/g, ' ')
        .replace(/[^a-zа-яіїєґ0-9\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const storyWords = cleanText(storyText).split(' ');
    const scenesWords = cleanText(
      scenes.map(scene => scene.text).join(' ')
    ).split(' ');

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

  const handleGenerateCharacters = async () => {
    try {
      setIsLoading(true);
      const response = await getCharacters(
        {
          story: storyText,
          mood,
          purpose,
          contexts: [],
        },
        characterPrompt
      );

      if (response?.characters) {
        setGeneratedCharacters(response.characters);
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Error generating characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitScenes = async () => {
    try {
      setIsLoading(true);
      setScenes([]);
      const strings = storyText
        .replace(/\n/g, '')
        .split('.')
        .filter(el => el.length !== 0);

      for (const string of strings) {
        if (string.replaceAll('.', '').trim().length <= 1) continue;

        const response = await getSentenceWithScenes(
          string.trim(),
          scenePrompt
        );
        if (response && response.scenes) {
          const formattedScenes = response.scenes.map(sceneData => ({
            text: sceneData.scene,
          }));
          setScenes(prev => [...prev, ...formattedScenes]);
        }
      }
      setActiveStep(2);
    } catch (error) {
      console.error('Error splitting scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDescriptions = async () => {
    try {
      setIsLoading(true);
      const response = await getScenesDescription(
        {
          scenes,
          characters: generatedCharacters,
          mood,
          purpose,
          style: style?.style || '',
        },
        descriptionPrompt
      );

      if (response?.scene_descriptions) {
        setScenesWithDescriptions(response.scene_descriptions);
        setActiveStep(3);
      }
    } catch (error) {
      console.error('Error getting scene descriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetBreakdowns = async () => {
    try {
      setIsLoading(true);
      const response = await getScenesBreakdown(
        {
          illustrations: scenesWithDescriptions.map(scene => scene.description),
          storyText,
          characters: generatedCharacters,
          mood,
          purpose,
        },
        breakdownPrompt
      );

      if (response?.scene_breakdowns) {
        setScenesWithBreakdowns(response.scene_breakdowns);
      }
    } catch (error) {
      console.error('Error getting scene breakdowns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (onRegenerationPromptChange) {
      onRegenerationPromptChange(regenerationPrompt);
    }
  }, [regenerationPrompt, onRegenerationPromptChange]);

  const renderPromptEditor = (value, onChange, title, defaultValue) => (
    <div className={styles.promptField}>
      <label>{title}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.textarea}
        placeholder={`Enter custom prompt for ${title.toLowerCase()}...`}
      />
      <button
        className={styles.resetButton}
        onClick={() => onChange(defaultValue)}
      >
        Reset to Default
      </button>
    </div>
  );

  const renderScenesList = (items, type) => {
    return (
      <div className={styles.scenesList}>
        {items.map((scene, index) => (
          <div
            key={index}
            className={`${styles.scene} ${
              type === 'breakdowns' ? styles.breakdownScene : ''
            } ${styles.fadeIn}`}
          >
            <span className={styles.sceneNumber}>{index + 1}.</span>
            {type === 'basic' && <p>{scene.text}</p>}
            {type === 'descriptions' && (
              <>
                <p>
                  <strong>Text:</strong> {scene.text}
                </p>
                <p>
                  <strong>Description:</strong> {scene.description}
                </p>
              </>
            )}
            {type === 'breakdowns' && (
              <>
                <p>
                  <strong>Illustration:</strong> {scene.illustration}
                </p>
                <div className={styles.characterDetails}>
                  <strong>Characters:</strong>
                  {scene.characters.map((char, charIndex) => (
                    <div key={charIndex} className={styles.characterInfo}>
                      <p>Name: {char.name}</p>
                      <p>Position: {char.position}</p>
                      <p>Action: {char.action}</p>
                      <p>Facial Expression: {char.facialExpression}</p>
                      <p>Body Posture: {char.bodyPosture}</p>
                    </div>
                  ))}
                </div>
                <p>
                  <strong>Background:</strong> {scene.background}
                </p>
                <p>
                  <strong>Time of Day:</strong> {scene.timeOfDay}
                </p>
                <p>
                  <strong>Location:</strong> {scene.location}
                </p>
                <p>
                  <strong>Weather/Atmosphere:</strong> {scene.weatherAtmosphere}
                </p>
                <p>
                  <strong>Camera Angle:</strong> {scene.cameraAngle}
                </p>
                <p>
                  <strong>Framing:</strong> {scene.framing}
                </p>
                <p>
                  <strong>Foreground:</strong> {scene.foreground}
                </p>
                <div className={styles.characterDetails}>
                  <strong>Transition Effects:</strong>
                  <p>Camera Motion: {scene.transitionEffects?.cameraMotion}</p>
                  <p>
                    Technique: {scene.transitionEffects?.transitionTechnique}
                  </p>
                  <p>Timing: {scene.transitionEffects?.timing}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCharactersList = characters => {
    return (
      <div className={styles.scenesList}>
        {characters.map((char, index) => (
          <div key={index} className={`${styles.characters} ${styles.fadeIn}`}>
            <span className={styles.sceneNumber}>{char.name}</span>
            <div className={styles.characterDetails}>
              <p>
                <strong>Type:</strong> {char.type}
              </p>
              <p>
                <strong>Species:</strong> {char.species}
              </p>
              <p>
                <strong>Gender:</strong> {char.gender}
              </p>
              <p>
                <strong>Race/Breed:</strong> {char.race_breed}
              </p>
              <p>
                <strong>Age:</strong> {char.age}
              </p>
              <p>
                <strong>Height:</strong> {char.height}
              </p>
              <p>
                <strong>Weight:</strong> {char.weight}
              </p>
              <p>
                <strong>Eyes:</strong> {char.eyes}
              </p>
              <p>
                <strong>Facial Structure:</strong> {char.facialStructure}
              </p>
              <p>
                <strong>Skin Color:</strong> {char.skinColor}
              </p>
              <p>
                <strong>Covering:</strong> {char.coveringHairFurEtc}
              </p>
              <p>
                <strong>Body Build:</strong> {char.bodyBuild}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActionButtons = (onAction, isDisabled, stepNumber) => {
    const isStepCompleted =
      (stepNumber === 0 && generatedCharacters.length > 0) ||
      (stepNumber === 1 && scenes.length > 0) ||
      (stepNumber === 2 && scenesWithDescriptions.length > 0) ||
      (stepNumber === 3 && scenesWithBreakdowns.length > 0);

    return (
      <div className={styles.actionButtons}>
        <ButtonWithIcon
          text={
            isLoading ? <LoaderDots /> : isStepCompleted ? 'Retry' : 'Generate'
          }
          onClick={onAction}
          disabled={isLoading || isDisabled}
          marginLeft="0px"
        />
      </div>
    );
  };

  const renderScriptInput = () => {
    return (
      <div className={styles.scriptInput}>
        <h3>Story Script</h3>
        <textarea
          value={storyText}
          onChange={e => setStoryText(e.target.value)}
          placeholder="Enter your story script here..."
          className={styles.textarea}
        />
        <div className={styles.scriptStats}>
          <span>Words: {storyText.trim().split(/\s+/).length}</span>
          <span>Characters: {storyText.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.promptEditor}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <h3>Scene Generation Testing</h3>
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
          <ChevronRightIcon color="rgba(255, 255, 255, 0.8)" />
        </span>
      </div>

      {isOpen && (
        <div className={styles.content}>
          {renderScriptInput()}
          <div className={styles.steps}>
            {renderPromptEditor(
              regenerationPrompt,
              setRegenerationPrompt,
              'Regeneration Prompt',
              DEFAULT_REGENERATION_PROMPT
            )}
            <div
              className={`${styles.step} ${
                activeStep === 0 ? styles.active : ''
              }`}
            >
              <h3>Step 1: Generate Characters</h3>
              {renderPromptEditor(
                characterPrompt,
                setCharacterPrompt,
                'Character Generation Prompt',
                DEFAULT_CHARACTER_PROMPT
              )}
              {renderActionButtons(handleGenerateCharacters, !storyText, 0)}
              {generatedCharacters.length > 0 &&
                renderCharactersList(generatedCharacters)}
            </div>

            <div
              className={`${styles.step} ${
                activeStep === 1 ? styles.active : ''
              }`}
            >
              <h3>Step 2: Split into Scenes</h3>
              {renderPromptEditor(
                scenePrompt,
                setScenePrompt,
                'Scene Generation Prompt',
                DEFAULT_SCENE_PROMPT
              )}
              {renderActionButtons(handleSplitScenes, !storyText, 1)}
              {scenes.length > 0 && (
                <div className={styles.testResults}>
                  <div
                    className={styles.resultsHeader}
                    onClick={() => setIsResultsOpen(!isResultsOpen)}
                  >
                    <h4>Test Results</h4>
                  </div>
                  {isResultsOpen && (
                    <>
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
                      {renderScenesList(scenes, 'basic')}
                    </>
                  )}
                </div>
              )}
            </div>

            <div
              className={`${styles.step} ${
                activeStep === 2 ? styles.active : ''
              }`}
            >
              <h3>Step 3: Get Scene Illustrations</h3>
              {renderPromptEditor(
                descriptionPrompt,
                setDescriptionPrompt,
                'Illustrations Generation Prompt',
                DEFAULT_DESCRIPTION_PROMPT
              )}
              {renderActionButtons(
                handleGetDescriptions,
                scenes.length === 0,
                2
              )}
              {scenesWithDescriptions.length > 0 &&
                renderScenesList(scenesWithDescriptions, 'descriptions')}
            </div>

            <div
              className={`${styles.step} ${
                activeStep === 3 ? styles.active : ''
              }`}
            >
              <h3>Step 4: Get Scene Details Prompts</h3>
              {renderPromptEditor(
                breakdownPrompt,
                setBreakdownPrompt,
                'Full Illustration Details Prompts',
                DEFAULT_BREAKDOWN_PROMPT
              )}
              {renderActionButtons(
                handleGetBreakdowns,
                scenesWithDescriptions.length === 0,
                3
              )}
              {scenesWithBreakdowns.length > 0 &&
                renderScenesList(scenesWithBreakdowns, 'breakdowns')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { SceneGenerationTester };
