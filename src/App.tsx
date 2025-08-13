// src/App.tsx
import React, { useState } from 'react';
import Header from './components/Header';
import SidePanel from './components/SidePanel';
import WorkArea from './components/WorkArea';
import { AppProvider, useAppContext } from './context/AppContext';
import { useFileStorage } from './hooks/useFileStorage';
import useToolRegistry from './hooks/useToolRegistry.tsx';

const App: React.FC = () => {
  const { panelSide, setPanelSide } = useAppContext();
  const {
    rememberedFolders,
    selectedFolderName,
    setSelectedFolderName,
    handleOpenExisting,
    handleSelectNew,
  } = useFileStorage();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const tools = useToolRegistry(selectedHandle);

  const toggleSide = () => setPanelSide(panelSide === 'left' ? 'right' : 'left');

  const handleFolderSelection = async (action: 'existing' | 'new') => {
    let handle: FileSystemDirectoryHandle | null = null;
    if (action === 'existing') {
      await handleOpenExisting();
      const folder = rememberedFolders.find(f => f.name === selectedFolderName);
      if (folder) handle = folder.handle;
    } else {
      await handleSelectNew();
      const newFolder = rememberedFolders[rememberedFolders.length - 1]; // Assuming last added
      if (newFolder) handle = newFolder.handle;
    }
    if (handle) {
      setSelectedHandle(handle);
      // Request permission if needed
      if ('requestPermission' in handle) {
        await (handle as any).requestPermission({ mode: 'read' });
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Welcome to AI Toolbox</h2>
            <p className="mb-4">Open a project folder:</p>
            {rememberedFolders.length > 0 ? (
              <>
                <select
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  value={selectedFolderName}
                  onChange={e => setSelectedFolderName(e.target.value)}
                >
                  {rememberedFolders.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
                <button
                  className="w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600"
                  onClick={() => handleFolderSelection('existing')}
                >
                  Open Existing
                </button>
              </>
            ) : (
              <p className="mb-4 text-gray-500 dark:text-gray-400">No remembered folders.</p>
            )}
            <button
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
              onClick={() => handleFolderSelection('new')}
            >
              Select New Folder
            </button>
          </div>
        </div>
      )}
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {panelSide === 'left' && (
          <SidePanel
            tools={tools}
            activeTool={activeTool}
            onSelect={setActiveTool}
            toggleSide={toggleSide}
            panelSide={panelSide}
          />
        )}
        <WorkArea activeTool={activeTool} tools={tools} />
        {panelSide === 'right' && (
          <SidePanel
            tools={tools}
            activeTool={activeTool}
            onSelect={setActiveTool}
            toggleSide={toggleSide}
            panelSide={panelSide}
          />
        )}
      </div>
    </div>
  );
};

const WrappedApp: React.FC = () => (
  <AppProvider>
    <App />
  </AppProvider>
);

export default WrappedApp;