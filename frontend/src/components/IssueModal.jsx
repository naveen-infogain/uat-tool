import React, { useState } from 'react';
import './IssueModal.css';

export const IssueModal = ({ file, onSubmit, onCancel }) => {
  const [comment, setComment] = useState('');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="issue-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <div className="issue-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 className="modal-title">Report Issue</h2>
        <p className="modal-subtitle">
          Describe the issue found in <strong>{file.fileName}</strong>. An email notification will be sent to the developer team to investigate.
        </p>

        <label className="field-label">
          Issue Description <span className="req">*</span>
        </label>
        <textarea
          className="issue-textarea"
          placeholder="Describe the deviation or issue found. Include specific records, attributes, or patterns that look incorrect..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={5}
          autoFocus
        />

        <div className="email-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          An email will be sent to the developer team with your comment attached.
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn-danger"
            onClick={() => onSubmit(comment)}
            disabled={!comment.trim()}
          >
            Submit Issue & Notify Developer
          </button>
        </div>
      </div>
    </div>
  );
};
