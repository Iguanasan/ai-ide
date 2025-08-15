import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../hooks/useTheme';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleLogout = async () => {
    try { await signOut(); navigate('/login', { replace: true }); } catch (err) { console.error(err); }
  };

  return (
    <header className="ds-header">
      <Link to="/tools/prompt-analyzer" className="ds-title">AI Toolbox</Link>

      <nav className="ml-2">
        <Link to="/help" className="ds-btn ds-btn-ghost" title="Help">Help</Link>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button className="ds-btn ds-btn-secondary" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        {user ? (
          <button onClick={handleLogout} className="ds-btn">Logout</button>
        ) : (
          <Link to="/login" className="ds-btn">Login</Link>
        )}
      </div>
    </header>
  );
};

export default Header;
