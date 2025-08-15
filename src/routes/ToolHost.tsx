// src/routes/ToolHost.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { getTool } from '../tools/registry';

const ToolHost: React.FC = () => {
  const { toolId = '' } = useParams();
  const meta = getTool(toolId);

  const [Comp, setComp] = React.useState<React.ComponentType | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

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

  // Full-bleed layout for Prompt Analyzer
  const content = <Comp key={toolId} />;
  return toolId === 'prompt-analyzer'
    ? <div className="full-bleed">{content}</div>
    : content;
};

export default ToolHost;
