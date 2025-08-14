// src/tools/markdown-notes/index.tsx
import React, { useMemo, useState } from 'react';

function simpleMarkdownToHtml(md: string): string {
  // Minimal renderer: **bold**, *italic*, `code`, # headings
  let html = md
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n$/gim, '<br/>');
  return html.trim();
}

const MarkdownNotes: React.FC = () => {
  const [text, setText] = useState<string>('# Notes\n\nType *markdown* here.');
  const html = useMemo(() => simpleMarkdownToHtml(text), [text]);

  return (
    <section>
      <h1 className="text-xl font-bold mb-2">Markdown Notes</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Markdown</label>
          <textarea
            className="mt-1 w-full h-72 border rounded p-2 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Preview</label>
          <div
            className="mt-1 w-full h-72 border rounded p-3 overflow-auto bg-white prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </section>
  );
};

export default MarkdownNotes;
