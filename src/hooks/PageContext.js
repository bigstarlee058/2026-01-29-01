import React, { createContext, useContext, useState } from 'react';

const PageContext = createContext();

export const PageProvider = ({ children }) => {
  const [isGalleryPage, setIsGalleryPage] = useState(false);

  return (
    <PageContext.Provider value={{ isGalleryPage, setIsGalleryPage }}>
      {children}
    </PageContext.Provider>
  );
};

export const usePageContext = () => useContext(PageContext);
