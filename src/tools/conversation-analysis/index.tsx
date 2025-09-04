import React, { useMemo, useRef, useState, useEffect } from 'react';
import { chatWithSystem } from '../../lib/system-llm';
import { getRepo } from '../../data';
import { useAuth } from '../../providers/AuthProvider';

// Set to true during testing to enable debug logging
const DEBUG_MODE = false;

const SYSTEM_PROMPT = `You are an expert in LLM prompt engineering and conversation analysis.
Your task is to analyze the entire dialogue and provide structured recommendations
that will help the human improve future interactions with LLMs to maximize the quality
of results.

Follow these steps:

Step 1. Conversation Summary
Provide a concise summary of the conversation's purpose, flow, and key themes.

Step 2. Strengths
Identify what the human did well in the conversation (e.g., clarity, context, step-by-step instructions).

Step 3. Weaknesses
Identify issues that reduced effectiveness (e.g., vague queries, missing context, unclear output expectations, lack of constraints).

Step 4. Missed Opportunities
Highlight what could have been included or asked to get better results (e.g., providing examples, specifying format, giving role guidance).

Step 5. Actionable Recommendations
List 3 to 5 concrete suggestions the human could apply in future chats to improve prompt effectiveness, clarity, and outcome alignment.

Step 6. Output in JSON
Always return results in the following JSON structure:

{
  "summary": "...",
  "strengths": ["point1", "point2"],
  "weaknesses": ["point1", "point2"],
  "missed_opportunities": ["point1", "point2"],
  "recommendations": [
    "recommendation1",
    "recommendation2",
    "recommendation3"
  ]
}`;

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

