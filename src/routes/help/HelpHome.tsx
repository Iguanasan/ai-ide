import React from 'react';
import { Link } from 'react-router-dom';

const linkCls = 'underline text-[var(--primary-color)] hover:opacity-80';
const backBtn = 'ds-btn ds-btn-secondary';

const HelpHome: React.FC = () => (
  <div className="max-w-3xl mx-auto p-6 bg-[var(--workspace-bg)] text-[var(--text-primary)]">
    <div className="mb-4">
      <Link to="/tools/prompt-analyzer" className={backBtn}>← Back to App</Link>
    </div>

    <h1 className="text-2xl font-bold mb-2">Help</h1>
    <p className="text-sm text-[var(--text-secondary)] mb-6">
      Quick guides, FAQs, and troubleshooting for AI Toolbox.
    </p>

    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
      <ol className="list-decimal ml-5 space-y-1">
        <li>Select a tool from the left sidebar.</li>
        <li>Work in the right panel; use Download/Save/Copy where available to export results.</li>
      </ol>
    </section>

    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Tool Guides</h2>
      <ul className="list-disc ml-5 space-y-1">
        <li><Link to="/help/tools/prompt-analyzer" className={linkCls}>Prompt Analyzer</Link></li>
        <li><Link to="/help/tools/conversation-analysis" className={linkCls}>Conversation Analysis</Link></li>
      </ul>
    </section>

    <div className="mt-8">
      <Link to="/tools/prompt-analyzer" className={backBtn}>← Back to App</Link>
    </div>
  </div>
);

export default HelpHome;
