import { useState, useEffect } from 'react';
import { useSocket } from 'contexts/SocketContext';
import toast from 'react-hot-toast';

export const useVoiceoverGeneration = ({
  storyId,
  refetch,
  enabled = true,
  onComplete,
}) => {
  const [isVoiceoverGenerating, setIsVoiceoverGenerating] = useState(false);
  const [voiceoverProgress, setVoiceoverProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [lastProcessedSentence, setLastProcessedSentence] = useState(-1);

  const { socket, subscribe, unsubscribeAll } = useSocket();

  useEffect(() => {
    if (!socket || !storyId || !enabled) return;

    const handleVoiceoverStart = data => {
      if (data.storyId !== storyId) return;

      setIsVoiceoverGenerating(true);
      setVoiceoverProgress({ completed: 0, total: 0 });
      setLastProcessedSentence(-1);
    };

    const handleStoryCreationProgress = data => {
      // Note: storyCreationProgress events don't contain storyId, so we assume
      // they relate to the current story. This is a limitation that could cause
      // issues in multi-user scenarios
      const voiceoverSteps = ['generate_voiceover', 'concatenate_audio', 'upload_audio', 'segments_complete'];
      
      if (voiceoverSteps.includes(data.step)) {
        // Start voiceover generation when generate_voiceover step begins
        if (data.step === 'generate_voiceover') {
          setIsVoiceoverGenerating(true);
          setVoiceoverProgress({ completed: 0, total: 0 });
          setLastProcessedSentence(-1);
        }
        
        // Complete voiceover generation when segments are complete
        if (data.step === 'segments_complete' && data.progress === 100) {
          setIsVoiceoverGenerating(false);
          
          // Call onComplete callback if provided
          if (onComplete) {
            onComplete();
          }

          // Delayed refetch to ensure data consistency
          setTimeout(async () => {
            if (refetch) {
              try {
                await refetch();
              } catch (error) {
                console.error('Auto-refetch after voiceover failed:', error);
              }
            }
          }, 1000);
        }
      }
    };

    const handleVoiceoverProgress = data => {
      if (data.storyId !== storyId) return;

      // Ensure voiceover generation is active when we receive progress
      setIsVoiceoverGenerating(true);

      setVoiceoverProgress({
        completed: data.completedSentences,
        total: data.totalSentences
      });
      setLastProcessedSentence(data.sentenceIndex || data.completedSentences - 1);
    };

    const handleVoiceoverComplete = data => {
      if (data.storyId !== storyId) return;

      setIsVoiceoverGenerating(false);
      setVoiceoverProgress({ 
        completed: data.totalSentences || data.processedSentences || 0, 
        total: data.totalSentences || data.processedSentences || 0 
      });
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }

      // Delayed refetch to ensure data consistency
      setTimeout(async () => {
        if (refetch) {
          try {
            await refetch();
          } catch (error) {
            console.error('Auto-refetch after voiceover failed:', error);
          }
        }
      }, 1000);
    };

    const handleVoiceoverError = data => {
      if (data.storyId !== storyId) return;

      console.error("Voice generation error:", data.error);
      setIsVoiceoverGenerating(false);
      setVoiceoverProgress({ completed: 0, total: 0 });
      toast.error(`Voice generation error: ${data.error}`);
    };

    const keyPrefix = `${storyId}_voiceover`;
    const unsubscribe1 = subscribe('voiceoverGenerationStarted', handleVoiceoverStart, `${keyPrefix}_start`);
    const unsubscribe2 = subscribe('voiceoverGenerated', handleVoiceoverProgress, `${keyPrefix}_progress`);
    const unsubscribe3 = subscribe('voiceoverAndSegmentsComplete', handleVoiceoverComplete, `${keyPrefix}_complete`);
    const unsubscribe4 = subscribe('voiceoverError', handleVoiceoverError, `${keyPrefix}_error`);
    const unsubscribe5 = subscribe('storyCreationProgress', handleStoryCreationProgress, `${keyPrefix}_creation_progress`);

    return () => {
      unsubscribeAll(keyPrefix);
    };
  }, [socket, storyId, subscribe, unsubscribeAll, refetch, enabled, onComplete]);

  // Calculate progress percentage
  const progressPercentage = voiceoverProgress.total > 0 
    ? Math.round((voiceoverProgress.completed / voiceoverProgress.total) * 100)
    : 0;

  return {
    isVoiceoverGenerating,
    voiceoverProgress,
    voiceoverProgressPercentage: progressPercentage,
    lastProcessedSentence,
  };
}; 