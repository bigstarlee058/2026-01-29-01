import { useEffect } from 'react';

export const useInputScroll = ({
  min,
  max,
  step,
  currentValue,
  onChange,
  enabled = true,
  ref
}) => {
  useEffect(() => {
    const input = ref?.current;
    if (!input || !enabled) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      const direction = e.deltaY > 0 ? -1 : 1;
      const currentVal = currentValue;
      
      let newValue = currentVal + direction * step;
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    };

    input.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      input.removeEventListener('wheel', handleWheel);
    };
  }, [min, max, step, currentValue, onChange, enabled, ref]);
};
