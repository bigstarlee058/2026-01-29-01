import { useState, useEffect, useCallback } from 'react';

const PRELOAD_THRESHOLD = 2; // Number of scenes to preload before and after visible scenes

export const useSceneVisibility = (sceneIndex, totalScenes) => {
  const [isNearViewport, setIsNearViewport] = useState(false);

  const checkVisibility = useCallback(
    entries => {
      const entry = entries[0];
      if (entry) {
        const isVisible = entry.isIntersecting;

        // Calculate distance to viewport
        const rect = entry.boundingClientRect;
        const windowHeight = window.innerHeight;
        const distanceToViewport =
          rect.top >= 0 ? rect.top : Math.abs(rect.bottom);

        // Consider "near" if within 1.5 viewport heights
        const isNear = distanceToViewport <= windowHeight * 1.5;

        const shouldPreload =
          isVisible ||
          (isNear &&
            // Only preload if within threshold range
            Math.abs(sceneIndex - Math.floor(window.scrollY / rect.height)) <=
              PRELOAD_THRESHOLD);

        setIsNearViewport(shouldPreload);
      }
    },
    [sceneIndex]
  );

  const getObserverTarget = useCallback(
    node => {
      if (!node) return;

      const observer = new IntersectionObserver(checkVisibility, {
        root: null,
        rootMargin: '150% 0px 150% 0px', // Extend the detection area vertically by 1.5 viewport heights
        threshold: 0,
      });

      observer.observe(node);

      return () => observer.disconnect();
    },
    [checkVisibility]
  );

  return {
    isNearViewport,
    getObserverTarget,
  };
};
