import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatWithSystem } from '../../lib/system-llm';

function extractTextFromHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
    const root = doc.querySelector('[role="main"]') || doc.querySelector('main') || doc.body;
    const w = doc.createTreeWalker(root!, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const s = (n.textContent || '').trim();
        return s ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const lines: string[] = [];
    let node: Node | null;
    while ((node = w.nextNode())) lines.push((node!.textContent || '').trim());
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  } catch {
    return html;
  }
}

const ConversationAnalysis: React.FC = () => {
  const [html, setHtml] = useState('');
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const plain = useMemo(() => extractTextFromHtml(html), [html]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOut('');
    if (!plain.trim()) { setErr('Paste a conversation HTML export first.'); return; }

    setLoading(true);
    try {
      const content = await chatWithSystem([
        { role: 'system', content: 'You are a concise, actionable prompting coach.' },
        {
          role: 'user',
          content:
            "Analyze the user's conversation below and look for two or three ways to help them improve their outcomes by coaching them on better prompting skills. Avoid making things up to satisfy the request; it's OK to tell the user you couldn't find any improvements. Conversation follows:\n\n" +
            plain,
        },
      ], { temperature: 0.3 });
      setOut(content || '_No content returned._');
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const css = `
    .ca-wrap{display:flex;flex-direction:column;gap:12px}
    .label{font-size:12px;color:var(--text-secondary)}
    textarea{width:100%;height:260px;border:1px solid var(--border-gray);border-radius:6px;background:var(--workspace-bg);color:var(--text-primary);padding:8px;font-family:var(--font-code)}
    .btn{height:36px;padding:0 16px;border:none;border-radius:6px;background:var(--primary-color);color:#fff;cursor:pointer}
    .btn[disabled]{opacity:.5;cursor:not-allowed}
    .out{min-height:200px;border:1px solid var(--border-gray);border-radius:6px;padding:12px;white-space:pre-wrap;background:var(--workspace-bg)}
  `;

  return (
    <>
      <style>{css}</style>
      <section className="ca-wrap">
        <h1 className="text-xl font-bold">Conversation Analysis</h1>
        <form onSubmit={onSubmit}>
          <div className="label">Paste conversation HTML</div>
          <textarea
            autoFocus
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            onKeyDown={(e) => {
              // paste -> Tab -> Enter
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); btnRef.current?.focus(); }
            }}
          />
          <button ref={btnRef} type="submit" className="btn" disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </form>

        <div className="label">Recommendations</div>
        <div className="out">
          {err ? <span style={{ color: '#DC3545' }}>{err}</span> : (out ? <ReactMarkdown>{out}</ReactMarkdown> : <em>No output yet.</em>)}
        </div>
      </section>
    </>
  );
};

export default ConversationAnalysis;
