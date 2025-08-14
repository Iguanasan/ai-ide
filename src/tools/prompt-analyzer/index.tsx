import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const VERSION = '0.1.2';

const CONFIG_KEY = 'prompt-analyzer.configs';
const GOAL_KEY = 'prompt-analyzer.goal';
const MODELS_KEY = 'prompt-analyzer.models';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

type Provider = 'ollama' | 'grok' | 'chatgpt';

interface Config {
  provider: Provider;
  endpoint: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  instructions: string;
}

type ProviderConfigs = Record<Provider, Config>;

const defaultConfigs: ProviderConfigs = {
  ollama: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434/api/generate',
    model: 'llama3.1',
    temperature: 0.7,
    instructions: '',
  },
  grok: {
    provider: 'grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    apiKey: '',
    model: 'grok-1',
    temperature: 0.7,
    instructions: '',
  },
  chatgpt: {
    provider: 'chatgpt',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    instructions: '',
  },
};

type ProviderModels = Record<Provider, string[]>;

const defaultModels: ProviderModels = {
  ollama: ['llama3.1', 'deepseek-coder-6.7b'],
  grok: ['grok-1'],
  chatgpt: ['gpt-3.5-turbo', 'gpt-4'],
};

const PromptAnalyzer: React.FC = () => {
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>(() => load(CONFIG_KEY, defaultConfigs));
  const [providerModels, setProviderModels] = useState<ProviderModels>(() => load(MODELS_KEY, defaultModels));
  const [activeProvider, setActiveProvider] = useState<Provider>('ollama');
  const [prompt, setPrompt] = useState('');
  const [parsed, setParsed] = useState<{ thinking?: string; response: string }>({ response: '' });
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState(() => load(GOAL_KEY, ''));
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newModel, setNewModel] = useState('');

  useEffect(() => {
    const container = document.querySelector('.app-container');
    if (container) {
      container.style.height = '100%';
      container.style.width = '100%';
    }
  }, []);

  const saveConfig = (next: Partial<Config>) => {
    const updated = { ...providerConfigs[activeProvider], ...next };
    const updatedAll = { ...providerConfigs, [activeProvider]: updated };
    setProviderConfigs(updatedAll);
    save(CONFIG_KEY, updatedAll);
  };

  const addNewModel = () => {
    if (newModel.trim()) {
      const currentModels = providerModels[activeProvider] || [];
      if (!currentModels.includes(newModel)) {
        const updatedModels = [...currentModels, newModel];
        const updatedAll = { ...providerModels, [activeProvider]: updatedModels };
        setProviderModels(updatedAll);
        save(MODELS_KEY, updatedAll);
        saveConfig({ model: newModel });
      }
      setNewModel('');
    }
  };

  const deleteSelectedModel = () => {
    const selectedModel = providerConfigs[activeProvider].model;
    if (selectedModel) {
      const currentModels = providerModels[activeProvider] || [];
      const updatedModels = currentModels.filter(m => m !== selectedModel);
      const updatedAll = { ...providerModels, [activeProvider]: updatedModels };
      setProviderModels(updatedAll);
      save(MODELS_KEY, updatedAll);
      if (updatedModels.length > 0) {
        saveConfig({ model: updatedModels[0] });
      } else {
        saveConfig({ model: '' });
      }
    }
  };

  const parseResponse = (res: string) => {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/i;
    const match = res.match(thinkingRegex);
    if (match) {
      const thinking = match[1].trim();
      const response = res.replace(match[0], '').trim();
      return { thinking, response };
    }
    return { response: res };
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goal.trim()) {
      alert('Please set your goal in the Goal modal.');
      return;
    }
    if (!prompt.trim()) return;
    setLoading(true);
    save(GOAL_KEY, goal);
    const config = providerConfigs[activeProvider];

    try {
      let result = '';
      const fullPrompt = {
        model: config.model || 'llama3.1',
        temperature: config.temperature ?? 0.7,
        prompt: `${config.instructions}\n\nGoal: ${goal}\n\n${prompt}`,
        stream: false,
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey && activeProvider !== 'ollama') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          activeProvider === 'ollama'
            ? { ...fullPrompt, model: config.model || 'llama3.1' }
            : {
                model: config.model || 'llama3.1',
                temperature: config.temperature ?? 0.7,
                messages: [
                  { role: 'system', content: config.instructions || '' },
                  { role: 'user', content: `Goal: ${goal}\n\n${prompt}` },
                ],
              }
        ),
      });

      const data = await res.json();
      if (activeProvider === 'ollama') {
        result = data.response || JSON.stringify(data);
      } else {
        result = data.choices?.[0]?.message?.content || JSON.stringify(data);
      }

      setParsed(parseResponse(result));
    } catch (e) {
      setParsed({ response: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  };

  const config = providerConfigs[activeProvider];
  const isOllama = activeProvider === 'ollama';
  const models = providerModels[activeProvider] || [];

  const css = `
    :root {
      --primary-color: #007ACC;
      --neutral-gray: #2D2D2D;
      --workspace-bg: #1E1E1E;
      --text-primary: #D4D4D4;
      --text-secondary: #858585;
      --border-gray: #3C3C3C;
      --hover-blue: #005A9E;
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
      --font-code: 'Consolas', 'Courier New', monospace;
    }

    [data-theme="light"] {
      --neutral-gray: #F0F0F0;
      --workspace-bg: #FFFFFF;
      --text-primary: #333333;
      --text-secondary: #666666;
      --border-gray: #DDDDDD;
      --hover-blue: #E6F7FF;
    }

    .app-container {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header {
      background: var(--neutral-gray);
      display: flex;
      align-items: center;
      padding: var(--space-lg);
      border-bottom: 1px solid var(--border-gray);
      flex-shrink: 0;
    }

    .header h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 var(--space-lg) 0 0;
    }

    .header select {
      margin-right: var(--space-sm);
      padding: var(--space-sm);
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      background: var(--workspace-bg);
      color: var(--text-primary);
      font-size: 14px;
    }

    .header select:focus {
      outline: 2px solid var(--primary-color);
    }

    .main-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .workspace {
      flex: 1;
      background: var(--workspace-bg);
      padding: var(--space-lg);
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    .workspace form {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    textarea {
      background: var(--workspace-bg);
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      padding: var(--space-sm);
      color: var(--text-primary);
      font-size: 14px;
      width: 100%;
      margin-bottom: var(--space-sm);
      resize: vertical;
    }

    textarea:focus {
      outline: 2px solid var(--primary-color);
    }

    .response {
      background: var(--workspace-bg);
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      padding: var(--space-md);
      overflow: auto;
      flex-grow: 1;
    }

    .box {
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      padding: var(--space-md);
      background: var(--neutral-gray);
      margin-bottom: var(--space-lg);
    }

    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
    }

    .btn {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      padding: var(--space-sm) var(--space-lg);
      font-size: 14px;
      cursor: pointer;
      height: 32px;
    }

    .btn:hover {
      background: var(--hover-blue);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
    }

    .btn-small {
      padding: var(--space-xs) var(--space-sm);
      font-size: 12px;
      height: auto;
    }

    .absolute-version {
      position: absolute;
      bottom: var(--space-xs);
      right: var(--space-lg);
      font-size: 12px;
      color: var(--text-secondary);
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--neutral-gray);
      padding: var(--space-lg);
      border-radius: 4px;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: var(--space-md);
    }

    .add-model {
      display: flex;
      gap: var(--space-sm);
      margin-top: var(--space-sm);
    }

    .add-model input {
      flex: 1;
    }

    .delete-btn {
      margin-top: var(--space-sm);
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="app-container">
        <header className="header">
          <h1>Prompt Analyzer</h1>
          <select
            value={activeProvider}
            onChange={(e) => setActiveProvider(e.target.value as Provider)}
          >
            {['ollama', 'grok', 'chatgpt'].map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => setShowConfigModal(true)}>
            Config
          </button>
          <button className="btn btn-secondary" onClick={() => setShowGoalModal(true)}>
            Set Goal
          </button>
        </header>

        <div className="main-content">
          <main className="workspace">
            <form onSubmit={handleAnalyze}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt to analyze..."
                style={{ height: '150px' }}
              />
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </form>
            {(parsed.thinking || parsed.response) && (
              <div className="response" style={{ marginTop: 'var(--space-lg)' }}>
                {parsed.thinking && (
                  <div className="box">
                    <div className="box-header">
                      <h3>Thinking</h3>
                      <button className="btn btn-secondary btn-small" onClick={() => copyToClipboard(parsed.thinking!)}>
                        Copy
                      </button>
                    </div>
                    <ReactMarkdown>{parsed.thinking}</ReactMarkdown>
                  </div>
                )}
                {parsed.response && (
                  <div className="box">
                    <div className="box-header">
                      <h3>Response</h3>
                      <button className="btn btn-secondary btn-small" onClick={() => copyToClipboard(parsed.response)}>
                        Copy
                      </button>
                    </div>
                    <ReactMarkdown>{parsed.response}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        <div className="absolute-version">Version {VERSION}</div>

        {showConfigModal && (
          <div className="modal" onClick={() => setShowConfigModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">Config for {activeProvider.toUpperCase()}</div>
              <input
                type="text"
                placeholder="Endpoint URL"
                value={config.endpoint || ''}
                onChange={(e) => saveConfig({ endpoint: e.target.value })}
              />
              {activeProvider !== 'ollama' && (
                <input
                  type="text"
                  placeholder="API Key"
                  value={config.apiKey || ''}
                  onChange={(e) => saveConfig({ apiKey: e.target.value })}
                />
              )}
              <div className="model-management">
                <select
                  value={config.model || ''}
                  onChange={(e) => saveConfig({ model: e.target.value })}
                >
                  <option value="">Select Model</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <div className="add-model">
                  <input
                    type="text"
                    placeholder="New Model Name"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                  />
                  <button className="btn btn-secondary" onClick={addNewModel}>
                    Add
                  </button>
                </div>
                <button className="btn btn-secondary delete-btn" onClick={deleteSelectedModel} disabled={!config.model}>
                  Delete Selected Model
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="Temperature"
                value={config.temperature}
                onChange={(e) => saveConfig({ temperature: parseFloat(e.target.value) })}
              />
              <textarea
                placeholder="Analyze Instructions"
                value={config.instructions || ''}
                onChange={(e) => saveConfig({ instructions: e.target.value })}
                style={{ height: '100px' }}
              />
              <button className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {showGoalModal && (
          <div className="modal" onClick={() => setShowGoalModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">Set Your Goal</div>
              <textarea
                placeholder="What is your goal for this prompt?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{ height: '100px' }}
              />
              <button className="btn" onClick={() => setShowGoalModal(false)}>
                Confirm
              </button>
              <button className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PromptAnalyzer;