import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import { TrashIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { TOOL_VERSION } from './version';

// IndexedDB helpers
const DB_NAME = 'agent-manager-db';
const STORE_NAME = 'settings';
async function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbGet(key: string) {
  const db = await openDB();
  return new Promise<any>((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbSet(key: string, value: any) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

const AgentManager: React.FC = () => {
  const editorRef = useRef<Editor>(null);
  const [repo, setRepo] = useState<FileSystemDirectoryHandle | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [agentName, setAgentName] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const h = await dbGet('repo');
      const savedGroups: string[] = (await dbGet('groups')) || [];
      const savedMap: Record<string, string> = (await dbGet('map')) || {};
      setGroups(['All', ...savedGroups]);
      setGroupMap(savedMap);
      if (h) {
        setRepo(h);
        await refreshAgents(h, savedMap);
        const last = await dbGet('lastAgent');
        if (last) loadAgent(h, last);
      }
    })();
  }, []);

  const refreshAgents = async (handle: FileSystemDirectoryHandle, map?: Record<string, string>) => {
    const list: string[] = [];
    for await (const [name, ent] of (handle as any).entries()) {
      if (ent.kind === 'file' && name.endsWith('.md')) list.push(name.slice(0, -3));
    }
    setAgents(list);
    if (map) setGroupMap(map);
  };

  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', name);
  };

  const handleGroupDrop = async (group: string, e: React.DragEvent) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');
    const newMap = { ...groupMap, [name]: group === 'All' ? '' : group };
    setGroupMap(newMap);
    await dbSet('map', newMap);
  };

  const duplicateAgent = async (name: string) => {
    if (!repo) return;
    const original = await repo.getFileHandle(`${name}.md`);
    const content = await (await original.getFile()).text();
    let copyName = `${name} Copy`;
    let i = 1;
    while (agents.includes(copyName)) copyName = `${name} Copy ${++i}`;
    const fh = await repo.getFileHandle(`${copyName}.md`, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
    await refreshAgents(repo, groupMap);
    alert(`Duplicated as ${copyName}`);
  };

  const selectRepo = async () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    const h = await window.showDirectoryPicker();
    await dbSet('repo', h);
    setRepo(h);
    await refreshAgents(h);
    resetEditor();
  };

  const resetEditor = () => {
    setAgentName('');
    editorRef.current?.getInstance().setMarkdown('');
    setIsDirty(false);
  };

  const filteredAgents = selectedGroup === 'All'
    ? agents
    : agents.filter(a => groupMap[a] === selectedGroup);

  const loadAgent = async (handle: FileSystemDirectoryHandle, name: string) => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    const fh = await handle.getFileHandle(`${name}.md`);
    const text = await (await fh.getFile()).text();
    setAgentName(name);
    editorRef.current?.getInstance().setMarkdown(text);
    setIsDirty(false);
    await dbSet('lastAgent', name);
  };

  const saveAgent = async () => {
    if (!repo || !agentName.trim()) return;
    const md = editorRef.current?.getInstance().getMarkdown() || '';
    const fh = await repo.getFileHandle(`${agentName}.md`, { create: true });
    const w = await fh.createWritable();
    await w.write(md);
    await w.close();
    setIsDirty(false);
    await dbSet('lastAgent', agentName);
    await refreshAgents(repo, groupMap);
    const newMap = { ...groupMap };
    if (selectedGroup !== 'All') newMap[agentName] = selectedGroup;
    else delete newMap[agentName];
    setGroupMap(newMap);
    await dbSet('map', newMap);
    alert('Saved');
  };

  const deleteAgent = async (name: string) => {
    if (!repo || !window.confirm(`Delete ${name}?`)) return;
    // @ts-ignore
    await repo.removeEntry(`${name}.md`);
    await refreshAgents(repo, groupMap);
    if (agentName === name) resetEditor();
  };

  const addGroup = async () => {
    const name = window.prompt('New Crew name');
    if (name && !groups.includes(name)) {
      const ng = [...groups, name];
      setGroups(ng);
      await dbSet('groups', ng.slice(1));
      setSelectedGroup(name);
    }
  };

  const deleteGroup = async (name: string) => {
    if (name === 'All') return;
    if (!window.confirm(`Delete Crew ${name}?`)) return;
    const ng = groups.filter(g => g !== name);
    const newMap = { ...groupMap };
    Object.keys(newMap).forEach(k => { if (newMap[k] === name) delete newMap[k]; });
    setGroups(ng);
    setGroupMap(newMap);
    setSelectedGroup('All');
    await dbSet('groups', ng.slice(1));
    await dbSet('map', newMap);
  };

  const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
    <button {...props} className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 ${className || ''}`}>{children}</button>
  );

  return (
    <div className="h-full flex relative">
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-60'} bg-gray-100 p-2 flex flex-col transition-width`}>
        <div className="flex items-center justify-between mb-2">
          {!sidebarCollapsed && <h3 className="font-bold">Crews</h3>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 rounded hover:bg-gray-300">
            {sidebarCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
          </button>
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="flex items-center mb-2" onClick={addGroup}>
              <Button className="text-green-600 bg-transparent hover:bg-green-100 active:bg-green-200">
                <PlusIcon className="h-5 w-5 inline-block" /> <span className="ml-1">New Crew</span>
              </Button>
            </div>
            <ul className="flex-1 overflow-auto mb-2">
              {groups.map(g => (
                <li key={g} onDragOver={e => e.preventDefault()} onDrop={e => handleGroupDrop(g, e)} className={`flex justify-between items-center p-1 rounded cursor-pointer ${selectedGroup === g ? 'bg-blue-200' : ''}`} onClick={() => setSelectedGroup(g)}>
                  <span>{g}</span>
                  {g !== 'All' && <TrashIcon className="h-4 w-4 text-red-600 cursor-pointer" onClick={() => deleteGroup(g)} />}
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          onClick={selectRepo}
          className="mt-auto px-3 py-2 text-white font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded shadow"
        >
          {repo ? 'Change Repo' : 'Select Repo'}
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="mb-4 flex items-center space-x-4">
          <Button onClick={resetEditor} className="text-green-600 bg-transparent hover:bg-green-100 active:bg-green-200">
            <PlusIcon className="h-5 w-5 inline-block" /> <span className="ml-1">New Agent</span>
          </Button>
          <Button onClick={saveAgent} className="text-blue-600 bg-transparent hover:bg-blue-100 active:bg-blue-200">
            Save
          </Button>
          <h3 className="font-bold ml-4">Agents ({filteredAgents.length})</h3>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-40 bg-white border p-2 overflow-auto">
            <ul>
              {filteredAgents.map(a => (
                <li key={a} draggable onDragStart={e => handleDragStart(e, a)} className={`flex justify-between p-1 rounded cursor-pointer ${agentName === a ? 'bg-blue-100' : ''}`}>
                  <span onClick={() => repo && loadAgent(repo, a)}>{a}</span>
                  <div className="flex space-x-1">
                    <ClipboardIcon onClick={() => duplicateAgent(a)} className="h-4 w-4 text-gray-600 cursor-pointer hover:text-gray-800" />
                    <TrashIcon className="h-4 w-4 text-red-600 cursor-pointer hover:text-red-800" onClick={() => deleteAgent(a)} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex flex-col ml-4">
            <input
              value={agentName}
              onChange={e => {
                setAgentName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Agent Name"
              className="border-b p-1 text-lg focus:outline-none mb-2"
            />
            <Editor
              ref={editorRef}
              initialValue=""
              previewStyle="vertical"
              height="400px"
              initialEditType="wysiwyg"
              useCommandShortcut
              onChange={() => setIsDirty(true)}
            />
          </div>
        </div>
        <div className="absolute bottom-1 right-4 text-xs text-gray-500">
          Version {TOOL_VERSION}
        </div>
      </div>
    </div>
  );
};

export default AgentManager;
