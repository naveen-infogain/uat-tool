import React, { useState } from 'react';
import './AddFilesModal.css';

const emptyRow = () => ({ department: '', businessUnit: '', fileName: '', filePath: '' });

export const AddFilesModal = ({ onAdd, onCancel }) => {
  const [rows, setRows] = useState([emptyRow()]);

  const handleChange = (index, field, value) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => setRows(prev => [...prev, emptyRow()]);

  const handleRemoveRow = (index) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const valid = rows.filter(r => r.fileName.trim() && r.filePath.trim());
    if (valid.length === 0) return;
    onAdd(valid);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="add-files-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h2 className="modal-title">Add Files to List</h2>
        <p className="modal-subtitle">Append one or more files that need to be converted for UAT. File name and path are required.</p>

        <div className="add-files-table-wrap">
          <table className="add-files-table">
            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>BUSINESS UNIT</th>
                <th>FILE NAME <span className="req">*</span></th>
                <th>FILE PATH <span className="req">*</span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td><input className="cell-input" placeholder="e.g. Finance" value={row.department} onChange={e => handleChange(i, 'department', e.target.value)} /></td>
                  <td><input className="cell-input" placeholder="e.g. Finance BU" value={row.businessUnit} onChange={e => handleChange(i, 'businessUnit', e.target.value)} /></td>
                  <td><input className="cell-input" placeholder="report.csv" value={row.fileName} onChange={e => handleChange(i, 'fileName', e.target.value)} /></td>
                  <td><input className="cell-input mono" placeholder="/data/path/file.csv" value={row.filePath} onChange={e => handleChange(i, 'filePath', e.target.value)} /></td>
                  <td>
                    <button className="remove-row-btn" onClick={() => handleRemoveRow(i)} disabled={rows.length === 1} title="Remove row">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="add-row-btn" onClick={handleAddRow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add another row
        </button>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!rows.some(r => r.fileName.trim() && r.filePath.trim())}
          >
            Append to List
          </button>
        </div>
      </div>
    </div>
  );
};
