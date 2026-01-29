import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import styles from './UploadBtnSet.module.scss';
import { StoreContext } from '../../mobx';
import { observer } from 'mobx-react';
import AddUploadMusicButton from '../Icons/AddUploadMusicButton';
import { deleteAudio } from '../../utils/deleteAudio';
import Lottie from 'lottie-react';
import videfyAnime from 'data/videfyAnime.json';
import CloseIcon from 'components/Icons/CloseIcon';
import { useUploadAudioMutation } from '../../redux/stories/storyApi';
import { store as reduxStore } from '../../redux/store';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import {
  saveTimelineState,
   
} from '../../redux/timeline/timelineSlice';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';

const getAuthHeaders = () => {
  const state = reduxStore.getState();
  const token = state.auth.token;

  return {
    Authorization: `Bearer ${token}`,
  };
};

const formatDuration = seconds => {
  if (!seconds || isNaN(seconds)) return '00:00';

  if (seconds > 10000) {
    seconds = seconds / 1000;
  }

  seconds = Math.round(Number(seconds));

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
};

const isBrowserSupportedAudioFormat = format => {
  const audio = document.createElement('audio');

  const formats = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    webm: 'audio/webm',
  };

  if (!format || !formats[format]) return true;

  return audio.canPlayType(formats[format]) !== '';
};

const UploadedAudioItem = ({ audio, onRemove, isInTimeline }) => {
  const cleanFileName = name => {
    if (!name) return 'Audio';
    return name;
  };

  const displayName = cleanFileName(
    audio.title || audio.name || audio.originalFileName
  );
  const durationInSeconds = audio.duration || 0;

  return (
    <div className={styles.uploaded_audio_item}>
      <div className={styles.audio_info}>
        <div className={styles.titleWrapper}>
          <span className={styles.title} title={displayName}>
            {displayName}
          </span>
        </div>

        {audio.duration > 0 && (
          <span className={styles.duration}>
            {formatDuration(durationInSeconds)}
          </span>
        )}
      </div>
      <ButtonWithIcon
        icon="CloseAiIcon"
        classNameButton={styles.close_btn}
        onClick={() => onRemove(audio.id)}
      />
    </div>
  );
};

