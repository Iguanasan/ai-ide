// src/components/SidePanel.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTools } from '../tools/registry';

const SidePanel: React.FC = () => {
  const tools = useTools();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={`ds-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="ds-sidebar-top">
        <span>{collapsed ? '' : 'Tools'}</span>
        <button
          className="ds-btn ds-btn-ghost"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ height: 28, padding: '0 10px' }}
        >
          {collapsed ? '>>' : '<<'}
        </button>
      </div>

      <nav className="ds-nav">
        {tools.map((t) => (
          <NavLink
            key={t.id}
            to={`/tools/${t.id}`}
            className={({ isActive }) => `ds-navlink ${isActive ? 'active' : ''}`}
          >
            <span className="ds-label">{t.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default SidePanel;
