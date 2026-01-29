import { useEffect } from 'react';

export const useModal = isModalShown => {
  useEffect(() => {
    if (isModalShown) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('no-scroll');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('no-scroll');
    };
  }, [isModalShown]);
};
