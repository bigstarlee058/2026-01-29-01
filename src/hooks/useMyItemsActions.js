import { useCallback } from 'react';
import { useDeleteFileMutation } from '../redux/gallery/galleryApi';
import toast from 'react-hot-toast';

const normalize = value => (value || '').toLowerCase();

const isVideoExt = (typeOrName) => /(mp4|avi|mov|wmv|flv|webm)$/.test(typeOrName);
const isAudioExt = (typeOrName) => /(mp3|wav|ogg|flac|aac|m4a|wma)$/.test(typeOrName);
const isImageExt = (typeOrName) => /(jpg|jpeg|png|webp|gif)$/.test(typeOrName);

export const useMyItemsActions = ({
  items = [],
  findItemById,
  onPreviewVideo,
  onPreviewImage,
  onPreviewAudio,
  onEditVideo,
  onTrimVideo,
  onTrimAudio,
  onRename,
  onViewDetails,
  getDownloadName,
  onConfirm,
  store,
  onAfterDelete,
} = {}) => {
  const [deleteFile] = useDeleteFileMutation();

  const getItem = useCallback(
    id => (findItemById ? findItemById(id) : items.find(i => i.id === id)),
    [findItemById, items]
  );

  const detectCategory = useCallback(item => {
    if (!item) return 'file';
    if (item.category) return item.category;
    const type = normalize(item.fileType || item.type);
    const name = normalize(item.fileName || item.title);
    if (isVideoExt(type) || isVideoExt(name)) return 'video';
    if (isAudioExt(type) || isAudioExt(name)) return 'audio';
    if (isImageExt(type) || isImageExt(name)) return 'image';
    return 'file';
  }, []);

  const downloadByUrl = useCallback((url, filename) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    if (filename) link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleMenuOption = useCallback(
    async (option, itemId) => {
      const item = getItem(itemId);
      if (!item) return;

      switch (option?.name) {
        case 'preview': {
          const category = detectCategory(item);
          if (category === 'video' && onPreviewVideo && item.url) onPreviewVideo(item);
          else if (category === 'image' && onPreviewImage && (item.url || item.thumbnail)) onPreviewImage(item);
          else if (category === 'audio' && onPreviewAudio && item.url) onPreviewAudio(item);
          break;
        }
        case 'edit': {
          if (onEditVideo) onEditVideo(item);
          break;
        }
        case 'trim': {
          const category = detectCategory(item);
          if (category === 'video' && onTrimVideo) onTrimVideo(item);
          else if (category === 'audio' && onTrimAudio) onTrimAudio(item);
          break;
        }
        case 'download': {
          const name = getDownloadName ? getDownloadName(item) : (item.title || 'file');
          if (item.url) downloadByUrl(item.url, name);
          break;
        }
        case 'delete': {
          try {
            const ok = onConfirm ? await onConfirm('Are you sure you want to permanently delete this file?') : true;
            if (!ok) break;

            // Remove references from timeline first
            if (store && item?.url) {
              const toRemove = (store.editorElements || [])
                .filter(
                  el =>
                    (el.type === 'video' || el.type === 'imageUrl' || el.type === 'audio') &&
                    el?.properties?.src === item.url
                )
                .map(el => el.id);
              if (toRemove.length) {
                await store.removeEditorElements(toRemove);
              }
            }

            await deleteFile(itemId);
            if (onAfterDelete) onAfterDelete(itemId);
          } catch (e) {
            // rtk query handles errors
          }
          break;
        }
        case 'rename': {
          if (onRename) onRename(item);
          break;
        }
        case 'details': {
          if (onViewDetails) onViewDetails(item);
          break;
        }
        case 'addToTimeline': {
          if (!store) {
            toast.error('Timeline is not available');
            break;
          }
          
          const category = detectCategory(item);
          
          try {
            switch (category) {
              case 'image':
                if (item.url || item.thumbnail) {
                  store.addImageLocal({
                    url: item.url || item.thumbnail,
                    minUrl: item.thumbnail || item.url,
                    row: 0,
                    startTime: 0
                  });
                  toast.success(`Added ${item.title || 'image'} to timeline`);
                } else {
                  toast.error('Image URL not available');
                }
                break;
                
              case 'video':
                if (item.url) {
                  store.handleVideoUploadFromUrl({
                    url: item.url,
                    title: item.title || 'Video',
                    duration: item.rawDuration || null,
                    row: 0,
                    startTime: 0,
                    isNeedLoader: false
                  });
                  toast.success(`Added ${item.title || 'video'} to timeline`);
                } else {
                  toast.error('Video URL not available');
                }
                break;
                
              case 'audio':
                if (item.url) {
                  store.addExistingAudio({
                    base64Audio: item.url,
                    durationMs: item.rawDuration || 0,
                    duration: item.rawDuration || 0,
                    row: 1, // Audio typically goes on row 1
                    startTime: 0,
                    audioType: 'music',
                    name: item.title || 'Audio'
                  });
                  toast.success(`Added ${item.title || 'audio'} to timeline`);
                } else {
                  toast.error('Audio URL not available');
                }
                break;
                
              default:
                toast.error(`Cannot add ${category} files to timeline`);
            }
          } catch (error) {
            console.error('Error adding item to timeline:', error);
            toast.error(`Failed to add ${item.title || 'item'} to timeline`);
          }
          break;
        }
        default:
          break;
      }
    },
    [getItem, detectCategory, onPreviewVideo, onPreviewImage, onPreviewAudio, onEditVideo, onTrimVideo, onTrimAudio, onRename, onViewDetails, getDownloadName, deleteFile, downloadByUrl, onConfirm, store, onAfterDelete]
  );

  return { handleMenuOption, downloadByUrl, detectCategory };
};