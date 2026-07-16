import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MergedFileWorkflowTable } from './components/MergedFileWorkflowTable';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { ALLOWED_BUSINESS_UNIT_SET } from './constants/businessUnits';
import { API, apiFetch, setAccessToken, setUnauthorizedHandler, refreshAccessToken } from './services/http';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('department');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedBU, setSelectedBU] = useState(null);

  const role = currentUser?.role;

  const resetToLoggedOut = useCallback(() => {
    setCurrentUser(null);
    setFiles([]);
    setSelectedBU(null);
    setSelectedIds([]);
    setSearchQuery('');
    setFilterField('department');
  }, []);

  // Silent login on load: if the httpOnly refresh cookie is still valid, mint a
  // fresh access token without showing the login screen.
  useEffect(() => {
    setUnauthorizedHandler(resetToLoggedOut);
    (async () => {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        setCurrentUser(refreshed.user);
      }
      setAuthLoading(false);
    })();
  }, [resetToLoggedOut]);

  const handleLoggedIn = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await apiFetch(`${API}/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setAccessToken(null);
    resetToLoggedOut();
  };

  const visibleFiles = files.filter(f => ALLOWED_BUSINESS_UNIT_SET.has(f.buName || f.department || ''));

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    apiFetch(`${API}/workflow-files`)
      .then(r => r.json())
      .then(data => setFiles(data.files || []))
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleUpdateFile = useCallback(async (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      const resp = await apiFetch(`${API}/workflow-files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (resp.ok) {
        // Reconcile with the server's response — it may include fields the
        // client never sent (e.g. developerEmail/businessUserEmail, derived
        // server-side from the logged-in user, not the optimistic `updates`).
        const updated = await resp.json();
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
      }
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

      const resp = await apiFetch(url, {
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
        apiFetch(`${API}/workflow-files/${id}`, {
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
    await apiFetch(`${API}/workflow-files/${id}`, { method: 'DELETE' }).catch(console.error);
  }, []);


  const departmentFiles = visibleFiles.filter(
    f => !selectedBU || (f.buName || f.department) === selectedBU
  );

  const canMoveToProduction = selectedIds.length > 0 &&
    selectedIds.every(id => visibleFiles.find(f => f.id === id)?.status === 'uat_done');

  if (authLoading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontSize: 15 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

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
          currentUser={currentUser}
          onLogout={handleLogout}
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
        currentUser={currentUser}
        onLogout={handleLogout}
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
