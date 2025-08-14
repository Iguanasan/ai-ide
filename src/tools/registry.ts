// src/tools/registry.ts
import React from 'react';

export type ToolMeta = {
  id: string;
  name: string;
  load: () => Promise<{ default: React.ComponentType }>;
};

const registry: ToolMeta[] = [
  { id: 'agent-manager', name: 'Agent Manager', load: () => import('./agent-manager') },
  { id: 'prompt-analyzer', name: 'Prompt Analyzer', load: () => import('./prompt-analyzer') },
  { id: 'csv-to-json',     name: 'CSV → JSON',      load: () => import('./csv-to-json') },
  { id: 'markdown-notes',  name: 'Markdown Notes',  load: () => import('./markdown-notes') },
];

export const useTools = () => registry;
export const getTool = (id: string) => registry.find((t) => t.id === id);
