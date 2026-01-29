import { useEffect, useRef } from 'react';

const useHorizontalScroll = () => {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
        e.preventDefault();
        scrollContainer.scrollBy({
          left: e.deltaY,
          behavior: 'smooth'
        });
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return scrollContainerRef;
};

export { useHorizontalScroll };
