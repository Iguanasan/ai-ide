// src/routes/ToolHost.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { getTool } from '../tools/registry';
import ResizableDock from '../components/ResizableDock';

const ToolHost: React.FC = () => {
  const { toolId = '' } = useParams();
  const meta = getTool(toolId);

  const [Comp, setComp] = React.useState<React.ComponentType | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Manual dynamic import ensures a fresh mount on every tool change
  React.useEffect(() => {
    let alive = true;
    setComp(null);
    setErr(null);

    if (!meta) {
      setErr(`Unknown tool: ${toolId}`);
      return;
    }

    meta
      .load()
      .then((m) => {
        if (!alive) return;
        const C = (m as any)?.default as React.ComponentType | undefined;
        if (C) setComp(() => C);
        else setErr(`Tool "${meta.name}" is missing a default export.`);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e?.message || e));
      });

    return () => {
      alive = false;
      setComp(null);
    };
  }, [toolId, meta?.id]);

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!Comp) return <div className="p-2">Loading...</div>;

  const content = <Comp key={toolId} />;

  // Only dock the Prompt Analyzer; other tools render normally
  return toolId === 'prompt-analyzer' ? (
    <ResizableDock defaultWidth={1000} defaultHeight={520}>{content}</ResizableDock>
  ) : (
    content
  );
};

export default ToolHost;
