import React, { useState, forwardRef } from 'react';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import styles from './RemoveSilenceMenu.module.scss';

const RemoveSilenceMenu = forwardRef(
  (
    {
      onApply,
      isProcessing = false,
      onClose,
      audioElements = [],
      selectedAudioId,
      onAudioSelect,
    },
    ref
  ) => {
    const [settings, setSettings] = useState({
      startThreshold: -45,
      stopThreshold: -35,
      stopDuration: 0.3,
      startDuration: 0.1,
      syncImages: true, // По дефолту включено
    });

    const handleApply = () => {
      if (!selectedAudioId) {
        console.error('❌ No audio selected');
        return;
      }

      // Конвертуємо числові значення у правильний формат для API
      const formattedSettings = {
        startThreshold: `${settings.startThreshold}dB`,
        stopThreshold: `${settings.stopThreshold}dB`,
        stopDuration: settings.stopDuration.toString(),
        startDuration: settings.startDuration.toString(),
        syncImages: settings.syncImages, // Передаємо опцію синхронізації
      };

      onApply(formattedSettings, selectedAudioId);
    };

    const handleReset = () => {
      setSettings({
        startThreshold: -45,
        stopThreshold: -35,
        stopDuration: 0.3,
        startDuration: 0.1,
        syncImages: true, // По дефолту включено
      });
    };

    const stopEvent = e => {
      // Don't stop propagation for select elements and their options
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
        return;
      }
      e.stopPropagation();
      // Don't prevent default for input elements
      if (e.target.tagName !== 'INPUT') {
        e.preventDefault();
      }
    };

    return (
      <div
        className={styles.menuContainer}
        onMouseDown={stopEvent}
        onClick={stopEvent}
        ref={ref}
      >
        <div className={styles.menuHeader}>
          <p className={styles.title}>Remove Silence Settings</p>
        </div>

        <div className={styles.menuBody}>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Select Audio</label>
            <select
              value={selectedAudioId || ''}
              onChange={e => onAudioSelect(e.target.value)}
              className={styles.settingSelect}
              disabled={isProcessing}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <option value="">Select audio element...</option>
              {audioElements.map(audio => (
                <option key={audio.id} value={audio.id}>
                  {audio.name || `Audio ${audio.id.slice(0, 8)}`}
                  {audio.properties?.audioType === 'voice' && ' (Voice)'}
                  {audio.properties?.audioType === 'music' && ' (Music)'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Start Threshold (dB)</label>
            <input
              type="number"
              value={settings.startThreshold}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  startThreshold: parseFloat(e.target.value),
                }))
              }
              className={styles.settingInput}
              disabled={isProcessing}
              min={-80}
              max={-10}
              step={1}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Stop Threshold (dB)</label>
            <input
              type="number"
              value={settings.stopThreshold}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  stopThreshold: parseFloat(e.target.value),
                }))
              }
              className={styles.settingInput}
              disabled={isProcessing}
              min={-80}
              max={-10}
              step={1}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Stop Duration (s)</label>
            <input
              type="number"
              value={settings.stopDuration}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  stopDuration: parseFloat(e.target.value),
                }))
              }
              className={styles.settingInput}
              disabled={isProcessing}
              min={0.1}
              max={5.0}
              step={0.1}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>

                     <div className={styles.settingGroup}>
             <label className={styles.settingLabel}>Start Duration (s)</label>
             <input
               type="number"
               value={settings.startDuration}
               onChange={e =>
                 setSettings(prev => ({
                   ...prev,
                   startDuration: parseFloat(e.target.value),
                 }))
               }
               className={styles.settingInput}
               disabled={isProcessing}
               min={0.1}
               max={5.0}
               step={0.1}
               onMouseDown={e => e.stopPropagation()}
               onClick={e => e.stopPropagation()}
             />
           </div>

           <div className={styles.settingGroup}>
             <label className={styles.checkboxLabel}>
               <input
                 type="checkbox"
                 checked={settings.syncImages}
                 onChange={e =>
                   setSettings(prev => ({
                     ...prev,
                     syncImages: e.target.checked,
                   }))
                 }
                 className={styles.settingCheckbox}
                 disabled={isProcessing}
                 onMouseDown={e => e.stopPropagation()}
                 onClick={e => e.stopPropagation()}
               />
               <span className={styles.checkboxText}>
                 Sync images on the same row
               </span>
             </label>
           </div>
         </div>

        <div className={styles.divider}></div>

        <div className={styles.menuFooter}>
          <div
            className={styles.resetButton}
            onMouseDown={stopEvent}
            onClick={e => {
              stopEvent(e);
              if (!isProcessing) handleReset();
            }}
            style={{
              opacity: isProcessing ? 0.5 : 1,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Reset
          </div>
          <div
            className={styles.applyButton}
            onMouseDown={e => {
              stopEvent(e);
              if (!isProcessing) handleApply();
            }}
            style={{
              opacity: isProcessing ? 0.5 : 1,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? 'Processing...' : 'Apply'}
          </div>
        </div>
      </div>
    );
  }
);

RemoveSilenceMenu.displayName = 'RemoveSilenceMenu';

export default RemoveSilenceMenu;
