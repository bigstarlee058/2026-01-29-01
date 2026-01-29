import { useStoryManager } from 'hooks/story/useStoryManager';
import { observer } from 'mobx-react';
import { ProjectCreationPage } from 'pages/ProjectCreationPage/ProjectCreationPage';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StoreContext } from '../../mobx';
import { useChangeProviderMutation } from '../../redux/stories/storyApi';
import styles from './SettingSection.module.scss';

const SettingSection = observer(({ storyData, refetch, isStoryBoardOpen }) => {
  const store = useContext(StoreContext);
  const { onUpdateStoryText, onUpdateNarrator } = useStoryManager();

  const [localStory, setLocalStory] = useState(storyData.text);
  const isLocalStoryChange = useRef(false);
  const [changeProvider] = useChangeProviderMutation();

  useEffect(() => {
    setLocalStory(storyData.text);
  }, [storyData]);

  const handleStoryChange = e => {
    isLocalStoryChange.current = true;
    setLocalStory(e.target.value);
  };

  const handleStoryBlur = () => {
    if (localStory !== storyData.text) {
      onUpdateStoryText({
        storyId: storyData._id,
        text: localStory,
      });
    }
  };

  const handleProviderChange = async e => {
    await changeProvider({
      storyId: storyData._id,
      generationProvider: e.target.value.toLowerCase(),
    });
    // Refetch story data to update UI
    if (refetch) {
      await refetch();
    }
  };

  const handleVoiceSelect = useCallback(
    voice => {
      if (storyData && storyData._id) {
        const voiceWithTone = {
          ...voice,
          tone: voice.tone || 'calm',
          pace: voice.pace || 'conversational'
        };
        
        onUpdateNarrator({
          storyId: storyData._id,
          narrator: voiceWithTone,
          language: voice.language,
          accent: voice.accent,
        });
      }
    },
    [storyData, onUpdateNarrator]
  );

  return (
    <div className={styles.container} data-testid="settings-panel">
      <ProjectCreationPage
        isSettingsPage={true}
        isStoryBoardOpen={isStoryBoardOpen}
      />
      {/* <section className={`${styles.settings_container}`}>
        <form>
          <label htmlFor="story" className={styles.label}>
            Story
          </label>
          <textarea
            className={styles.story}
            name="story"
            id="story"
            value={localStory}
            onChange={handleStoryChange}
            onBlur={handleStoryBlur}
          ></textarea>
        </form>
        <div className={styles.format_container}>
          <h2>Selecting format video</h2>
          <SelectSizeFormatBtnSet storyData={storyData} format="true" />
        </div>
        <div className={styles.format_container}>
          <h2>Generation</h2>
          <select
            className={styles.provider_select}
            onChange={handleProviderChange}
            defaultValue={
              storyData.generationProvider?.toUpperCase() || 'MODELSLAB'
            }
          >
            <option value="MODELSLAB">Modelslab</option>
            <option value="LEONARDO">Leonardo</option>
            <option value="LEONARDO-API">Leonardo API</option>
          </select>
        </div>
        <div className={styles.format_container}>
          <h2>Voiceover</h2>
          <NarratorDropdown
            onSelect={handleVoiceSelect}
            hasVoiceover={store.editorElements.some(
              el =>
                el.type === 'audio' && el.properties?.audioType === 'voiceover'
            )}
            storyData={storyData}
          />
        </div>
        <div className={styles.format_container}>
          <h2>Sound settings</h2>
          <UploadBtnSet storyId={storyData._id} storyData={storyData} />
        </div>
      </section> */}
    </div>
  );
});

export { SettingSection };
