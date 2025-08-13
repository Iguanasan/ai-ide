import { lazy } from 'react';
import React from 'react';
import type { Tool } from '../types/Tool';
import type { FC } from 'react'; // Changed to type-only import
import * as babel from '@babel/standalone';

const useToolRegistry = (dirHandle: FileSystemDirectoryHandle | null): Tool[] => {
  const [tools, setTools] = React.useState<Tool[]>([]);

  React.useEffect(() => {
    const loadTools = async () => {
      if (!dirHandle) {
        console.log('No directory handle provided');
        return;
      }

      console.log('Checking directory handle:', dirHandle.name);
      try {
        const toolsDir = await dirHandle.getDirectoryHandle('tools', { create: false });
        console.log('Found tools directory:', toolsDir.name);
        const loadedTools: Tool[] = [];

        const entries = (toolsDir as any).entries();
        console.log('Scanning tools directory entries...');
        for await (const [toolName, entry] of entries) {
          console.log(`Found entry: ${toolName}, kind: ${entry.kind}`);
          if (entry.kind === 'directory') {
            console.log(`Processing tool directory: ${toolName}`);
            try {
              const indexHandle = await (entry as FileSystemDirectoryHandle).getFileHandle('index.tsx');
              const file = await indexHandle.getFile();
              const code = await file.text();
              console.log(`Read index.tsx for ${toolName}, code length: ${code.length}`);

              // Transpile JSX to JS
              const transpiled = babel.transform(code, {
                presets: ['react', 'typescript'],
                filename: `${toolName}/index.tsx`,
              }).code;

              // Create blob URL for dynamic import
              const blob = new Blob([transpiled || ''], { type: 'application/javascript' });
              const url = URL.createObjectURL(blob);

              // Lazy load the component
              const LazyComponent = lazy(() =>
                import(url).then(module => {
                  URL.revokeObjectURL(url); // Clean up
                  return { default: module.default as FC };
                })
              );

              loadedTools.push({
                id: toolName,
                name: toolName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                description: `Tool: ${toolName}`,
                component: LazyComponent,
              });
              console.log(`Successfully added tool: ${toolName}`);
            } catch (err) {
              console.warn(`Failed to load tool ${toolName}:`, err);
            }
          } else {
            console.log(`Skipping non-directory entry: ${toolName}`);
          }
        }

        setTools(loadedTools);
        console.log(`Loaded ${loadedTools.length} tools:`, loadedTools.map(t => t.name));
      } catch (err) {
        console.error('Error accessing tools dir:', err);
      }
    };

    loadTools();
  }, [dirHandle]);

  return tools;
};

export default useToolRegistry;