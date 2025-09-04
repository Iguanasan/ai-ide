import React from 'react';
import { useParams, Link } from 'react-router-dom';

const backBtn = 'ds-btn ds-btn-secondary';

const HELP: Record<string, { title: string; body: React.ReactNode }> = {
  'prompt-analyzer': {
    title: 'Prompt Analyzer',
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>Paste in the prompt you want analyzed and press the [Analyze] button.</li>
        <li>The system will analyze the prompt and provide a screen where you can update various sections to build new prompt that will achieve better results.</li>
        <li>After updating the various sections based on their specific critique or one of the provided suggestions, re-analyze to see if you've improved your score.</li>
        <li>You can use the Save and Load buttons to save your work and come back to it later.</li>
      </ul>
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
          The goal of this tool is to analyze your conversation to suggest ways of achieving better results in future conversations with the LLM.
        </p>
      </>
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
