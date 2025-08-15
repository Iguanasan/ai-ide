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
        <li><Link to="/help/tools/agent-manager" className={linkCls}>Agent Manager</Link></li>
        <li><Link to="/help/tools/csv-to-json" className={linkCls}>CSV to JSON</Link></li>
      </ul>
    </section>

    <section>
      <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
      <details className="mb-2">
        <summary className="cursor-pointer text-[var(--text-primary)]">I can’t log in</summary>
        <div className="mt-2 text-sm text-[var(--text-primary)]">
          Ensure you’re using your company email and correct password. If the issue persists, sign out and try again.
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-[var(--text-primary)]">My data isn’t saving</summary>
        <div className="mt-2 text-sm text-[var(--text-primary)]">
          Check network connectivity. If you switched accounts, sign out and back in.
        </div>
      </details>
    </section>

    <div className="mt-8">
      <Link to="/tools/prompt-analyzer" className={backBtn}>← Back to App</Link>
    </div>
  </div>
);

export default HelpHome;
