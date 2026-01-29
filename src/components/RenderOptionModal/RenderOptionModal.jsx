import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { GenerateAIModeComponent } from 'components/GenerateWithAiSection/GenerateAIModeComponent';
import { LocalRenderIcon, CloudRenderIcon } from 'components/Icons';
import { user } from '../../redux/auth/selectors';
import styles from './RenderOptionModal.module.scss';

const RenderOptionModal = ({
  isOpen,
  onClose,
  onLocalRender,
  onCloudRender,
  onSandboxRender,
}) => {
  const [localQuality, setLocalQuality] = useState('medium');
  const [cloudQuality, setCloudQuality] = useState('high');
  const [sandboxQuality, setSandboxQuality] = useState('high');
  const [showSandbox, setShowSandbox] = useState(false);
  const currentUser = useSelector(user);

  if (!isOpen) return null;

  const localTabs = [
    { label: 'medium', active: true },
    { label: 'high', active: true },
  ];

  const cloudTabs = [
    { label: 'medium', active: false },
    { label: 'high', active: true },
  ];

  const sandboxTabs = [
    { label: 'medium', active: false },
    { label: 'high', active: true },
  ];

  const isAdmin = currentUser?.type === 'Admin';

  const handleLocalRender = () => {
    onLocalRender(localQuality);
  };

  const handleCloudRender = () => {
    onCloudRender(cloudQuality);
  };

  const handleSandboxRender = () => {
    onSandboxRender(sandboxQuality);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Choose Where to Create Your Video</h3>
          {isAdmin && (
            <button 
              className={`${styles.testButton} ${showSandbox ? styles.active : ''}`}
              onClick={() => setShowSandbox(!showSandbox)}
            >
              Test
            </button>
          )}
        </div>
        <ButtonWithIcon
          icon="CloseIcon"
          onClick={onClose}
          size={10}
          classNameButton={styles.closeButton}
        />
        <div className={styles.content}>
          <div className={styles.optionGrid}>
            {!showSandbox ? (
              <>
                {/* Production render options */}
                <div className={styles.option} onClick={handleLocalRender}>
                  <div className={styles.optionHeader}>
                    <div className={styles.optionIcon}>
                      <LocalRenderIcon size={64} />
                    </div>

                    <div
                      className={styles.qualitySection}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className={styles.qualityLabel}>Quality</div>
                      <GenerateAIModeComponent
                        activeTab={localQuality}
                        handleTabClick={setLocalQuality}
                        tabs={localTabs}
                        containerStyle={{}}
                        tabsStyle={{ gap: '4px' }}
                      />
                    </div>
                  </div>

                  <div className={styles.optionContent}>
                    <h4 className={styles.optionTitle}>Local Render</h4>
                    <p className={styles.optionDescription}>
                      Render directly in your browser. Works offline and keeps your
                      data private.
                    </p>
                  </div>

                  <ul className={styles.optionFeatures}>
                    <li>Medium: Browser-based rendering</li>
                    <li>High: FFmpeg local rendering</li>
                    <li>Offline rendering</li>
                  </ul>
                </div>

                <div className={styles.option} onClick={handleCloudRender}>
                  <div className={styles.optionHeader}>
                    <div className={styles.optionIcon}>
                      <CloudRenderIcon size={64} />
                    </div>

                    <div
                      className={styles.qualitySection}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className={styles.qualityLabel}>Quality</div>
                      <GenerateAIModeComponent
                        activeTab={cloudQuality}
                        handleTabClick={setCloudQuality}
                        tabs={cloudTabs}
                        containerStyle={{}}
                        tabsStyle={{ gap: '4px' }}
                      />
                    </div>
                  </div>

                  <div className={styles.optionContent}>
                    <h4 className={styles.optionTitle}>Cloud Render</h4>
                    <p className={styles.optionDescription}>
                      Render on our high-performance servers. Ideal for final
                      exports and sharing.
                    </p>
                  </div>

                  <ul className={styles.optionFeatures}>
                    <li>Only high quality available</li>
                    <li>Faster processing</li>
                    <li>Best if your computer is slow</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* Test render options */}
                <div className={styles.option} onClick={handleSandboxRender}>
                  <div className={styles.optionHeader}>
                    <div className={styles.optionIcon}>
                      <CloudRenderIcon size={64} />
                    </div>

                    <div
                      className={styles.qualitySection}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className={styles.qualityLabel}>Quality</div>
                      <GenerateAIModeComponent
                        activeTab={sandboxQuality}
                        handleTabClick={setSandboxQuality}
                        tabs={sandboxTabs}
                        containerStyle={{}}
                        tabsStyle={{ gap: '4px' }}
                      />
                    </div>
                  </div>

                  <div className={styles.optionContent}>
                    <h4 className={styles.optionTitle}>Sandbox</h4>
                    <p className={styles.optionDescription}>
                      Development environment for testing new features and configurations.
                    </p>
                  </div>

                  <ul className={styles.optionFeatures}>
                    <li>High quality output</li>
                    <li>Development environment</li>
                    <li>Testing new features</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderOptionModal;
