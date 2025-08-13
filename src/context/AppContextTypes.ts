import React, { createContext, useContext } from 'react';

interface AppContextType {
  panelSide: 'left' | 'right';
  setPanelSide: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

export { AppContext };