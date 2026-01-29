import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import UploadOptions from 'components/UploadOptions/UploadOptions';
import GoogleDrivePicker from 'components/GoogleDrivePicker/GoogleDrivePicker';
import { uploadVideoToAWS } from '../../utils/awsUpload';
import { saveVideoData } from '../../utils/saveVideoMetadata';
import { galleryApi } from '../../redux/gallery/galleryApi';
import styles from './VideoUploadPanel.module.scss';

async function handleVideoUpload(
  file,
  user,
  storyId,
  updateProgress,
  duration,
  store,
  dispatch
) {
try {
// First handle the video locally for immediate preview
    await store.handleVideoUpload(file);

    // Then upload to AWS in the background
    const { url, key } = await uploadVideoToAWS(file, progress => {
if (typeof updateProgress === 'function') {
        updateProgress(progress);
      }
    });
const userId = user?.id || user?.username || user?.email;
const videoData = {
      key: key,
      s3Url: url,
      title: file.name,
      length: duration,
    };
const saved = await saveVideoData(videoData, storyId, user);
dispatch(galleryApi.util.invalidateTags(['Gallery']));
store.handleVideoUploadFromUrl({
      url: url,
      title: file.name,
      key: key,
      duration: duration,
      row: 2,
    });

    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

const VideoUploadPanel = ({ user, storyId, store }) => {
  const dispatch = useDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);

  const handleLocalUpload = () => {
    setShowUploadOptions(false);
    document.getElementById('videoUpload').click();
  };

  const handleGoogleDriveUpload = () => {
    setShowUploadOptions(false);
    setShowGoogleDrivePicker(true);
  };

  const handleGoogleDriveFileSelect = async file => {
    setShowGoogleDrivePicker(false);
    try {
      // Show upload progress
      setIsUploading(true);
      setUploadProgress(0);

      // Get video duration
      const duration = await new Promise(resolve => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
        };
        video.src = URL.createObjectURL(file);
      });

      // Handle the video locally and upload to AWS
      await handleVideoUpload(
        file,
        user,
        storyId,
        progress => {
          setUploadProgress(progress);
        },
        duration,
        store,
        dispatch
      );
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={styles.uploadPanel}>
      <div className={styles.uploadWrapper}>
        {isUploading && (
          <>
            <div className={styles.uploadProgressBar}>
              <div
                className={styles.uploadProgressBarFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        )}
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={async e => {
            const files = e.target.files;
            if (files && files.length > 0) {
              try {
                // Show upload progress
                setIsUploading(true);
                setUploadProgress(0);

                // Track overall progress across all files
                let completedFiles = 0;

                // Store all uploaded URLs
                const uploadedUrls = [];

                // Process each file sequentially
                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                  const file = files[fileIndex];

                  // Validate file is a video
                  if (!file.type.startsWith('video/')) {
                    console.warn(`Skipping ${file.name}: Not a video file`);
                    continue;
                  }

                  // Get video duration
                  const duration = await new Promise(resolve => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => {
                      resolve(video.duration);
                    };
                    video.src = URL.createObjectURL(file);
                  });

                  // Upload to AWS
                  const url = await handleVideoUpload(
                    file,
                    user,
                    storyId,
                    progress => {
                      // Calculate weighted progress for this file
                      const weightedProgress =
                        (progress + completedFiles * 100) / files.length;
                      setUploadProgress(Math.round(weightedProgress));
                    },
                    duration,
                    store,
                    dispatch
                  );

                  uploadedUrls.push(url);
                  completedFiles++;
                }
              } catch (error) {
                console.error('Error uploading videos:', error);
                alert('Failed to upload videos. Please try again.');
              } finally {
                setIsUploading(false);
                setUploadProgress(0);
              }
            }
          }}
          style={{ display: 'none' }}
          id="videoUpload"
        />
        <ButtonWithIcon
          icon="UploadIcon"
          accentColor="var(--accent-color)"
          classNameButton={styles.uploadButton}
          tooltipText="Upload Video"
          onClick={() => setShowUploadOptions(true)}
        />
      </div>

      {showUploadOptions && createPortal(
        <UploadOptions
          onClose={() => setShowUploadOptions(false)}
          onLocalUpload={handleLocalUpload}
          onGoogleDriveUpload={handleGoogleDriveUpload}
        />,
        document.body
      )}

      {showGoogleDrivePicker && createPortal(
        <GoogleDrivePicker
          onClose={() => setShowGoogleDrivePicker(false)}
          onFileSelect={handleGoogleDriveFileSelect}
        />,
        document.body
      )}
    </div>
  );
};

export { VideoUploadPanel }; 