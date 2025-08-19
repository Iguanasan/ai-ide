import React from 'react';

export type ToolMeta = {
  id: string;
  name: string;
  load: () => Promise<{ default: React.ComponentType }>;
};

const registry: ToolMeta[] = [
  { id: 'prompt-analyzer',  name: 'Prompt Analyzer',     load: () => import('./prompt-analyzer') },
  { id: 'local-chat',  name: 'Local Chat',     load: () => import('./local-chat') },
  { id: 'conversation-analysis', name: 'Conversation Analysis', load: () => import('./conversation-analysis') },
  { id: 'agent-manager',    name: 'Agent Manager',       load: () => import('./agent-manager') },
  { id: 'csv-to-json',      name: 'CSV to JSON',         load: () => import('./csv-to-json') },
];

export const useTools = () => registry;
export const getTool = (id: string) => registry.find((t) => t.id === id);