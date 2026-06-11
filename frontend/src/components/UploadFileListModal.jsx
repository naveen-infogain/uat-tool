import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import './UploadFileListModal.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const COLUMN_MAP = {
  buName:       ['bu names', 'bu name', 'bu', 'business unit', 'businessunit', 'business_unit'],
  department:   ['department', 'dept'],
  fileName:     ['file name', 'filename', 'file'],
  filePath:     ['file path', 'filepath', 'path'],
  owner:        ['user/owner', 'owner', 'user', 'assigned to'],
  readyForUAT:  ['ready for uat', 'uat ready', 'ready'],
  savePath:     ['where to save?', 'where to save', 'save path', 'save location', 'output path'],
};

function normalizeHeader(h) {
  return (h || '').toString().trim().toLowerCase();
}

function findCol(headers, variants) {
  for (const v of variants) {
    const idx = headers.findIndex(h => normalizeHeader(h) === v);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseSheet(worksheet) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  const headers = raw[0].map(h => normalizeHeader(h));
  const cols = {};
  for (const [field, variants] of Object.entries(COLUMN_MAP)) {
    cols[field] = findCol(headers, variants);
  }
  return raw.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => ({
      buName:      cols.buName      >= 0 ? String(row[cols.buName]      || '').trim() : '',
      department:  cols.department  >= 0 ? String(row[cols.department]  || '').trim() : '',
      fileName:    cols.fileName    >= 0 ? String(row[cols.fileName]    || '').trim() : '',
      filePath:    cols.filePath    >= 0 ? String(row[cols.filePath]    || '').trim() : '',
      owner:       cols.owner       >= 0 ? String(row[cols.owner]       || '').trim() : '',
      readyForUAT: cols.readyForUAT >= 0
        ? /yes|true|1/i.test(String(row[cols.readyForUAT] || ''))
        : false,
      savePath:    cols.savePath    >= 0 ? String(row[cols.savePath]    || '').trim() : '',
    }))
    .filter(r => r.fileName);
}

function buMatchValue(row) {
  return (row.buName || '').trim().toLowerCase();
}

