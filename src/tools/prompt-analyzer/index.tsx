import React, { useState, useEffect } from 'react';
import { getRepo } from '../../data';
import { useAuth } from '../../providers/AuthProvider';
import { chatWithSystem, type ChatMessage } from '../../lib/system-llm';

// Set to true during testing to enable debug logging
const DEBUG_MODE = false;

type SectionKey = 'role' | 'task' | 'context' | 'examples' | 'instructions' | 'constraints' | 'outputFormat' | 'query';
type SectionData = { content: string; evaluation: string };
type Sections = Record<SectionKey, SectionData>;

export const SYSTEM_PROMPT = `
You are an evaluator of prompts.
Your task is to analyze the effectiveness of a given user prompt and produce structured feedback.
Follow these steps:

Step 1. Parse Prompt into Sections
Extract content into these categories along with an evaluation for each (use "" if absent):
- Role Assignment
- Task Description
- Context/Background
- Examples
- Specific Instructions
- Constraints & Guidelines
- Desired Output Format
- Audience/Intent
- Final Query/Trigger

Step 2. Style Analysis (Three Sliders)
Evaluate the formatting choice of the prompt along three axes:
- Structure Strictness (Unstructured to Fully Structured)
- Human Readability (Machine-oriented to Human-oriented)
- Hierarchy Depth (Flat to Deeply Nested)
Identify the corresponding format region (Plain text / Markdown / JSON / YAML / Hybrid) and comment on fitness for purpose.

Step 3. Identify Gaps or Weaknesses
- List missing or weak sections.
- Highlight redundancies or overlaps.

Step 4. Suggest Improvements
Provide 2 or 3 targeted questions that would help strengthen or complete the prompt.

Step 5. Score the Prompt
Assign a total effectiveness score (0 to 100) using this rubric:
- Completeness of Sections (30 pts)
- Clarity & Unambiguity (20 pts)
- Alignment of Audience/Intent (15 pts)
- Use of Examples (10 pts)
- Output Format Appropriateness (15 pts)
- Style Fit via Three Sliders (10 pts)

Step 6. Output in JSON
Always return results in the following JSON structure:

{
  "sections": {
    "role": "...","role_evaluation": "...",
    "task": "...","task_evaluation": "...",
    "context": "...","context_evaluation": "...",
    "examples": "...","examples_evaluation": "...",
    "instructions": "...","instructions_evalauation": "...",
    "constraints": "...","constraints_evalauation": "...",
    "output_format": "...","output_evalauation": "...",
    "audience": "...","audience_evalauation": "...",
    "final_query": "..."final_query_evalauation": "...",
  },
  "style": {
    "structure_strictness": "low/medium/high",
    "human_readability": "low/medium/high",
    "hierarchy_depth": "low/medium/high",
    "format_region": "Plain text / Markdown / JSON / YAML / Hybrid",
    "fit_comment": "..."
  },
  "missing": ["section1", "section2"],
  "suggestions": [
    "question1",
    "question2"
  ],
  "score": 0-100
}
`;


