import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  panelSide: 'left' | 'right';
  setPanelSide: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('left');

  return <AppContext.Provider value={{ panelSide, setPanelSide }}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};