// ✅ departmentFilter prop = selected BU
export const UploadFileListModal = ({ onAdd, onCancel, departmentFilter }) => {
  const [dragOver, setDragOver] = useState(false);
  const [allRows, setAllRows] = useState(null);       // saare parsed rows
  const [preview, setPreview] = useState(null);       // sirf filtered rows
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const processFile = (file) => {
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Only .xlsx, .xls, or .csv files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = parseSheet(ws);

        if (rows.length === 0) {
          setError('No valid rows found. Make sure the file has a header row.');
          return;
        }

        const target = (departmentFilter || '').trim().toLowerCase();
        const filtered = departmentFilter
          ? rows.filter(r => buMatchValue(r) === target)
          : rows;

        if (filtered.length === 0) {
          const foundBUs = [...new Set(rows.map(r => r.buName).filter(Boolean))];
          setError(
            `No rows found for "${departmentFilter}". ` +
            `File contains: ${foundBUs.join(', ')}`
          );
          return;
        }

        setAllRows(rows);
        setFileName(file.name);
        // Show preview immediately with 'checking' state while we query the backend
        setPreview(filtered.map(r => ({ ...r, rowStatus: 'checking' })));

        try {
          const resp = await fetch(`${API}/workflow-files/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtered.map(r => ({
              fileName: r.fileName,
              filePath: r.filePath || '',
            }))),
          });
          if (resp.ok) {
            const data = await resp.json();
            setPreview(filtered.map((r, i) => ({
              ...r,
              rowStatus: data.rows[i]?.rowStatus || 'new',
            })));
          } else {
            setPreview(filtered.map(r => ({ ...r, rowStatus: 'new' })));
          }
        } catch {
          setPreview(filtered.map(r => ({ ...r, rowStatus: 'new' })));
        }
      } catch {
        setError('Could not parse the file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const isChecking = preview && preview.some(r => r.rowStatus === 'checking');
  const newCount   = preview ? preview.filter(r => r.rowStatus !== 'duplicate').length : 0;
  const dupCount   = preview ? preview.filter(r => r.rowStatus === 'duplicate').length : 0;

  const handleConfirm = () => {
    if (preview && preview.length > 0) onAdd(preview, departmentFilter);
  };

  const handleReset = () => {
    setPreview(null);
    setAllRows(null);
    setFileName('');
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="ufl-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>

        <h2 className="modal-title">
          {preview ? `Preview — ${fileName}` : 'Upload File List'}
        </h2>

        <p className="modal-subtitle">
          {preview ? (
            <>
              <strong>{preview.length}</strong> row{preview.length !== 1 ? 's' : ''} found
              {departmentFilter && (
                <span style={{ color: '#6366f1', marginLeft: 6 }}>
                  for <strong>{departmentFilter}</strong>
                </span>
              )}
              {!isChecking && newCount > 0 && (
                <span style={{ color: '#16a34a', marginLeft: 8 }}>
                  · <strong>{newCount} new</strong>
                </span>
              )}
              {!isChecking && dupCount > 0 && (
                <span style={{ color: '#d97706', marginLeft: 6 }}>
                  · <strong>{dupCount} already present</strong>
                </span>
              )}
              {allRows && allRows.length > preview.length && (
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                  ({allRows.length - preview.length} rows from other business units ignored)
                </span>
              )}
            </>
          ) : (
            'Upload an Excel or CSV file. Only rows matching the current business unit will be imported.'
          )}
        </p>

        {!preview && (
          <>
            {/* ✅ Active BU hint */}
            {departmentFilter && (
              <div className="ufl-col-hint" style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 12 }}>
                <strong>Active business unit:</strong> Only{' '}
                <span style={{ color: '#2563eb' }}>{departmentFilter}</span>{' '}
                rows will be imported. Other business units will be ignored.
              </div>
            )}

            <div
              className={`ufl-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <svg className="ufl-upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <p className="ufl-drop-text">Drag and drop your Excel or CSV file here, or</p>
              <button type="button" className="ufl-browse-btn">Browse File</button>
              <p className="ufl-hint">Accepted: .xlsx, .xls, .csv</p>
            </div>

            {error && <div className="ufl-error">{error}</div>}

            <div className="ufl-col-hint">
              <strong>Expected columns:</strong> BU Names · Department · File name · File path · User/Owner ·
            </div>
          </>
        )}

        {preview && (
          <>
            <div className="ufl-preview-wrap">
              <table className="ufl-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>STATUS</th>
                    <th>BU NAME</th>
                    <th>DEPARTMENT</th>
                    <th>FILE NAME</th>
                    <th>FILE PATH</th>
                    <th>OWNER</th>
                   
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={row.rowStatus === 'duplicate' ? 'row-duplicate' : row.rowStatus === 'checking' ? 'row-checking' : ''}>
                      <td className="row-num">{i + 1}</td>
                      <td>
                        {row.rowStatus === 'new' && (
                          <span className="row-status-badge row-status-new">New</span>
                        )}
                        {row.rowStatus === 'duplicate' && (
                          <span className="row-status-badge row-status-duplicate">Already Present</span>
                        )}
                        {row.rowStatus === 'checking' && (
                          <span className="row-status-badge row-status-checking">Checking…</span>
                        )}
                      </td>
                      <td>{row.buName || departmentFilter || '—'}</td>
                      <td>{row.department || '—'}</td>
                      <td className="fn-cell">{row.fileName}</td>
                      <td className="path-cell">{row.filePath || '—'}</td>
                      <td>{row.owner || '—'}</td>
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="ufl-re-upload" onClick={handleReset}>
              ← Upload a different file
            </button>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          {preview && (
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={isChecking || newCount === 0}
            >
              {isChecking
                ? 'Checking…'
                : newCount === 0
                  ? `All ${dupCount} row${dupCount !== 1 ? 's' : ''} already present`
                  : dupCount > 0
                    ? `Add ${newCount} new row${newCount !== 1 ? 's' : ''} · ${dupCount} will be skipped`
                    : `Add ${newCount} row${newCount !== 1 ? 's' : ''} to List`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
