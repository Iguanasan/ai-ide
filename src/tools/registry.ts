import React from 'react';

export type ToolMeta = {
  id: string;
  name: string;
  load: () => Promise<{ default: React.ComponentType }>;
};

const registry: ToolMeta[] = [
  { id: 'prompt-analyzer',  name: 'Prompt Analyzer',     load: () => import('./prompt-analyzer') },
  { id: 'conversation-analysis', name: 'Conversation Analysis', load: () => import('./conversation-analysis') }
];

export const useTools = () => registry;
export const getTool = (id: string) => registry.find((t) => t.id === id);