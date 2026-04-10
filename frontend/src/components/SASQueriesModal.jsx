import React from 'react';
import './SASQueriesModal.css';

export const SASQueriesModal = ({ file, onClose }) => {
  const sql = file.pysparkSqlQuery;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sas-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">SQL Query to Run in SAS</h2>
        <p className="modal-subtitle">
          The developer ran this query to generate the PySpark output.
          Copy it, run the equivalent in your SAS environment, then upload the output file.
        </p>

        <div className="sas-info-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          File: <strong>{file.fileName}</strong>{file.department ? ` · ${file.department}` : ''}
        </div>

        {sql ? (
          <div className="sas-code-wrap">
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard?.writeText(sql).then(() => {})}
              title="Copy SQL to clipboard"
            >
              Copy
            </button>
            <pre className="sas-code">{sql}</pre>
          </div>
        ) : (
          <div className="sas-no-sql">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            No SQL query was provided by the developer for this file.
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: 24 }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
