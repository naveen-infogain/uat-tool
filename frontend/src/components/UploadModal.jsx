import React, { useState, useRef } from 'react';
import './UploadModal.css';

const MODAL_CONFIG = {
  pyspark: {
    title: 'Upload PySpark Output',
    subtitle: 'Provide the processed PySpark output file and (optional) SQL query used to generate it.',
    accept: '.csv,.parquet,.json,.xlsx,.xls',
    acceptLabel: 'Accepted: .csv, .parquet, .json, .xlsx, up to 100 MB.',
    allowedTypes: ['csv', 'parquet', 'json', 'xlsx', 'xls'],
    showSQLQuery: true,
  },
  sas: {
    title: 'Upload SAS Output',
    subtitle: 'Upload the finalized SAS output file generated from your SAS job.',
    accept: '.csv,.parquet,.sas7bdat,.xlsx,.xls',
    acceptLabel: 'Accepted: .csv, .parquet, .sas7bdat, .xlsx, up to 100 MB.',
    allowedTypes: ['csv', 'parquet', 'sas7bdat', 'xlsx', 'xls'],
    showSQLQuery: false,
  },
};

export const UploadModal = ({ type, file, onUpload, onCancel }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const config = MODAL_CONFIG[type] || MODAL_CONFIG.pyspark;

  // Validate file before selection
  const validateFile = (f) => {
    if (!f) return { valid: false, error: 'No file selected' };
    
    const ext = f.name.split('.').pop().toLowerCase();
    if (!config.allowedTypes.includes(ext)) {
      return { 
        valid: false, 
        error: `File type not supported. Accepted: ${config.allowedTypes.join(', ')}.` 
      };
    }

    const maxSize = 100 * 1024 * 1024; // 100 MB
    if (f.size > maxSize) {
      return { 
        valid: false, 
        error: `File size exceeds 100 MB limit. Your file: ${(f.size / 1024 / 1024).toFixed(1)} MB.` 
      };
    }

    return { valid: true, error: null };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      const validation = validateFile(f);
      if (validation.valid) {
        setSelectedFile(f);
        setError(null);
      } else {
        setError(validation.error);
        setSelectedFile(null);
      }
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      const validation = validateFile(f);
      if (validation.valid) {
        setSelectedFile(f);
        setError(null);
      } else {
        setError(validation.error);
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_type', type === 'pyspark' ? 'developer' : 'client');
      if (sqlQuery && config.showSQLQuery) {
        formData.append('sql_query', sqlQuery);
      }

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploading(false);
      onUpload({ ...result, sqlQuery, fileName: selectedFile.name }, sqlQuery);
    } catch (err) {
      setUploading(false);
      setError(err.message || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>

        <h2 className="modal-title">{config.title}</h2>
        <p className="modal-subtitle">{config.subtitle}</p>

        {/* Drop Zone */}
        <label className="field-label">Output File <span className="required">*</span></label>
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={config.accept}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <div className="file-selected">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="selected-name">{selectedFile.name}</span>
              <span className="selected-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          ) : (
            <>
              <svg className="upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <p className="drop-text">Drag and drop your file here, or</p>
              <button type="button" className="browse-btn">Browse Files</button>
            </>
          )}
        </div>
        <p className="accept-label">{config.acceptLabel}</p>

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* SQL Query (PySpark only) */}
        {config.showSQLQuery && (
          <>
            <label className="field-label">SQL Query <span className="optional">(optional)</span></label>
            <textarea
              className="sql-textarea"
              placeholder="Paste SQL here..."
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              rows={5}
            />
          </>
        )}

        {/* Info Banner */}
        <div className="info-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Uploads may take a few minutes. Do not close this window.
        </div>

        {/* Footer Buttons */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel} disabled={uploading}>Cancel</button>
          <button
            className="btn-upload"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <span className="upload-spinner" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
