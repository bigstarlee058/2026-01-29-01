import React, { createContext, useContext, useState } from 'react';

const AvatarContext = createContext();

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
};

export const AvatarProvider = ({ children }) => {
  const [avatarUrl, setAvatarUrl] = useState(null);

  const updateAvatar = (url) => {
    setAvatarUrl(url);
  };

  return (
    <AvatarContext.Provider value={{ avatarUrl, updateAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};
