import { useEffect, useRef } from 'react';
import { getPromptsByStatus } from 'utils/prompts';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;

export const useGetBotGeneration = ({
  storyId,
  owner,
  setPromptsStatuses,
  setIsImagesLoading,
  addImage,
  changePromptsStatus,
  store,
  setIsImageEditingStarted,
  setIsImageGenerationStarted,
  setGenerationProgress,
  refetch,
}) => {
  const activePromptsRef = useRef(0);

  useEffect(() => {
    if (!storyId || !owner || !setIsImageEditingStarted) {
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
    });

    socket.on('connect', () => {
      socket.emit('subscribeToStory', { storyId, owner });
    });

    socket.on('connect_error', error => {
      console.error('Connection error:', error);
    });

    socket.on('promptStatusesUpdated', ({ prompts }) => {
      setPromptsStatuses(prompts);

      // Count completed prompts only
      const completedPrompts = prompts.filter(p => p.status === 'DONE');

      // Update generation progress using the stored total
      if (activePromptsRef.current > 0) {
        setGenerationProgress({
          current: completedPrompts.length,
          total: activePromptsRef.current,
        });
      }
    });

    socket.on('imageEditingStart', ({ isStarted }) => {
      if (isStarted) {
        setIsImageEditingStarted(true);
      }
    });

    socket.on('imageEditingUpdated', ({ imageEditing }) => {
      const { generated_images, initialImage } = imageEditing;

      if (generated_images?.length > 0) {
        const { googleCloudUrl, minGoogleCloudUrl } = generated_images[0];

        store.updateCanvasImage({
          url: googleCloudUrl,
          minUrl: minGoogleCloudUrl,
          id: initialImage,
        });
      }
      setIsImageEditingStarted(false);
    });

    socket.on('imageGenerationStart', ({ isGenerationStarted, pointId }) => {
      if (isGenerationStarted) {
        setIsImagesLoading(false);
        setIsImageGenerationStarted(true);
        // Increment the counter on generation start
        activePromptsRef.current += 1;
        setGenerationProgress({
          current: 0,
          total: activePromptsRef.current,
        });
      }
    });

    socket.on('imageGenerationEnd', ({ isGenerationEnded, pointId }) => {
      if (isGenerationEnded) {
        setIsImagesLoading(false);
        setIsImageGenerationStarted(false);
        // Decrement the counter on generation end
        activePromptsRef.current = Math.max(0, activePromptsRef.current - 1);
        if (activePromptsRef.current === 0) {
          setGenerationProgress({ current: 0, total: 0 });
        }
        refetch();
      }
    });

    socket.on('promptInWork', async ({ prompt }) => {
      let image = await getPromptsByStatus({
        owner: owner,
        status: 'INWORK',
        storyId,
      });

      let awaitCount = 0;

      while (!image.generationId && awaitCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        awaitCount += 1;
      }

      if (awaitCount >= 4) {
        await changePromptsStatus({
          id: image._id,
          status: 'NEW',
        });
      }

      if (image.modelId) {
        addImage({
          image: {
            ...image,
            storyId,
          },
        });

        await changePromptsStatus({
          id: image.statusId,
          status: 'DONE',
        });

        setIsImagesLoading(false);
      }
    });

    socket.on('promptError', async ({ prompt, message }) => {
      await changePromptsStatus({
        id: prompt._id,
        status: 'DONE',
      });
      setIsImageGenerationStarted(false);
      setGenerationProgress({ current: 0, total: 0 });
    });

    socket.on('promptStatusUpdate', async ({ prompt }) => {
      addImage({
        image: {
          ...prompt,
          storyId,
        },
      });

      await changePromptsStatus({
        id: prompt.statusId,
        status: 'DONE',
      });

      setIsImagesLoading(false);
    });

    socket.on('error', error => {
      setIsImageGenerationStarted(false);
      setGenerationProgress({ current: 0, total: 0 });
    });

    socket.io.on('upgrade', () => {});

    socket.on('disconnect', reason => {
      setIsImageGenerationStarted(false);
      setGenerationProgress({ current: 0, total: 0 });
    });

    return () => {
      socket.emit('unsubscribeFromStory', { storyId, owner });
      socket.disconnect();
    };
  }, [
    storyId,
    owner,
    setPromptsStatuses,
    setIsImagesLoading,
    addImage,
    changePromptsStatus,
    store,
    refetch,
    setIsImageEditingStarted,
    setIsImageGenerationStarted,
    setGenerationProgress,
  ]);
};
