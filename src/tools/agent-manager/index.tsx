import React, { useState } from 'react';
import { TrashIcon, PlusIcon, PencilIcon, ClipboardIcon } from '@heroicons/react/24/outline';

const VERSION = '0.1.0';

const AGENTS_KEY = 'agent-manager.agents';
const CREWS_KEY = 'agent-manager.crews';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

interface Agent {
  name: string;
  profile: string;
}

interface Crew {
  name: string;
  purpose: string;
  agents: string[];
}

const AgentManager: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>(() => load(AGENTS_KEY, []));
  const [crews, setCrews] = useState<Crew[]>(() => load(CREWS_KEY, []));
  const [selectedType, setSelectedType] = useState<'agents' | 'crews'>('agents');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [selectedCrewAgents, setSelectedCrewAgents] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const resetForm = () => {
    setName('');
    setContent('');
    setSelectedCrewAgents([]);
    setShowModal(false);
    setIsEdit(false);
    setShowDeleteConfirm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (itemName: string) => {
    if (selectedType === 'agents') {
      const agent = agents.find(a => a.name === itemName);
      if (agent) {
        setName(agent.name);
        setContent(agent.profile);
      }
    } else {
      const crew = crews.find(c => c.name === itemName);
      if (crew) {
        setName(crew.name);
        setContent(crew.purpose);
        setSelectedCrewAgents(crew.agents);
      }
    }
    setSelectedItem(itemName);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDuplicate = (itemName: string) => {
    if (selectedType === 'agents') {
      const agent = agents.find(a => a.name === itemName);
      if (agent) {
        const copyName = `Copy of ${agent.name}`;
        const newAgents = [...agents, { name: copyName, profile: agent.profile }];
        setAgents(newAgents);
        save(AGENTS_KEY, newAgents);
      }
    } else {
      const crew = crews.find(c => c.name === itemName);
      if (crew) {
        const copyName = `Copy of ${crew.name}`;
        const newCrews = [...crews, { name: copyName, purpose: crew.purpose, agents: [...crew.agents] }];
        setCrews(newCrews);
        save(CREWS_KEY, newCrews);
      }
    }
  };

  const handleSave = () => {
    if (selectedType === 'agents') {
      const newAgents = isEdit
        ? agents.map(a => a.name === selectedItem ? { name, profile: content } : a)
        : [...agents, { name, profile: content }];
      setAgents(newAgents);
      save(AGENTS_KEY, newAgents);
    } else {
      const newCrews = isEdit
        ? crews.map(c => c.name === selectedItem ? { name, purpose: content, agents: selectedCrewAgents } : c)
        : [...crews, { name, purpose: content, agents: selectedCrewAgents }];
      setCrews(newCrews);
      save(CREWS_KEY, newCrews);
    }
    resetForm();
  };

  const confirmDelete = (itemName: string) => {
    setSelectedItem(itemName);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (selectedItem) {
      if (selectedType === 'agents') {
        const newAgents = agents.filter(a => a.name !== selectedItem);
        setAgents(newAgents);
        save(AGENTS_KEY, newAgents);
        const newCrews = crews.map(c => ({ ...c, agents: c.agents.filter(ag => ag !== selectedItem) }));
        setCrews(newCrews);
        save(CREWS_KEY, newCrews);
      } else {
        const newCrews = crews.filter(c => c.name !== selectedItem);
        setCrews(newCrews);
        save(CREWS_KEY, newCrews);
      }
    }
    resetForm();
  };

  const toggleCrewAgent = (agentName: string) => {
    setSelectedCrewAgents(prev => 
      prev.includes(agentName) ? prev.filter(ag => ag !== agentName) : [...prev, agentName]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  };

  const css = `
    :root {
      --primary-color: #007ACC;
      --neutral-gray: #2D2D2D;
      --workspace-bg: #1E1E1E;
      --text-primary: #D4D4D4;
      --text-secondary: #858585;
      --border-gray: #3C3C3C;
      --hover-blue: #005A9E;
      --success-green: #28A745;
      --warning-yellow: #FFC107;
      --error-red: #DC3545;
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
      --font-code: 'Consolas', 'Courier New', monospace;
    }

    [data-theme="light"] {
      --neutral-gray: #F0F0F0;
      --workspace-bg: #FFFFFF;
      --text-primary: #333333;
      --text-secondary: #666666;
      --border-gray: #DDDDDD;
      --hover-blue: #E6F7FF;
    }

    body {
      margin: 0;
      font-family: var(--font-family);
      color: var(--text-primary);
      background: var(--neutral-gray);
      font-size: 14px;
      line-height: 1.6;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .header {
      background: var(--neutral-gray);
      display: flex;
      align-items: center;
      padding: var(--space-lg);
      border-bottom: 1px solid var(--border-gray);
      width: 100%;
    }

    .header h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 var(--space-lg) 0 0;
    }

    .btn {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      padding: var(--space-sm) var(--space-lg);
      font-size: 14px;
      cursor: pointer;
      height: 32px;
      margin-left: var(--space-sm);
    }

    .btn:hover {
      background: var(--hover-blue);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
    }

    .main-content {
      flex: 1;
      display: flex;
      overflow: hidden;
      width: 100%;
    }

    .sidebar {
      width: 240px;
      background: var(--neutral-gray);
      border-right: 1px solid var(--border-gray);
      transition: width 0.3s ease;
      overflow: auto;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      padding: var(--space-sm) var(--space-lg);
      height: 40px;
      cursor: pointer;
    }

    .sidebar-item:hover, .sidebar-item.active {
      background: var(--primary-color);
      color: white;
    }

    .workspace {
      flex: 1;
      background: var(--workspace-bg);
      padding: var(--space-lg);
      overflow: auto;
    }

    .list {
      margin-bottom: var(--space-lg);
    }

    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md);
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      margin-bottom: var(--space-sm);
      background: var(--neutral-gray);
    }

    .item-name {
      flex: 1;
      margin-right: var(--space-md);
    }

    .item-actions {
      display: flex;
      gap: var(--space-sm);
    }

    .icon-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-primary);
    }

    .icon-btn:hover {
      color: var(--hover-blue);
    }

    .icon-btn svg {
      width: 20px;
      height: 20px;
    }

    .add-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      padding: var(--space-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-top: var(--space-sm);
    }

    .add-btn:hover {
      background: var(--hover-blue);
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;
    }

    .modal-content {
      background: var(--workspace-bg);
      padding: var(--space-lg);
      border-radius: 4px;
      width: 500px;
      max-height: 80vh;
      overflow: auto;
    }

    .close-btn {
      background: var(--error-red);
      color: white;
      border: none;
      padding: var(--space-sm) var(--space-lg);
      border-radius: 4px;
      cursor: pointer;
      margin-top: var(--space-sm);
    }

    .close-btn:hover {
      opacity: 0.8;
    }

    input, textarea {
      background: var(--neutral-gray);
      border: 1px solid var(--border-gray);
      border-radius: 4px;
      padding: var(--space-sm);
      color: var(--text-primary);
      font-size: 14px;
      width: 100%;
      margin-bottom: var(--space-sm);
    }

    textarea {
      height: 200px;
    }

    .checkbox-list {
      margin-bottom: var(--space-sm);
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      margin-bottom: var(--space-sm);
    }

    .confirm-modal {
      background: var(--workspace-bg);
      padding: var(--space-lg);
      border-radius: 4px;
      width: 300px;
      text-align: center;
    }

    .confirm-btn {
      background: var(--error-red);
      color: white;
      border: none;
      padding: var(--space-sm) var(--space-lg);
      border-radius: 4px;
      cursor: pointer;
      margin-right: var(--space-sm);
    }

    .confirm-btn:hover {
      opacity: 0.8;
    }

    .cancel-btn {
      background: var(--border-gray);
      color: var(--text-primary);
      border: none;
      padding: var(--space-sm) var(--space-lg);
      border-radius: 4px;
      cursor: pointer;
    }

    .cancel-btn:hover {
      background: var(--hover-blue);
    }

    .absolute-version {
      position: absolute;
      bottom: var(--space-xs);
      right: var(--space-lg);
      font-size: 12px;
      color: var(--text-secondary);
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="app-container">
        <header className="header">
          <h1>Agent Manager</h1>
        </header>

        <div className="main-content">
          <nav className="sidebar">
            <div className={`sidebar-item ${selectedType === 'agents' ? 'active' : ''}`} onClick={() => setSelectedType('agents')}>
              <span>Agents</span>
            </div>
            <div className={`sidebar-item ${selectedType === 'crews' ? 'active' : ''}`} onClick={() => setSelectedType('crews')}>
              <span>Crews</span>
            </div>
          </nav>

          <main className="workspace">
            <div className="list">
              {(selectedType === 'agents' ? agents : crews).map((item) => (
                <div key={item.name} className="item">
                  <span className="item-name">{item.name}</span>
                  <div className="item-actions">
                    <button className="icon-btn" onClick={() => handleEdit(item.name)}>
                      <PencilIcon className="h-5 w-5 text-current" />
                    </button>
                    <button className="icon-btn" onClick={() => handleDuplicate(item.name)}>
                      <ClipboardIcon className="h-5 w-5 text-current" />
                    </button>
                    <button className="icon-btn" onClick={() => confirmDelete(item.name)}>
                      <TrashIcon className="h-5 w-5 text-current" />
                    </button>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={handleCreate}>
                <PlusIcon className="h-5 w-5 text-current" />
              </button>
            </div>
          </main>
        </div>

        <div className="absolute-version">Version {VERSION}</div>

        {showModal && (
          <div className="modal" onClick={() => { if (name || content || (selectedType === 'crews' && selectedCrewAgents.length)) if (!window.confirm('Lose unsaved changes?')) return; resetForm(); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedType === 'agents' ? 'Agent Name' : 'Crew Name'}
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={selectedType === 'agents' ? 'Profile (Markdown)' : 'Purpose (Markdown)'}
              />
              {selectedType === 'crews' && (
                <div className="checkbox-list">
                  {agents.map((agent) => (
                    <div key={agent.name} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedCrewAgents.includes(agent.name)}
                        onChange={() => toggleCrewAgent(agent.name)}
                      />
                      <label>{agent.name}</label>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn" onClick={handleSave}>
                {isEdit ? 'Update' : 'Create'}
              </button>
              <button className="close-btn" onClick={() => { if (name || content || (selectedType === 'crews' && selectedCrewAgents.length)) if (!window.confirm('Lose unsaved changes?')) return; resetForm(); }}>
                Close
              </button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal">
            <div className="confirm-modal">
              <p>Confirm delete {selectedItem}?</p>
              <button className="confirm-btn" onClick={handleDelete}>
                Delete
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AgentManager;