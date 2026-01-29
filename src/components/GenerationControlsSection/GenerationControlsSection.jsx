import React, { useRef, useEffect, useMemo } from 'react';
import autoAnimate from '@formkit/auto-animate';
import styles from './GenerationControlsSection.module.scss';
import { CustomDropdown } from 'components/CustomDropdown/CustomDropdown';
import { NumberInput } from 'components/NumberInput/NumberInput';
import leonardoModelsData from 'data/leonardoModels.json';
import videoModelsData from 'data/videoModels.json';

import {
  ThreeCirclesIcon,
  SubtitlesIcon,
  QuantityIcon,
  ClockIcon,
  ResolutionIcon,
  ModelIcon,
  ProviderIcon,
  AspectRationIcon,
  SettingsIcon,
  DoneIcon,
} from 'components/Icons';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { RotatingLines } from 'react-loader-spinner';

const GenerationControlsSection = ({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  duration,
  onDurationChange,
  quantity,
  onQuantityChange,
  model,
  onModelChange,
  preset,
  onPresetChange,
  provider,
  onProviderChange,
  generationMode = 'textToImage',

  // Advanced settings toggle
  showAdvancedSettings = false,
  onToggleAdvancedSettings,

  // Generate button props
  onGenerateClick,
  isGenerateDisabled = false,
  isGenerateLoading = false,
  isGenerationComplete = false,
}) => {
  // Aspect ratio options
  const aspectRatioOptions = [
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '4:3', label: '4:3 (Standard)' },
    { value: '1:1', label: '1:1 (Square)' },
  ];

  // Resolution options
  const resolutionOptions = [
    { value: '480p', label: '480p (SD)' },
    { value: '720p', label: '720p (HD)' },
    { value: '1080p', label: '1080p (Full HD)' },
  ];

  // Duration options (for video modes)
  const durationOptions = [
    { value: '5s', label: '5s' },
    { value: '10s', label: '10s' },
  ];

  // Determine if we're in video mode
  const isVideoMode =
    generationMode === 'textToVideo' || generationMode === 'imageToVideo';

  // Auto-animate ref
  const controlsRowRef = useRef(null);

  // Initialize auto-animate
  useEffect(() => {
    if (controlsRowRef.current) {
      autoAnimate(controlsRowRef.current, {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      });
    }
  }, []);

  // Model options
  const imageModelOptions = leonardoModelsData.custom_models.map(model => ({
    value: model.id,
    label: model.name,
  }));

  const videoModelOptions = videoModelsData.video_models.map(model => ({
    value: model.id,
    label: model.displayName,
  }));

  const modelOptions = isVideoMode ? videoModelOptions : imageModelOptions;

  // Get selected video model data for dynamic controls
  const selectedVideoModel = isVideoMode
    ? videoModelsData.video_models.find(videoModel => videoModel.id === model)
    : null;

  // Get generation type params (t2v or i2v)
  const generationType =
    generationMode === 'imageToVideo' ? 'i2vParams' : 't2vParams';
  const modelParams = selectedVideoModel?.[generationType];

  // Dynamic aspect ratio options based on selected model
  const dynamicAspectRatioOptions = useMemo(() => {
    if (!isVideoMode || !modelParams?.aspectRatio) {
      return aspectRatioOptions;
    }

    if (modelParams.ratioParams) {
      return modelParams.ratioParams.map(ratio => ({
        value: ratio,
        label: `${ratio} ${
          ratio === '16:9'
            ? '(Landscape)'
            : ratio === '9:16'
            ? '(Portrait)'
            : ratio === '1:1'
            ? '(Square)'
            : ''
        }`,
      }));
    }

    return aspectRatioOptions;
  }, [isVideoMode, modelParams]);

  // Dynamic resolution options based on selected model
  const dynamicResolutionOptions = useMemo(() => {
    if (!isVideoMode || !modelParams?.resolution) {
      return resolutionOptions;
    }

    if (modelParams.resolutionParams) {
      return modelParams.resolutionParams.map(res => ({
        value: res,
        label: `${res} ${
          res === '480p'
            ? '(SD)'
            : res === '720p'
            ? '(HD)'
            : res === '1080p'
            ? '(Full HD)'
            : res === '4k'
            ? '(4K)'
            : ''
        }`,
      }));
    }

    return resolutionOptions;
  }, [isVideoMode, modelParams]);

  // Preset options (only for image modes)
  const presetOptions = [
    { value: 'anime', label: 'Anime' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'creative', label: 'Creative' },
    { value: 'dynamic', label: 'Dynamic' },
    { value: 'environment', label: 'Environment' },
    { value: 'general', label: 'General' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'photography', label: 'Photography' },
    { value: 'raytraced', label: 'Raytraced' },
    { value: 'render_3d', label: '3D Render' },
    { value: 'sketch_bw', label: 'Sketch B/W' },
    { value: 'sketch_color', label: 'Sketch Color' },
    { value: 'vibrant', label: 'Vibrant' },
    { value: 'none', label: 'None' },
  ];

  // Provider options
  const providerOptions = [{ value: 'leonardo', label: 'Leonardo' }];

  return (
    <div className={styles.container}>
      <div ref={controlsRowRef} className={styles.controlsRow}>
        {/* Advanced Settings (inline, left side) */}
        {showAdvancedSettings && (
          <>
            {/* Provider */}
            <div className={styles.controlGroup}>
              <CustomDropdown
                options={providerOptions}
                value={provider}
                onChange={onProviderChange}
                placeholder="Select provider"
                width="140px"
                icon={<ProviderIcon size={14} color="#FFFFFF99" />}
              />
            </div>

            {/* Model */}
            <div className={styles.controlGroup}>
              <CustomDropdown
                options={modelOptions}
                value={model}
                onChange={onModelChange}
                placeholder="Select model"
                width="150px"
                icon={<ModelIcon size={14} color="#FFFFFF99" />}
              />
            </div>

            {/* Preset (only for image modes) */}
            {!isVideoMode && (
              <div className={styles.controlGroup}>
                <CustomDropdown
                  options={presetOptions}
                  value={preset}
                  onChange={onPresetChange}
                  placeholder="Select preset"
                  width="130px"
                  icon={<ThreeCirclesIcon width="14" height="14" />}
                />
              </div>
            )}
          </>
        )}

        {/* Main Controls - only show when advanced settings are open */}
        {showAdvancedSettings && (
          <>
            {/* Aspect Ratio (only for video modes) */}
            {isVideoMode && modelParams?.aspectRatio && (
              <div className={styles.controlGroup}>
                <CustomDropdown
                  options={dynamicAspectRatioOptions}
                  value={aspectRatio}
                  onChange={onAspectRatioChange}
                  placeholder="Select ratio"
                  width="140px"
                  icon={<AspectRationIcon size={14} color="#FFFFFF99" />}
                />
              </div>
            )}

            {/* Resolution (only for video modes) */}
            {isVideoMode && modelParams?.resolution && (
              <div className={styles.controlGroup}>
                <CustomDropdown
                  options={dynamicResolutionOptions}
                  value={resolution}
                  onChange={onResolutionChange}
                  placeholder="Select resolution"
                  width="140px"
                  icon={<ResolutionIcon size={14} color="#FFFFFF99" />}
                />
              </div>
            )}

            {/* Quantity */}
            <div className={styles.controlGroup}>
              <NumberInput
                value={quantity}
                onChange={onQuantityChange}
                min={1}
                max={4}
                placeholder="1"
                width="80px"
                icon={<QuantityIcon size={14} color="#FFFFFF99" />}
              />
            </div>

            {/* Duration (only for video modes) */}
            {isVideoMode && modelParams?.length && (
              <div className={styles.controlGroup}>
                <CustomDropdown
                  options={durationOptions}
                  value={duration}
                  onChange={onDurationChange}
                  placeholder="Select duration"
                  width="120px"
                  icon={<ClockIcon width="14" height="14" />}
                />
              </div>
            )}
          </>
        )}

        {/* Settings Gear Icon */}
        <div className={styles.controlGroup_left}>
          <ButtonWithIcon
            icon="SettingsIcon"
            size="16px"
            color="#FFFFFF66"
            accentColor={
              showAdvancedSettings ? 'var(--accent-color)' : '#FFFFFF99'
            }
            classNameButton={`${styles.settingsButton} ${
              showAdvancedSettings ? styles.active : ''
            }`}
            onClick={onToggleAdvancedSettings}
            tooltipText="Advanced Settings"
            tooltipPlace="top"
          />

          <ButtonWithIcon
            icon={isGenerateLoading ? null : 'StarIcon'}
            text={isGenerateLoading ? 'Generating...' : 'Generate'}
            color={isGenerateLoading ? 'var(--accent-color)' : '#FFFFFFB2'}
            accentColor={
              isGenerateLoading ? 'var(--accent-color)' : '#FFFFFFCC'
            }
            classNameButton={
              isGenerateLoading ? styles.generateBtn_active : styles.generateBtn
            }
            classNameIcon={styles.generateIcon}
            onClick={onGenerateClick}
            disabled={isGenerateDisabled}
            marginLeft="0"
          />

          {/* Generate Button Loader */}
          <div className={styles.generateBtnLoader}>
            {isGenerateLoading && (
              <RotatingLines
                strokeColor="var(--accent-color)"
                strokeWidth="5"
                animationDuration="0.75"
                width="20"
                visible={true}
              />
            )}
            {isGenerationComplete && !isGenerateLoading && (
              <div className={styles.doneIconContainer}>
                <DoneIcon color="var(--accent-color)" width="20" height="20" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { GenerationControlsSection };
