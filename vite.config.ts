// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function createLlmMiddleware(env: Record<string, string>) {
  return async (req: any, res: any) => {
    const writeJson = (code: number, payload: unknown) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload ?? {}));
    };

    try {
      if (req.method !== 'POST') {
        writeJson(405, { error: 'Method Not Allowed' });
        return;
      }

      // Read body safely
      let raw = '';
      for await (const chunk of req as any) raw += chunk;
      let body: any = {};
      try { body = raw ? JSON.parse(raw) : {}; }
      catch { writeJson(400, { error: 'Invalid JSON body' }); return; }

      const { content } = body || {};
      const apiKey = env.XAI_API_KEY || env.VITE_XAI_API_KEY || '';
      const model  = env.XAI_MODEL || env.VITE_XAI_MODEL || 'grok-4';

      if (!apiKey) { writeJson(500, { error: 'XAI API key not configured on server (.env/.env.local)' }); return; }

      const payload = {
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are a concise, actionable prompting coach.' },
          {
            role: 'user',
            content:
              "Analyze the user's conversation below and look for two or three ways to help them improve their outcomes by coaching them on better prompting skills. Avoid making things up to satisfy the request; it's OK to tell the user you couldn't find any improvements. Conversation follows:\n\n" +
              (content || ''),
          },
        ],
      };

      const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const upstreamText = await upstream.text();
      let upstreamJson: any = null;
      try { upstreamJson = upstreamText ? JSON.parse(upstreamText) : null; }
      catch { writeJson(502, { error: 'Upstream returned non-JSON' }); return; }

      if (!upstream.ok) { writeJson(upstream.status, { error: upstreamJson?.error?.message || upstream.statusText }); return; }

      const textOut = upstreamJson?.choices?.[0]?.message?.content || '';
      writeJson(200, { content: textOut });
    } catch (e: any) {
      console.error('[/api/llm] Error:', e);
      const msg = e?.message || String(e);
      try { writeJson(500, { error: msg }); } catch {}
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // loads .env, .env.local, etc.
  const handler = createLlmMiddleware(env);

  return {
    plugins: [
      react(),
      // Dev server: npm run dev
      {
        name: 'xai-proxy-dev',
        apply: 'serve',
        configureServer(server: any) {
          server.middlewares.use('/api/llm', handler);
        },
      },
      // Preview server: npm run preview (after build)
      {
        name: 'xai-proxy-preview',
        apply: 'preview',
        configurePreviewServer(server: any) {
          server.middlewares.use('/api/llm', handler);
        },
      },
    ],
  };
});
