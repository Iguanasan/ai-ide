import { useState, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';

interface Folder {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export const useFileStorage = () => {
  const [rememberedFolders, setRememberedFolders] = useState<Folder[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');

  // Load remembered folders from IndexedDB on mount
  useEffect(() => {
    const loadFolders = async () => {
      const storedFolders = await get('rememberedFolders');
      if (storedFolders) {
        // Validate handles (they might be invalidated by browser security)
        const validFolders = await Promise.all(
          storedFolders.map(async (folder) => {
            try {
              await folder.handle.requestPermission({ mode: 'readwrite' });
              return folder;
            } catch {
              return null;
            }
          })
        ).then(folders => folders.filter(f => f !== null));
        setRememberedFolders(validFolders as Folder[]);
      }
    };
    loadFolders();
  }, []);

  // Save folders to IndexedDB when updated
  useEffect(() => {
    if (rememberedFolders.length > 0) {
      set('rememberedFolders', rememberedFolders);
    } else {
      del('rememberedFolders');
    }
  }, [rememberedFolders]);

  const handleOpenExisting = async () => {
    if (!selectedFolderName) return;
    const folder = rememberedFolders.find(f => f.name === selectedFolderName);
    if (folder) {
      try {
        // Request permission if needed
        const permission = await folder.handle.requestPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          // Example: Write to a file
          const fileHandle = await folder.handle.getFileHandle('test.txt', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write('Updated content at ' + new Date().toISOString());
          await writable.close();
          console.log(`Wrote to ${selectedFolderName}/test.txt`);
          // Example: Read a file
          const file = await fileHandle.getFile();
          const content = await file.text();
          console.log(`Read from ${selectedFolderName}/test.txt: ${content}`);
        } else {
          console.log('Permission denied for folder:', selectedFolderName);
        }
      } catch (error) {
        console.error('Error accessing folder:', error);
      }
    }
  };

  const handleSelectNew = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const newFolder: Folder = { name: dirHandle.name, handle: dirHandle };
      setRememberedFolders(prev => [...prev, newFolder]);
      setSelectedFolderName(dirHandle.name);
      // Example: Write a sample file
      const fileHandle = await dirHandle.getFileHandle('test.txt', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('Created at ' + new Date().toISOString());
      await writable.close();
      console.log(`Created test.txt in ${dirHandle.name}`);
    } catch (error) {
      console.error('Error selecting new folder:', error);
    }
  };

  return {
    rememberedFolders,
    selectedFolderName,
    setSelectedFolderName,
    handleOpenExisting,
    handleSelectNew,
  };
};