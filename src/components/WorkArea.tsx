import React from 'react';
import type { Tool } from '../types/Tool';

interface Props {
  activeTool: string | null;
  tools: Tool[];
}

const WorkArea: React.FC<Props> = ({ activeTool, tools }) => {
  const ToolComponent = tools.find(t => t.id === activeTool)?.component;
  return <main className="flex-1 p-4 overflow-y-auto">{ToolComponent ? <ToolComponent /> : <p>Select a tool</p>}</main>;
};
export default WorkArea;