function cleanText(text: string): string {
  return text
    // Remove emoji and other Unicode symbols/icons
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Remove em-dashes and other fancy dashes
    .replace(/—|–|―/g, '-')
    // Remove smart quotes and replace with regular quotes
    .replace(/["""]/g, '"')
    .replace(/[''']/g, "'")
    // Remove zero-width characters and other invisible Unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove other potentially problematic Unicode characters
    .replace(/[\u00A0\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ')
    // Clean up multiple spaces
    .replace(/ +/g, ' ')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface StructuredOutputProps {
  content: string;
}

const StructuredOutput: React.FC<StructuredOutputProps> = ({ content }) => {
  try {
    // Clean the content first to remove weird characters
    const cleanedContent = cleanText(content);
    // Try to extract JSON from the content if it's mixed with other text
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : cleanedContent;
    const data = JSON.parse(jsonString);

    return (
      <div className="structured-output">
        {data.summary && (
          <div className="section">
            <div className="section-title">📋 Conversation Summary</div>
            <div className="section-content">{data.summary}</div>
          </div>
        )}
        {data.strengths && data.strengths.length > 0 && (
          <div className="section">
            <div className="section-title">✅ Strengths</div>
            <ul>
              {data.strengths.map((strength: string, i: number) => (
                <li key={i}>{strength}</li>
              ))}
            </ul>
          </div>
        )}
        {data.weaknesses && data.weaknesses.length > 0 && (
          <div className="section">
            <div className="section-title">❌ Weaknesses</div>
            <ul>
              {data.weaknesses.map((weakness: string, i: number) => (
                <li key={i}>{weakness}</li>
              ))}
            </ul>
          </div>
        )}
        {data.missed_opportunities && data.missed_opportunities.length > 0 && (
          <div className="section">
            <div className="section-title">💡 Missed Opportunities</div>
            <ul>
              {data.missed_opportunities.map((opportunity: string, i: number) => (
                <li key={i}>{opportunity}</li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="section">
            <div className="section-title">🎯 Actionable Recommendations</div>
            <ul>
              {data.recommendations.map((recommendation: string, i: number) => (
                <li key={i}>{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  } catch (error) {
    // If JSON parsing fails, fall back to displaying the cleaned raw content
    const cleanedContent = cleanText(content);
    return (
      <div className="markdown-content">
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{cleanedContent}</pre>
      </div>
    );
  }
};

const ConversationAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [html, setHtml] = useState('');
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savedConversations, setSavedConversations] = useState<{ id: string; title: string }[]>([]);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const repo = getRepo();

  const plain = useMemo(() => extractTextFromHtml(html), [html]);

  useEffect(() => {
    if (user) loadSavedConversations();
  }, [user]);

  const loadSavedConversations = async () => {
    const docs = await repo.listDocuments('conversation-analysis');
    setSavedConversations(docs.slice(0, 5).map((d) => ({ id: d.id, title: d.title })));
  };

  const loadConversation = async (id: string) => {
    const doc = await repo.getDocument(id);
    if (doc) {
      const data = JSON.parse(doc.content);
      setHtml(data.html || '');
      setOut(data.output || '');
      setLoadModalOpen(false);
      setHasChanges(false);
    }
  };

  const saveConversation = async () => {
    if (!user) return;
    try {
      await repo.upsertDocument({
        id: crypto.randomUUID(),
        tool: 'conversation-analysis',
        title: html.slice(0, 50) || 'Untitled Conversation',
        content: JSON.stringify({ html, output: out }),
        owner_user_id: user.id,
      });
      loadSavedConversations();
      setHasChanges(false);
    } catch (err) {
      setErr('Save failed: ' + (err as Error).message);
    }
  };

  const deleteConversation = async (id: string) => {
    if (confirm('Are you sure you want to delete this saved conversation?')) {
      await repo.deleteDocument(id);
      loadSavedConversations();
    }
  };

  const resetAll = () => {
    if (!hasChanges || confirm('Are you sure you want to start over? This will clear all current work.')) {
      setHtml('');
      setOut('');
      setErr('');
      setHasChanges(false);
      setLog([]);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOut('');
    if (!plain.trim()) { setErr('Paste a conversation HTML export first.'); return; }

    setLoading(true);
    try {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: plain,
        },
      ];
      if (DEBUG_MODE) {
        setLog(prev => [...prev, `API Call: ${JSON.stringify(messages)}`]);
      }
      const content = await chatWithSystem(messages, { temperature: 0.3 });
      if (DEBUG_MODE) {
        setLog(prev => [...prev, `API Response: ${content}`]);
      }
      const cleanedContent = cleanText(content || '_No content returned._');
      setOut(cleanedContent);
      setHasChanges(true);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const css = `
    .ca-wrap{display:flex;flex-direction:column;gap:12px;padding:20px}
    .columns{display:flex;gap:40px;height:calc(100vh - 120px)}
    .left-column{flex:1;display:flex;flex-direction:column;gap:12px}
    .right-column{flex:1;display:flex;flex-direction:column;gap:12px}
    .label{font-size:12px;color:var(--text-secondary)}
    textarea{width:100%;flex:1;border:1px solid var(--border-gray);border-radius:6px;background:var(--workspace-bg);color:var(--text-primary);padding:8px;font-family:var(--font-code);resize:none}
    .btn{height:36px;padding:0 16px;border:none;border-radius:6px;background:var(--primary-color);color:#fff;cursor:pointer}
    .btn[disabled]{opacity:.5;cursor:not-allowed}
    .out{border:1px solid var(--border-gray);border-radius:6px;padding:12px;background:var(--workspace-bg);overflow-y:auto}
    .markdown-content{color:var(--text-primary);line-height:1.6}
    .markdown-content h1,.markdown-content h2,.markdown-content h3{margin-top:16px;margin-bottom:8px;font-weight:bold}
    .markdown-content h1{font-size:24px}
    .markdown-content h2{font-size:20px}
    .markdown-content h3{font-size:18px}
    .markdown-content p{margin-bottom:12px}
    .markdown-content ul,.markdown-content ol{margin-left:20px;margin-bottom:12px}
    .markdown-content li{margin-bottom:4px}
    .markdown-content code{background:#f4f4f4;padding:2px 4px;border-radius:3px;font-family:var(--font-code);font-size:14px}
    .markdown-content pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto;margin:12px 0}
    .markdown-content blockquote{border-left:4px solid var(--border-gray);padding-left:12px;margin:12px 0;color:var(--text-secondary)}
    .structured-output .section{margin-bottom:20px}
    .structured-output .section-title{font-weight:bold;color:var(--primary-color);margin-bottom:8px;font-size:16px}
    .structured-output .section-content{margin-left:12px}
    .structured-output ul{margin:8px 0;padding-left:20px}
    .structured-output li{margin-bottom:4px}
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ position: 'fixed', top: '60px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="ds-btn ds-btn-ghost" onClick={resetAll}>
          Start Over
        </button>
        <button className="ds-btn" onClick={saveConversation} disabled={loading || !user}>Save Conversation</button>
        <button className="ds-btn ds-btn-secondary" onClick={() => setLoadModalOpen(true)}>Load Conversation</button>
        {DEBUG_MODE && <button className="ds-btn ds-btn-secondary" onClick={() => navigator.clipboard.writeText(log.join('\n'))}>Copy Log</button>}
      </div>
      <section className="ca-wrap">
        <h1 className="text-xl font-bold">Conversation Analysis</h1>
        <div className="columns">
          <div className="left-column">
            <div className="label">Paste conversation HTML</div>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '70%' }}>
              <textarea
                autoFocus
                value={html}
                onChange={(e) => { setHtml(e.target.value); setHasChanges(true); }}
                onKeyDown={(e) => {
                  // paste -> Tab -> Enter
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); btnRef.current?.focus(); }
                }}
                placeholder="Paste your conversation HTML here..."
              />
              <button ref={btnRef} type="submit" className="btn" disabled={loading} style={{ marginTop: '12px', alignSelf: 'flex-start' }}>
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
            </form>
          </div>
          <div className="right-column">
            <div className="label">Recommendations</div>
            <div className="out" style={{ height: '80%' }}>
              {err ? (
                <span style={{ color: '#DC3545' }}>{err}</span>
              ) : out ? (
                <StructuredOutput content={out} />
              ) : (
                <em>No output yet.</em>
              )}
            </div>
          </div>
        </div>
      </section>
      {loadModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '5px', width: '50%', maxHeight: '80%', overflow: 'auto' }}>
            <h3 className="text-lg font-semibold mb-[var(--space-sm)]">Load Saved Conversations</h3>
            {savedConversations.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <button className="ds-btn ds-btn-secondary" onClick={() => loadConversation(p.id)}>
                  {p.title}
                </button>
                <button className="ds-btn ds-btn-ghost" onClick={() => deleteConversation(p.id)}>
                  🗑️
                </button>
              </div>
            ))}
            <button onClick={() => setLoadModalOpen(false)} className="ds-btn" style={{ marginTop: '10px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationAnalysis;
