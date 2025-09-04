// src/lib/system-llm.ts
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatOptions = { model?: string; temperature?: number };

export async function chatWithSystem(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  // Accept either XAI_* or GROK_* naming (Vite exposes only VITE_* at runtime)
  const apiKey =
    (import.meta.env.VITE_XAI_API_KEY as string | undefined) ??
    (import.meta.env.VITE_GROK_API_KEY as string | undefined) ??
    '';

  if (!apiKey) {
    // Do NOT print the key; just say what's missing.
    throw new Error('System LLM not configured. Missing VITE_XAI_API_KEY (or VITE_GROK_API_KEY) at build time.');
  }

  const model =
    (opts.model as string | undefined) ??
    (import.meta.env.VITE_XAI_MODEL as string | undefined) ??
    (import.meta.env.VITE_GROK_MODEL as string | undefined) ??
    'grok-3-mini';

  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.3;

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature, messages }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || res.statusText || 'Upstream error');
  return data?.choices?.[0]?.message?.content || '';
}
