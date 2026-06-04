import React from 'react';
import './IssueViewModal.css';

export const IssueViewModal = ({ file, onClose }) => {
  const { issueComment, issueAttachment } = file;
  const isImage = issueAttachment && issueAttachment.type && issueAttachment.type.startsWith('image/');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = issueAttachment.dataUrl;
    a.download = issueAttachment.name;
    a.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="issue-view-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="iv-header">
          <div className="iv-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <h2 className="iv-title">Issue Reported</h2>
            <p className="iv-subtitle">
              Filed against <strong>{file.fileName}</strong>
              {file.department ? <> · <span className="iv-dept">{file.department}</span></> : null}
            </p>
          </div>
        </div>

        <div className="iv-section">
          <div className="iv-section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Business User Comment
          </div>
          {issueComment
            ? <div className="iv-comment">{issueComment}</div>
            : <div className="iv-empty">No comment provided.</div>
          }
        </div>

        {issueAttachment && (
          <div className="iv-section">
            <div className="iv-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              Attachment
            </div>
            <div className="iv-attachment-box">
              {isImage ? (
                <img
                  src={issueAttachment.dataUrl}
                  alt={issueAttachment.name}
                  className="iv-img-preview"
                />
              ) : (
                <div className="iv-file-icon-wrap">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
              )}
              <div className="iv-attach-meta">
                <span className="iv-attach-name">{issueAttachment.name}</span>
                <button className="iv-download-btn" onClick={handleDownload}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
