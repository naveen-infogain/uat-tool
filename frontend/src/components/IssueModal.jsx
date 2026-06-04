import React, { useState, useRef } from 'react';
import './IssueModal.css';

export const IssueModal = ({ file, onSubmit, onCancel }) => {
  const [comment, setComment]       = useState('');
  const [attachment, setAttachment] = useState(null); // { name, type, dataUrl }
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef = useRef();

  const readFile = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => setAttachment({ name: f.name, type: f.type, dataUrl: e.target.result });
    reader.readAsDataURL(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) readFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  };

  const isImage = attachment && attachment.type.startsWith('image/');

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
          Describe the issue found in <strong>{file.fileName}</strong>. An email notification will be sent to the developer team.
        </p>

        <label className="field-label">
          Issue Description <span className="req">*</span>
        </label>
        <textarea
          className="issue-textarea"
          placeholder="Describe the deviation or issue found. Include specific records, attributes, or patterns that look incorrect..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          autoFocus
        />

        <label className="field-label" style={{ marginTop: 12 }}>
          Attachment <span className="field-optional">(screenshot or file — optional)</span>
        </label>
        <div
          className={`attach-zone ${dragOver ? 'drag-over' : ''} ${attachment ? 'has-file' : ''}`}
          onClick={() => !attachment && fileInputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {!attachment ? (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <span className="attach-hint">Drag &amp; drop or <span className="attach-browse">browse</span></span>
              <span className="attach-sub">PNG, JPG, PDF, XLSX, CSV — max 10 MB</span>
            </>
          ) : (
            <div className="attach-preview">
              {isImage
                ? <img src={attachment.dataUrl} alt="preview" className="attach-img-thumb" />
                : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                )
              }
              <div className="attach-file-info">
                <span className="attach-file-name">{attachment.name}</span>
                <button
                  className="attach-remove"
                  onClick={e => { e.stopPropagation(); setAttachment(null); fileInputRef.current.value = ''; }}
                >Remove</button>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="email-notice" style={{ marginTop: 14 }}>
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
            onClick={() => onSubmit(comment, attachment)}
            disabled={!comment.trim()}
          >
            Submit Issue &amp; Notify Developer
          </button>
        </div>
      </div>
    </div>
  );
};
