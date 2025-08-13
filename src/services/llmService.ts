export const generateResponse = async (prompt: string, model = 'llama3') => {
  try {
    const res = await fetch('http://192.168.68.52:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    const data = await res.json();
    return data.response;
  } catch (e) {
    console.error('Ollama error:', e);
    return 'Error: Ensure Ollama is running on localhost:11434';
  }
};