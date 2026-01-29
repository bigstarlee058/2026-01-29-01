import { useState, useEffect } from 'react';
import { useSocket } from 'contexts/SocketContext';
import { useDispatch } from 'react-redux';
import { storyApi } from '../redux/stories/storyApi';

export const useBackgroundPromptGeneration = ({
  storyId,
  storyData,
  refetch,
  enabled = true,
  onComplete,
}) => {
  const [promptsGenerating, setPromptsGenerating] = useState(false);
  const [promptProgress, setPromptProgress] = useState(0);
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenesForPrompts, setTotalScenesForPrompts] = useState(0);
  const [lastProcessedScene, setLastProcessedScene] = useState(-1);

  const { socket, isConnected, subscribe, unsubscribeAll, emit } = useSocket();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!socket || !storyId || !enabled) return;

    const handleStoryCreationComplete = data => {
      if (data.story?._id !== storyId) return;

      const totalScenes = data.story?.scenes?.length || 0;
      if (totalScenes > 0 && !data.promptsReady) {
        setPromptsGenerating(true);
        setTotalScenesForPrompts(totalScenes);
        setCompletedScenes(0);
        setPromptProgress(0);
        setLastProcessedScene(-1);
      }
    };

    const handleScenePromptReady = async data => {
      if (data.storyId !== storyId) return;
      
      setCompletedScenes(data.completedScenes);
      setPromptProgress(data.progress || 0);
      setLastProcessedScene(data.sceneIndex);

      // Force invalidation of the story cache
      dispatch(
        storyApi.util.invalidateTags([{ type: 'Story', id: storyId }, 'Story'])
      );
    };

    const handleAllPromptsReady = async data => {
      if (data.storyId !== storyId) return;
      
      setPromptsGenerating(false);
      setPromptProgress(100);
      setCompletedScenes(data.totalScenes || data.completedScenes);

      // Force invalidation and refetch
      dispatch(
        storyApi.util.invalidateTags([{ type: 'Story', id: storyId }, 'Story'])
      );

      // Delayed refetch to ensure data consistency
      // Always refetch after prompt generation to get updated prompts
      setTimeout(async () => {
        if (refetch) {
          try {
            await refetch();
          } catch (error) {
            console.error('Auto-refetch failed:', error);
          }
        }
      }, 500);

      // Send final completion event
      socket.emit("allPromptsReady", {
        storyId: storyId,
        totalScenes: data.totalScenes || data.completedScenes,
        completedScenes: data.completedScenes,
        actualScenesWithPrompts: data.completedScenes,
        scenes: data.scenes,
        timestamp: new Date().toISOString(),
      });

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
};

    const handlePromptGenerationError = data => {
      if (data.storyId !== storyId) return;

      console.error('Prompt generation error:', data.error);
      setPromptsGenerating(false);
    };

    // Subscribe to all relevant events
    const keyPrefix = `${storyId}_prompt`;
    const unsubscribe1 = subscribe(
      'storyCreationComplete',
      handleStoryCreationComplete,
      `${keyPrefix}_creation`
    );
    const unsubscribe2 = subscribe(
      'scenePromptReady',
      handleScenePromptReady,
      `${keyPrefix}_sceneReady`
    );
    const unsubscribe3 = subscribe(
      'allPromptsReady',
      handleAllPromptsReady,
      `${keyPrefix}_allReady`
    );
    const unsubscribe4 = subscribe(
      'promptGenerationError',
      handlePromptGenerationError,
      `${keyPrefix}_error`
    );

    return () => {
      unsubscribeAll(keyPrefix);
    };
  }, [socket, storyId, refetch, enabled, subscribe, unsubscribeAll, dispatch, onComplete]);

  // Effect to initialize and track prompt generation state from existing data
  useEffect(() => {
    if (!enabled || !storyData?.scenes || storyData.scenes.length === 0) {
      setPromptsGenerating(false);
      return;
    }

    const totalScenes = storyData.scenes.length;
    const scenesWithPrompts = storyData.scenes.filter(
      scene => scene.prompt && scene.prompt.trim().length > 0
    );
    const completedCount = scenesWithPrompts.length;

    // Only update if we haven't set total scenes from socket events
    if (totalScenesForPrompts === 0) {
      setTotalScenesForPrompts(totalScenes);
    }

    // Only update completed scenes if we haven't received socket updates
    if (lastProcessedScene === -1) {
      setCompletedScenes(completedCount);
    }

    // Check if prompts are still being generated
    const isGenerating = !storyData.promptsReady && completedCount < totalScenes;
    
    if (isGenerating && totalScenesForPrompts === 0) {
      // This is initial load of an in-progress story
      setPromptsGenerating(true);
      const progress = totalScenes > 0 ? Math.round((completedCount / totalScenes) * 100) : 0;
      setPromptProgress(progress);
      setTotalScenesForPrompts(totalScenes);
    } else if (!isGenerating) {
      setPromptsGenerating(false);
      setPromptProgress(100);
    }
  }, [storyData, enabled, totalScenesForPrompts, lastProcessedScene]);

  // Method to manually trigger prompt generation
  const triggerPromptGeneration = () => {
    if (!emit || !storyId) {
      console.warn('Cannot trigger prompt generation: missing emit or storyId');
      return false;
    }

    const success = emit('generateScenePrompts', { storyId });
    
    if (success) {
      setPromptsGenerating(true);
      setPromptProgress(0);
      setCompletedScenes(0);
      setLastProcessedScene(-1);
    }
    
    return success;
  };

  return {
    promptsGenerating,
    promptProgress,
    completedScenes,
    totalScenesForPrompts,
    triggerPromptGeneration,
    isConnected,
    lastProcessedScene,
  };
};
