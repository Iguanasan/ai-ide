// src/routes/ProtectedLayout.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import Header from '../components/Header';
import SidePanel from '../components/SidePanel';

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-[var(--text-primary)]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="ds-shell">
        <SidePanel />
        {/* make the workspace a positioned parent for the dock */}
        <main className="ds-workspace relative">
          <div className="ds-workspace-inner">
            <Outlet />
          </div>
        </main>
        <aside className="ds-right-panel" />
      </div>
      <section className="ds-bottom-panel" />
    </div>
  );
};

export default ProtectedLayout;
