import { useState, createContext } from 'react';
import { Store } from './store';

export const StoreContext = createContext(new Store());

export function StoreProvider({ children }) {
  const [store] = useState(new Store());
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
