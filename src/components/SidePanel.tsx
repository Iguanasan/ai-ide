import React, { useState, useEffect, useRef } from 'react';
import type { Tool } from '../types/Tool';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Props {
  tools: Tool[];
  activeTool: string | null;
  onSelect: (id: string) => void;
  toggleSide: () => void;
  panelSide: 'left' | 'right';
}

const SidePanel: React.FC<Props> = ({ tools, activeTool, onSelect, toggleSide, panelSide }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(256); // Initial width in pixels (w-64)
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing && panelRef.current) {
      let newWidth = panelSide === 'left' ? e.clientX : window.innerWidth - e.clientX;
      newWidth = Math.max(200, Math.min(400, newWidth)); // Constrain between 200px and 400px
      setWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  return (
    <aside
      ref={panelRef}
      className={`bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto h-full transition-all duration-300 ${
        isCollapsed ? 'w-0 p-0 overflow-hidden' : ''
      }`}
      style={{ width: isCollapsed ? 0 : width }}
    >
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? (
            <ArrowRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>
      {!isCollapsed && (
        <>
          {tools.length > 0 ? (
            <div className="space-y-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  className={`w-full text-left p-3 rounded-lg transition-colors border ${
                    activeTool === tool.id
                      ? 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-700'
                      : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => onSelect(tool.id)}
                  title={tool.description}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No tools available yet. Add some!</p>
          )}
          <div
            className="absolute right-0 top-0 h-full w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
            onMouseDown={startResizing}
            style={{ position: 'absolute', right: 0 }}
          />
        </>
      )}
      {!isCollapsed && (
        <div className="mt-auto flex justify-center">
          <button
            type="button"
            onClick={toggleSide}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title={panelSide === 'left' ? 'Move to right' : 'Move to left'}
          >
            <div className="flex space-x-2">
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <ArrowRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </button>
        </div>
      )}
    </aside>
  );
};

export default SidePanel;