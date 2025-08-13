import React, { useState } from 'react';
import { generateResponse } from '../../services/llmService';
import ReactMarkdown from 'react-markdown';

const VERSION = '0.1.2';

const CONFIG_KEY = 'prompt-analyzer.configs';
const GOAL_KEY = 'prompt-analyzer.goal';

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
    endpoint: '',
    instructions: '',
  },
  grok: {
    provider: 'grok',
    endpoint: '',
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

const PromptAnalyzer: React.FC = () => {
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>(() => load(CONFIG_KEY, defaultConfigs));
  const [activeProvider, setActiveProvider] = useState<Provider>('ollama');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goal, setGoal] = useState(() => load(GOAL_KEY, ''));

  const saveConfig = (next: Partial<Config>) => {
    const updated = { ...providerConfigs[activeProvider], ...next };
    const updatedAll = { ...providerConfigs, [activeProvider]: updated };
    setProviderConfigs(updatedAll);
    save(CONFIG_KEY, updatedAll);
  };

  const handleAnalyze = async () => {
    if (!goal.trim()) {
      setShowGoalModal(true);
      return;
    }
    if (!prompt.trim()) return;
    setLoading(true);
    save(GOAL_KEY, goal);
    const config = providerConfigs[activeProvider];

    try {
      let result = '';

      if (activeProvider === 'ollama') {
        result = await generateResponse(`${config.instructions}\n\nGoal: ${goal}\n\n${prompt}`);
      } else {
        const fullPrompt = {
          model: config.model || '',
          temperature: config.temperature ?? 0.7,
          messages: [
            { role: 'system', content: config.instructions || '' },
            { role: 'user', content: `Goal: ${goal}\n\n${prompt}` },
          ],
        };

        const res = await fetch(config.endpoint || '', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify(fullPrompt),
        });

        const data = await res.json();
        result = data.choices?.[0]?.message?.content || data.response || JSON.stringify(data);
      }

      setResponse(result);
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const config = providerConfigs[activeProvider];

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex space-x-4 items-center">
        <label className="flex items-center space-x-2">
          <span>Provider:</span>
          <select
            value={activeProvider}
            onChange={e => setActiveProvider(e.target.value as Provider)}
            className="p-2 border rounded"
          >
            <option value="ollama">Ollama</option>
            <option value="grok">Grok</option>
            <option value="chatgpt">ChatGPT</option>
          </select>
        </label>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          Config
        </button>
        <button
          onClick={() => setShowGoalModal(true)}
          className="px-3 py-1 bg-indigo-700 text-white rounded hover:bg-indigo-800"
        >
          Set Goal
        </button>
      </div>

      <div className="flex space-x-4">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your prompt to analyze..."
          className="w-full h-40 p-2 border rounded resize-none"
        />
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      <div className="flex-1 border rounded p-4 overflow-auto bg-white">
        {response ? <ReactMarkdown>{response}</ReactMarkdown> : 'Analysis output will appear here.'}
      </div>

      <div className="absolute bottom-1 right-4 text-xs text-gray-500">
        Version {VERSION}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">Prompt Analyzer Config</h2>
            <input
              type="text"
              placeholder="Endpoint URL"
              value={config.endpoint || ''}
              onChange={e => saveConfig({ endpoint: e.target.value })}
              className="p-2 border rounded w-full"
            />
            {config.apiKey !== undefined && (
              <input
                type="text"
                placeholder="API Key"
                value={config.apiKey || ''}
                onChange={e => saveConfig({ apiKey: e.target.value })}
                className="p-2 border rounded w-full"
              />
            )}
            {config.model !== undefined && (
              <input
                type="text"
                placeholder="Model"
                value={config.model || ''}
                onChange={e => saveConfig({ model: e.target.value })}
                className="p-2 border rounded w-full"
              />
            )}
            {config.temperature !== undefined && (
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="Temperature"
                value={config.temperature}
                onChange={e => saveConfig({ temperature: parseFloat(e.target.value) })}
                className="p-2 border rounded w-full"
              />
            )}
            <textarea
              placeholder="Prompt instructions"
              value={config.instructions || ''}
              onChange={e => saveConfig({ instructions: e.target.value })}
              className="p-2 border rounded w-full h-32"
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">Set Your Goal</h2>
            <textarea
              placeholder="What is your goal for this prompt?"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="p-2 border rounded w-full h-32"
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  if (!goal.trim()) {
                    setGoal("Make my prompt better. Developer's Note: This is a bad goal, replace it with a better one.");
                  }
                  setShowGoalModal(false);
                  handleAnalyze();
                }}
              >
                Confirm
              </button>
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowGoalModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptAnalyzer;
