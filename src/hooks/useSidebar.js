import React, { createContext, useState, useContext, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [sidebarState, setSidebarState] = useState(() => {
    const storedState = localStorage.getItem('sidebarState');
    return storedState ? JSON.parse(storedState) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarState', JSON.stringify(sidebarState));
  }, [sidebarState]);

  return (
    <SidebarContext.Provider value={{ sidebarState, setSidebarState }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