const PromptAnalyzer: React.FC = () => {
  const { user } = useAuth();
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [showOriginal, setShowOriginal] = useState(true);
  const [sections, setSections] = useState<Sections>({ role: { content: '', evaluation: '' }, task: { content: '', evaluation: '' }, context: { content: '', evaluation: '' }, examples: { content: '', evaluation: '' }, instructions: { content: '', evaluation: '' }, constraints: { content: '', evaluation: '' }, outputFormat: { content: '', evaluation: '' }, query: { content: '', evaluation: '' } });
  const [missing, setMissing] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<{ id: string; title: string }[]>([]);
  const [isFirstAnalysis, setIsFirstAnalysis] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalKey, setModalKey] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const repo = getRepo();

  useEffect(() => {
    if (user) loadSavedPrompts();
  }, [user]);

  const loadSavedPrompts = async () => {
    const docs = await repo.listDocuments('prompt-analyzer');
    setSavedPrompts(docs.slice(0, 5).map((d) => ({ id: d.id, title: d.title })));
  };

  const loadPrompt = async (id: string) => {
    resetAll();
    const doc = await repo.getDocument(id);
    if (doc) {
      const data = JSON.parse(doc.content);
      setOriginalPrompt(data.original || '');
      const loadedSections = data.sections || {};
      const newSections = {
        role: { content: loadedSections.role || '', evaluation: '' },
        task: { content: loadedSections.task || '', evaluation: '' },
        context: { content: loadedSections.context || '', evaluation: '' },
        examples: { content: loadedSections.examples || '', evaluation: '' },
        instructions: { content: loadedSections.instructions || '', evaluation: '' },
        constraints: { content: loadedSections.constraints || '', evaluation: '' },
        outputFormat: { content: loadedSections.outputFormat || '', evaluation: '' },
        query: { content: loadedSections.query || '', evaluation: '' },
      };
      setSections(newSections);
      setMissing(data.missing || []);
      setSuggestions(data.suggestions || []);
      setScore(data.score || 0);
      setPreview(generatePreview(newSections));
      setShowOriginal(false);
      setIsFirstAnalysis(false);
      setHasChanges(false);
    }
  };

  const analyzePrompt = async () => {
    if (!isFirstAnalysis) {
      reAnalyze();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: originalPrompt },
      ];
      const result = await chatWithSystem(messages);
      if (DEBUG_MODE) {
        setLog(prev => [...prev, `API Call: ${JSON.stringify(messages)}`]);
        setLog(prev => [...prev, `API Response: ${result}`]);
      }
      const parsed: any = JSON.parse(result);
      const sectionsData = parsed.sections || {};
      const newSections: Sections = {
        role: { content: sectionsData.role || '', evaluation: sectionsData.role_evaluation || '' },
        task: { content: sectionsData.task || '', evaluation: sectionsData.task_evaluation || '' },
        context: { content: sectionsData.context || '', evaluation: sectionsData.context_evaluation || '' },
        examples: { content: sectionsData.examples || '', evaluation: sectionsData.examples_evaluation || '' },
        instructions: { content: sectionsData.instructions || '', evaluation: sectionsData.instructions_evaluation || '' },
        constraints: { content: sectionsData.constraints || '', evaluation: sectionsData.constraints_evaluation || '' },
        outputFormat: { content: sectionsData.output_format || '', evaluation: sectionsData.output_format_evaluation || '' },
        query: { content: sectionsData.final_query || '', evaluation: sectionsData.final_query_evaluation || '' },
      };
      setSections(newSections);
      setMissing(Array.isArray(parsed.missing) ? parsed.missing : []);
      setSuggestions(Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
      setScore(typeof parsed.score === 'number' ? parsed.score : 0);
      setPreview(generatePreview(newSections));
      setShowOriginal(false);
      setIsFirstAnalysis(false);
    } catch (err) {
      setError('Analysis failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (key: SectionKey, value: string) => {
    const newSections = { ...sections, [key]: { ...sections[key], content: value } };
    setSections(newSections);
    setPreview(generatePreview(newSections));
  };

  const reAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentPrompt = preview;
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: currentPrompt },
      ];
      const result = await chatWithSystem(messages);
      if (DEBUG_MODE) {
        setLog(prev => [...prev, `API Call: ${JSON.stringify(messages)}`]);
        setLog(prev => [...prev, `API Response: ${result}`]);
      }
      const parsed: any = JSON.parse(result);
      const sectionsData = parsed.sections || {};
      const newSections: Sections = {
        role: { content: sectionsData.role || '', evaluation: sectionsData.role_evaluation || '' },
        task: { content: sectionsData.task || '', evaluation: sectionsData.task_evaluation || '' },
        context: { content: sectionsData.context || '', evaluation: sectionsData.context_evaluation || '' },
        examples: { content: sectionsData.examples || '', evaluation: sectionsData.examples_evaluation || '' },
        instructions: { content: sectionsData.instructions || '', evaluation: sectionsData.instructions_evaluation || '' },
        constraints: { content: sectionsData.constraints || '', evaluation: sectionsData.constraints_evaluation || '' },
        outputFormat: { content: sectionsData.output_format || '', evaluation: sectionsData.output_format_evaluation || '' },
        query: { content: sectionsData.final_query || '', evaluation: sectionsData.final_query_evaluation || '' },
      };
      setSections(newSections);
      setMissing(Array.isArray(parsed.missing) ? parsed.missing : []);
      setSuggestions(Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
      setScore(typeof parsed.score === 'number' ? parsed.score : 0);
      setPreview(generatePreview(newSections));
    } catch (err) {
      setError('Re-analysis failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = (secs: Sections) => {
    return `
**Role Assignment:** ${secs.role.content}

**Task Description:** ${secs.task.content}

**Context/Background:** ${secs.context.content}

**Examples:** ${secs.examples.content}

**Specific Instructions:** ${secs.instructions.content}

**Constraints and Guidelines:** ${secs.constraints.content}

**Desired Output Format:** ${secs.outputFormat.content}

**Final Query or Trigger:** ${secs.query.content}
    `.trim();
  };

  const saveProgress = async () => {
    if (!user) return;
    try {
      await repo.upsertDocument({
        id: crypto.randomUUID(),
        tool: 'prompt-analyzer',
        title: originalPrompt.slice(0, 50) || 'Untitled',
      content: JSON.stringify({ original: originalPrompt, sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.content])), missing, suggestions, score }),
        owner_user_id: user.id,
      });
      loadSavedPrompts();
      setHasChanges(false);
    } catch (err) {
      setError('Save failed');
    }
  };

  const copyPreview = () => {
    navigator.clipboard.writeText(preview);
  };

  const resetAll = () => {
    setOriginalPrompt('');
    setSections({ role: { content: '', evaluation: '' }, task: { content: '', evaluation: '' }, context: { content: '', evaluation: '' }, examples: { content: '', evaluation: '' }, instructions: { content: '', evaluation: '' }, constraints: { content: '', evaluation: '' }, outputFormat: { content: '', evaluation: '' }, query: { content: '', evaluation: '' } });
    setMissing([]);
    setSuggestions([]);
    setScore(0);
    setPreview('');
    setShowOriginal(true);
    setIsFirstAnalysis(true);
    setHasChanges(false);
    setLog([]);
  };

  const deletePrompt = async (id: string) => {
    if (confirm('Are you sure you want to delete this saved prompt?')) {
      await repo.deleteDocument(id);
      loadSavedPrompts();
    }
  };

  return (
    <div className="full-bleed p-[var(--space-lg)]">
      <div style={{ position: 'fixed', top: '60px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="ds-btn ds-btn-ghost" onClick={() => { if (!hasChanges || confirm('Are you sure you want to start over? This will clear all current work.')) resetAll(); }}>
          Start Over
        </button>
        <button className="ds-btn" onClick={saveProgress} disabled={loading || !user}>Save Prompt</button>
        <button className="ds-btn ds-btn-secondary" onClick={() => setLoadModalOpen(true)}>Load Prompt</button>
        {DEBUG_MODE && <button className="ds-btn ds-btn-secondary" onClick={() => navigator.clipboard.writeText(log.join('\n'))}>Copy Log</button>}
      </div>

      <div className="mb-[var(--space-md)]">
        <div
          className="cursor-pointer p-[var(--space-sm)] border border-[var(--border-gray)] rounded bg-[var(--neutral-gray)]"
          onClick={() => setShowOriginal(!showOriginal)}
        >
          <span>Original Prompt {showOriginal ? '(Collapse)' : '(Click to Expand)'}</span>
        </div>
        {showOriginal && (
          <div style={{ overflow: 'hidden' }}>
            <textarea
              className="w-full p-[var(--space-sm)] border border-[var(--border-gray)] rounded mt-1 bg-[var(--neutral-gray)] text-[var(--text-primary)]"
              style={{ wordWrap: 'break-word', maxWidth: '100%', overflowWrap: 'break-word', overflow: 'auto', height: 'calc(100vh - 200px)' }}
              value={originalPrompt}
              onChange={(e) => { setOriginalPrompt(e.target.value); setHasChanges(true); }}
              placeholder="Paste your prompt here..."
            />
            <button className="ds-btn ds-btn-secondary mt-1" onClick={() => { setModalContent(originalPrompt); setModalKey('original'); setModalOpen(true); }}>
              ⛶
            </button>
          </div>
        )}
        {originalPrompt && (
          <button className="ds-btn mt-2" onClick={analyzePrompt} disabled={loading}>
            {loading ? (isFirstAnalysis ? 'Analyzing...' : 'Re-analyzing...') : (isFirstAnalysis ? 'Analyze' : 'Re-analyze')}
          </button>
        )}
      </div>
      {error && <div className="text-[var(--error-red)] mb-[var(--space-sm)]">{error}</div>}
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, width: '50%' }}>
          {!showOriginal && Object.keys(sections).length > 0 && (
            <div className="mb-[var(--space-md)]">
              <h3 className="text-xl font-bold mb-[var(--space-sm)]">Sections</h3>
              {Object.entries(sections).map(([key, value]) => (
                <div key={key} className={`mb-[var(--space-sm)] border ${missing.includes(key) ? 'border-[var(--error-red)]' : 'border-[var(--border-gray)]'} rounded p-[var(--space-sm)]`} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <button className="ds-btn ds-btn-secondary" onClick={() => { setModalContent(value.content); setModalKey(key); setModalOpen(true); }}>
                      ⛶
                    </button>
                  </div>
                  <textarea
                    className="w-full h-24 p-[var(--space-sm)] border border-[var(--border-gray)] rounded bg-[var(--neutral-gray)] text-[var(--text-primary)]"
                    style={{ wordWrap: 'break-word', maxWidth: '100%', overflowWrap: 'break-word', overflow: 'hidden' }}
                    value={value.content}
                    onChange={(e) => { updateSection(key as SectionKey, e.target.value); setHasChanges(true); }}
                  />
                  {value.evaluation && (
                    <div className="mt-2 p-3 bg-gray-800 border-l-4 border-blue-500 rounded-r-md">
                      <div className="flex items-start">
                        <p className="text-white text-sm leading-relaxed font-medium"><blockquote>{value.evaluation}</blockquote></p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, width: '50%' }}>
          {!showOriginal && Object.keys(sections).length > 0 && (
            <>
              {suggestions.length > 0 && (
                <div className="mb-[var(--space-md)]">
                  <h3 className="text-xl font-bold mb-[var(--space-sm)]">Suggestions</h3>
                  {suggestions.map((sug, i) => (
                    <div key={i} className="mb-[var(--space-sm)]" style={{ overflow: 'hidden' }}>
                      <p className="text-sm">{sug}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mb-[var(--space-md)]">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="text-lg font-semibold">Preview Prompt</h3>
                  <button className="ds-btn ds-btn-secondary" onClick={copyPreview}>📋</button>
                </div>
                <pre className="ds-pre" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{preview}</pre>
              </div>
            </>
          )}
        </div>
      </div>
      {!showOriginal && Object.keys(sections).length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'white', color: score >= 80 ? 'var(--success-green)' : score >= 50 ? 'var(--warning-yellow)' : 'var(--error-red)', padding: '15px', borderRadius: '5px', zIndex: 1000, fontSize: '18px' }}>
          <strong>Prompt Strength: {score}/100</strong>
        </div>
      )}
      {loadModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '5px', width: '50%', maxHeight: '80%', overflow: 'auto' }}>
            <h3 className="text-lg font-semibold mb-[var(--space-sm)]">Load Saved Prompts</h3>
            {savedPrompts.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <button className="ds-btn ds-btn-secondary" onClick={() => { loadPrompt(p.id); setLoadModalOpen(false); }}>
                  {p.title}
                </button>
                <button className="ds-btn ds-btn-ghost" onClick={() => deletePrompt(p.id)}>
                  🗑️
                </button>
              </div>
            ))}
            <button onClick={() => setLoadModalOpen(false)} className="ds-btn">
              Close
            </button>
          </div>
        </div>
      )}
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '5px', textAlign: 'center' }}>
            <p>Analyzing Your Prompt...</p>
            <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', margin: '20px auto' }}></div>
          </div>
        </div>
      )}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '5px', width: '80%', height: '80%', display: 'flex', flexDirection: 'column' }}>
            <textarea
              className="flex-1 p-[var(--space-sm)] border border-[var(--border-gray)] rounded bg-[var(--neutral-gray)] text-[var(--text-primary)]"
              style={{ wordWrap: 'break-word', maxWidth: '100%', overflowWrap: 'break-word', overflow: 'auto' }}
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
            />
            <button
              className="ds-btn mt-2"
              onClick={() => {
                if (modalKey === 'original') {
                  setOriginalPrompt(modalContent);
                } else {
                  updateSection(modalKey as SectionKey, modalContent);
                }
                setModalOpen(false);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptAnalyzer;