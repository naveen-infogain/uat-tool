import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MergedFileWorkflowTable } from './components/MergedFileWorkflowTable';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [role, setRole] = useState('developer');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // ── Load all workflow files from DB on mount ──────────────────────────────
  useEffect(() => {
    fetch(`${API}/workflow-files`)
      .then(r => r.json())
      .then(data => setFiles(data.files || []))
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Sync a status/field update to DB, then update local state ────────────
  const handleUpdateFile = useCallback(async (id, updates) => {
    // Optimistically update UI immediately
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      await fetch(`${API}/workflow-files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to persist file update:', err);
    }
  }, []);

  // ── Add new rows (from file-list upload) ─────────────────────────────────
  const handleAddFiles = useCallback(async (newRows) => {
    const payload = newRows.map(r => ({
      department: r.department || '',
      fileName: r.fileName || r.file_name || '',
      filePath: r.filePath || r.file_path || '',
      owner: r.owner || '',
      readyForUAT: !!(r.readyForUAT ?? r.ready_for_uat),
      savePath: r.savePath || r.save_path || '',
    }));
    try {
      const resp = await fetch(`${API}/workflow-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      const saved = (data.files || []).map(f => ({
        ...f,
        pysparkFile: null,
        sasFile: null,
        issueComment: null,
      }));
      setFiles(prev => [...saved, ...prev]);
    } catch (err) {
      console.error('Failed to save new files:', err);
    }
  }, []);

  // ── Move to production = delete from DB ──────────────────────────────────
  const handleMoveToProduction = useCallback(async (ids) => {
    const toMove = ids || selectedIds;
    setFiles(prev => prev.filter(f => !toMove.includes(f.id)));
    setSelectedIds(prev => prev.filter(id => !toMove.includes(id)));
    await Promise.all(
      toMove.map(id =>
        fetch(`${API}/workflow-files/${id}`, { method: 'DELETE' }).catch(console.error)
      )
    );
  }, [selectedIds]);

  // ── Hard delete ───────────────────────────────────────────────────────────
  const handleDeleteFile = useCallback(async (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
    await fetch(`${API}/workflow-files/${id}`, { method: 'DELETE' }).catch(console.error);
  }, []);

  const filteredFiles = files.filter(f => {
    const q = searchQuery.toLowerCase();
    return (
      (f.department || '').toLowerCase().includes(q) ||
      (f.fileName || '').toLowerCase().includes(q) ||
      (f.filePath || '').toLowerCase().includes(q) ||
      (f.owner || '').toLowerCase().includes(q)
    );
  });

  const canMoveToProduction = selectedIds.length > 0 &&
    selectedIds.every(id => files.find(f => f.id === id)?.status === 'uat_done');

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontSize: 15 }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        role={role}
        onRoleChange={setRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMoveToProduction={() => handleMoveToProduction(selectedIds)}
        canMoveToProduction={canMoveToProduction}
      />
      <main className="app-main">
        <MergedFileWorkflowTable
          files={filteredFiles}
          role={role}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onUpdateFile={handleUpdateFile}
          onDeleteFile={handleDeleteFile}
          onMoveToProduction={handleMoveToProduction}
          onAddFiles={handleAddFiles}
        />
      </main>
    </div>
  );
}

export default App;
