import React, { useState } from 'react';
import { generateResponse } from '../../services/llmService';
import { useFileStorage } from '../../hooks/useFileStorage';

const CrewAIPlanner: React.FC = () => {
  const [description, setDescription] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { saveUserData, loadUserData } = useFileStorage();
  const dataPath = 'crewai-planner-data.json';

  // Load saved input/output on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const data = await loadUserData(dataPath);
        if (data?.description) setDescription(data.description);
        if (data?.output) setOutput(data.output);
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    };
    load();
  }, [loadUserData]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const prompt = `You are a CrewAI assistant. Based on the user's description below, generate a JSON object defining a team of agents and tasks suitable for CrewAI framework. Include roles, goals, backstory, and task dependencies. Be concise and structured.

Description:
${description}`;

      const response = await generateResponse(prompt);
      const trimmed = response?.trim() || 'No response generated.';
      setOutput(trimmed);

      await saveUserData(dataPath, { description, output: trimmed });
    } catch (err: any) {
      setError('Error generating CrewAI plan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">CrewAI Planner</h2>
      <textarea
        className="w-full p-2 border rounded dark:border-gray-600"
        rows={6}
        placeholder="Describe your AI crew idea. Example: 'I want a research agent and a writing agent that collaborate on summarizing articles.'"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleGenerate}
        disabled={loading || !description.trim()}
      >
        {loading ? 'Generating...' : 'Generate Crew Config'}
      </button>

      {error && <div className="text-red-600">{error}</div>}

      {output && (
        <div>
          <h3 className="font-semibold mb-2">Generated Output:</h3>
          <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 text-sm p-3 rounded border dark:border-gray-600 overflow-x-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CrewAIPlanner;