const UploadBtnSet = observer(({ storyId, storyData }) => {
  const store = React.useContext(StoreContext);
  const [audioFiles, setAudioFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState(null);
  const uploadControllersRef = useRef({});
  const audioInputRef = useRef(null);
  const dispatch = useDispatch();

  const [uploadAudio] = useUploadAudioMutation();

  const getAudioDuration = file => {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
          window.URL.revokeObjectURL(audio.src);
          resolve(audio.duration);
        };

        audio.onerror = () => {
          window.URL.revokeObjectURL(audio.src);
          reject(new Error('Error loading audio file'));
        };

        audio.src = URL.createObjectURL(file);
      } catch (error) {
        reject(new Error('Error estimating audio duration'));
      }
    });
  };

  const handleCancelUpload = uploadId => {
    if (uploadControllersRef.current[uploadId]) {
      uploadControllersRef.current[uploadId].abort();
      delete uploadControllersRef.current[uploadId];
      setUploadingFiles(files => files.filter(f => f.id !== uploadId));
    }
  };

  const isVoiceover = useMemo(() => {
    return audio => {
      if (!audio) return false;

      if (audio.text) return true;

      const url =
        audio.url ||
        audio.audioUrl ||
        audio.previewURL ||
        audio.base64Audio ||
        audio.src;
      if (url && typeof url === 'string' && url.includes('subtitles'))
        return true;

      const checkTypeField = field => {
        if (!field) return false;
        const typeStr = String(field).toLowerCase();
        return [
          'voiceover',
          'voice-over',
          'voice_over',
          'voice over',
          'narration',
          'voice',
        ].includes(typeStr);
      };

      return checkTypeField(audio.type) || checkTypeField(audio.audioType);
    };
  }, []);

  const fetchAudioHistory = useCallback(() => {
    if (!storyData) {
      setAudioFiles([]);
      return;
    }

    const possiblePaths = [
      storyData.audio,
      storyData.audioFiles,
      storyData.sounds,
      storyData.data?.audio,
      storyData.data?.audioFiles,
    ];

    let audioArray = null;
    if (Array.isArray(storyData.audio)) {
      audioArray = storyData.audio;
    } else if (Array.isArray(storyData.audioFiles)) {
      audioArray = storyData.audioFiles;
    } else if (Array.isArray(storyData.data?.audio)) {
      audioArray = storyData.data.audio;
    } else if (Array.isArray(storyData.data?.audioFiles)) {
      audioArray = storyData.data.audioFiles;
    } else {
      for (const key in storyData) {
        if (Array.isArray(storyData[key])) {
          if (storyData[key].length > 0 && storyData[key][0]?.url) {
            audioArray = storyData[key];
            break;
          }
        }
      }
    }

    if (!audioArray || !audioArray.length) {
      setAudioFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const validAudioFiles = audioArray.filter(audio => {
        const hasValidUrl =
          audio.url &&
          typeof audio.url === 'string' &&
          (audio.url.startsWith('http') ||
            audio.url.startsWith('https') ||
            audio.url.startsWith('/'));

        if (!hasValidUrl) {
          return false;
        }

        const isVoiceoverFile = isVoiceover(audio);

        return !isVoiceoverFile;
      });

      if (validAudioFiles.length === 0) {
        setAudioFiles([]);
        setIsLoading(false);
        return;
      }

      const uniqueAudios = new Map();

      validAudioFiles.forEach(audio => {
        let audioUrl = audio.url;
        if (audioUrl.startsWith('/') && !audioUrl.startsWith('//')) {
          audioUrl = window.location.origin + audioUrl;
        } else if (audioUrl.startsWith('//')) {
          audioUrl = 'https:' + audioUrl;
        }

        const audioName =
          audio.originalFileName ||
          audio.name ||
          audio.title ||
          audioUrl
            .split('/')
            .pop()
            .split('?')[0]
            .replace(/\.[^/.]+$/, '');

        const audioId = audio._id || audio.id;

        if (!uniqueAudios.has(audioId)) {
          uniqueAudios.set(audioId, {
            id: audioId,
            title: audioName,
            name: audioName,
            originalFileName: audioName,
            url: audioUrl,
            duration: audio.duration || 0,
            type: audio.type,
            hasCoverArt: audio.hasCoverArt || false,
            coverArtUrl: audio.coverArtUrl || null,
            artist: audio.artist || '',
            isOnTimeline: false,
          });
        }
      });

      const storyAudio = Array.from(uniqueAudios.values());

      setAudioFiles(storyAudio);
    } catch (error) {
      console.error('Error retrieving audio story:', error);
      setError('Failed to load story audio');
    } finally {
      setIsLoading(false);
    }
  }, [storyData, isVoiceover]);

  useEffect(() => {
    fetchAudioHistory();
  }, [fetchAudioHistory]);

  useEffect(() => {
    if (store && store.editorElements) {
      const editorAudioIds = new Set(
        store.editorElements
          .filter(
            element =>
              element.type === 'audio' ||
              element.audioType === 'sound' ||
              (element.type === 'audio' && element.audioType === 'sound')
          )
          .map(audio => audio.id)
      );

      if (editorAudioIds.size > 0) {
        setAudioFiles(prevList => {
          return prevList.map(audioItem => {
            const isOnTimeline = editorAudioIds.has(audioItem.id);
            return {
              ...audioItem,
              isOnTimeline,
            };
          });
        });
      }
    }
  }, [store, store?.editorElements]);

  const handleGlobalAudioDeleted = useCallback(audioId => {
    setAudioFiles(prev =>
      prev.map(audio =>
        audio.id === audioId ? { ...audio, isOnTimeline: false } : audio
      )
    );
  }, []);

  useEffect(() => {
    const handleAudioDeletedEvent = event => {
      if (event && event.detail && event.detail.audioId) {
        handleGlobalAudioDeleted(event.detail.audioId);
      }
    };

    window.addEventListener('audioDeleted', handleAudioDeletedEvent);

    return () => {
      window.removeEventListener('audioDeleted', handleAudioDeletedEvent);
    };
  }, [handleGlobalAudioDeleted]);

  useEffect(() => {
    if (store && store.editorElements) {
      const editorAudioIds = new Set(
        store.editorElements
          .filter(
            element =>
              element.type === 'audio' ||
              element.audioType === 'sound' ||
              (element.type === 'audio' && element.audioType === 'sound')
          )
          .map(audio => audio.id)
      );

      setAudioFiles(prevList => {
        const needsUpdate = prevList.some(item => {
          const isOnTimeline = editorAudioIds.has(item.id);
          return item.isOnTimeline !== isOnTimeline;
        });

        if (needsUpdate) {
          return prevList.map(audioItem => {
            const isOnTimeline = editorAudioIds.has(audioItem.id);
            return {
              ...audioItem,
              isOnTimeline,
              _lastUpdated: Date.now(),
            };
          });
        }

        return prevList;
      });
    }
  }, [store, store?.editorElements]);

  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) {
      setError('No files selected');
      return;
    }

    if (!storyId) {
      console.warn('Audio cannot be saved without storyId');
      return;
    }

    const uploadPromises = files.map(async file => {
      let uploadId = null;
      let progressInterval = null;

      try {
        if (!file.type.startsWith('audio/')) {
          setError('Please select audio files only');
          return;
        }

        const format = file.type.split('/')[1];
        if (!isBrowserSupportedAudioFormat(format)) {
          setError(`Audio format ${format} is not supported by your browser`);
          return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const duration = await getAudioDuration(file);
        uploadId = `upload-${Date.now()}-${file.name}`;

        const fileNameWithExtension = file.name.replace(/\.[^/.]+$/, '');

        uploadControllersRef.current[uploadId] = new AbortController();

        setUploadingFiles(prevFiles => [
          ...prevFiles,
          {
            id: uploadId,
            name: file.name,
            progress: 0,
          },
        ]);

        setError(null);

        try {
          progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const newProgress = prev + 2;
              return newProgress >= 90 ? 90 : newProgress;
            });

            setUploadingFiles(files =>
              files.map(f =>
                f.id === uploadId
                  ? { ...f, progress: Math.min(f.progress + 2, 90) }
                  : f
              )
            );
          }, 200);

          const formData = new FormData();
          formData.append('audio', file);
          formData.append('duration', duration);
          formData.append('name', fileNameWithExtension);
          formData.append('title', fileNameWithExtension);
          formData.append('originalFileName', fileNameWithExtension);

          const response = await uploadAudio({
            storyId,
            formData,
            type: 'audio',
          }).unwrap();

          clearInterval(progressInterval);
          progressInterval = null;

          setUploadProgress(100);

          setUploadingFiles(files =>
            files.map(f => (f.id === uploadId ? { ...f, progress: 100 } : f))
          );

          if (response) {
            const audioUrl =
              response.url ||
              (response.audio && response.audio.length > 0
                ? response.audio[response.audio.length - 1].url
                : null);

            if (audioUrl) {
              const fileId =
                response.audio && response.audio.length > 0
                  ? response.audio[response.audio.length - 1]._id
                  : Date.now();
              const audioDuration = duration * 1000;

              let highestRow = -1;
              store.editorElements.forEach(el => {
                if (el.row > highestRow) {
                  highestRow = el.row;
                }
              });

              const newRow = highestRow + 1;

              const newAudioFile = {
                id: fileId,
                title: fileNameWithExtension,
                name: fileNameWithExtension,
                originalFileName: fileNameWithExtension,
                url: audioUrl,
                duration,
                type: 'audio',
                isOnTimeline: true,
              };

              setTimeout(async () => {
                setUploadingFiles(files =>
                  files.filter(f => f.id !== uploadId)
                );
                delete uploadControllersRef.current[uploadId];

                setAudioFiles(prev => {
                  const alreadyExists = prev.some(
                    existingAudio => existingAudio.id === fileId
                  );
                  if (alreadyExists) {
                    return prev;
                  }
                  return [...prev, newAudioFile];
                });

                await store.addExistingAudio({
                  id: fileId,
                  base64Audio: audioUrl,
                  durationMs: audioDuration,
                  row: newRow,
                  startTime: 0,
                  audioType: 'audio',
                  name: fileNameWithExtension,
                  title: fileNameWithExtension,
                  originalFileName: fileNameWithExtension,
                });

                 
                 

                if (typeof store.saveDataOnBackend === 'function') {
                  store.saveDataOnBackend();
                }

                if (typeof store.saveToHistory === 'function') {
                  store.saveToHistory();
                }
              }, 500);
            } else {
              setTimeout(() => {
                setUploadingFiles(files =>
                  files.filter(f => f.id !== uploadId)
                );
                delete uploadControllersRef.current[uploadId];
              }, 500);
            }
          } else {
            setTimeout(() => {
              setUploadingFiles(files => files.filter(f => f.id !== uploadId));
              delete uploadControllersRef.current[uploadId];
            }, 500);
          }
        } catch (uploadError) {
          console.error('Error uploading to server:', uploadError);
          setError(
            `Failed to upload ${file.name}: ${
              uploadError.message || 'Unknown error'
            }`
          );
          if (uploadId) {
            setUploadingFiles(files => files.filter(f => f.id !== uploadId));
            delete uploadControllersRef.current[uploadId];
          }
        }
      } catch (error) {
        console.error('Error handling audio upload:', error);
        setError(
          `Error processing ${file.name}: ${error.message || 'Unknown error'}`
        );
        if (uploadId) {
          setUploadingFiles(files => files.filter(f => f.id !== uploadId));
          delete uploadControllersRef.current[uploadId];
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }
    });

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error in batch upload:', error);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = async fileId => {
    try {
      const audioToRemove = store.editorElements.find(
        el => el.id === fileId && el.type === 'audio'
      );

      if (!audioToRemove) {
        setAudioFiles(prev => prev.filter(audio => audio.id !== fileId));
        return;
      }

      if (storyId) {
        try {
          await deleteAudio({ storyId, audioId: fileId });
        } catch (err) {
          console.error('Error deleting audio from server:', err);
        }
      }

      store.removeEditorElement(fileId);

      if (typeof store.saveDataOnBackend === 'function') {
        store.saveDataOnBackend();
      }

      if (typeof store.saveToHistory === 'function') {
        store.saveToHistory();
      }

      setAudioFiles(prev => prev.filter(audio => audio.id !== fileId));

      const audioDeletedEvent = new CustomEvent('audioDeleted', {
        detail: { audioId: fileId },
      });
      window.dispatchEvent(audioDeletedEvent);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  };

  const handleClickUpload = e => {
    e.preventDefault();
    audioInputRef.current.click();
  };

  return (
    <>
      <h4 className={styles.btn_label}>
        Audio<span></span>
      </h4>
      <div className={styles.upload_container}>
        {audioFiles.length > 0 &&
          audioFiles.map(audio => (
            <div
              key={audio.id}
              className={`${styles.audio_item_container} ${
                audio.isOnTimeline ? styles.onTimeline : ''
              }`}
            >
              <UploadedAudioItem
                audio={audio}
                onRemove={handleRemoveFile}
                isInTimeline={audio.isOnTimeline}
              />
            </div>
          ))}

        {uploadingFiles.length > 0 &&
          uploadingFiles.map(file => (
            <div
              key={file.id}
              className={styles.loadingItem}
              style={{
                '--progress': `${file.progress || 0}%`,
              }}
            >
              <Lottie
                animationData={videfyAnime}
                className={styles.lottieAnimation}
                key={`lottie-${file.id}`}
              />
              <span className={styles.loadingText}>{file.name}</span>
              <button
                className={styles.cancelButton}
                onClick={() => handleCancelUpload(file.id)}
              >
                <CloseIcon size="7" color="var(--accent-color)" />
              </button>
            </div>
          ))}

        <input
          type="file"
          ref={audioInputRef}
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          multiple
        />
        <div
          onClick={handleClickUpload}
          className={styles.upload_button_wrapper}
        >
          <AddUploadMusicButton size="98" />
        </div>
      </div>
    </>
  );
});

export { UploadBtnSet };

UploadBtnSet.propTypes = {
  storyId: PropTypes.string,
  storyData: PropTypes.object,
};
