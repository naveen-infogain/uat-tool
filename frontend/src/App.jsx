import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MergedFileWorkflowTable } from './components/MergedFileWorkflowTable';
import { LandingPage } from './components/LandingPage';
import { ALLOWED_BUSINESS_UNIT_SET } from './constants/businessUnits';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [role, setRole] = useState('developer');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('department'); 
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedBU, setSelectedBU] = useState(null);

  const visibleFiles = files.filter(f => ALLOWED_BUSINESS_UNIT_SET.has(f.buName || f.department || ''));

  useEffect(() => {
    fetch(`${API}/workflow-files`)
      .then(r => r.json())
      .then(data => setFiles(data.files || []))
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateFile = useCallback(async (id, updates) => {
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

  const handleAddFiles = useCallback(async (newRows, departmentFilter) => {
    const payload = newRows.map(r => ({
      buName: r.buName || '',
      department: r.department || '',
      fileName: r.fileName || r.file_name || '',
      filePath: r.filePath || r.file_path || '',
      owner: r.owner || '',
      readyForUAT: !!(r.readyForUAT ?? r.ready_for_uat),
      savePath: r.savePath || r.save_path || '',
    }));

    try {
      const url = departmentFilter
        ? `${API}/workflow-files?department_filter=${encodeURIComponent(departmentFilter)}`
        : `${API}/workflow-files`;

      const resp = await fetch(url, {
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

      if (data.skipped_department_count > 0) {
        console.info(`${data.skipped_department_count} rows from other departments were ignored.`);
      }
    } catch (err) {
      console.error('Failed to save new files:', err);
    }
  }, []);

  const handleMoveToProduction = useCallback(async (ids) => {
    const toMove = ids || selectedIds;
    setFiles(prev => prev.map(f => toMove.includes(f.id) ? { ...f, status: 'production' } : f));
    setSelectedIds(prev => prev.filter(id => !toMove.includes(id)));
    await Promise.all(
      toMove.map(id =>
        fetch(`${API}/workflow-files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'production' }),
        }).catch(console.error)
      )
    );
  }, [selectedIds]);

  const handleDeleteFile = useCallback(async (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
    await fetch(`${API}/workflow-files/${id}`, { method: 'DELETE' }).catch(console.error);
  }, []);

  
  const departmentFiles = visibleFiles.filter(
    f => !selectedBU || (f.buName || f.department) === selectedBU
  );

  const canMoveToProduction = selectedIds.length > 0 &&
    selectedIds.every(id => visibleFiles.find(f => f.id === id)?.status === 'uat_done');

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontSize: 15 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!selectedBU) {
    return (
      <div className="app">
        <Header
          role={role}
          onRoleChange={setRole}
          searchQuery=""
          onSearchChange={() => {}}
          onMoveToProduction={null}
          canMoveToProduction={false}
          selectedBU={null}
          onBackToLanding={null}
        />
        <main className="app-main">
          <LandingPage
            files={visibleFiles}
            onSelectBU={bu => { setSelectedBU(bu); setSearchQuery(''); setFilterField('department'); setSelectedIds([]); }}
          />
        </main>
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
        filterField={filterField}                 
        onFilterFieldChange={setFilterField}       
        onMoveToProduction={() => handleMoveToProduction(selectedIds)}
        canMoveToProduction={canMoveToProduction}
        selectedBU={selectedBU}
        onBackToLanding={() => { setSelectedBU(null); setSearchQuery(''); setFilterField('department'); setSelectedIds([]); }}
      />
      <main className="app-main">
        <MergedFileWorkflowTable
          files={departmentFiles}                 
          role={role}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onUpdateFile={handleUpdateFile}
          onDeleteFile={handleDeleteFile}
          onMoveToProduction={handleMoveToProduction}
          onAddFiles={handleAddFiles}
          currentDepartment={selectedBU}
          searchQuery={searchQuery}                
          filterField={filterField}               
        />
      </main>
    </div>
  );
}

export default App;
