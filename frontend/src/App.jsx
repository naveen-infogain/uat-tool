import React, { useState } from 'react';
import { Header } from './components/Header';
import { MergedFileWorkflowTable } from './components/MergedFileWorkflowTable';
import './App.css';

// File status state machine:
// not_started → pyspark_uploaded → uat_ready → uat_in_progress → sas_uploaded → compared → uat_done
//                                                                                          ↘ issue_reported → pyspark_uploaded (cycle)
// not_applicable (developer can mark/unmark at any time before uat_ready)

// Demo mode: Enable with REACT_APP_DEMO_MODE=true environment variable
const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === 'true';

let nextId = 6;
const DEMO_FILES = [
  { id: 1, department: 'Dept1', fileName: 'Invoice_FY26', filePath: '/mar/gsdd/exc', owner: 'U1', readyForUAT: true,  savePath: 'Dept1/mar/gsdd/exc/', status: 'not_started',      pysparkFile: null, sasFile: null, issueComment: null, pysparkUploadId: null, sasUploadId: null, comparisonId: null, comparisonResult: null },
  { id: 2, department: 'Dept1', fileName: 'File2',        filePath: '',              owner: 'U1', readyForUAT: false, savePath: '',                   status: 'not_started',      pysparkFile: null, sasFile: null, issueComment: null, pysparkUploadId: null, sasUploadId: null, comparisonId: null, comparisonResult: null },
  { id: 3, department: 'Dept1', fileName: 'File6',        filePath: '',              owner: 'U2', readyForUAT: true,  savePath: '',                   status: 'pyspark_uploaded', pysparkFile: 'file6.csv', sasFile: null, issueComment: null, pysparkUploadId: null, sasUploadId: null, comparisonId: null, comparisonResult: null },
  { id: 4, department: 'Dept1', fileName: 'File8',        filePath: '',              owner: 'U2', readyForUAT: true,  savePath: '',                   status: 'uat_ready',        pysparkFile: 'file8.csv', sasFile: null, issueComment: null, pysparkUploadId: null, sasUploadId: null, comparisonId: null, comparisonResult: null },
  { id: 5, department: 'Dept2', fileName: 'Invoice_FY26', filePath: '/uvw/fgh',      owner: 'U3', readyForUAT: false, savePath: '',                   status: 'compared',         pysparkFile: 'inv.csv', sasFile: 'sas_inv.csv', issueComment: null, pysparkUploadId: null, sasUploadId: null, comparisonId: null, comparisonResult: null },
];

const INITIAL_FILES = DEMO_MODE ? DEMO_FILES : [];


function App() {
  const [role, setRole] = useState('developer'); // 'developer' | 'business_user'
  const [files, setFiles] = useState(INITIAL_FILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const handleUpdateFile = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleAddFiles = (newRows) => {
    const rows = newRows.map(r => ({
      ...r,
      id: nextId++,
      status: 'not_started',
      pysparkFile: null,
      sasFile: null,
      issueComment: null,
    }));
    // New rows added at the TOP; existing rows shift down
    setFiles(prev => [...rows, ...prev]);
  };

  const filteredFiles = files.filter(f => {
    const q = searchQuery.toLowerCase();
    return (
      f.department.toLowerCase().includes(q) ||
      f.fileName.toLowerCase().includes(q) ||
      f.filePath.toLowerCase().includes(q) ||
      (f.owner || '').toLowerCase().includes(q)
    );
  });

  const canMoveToProduction = selectedIds.length > 0 &&
    selectedIds.every(id => files.find(f => f.id === id)?.status === 'uat_done');

  const handleMoveToProduction = () => {
    // Remove selected completed files from the list
    setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

  return (
    <div className="app">
      <Header
        role={role}
        onRoleChange={setRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMoveToProduction={handleMoveToProduction}
        canMoveToProduction={canMoveToProduction}
      />
      <main className="app-main">
        <MergedFileWorkflowTable
          files={filteredFiles}
          role={role}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onUpdateFile={handleUpdateFile}
          onAddFiles={handleAddFiles}
        />
      </main>
    </div>
  );
}

export default App;
