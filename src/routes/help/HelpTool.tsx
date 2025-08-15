import React from 'react';
import { useParams, Link } from 'react-router-dom';

const backBtn = 'ds-btn ds-btn-secondary';

const HELP: Record<string, { title: string; body: React.ReactNode }> = {
  'prompt-analyzer': {
    title: 'Prompt Analyzer',
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>Set your goal, paste a prompt, and click Analyze.</li>
        <li>Use Config to choose provider/model and add your configuration information for your models.</li>
      </ul>
    ),
  },
  'agent-manager': {
    title: 'Agent Manager',
    body: (
      <p>
        This tool is used to add agents and create crews. It's prep for attempting to integrate CrewAI. More to follow...
      </p>
    ),
  },
  'conversation-analysis': {
    title: 'Conversation Analysis',
    body: (
      <>
        <p>
          The Conversation Analyzer accepts a copy of your LLM conversation. Copy your conversation in its entirety,
          paste it into the box and hit analyze.
        </p>
        <p>
          The goal of this tool is to analyze your conversation to suggest ways of achieving better results.
        </p>
      </>
    ),
  },
  'csv-to-json': {
    title: 'CSV to JSON',
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>First row is treated as headers; JSON updates live.</li>
        <li>Use Download to save the JSON file.</li>
      </ul>
    ),
  },
};

const HelpTool: React.FC = () => {
  const { toolId = '' } = useParams();
  const help = HELP[toolId];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-[var(--workspace-bg)] text-[var(--text-primary)]">
      <div className="mb-4">
        <Link to="/tools/prompt-analyzer" className={backBtn}>← Back to App</Link>
      </div>

      {!help ? (
        <>
          <h1 className="text-2xl font-bold mb-2">Tool Help</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            No help found for <code className="px-1 rounded bg-[var(--neutral-gray)]">{toolId}</code>.
          </p>
          <Link className="underline text-[var(--primary-color)] hover:opacity-80" to="/help">Back to Help</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">{help.title}</h1>
          <div className="text-sm [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-5">{help.body}</div>
          <div className="mt-6 flex gap-3">
            <Link className="underline text-[var(--primary-color)] hover:opacity-80" to="/help">Back to Help</Link>
            <Link to="/tools/prompt-analyzer" className={backBtn}>← Back to App</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default HelpTool;
