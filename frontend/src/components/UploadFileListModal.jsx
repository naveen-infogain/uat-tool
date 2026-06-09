import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import './UploadFileListModal.css';

const COLUMN_MAP = {
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

// ✅ departmentFilter prop add kiya
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
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = parseSheet(ws);

        if (rows.length === 0) {
          setError('No valid rows found. Make sure the file has a header row.');
          return;
        }

        // ✅ Sirf current BU ki rows filter karo
        const filtered = departmentFilter
          ? rows.filter(r =>
              r.department.trim().toLowerCase() === departmentFilter.trim().toLowerCase()
            )
          : rows;

        if (filtered.length === 0) {
          const foundDepts = [...new Set(rows.map(r => r.department).filter(Boolean))];
          setError(
            `No rows found for "${departmentFilter}". ` +
            `File contains: ${foundDepts.join(', ')}`
          );
          return;
        }

        setAllRows(rows);
        setPreview(filtered);
        setFileName(file.name);
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

  // ✅ Sirf filtered rows + departmentFilter bhejo
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
              {allRows && allRows.length > preview.length && (
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                  ({allRows.length - preview.length} rows from other departments ignored)
                </span>
              )}
            </>
          ) : (
            'Upload an Excel or CSV file. Only rows matching the current department will be imported.'
          )}
        </p>

        {!preview && (
          <>
            {/* ✅ Active department hint */}
            {departmentFilter && (
              <div className="ufl-col-hint" style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 12 }}>
                <strong>Active department:</strong> Only{' '}
                <span style={{ color: '#2563eb' }}>{departmentFilter}</span>{' '}
                rows will be imported. Other departments will be ignored.
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
              <strong>Expected columns:</strong> Department · File name · File path · User/Owner · Ready for UAT · Where to save?
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
                    <th>DEPARTMENT</th>
                    <th>FILE NAME</th>
                    <th>FILE PATH</th>
                    <th>OWNER</th>
                    <th>UAT READY</th>
                    <th>SAVE PATH</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="row-num">{i + 1}</td>
                      <td>{row.department || '—'}</td>
                      <td className="fn-cell">{row.fileName}</td>
                      <td className="path-cell">{row.filePath || '—'}</td>
                      <td>{row.owner || '—'}</td>
                      <td>{row.readyForUAT ? <span className="uat-yes">Yes</span> : '—'}</td>
                      <td className="path-cell">{row.savePath || '—'}</td>
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
            <button className="btn-primary" onClick={handleConfirm}>
              Add {preview.length} row{preview.length !== 1 ? 's' : ''} to List
            </button>
          )}
        </div>
      </div>
    </div>
  );
};