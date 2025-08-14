// src/components/ResizableDock.tsx
import React from 'react';

type Props = {
  children: React.ReactNode;
  defaultWidth?: number;   // px
  defaultHeight?: number;  // px
  minWidth?: number;
  minHeight?: number;
};

const ResizableDock: React.FC<Props> = ({
  children,
  defaultWidth = 880,
  defaultHeight = 420,
  minWidth = 480,
  minHeight = 240,
}) => {
  const [w, setW] = React.useState(defaultWidth);
  const [h, setH] = React.useState(defaultHeight);
  const [drag, setDrag] = React.useState<null | 'right' | 'bottom' | 'corner'>(null);

  React.useEffect(() => {
    const onUp = () => setDrag(null);
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      if (drag === 'right' || drag === 'corner') {
        setW((prev) => Math.max(minWidth, prev + e.movementX));
      }
      if (drag === 'bottom' || drag === 'corner') {
        setH((prev) => Math.max(minHeight, prev + e.movementY));
      }
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [drag, minWidth, minHeight]);

  return (
    <div
      className="dock"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: w,
        height: h,
        background: 'var(--workspace-bg)',
        border: '1px solid var(--border-gray)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {children}
      </div>

      {/* handles */}
      <div
        className="dock-handle-right"
        onMouseDown={() => setDrag('right')}
        title="Drag to resize width"
        style={{ position: 'absolute', top: 0, right: 0, width: 6, height: '100%', cursor: 'col-resize' }}
      />
      <div
        className="dock-handle-bottom"
        onMouseDown={() => setDrag('bottom')}
        title="Drag to resize height"
        style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: '100%', cursor: 'row-resize' }}
      />
      <div
        className="dock-handle-corner"
        onMouseDown={() => setDrag('corner')}
        title="Drag to resize"
        style={{ position: 'absolute', right: 0, bottom: 0, width: 10, height: 10, cursor: 'nwse-resize' }}
      />
    </div>
  );
};

export default ResizableDock;