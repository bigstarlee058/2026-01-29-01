import { useEffect, useContext } from 'react';
import { StoreContext } from '../mobx';

export const useVideoStopOnUnmount = () => {
  const store = useContext(StoreContext);

  useEffect(() => {
    return () => {
      if (store?.playing) {
        store.setPlaying(false);
      }
      if (store) {
        store.cleanup();
      }
    };
  }, [store]);
};
