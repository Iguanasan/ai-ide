import React, { useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const OllamaTool: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const [response, setResponse] = useState('');
  const [think, setThink] = useState('');
  const [model, setModel] = useState('qwen3:4b');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRawResponse('');
    setResponse('');
    setThink('');
    try {
      const res = await fetch('http://192.168.68.52:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: "You are a helpful assistant. Before providing your final response, include all your internal thoughts and reasoning within <think></think> tags. Only the final answer should appear outside these tags, and it may include Markdown formatting.",
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      const fullResponse = data.response || 'No response from model.';
      console.log('Raw Response:', fullResponse); // For debugging
      setRawResponse(fullResponse);
      const thinkStart = fullResponse.indexOf('<think>');
      const thinkEnd = fullResponse.indexOf('</think>');
      if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
        setThink(fullResponse.substring(thinkStart + 7, thinkEnd).trim());
        let responseText = fullResponse.substring(thinkEnd + 8).trim();
        let markdownResponse = responseText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>');
        setResponse(markdownResponse);
      } else {
        setResponse(fullResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }, () => {
      alert('Failed to copy to clipboard.');
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Ollama Interface</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Model:</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="qwen3:4b">Qwen3 4B</option>
            <option value="llama3.2">Llama 3.2</option>
            <option value="mistral">Mistral</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Prompt:</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            rows={4}
            placeholder="Enter your prompt here..."
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading && (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && (
        <div className="mt-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Error: {error}
        </div>
      )}
      {response && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded border">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Response:</h4>
            <button
              onClick={() => copyToClipboard(response.replace(/<[^>]*>/g, ''))} // Strip HTML for copy
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Copy response to clipboard"
            >
              <DocumentDuplicateIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <div
            className="prose dark:prose-invert break-words"
            dangerouslySetInnerHTML={{ __html: response }}
          />
        </div>
      )}
      {rawResponse && (
        <div className="mt-4 p-4 bg-gray-200 dark:bg-gray-700 rounded border">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Raw Response:</h4>
            <button
              onClick={() => copyToClipboard(rawResponse)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Copy raw response to clipboard"
            >
              <DocumentDuplicateIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <pre className="text-sm overflow-x-auto break-words">{rawResponse}</pre>
        </div>
      )}
    </div>
  );
};

export default OllamaTool;