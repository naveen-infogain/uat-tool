import React, { useState } from 'react';
import { UploadModal } from './UploadModal';
import './WorkflowTable.css';

// Step icon component
const StepIcon = ({ state }) => {
  if (state === 'done') {
    return (
      <span className="step-icon done">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (state === 'active') {
    return <span className="step-icon active" />;
  }
  return <span className="step-icon pending" />;
};

const StepFlow = ({ pysparkDone, sasDone, validatedDone }) => (
  <div className="step-flow">
    <div className="step-item">
      <StepIcon state={pysparkDone ? 'done' : 'active'} />
      <span className="step-label">PySpark Output Uploaded</span>
    </div>
    <span className="step-connector" />
    <div className="step-item">
      <StepIcon state={sasDone ? 'done' : pysparkDone ? 'active' : 'pending'} />
      <span className="step-label">SAS Output Uploaded</span>
    </div>
    <span className="step-connector" />
    <div className="step-item">
      <StepIcon state={validatedDone ? 'done' : sasDone ? 'active' : 'pending'} />
      <span className="step-label">Validated</span>
    </div>
  </div>
);

const getActionButton = (file, onAction) => {
  switch (file.status) {
    case 'not_started':
      return <button className="action-btn primary" onClick={() => onAction(file, 'pyspark')}>Upload PySpark Output</button>;
    case 'pyspark_uploaded':
      return <button className="action-btn primary" onClick={() => onAction(file, 'sas')}>Upload SAS Output</button>;
    case 'sas_uploaded':
      return <button className="action-btn primary" onClick={() => onAction(file, 'validate')}>Run Validation</button>;
    case 'validated':
      return <button className="action-btn primary" onClick={() => onAction(file, 'review')}>Review Metrics</button>;
    case 'reviewed':
      return <button className="action-btn primary" onClick={() => onAction(file, 'review')}>Review Metrics</button>;
    case 'complete':
      return <button className="action-btn complete">✓ Complete</button>;
    default:
      return null;
  }
};

export const WorkflowTable = ({ files, selectedIds, onSelectChange, onUpdateFile, onReview }) => {
  const [uploadModal, setUploadModal] = useState(null); // { file, type }
  const [menuOpenId, setMenuOpenId] = useState(null);

  const handleAction = (file, type) => {
    if (type === 'validate') {
      // Simulate running validation → update status
      onUpdateFile(file.id, { status: 'validated' });
      return;
    }
    if (type === 'review') {
      onReview(file);
      return;
    }
    setUploadModal({ file, type });
  };

  const handleUploadDone = (file, type) => {
    if (type === 'pyspark') {
      onUpdateFile(file.id, { status: 'pyspark_uploaded', pysparkUploadId: 'uploaded-' + file.id });
    } else if (type === 'sas') {
      onUpdateFile(file.id, { status: 'sas_uploaded', sasUploadId: 'uploaded-' + file.id });
    }
    setUploadModal(null);
  };

  const toggleSelect = (id) => {
    onSelectChange(selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    );
  };

  return (
    <div className="workflow-wrap">
      <table className="workflow-table">
        <thead>
          <tr>
            <th>FOLDER PATH</th>
            <th>STATUS</th>
            <th>ACTION</th>
            <th>SELECT</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => {
            const pyDone = ['pyspark_uploaded', 'sas_uploaded', 'validated', 'reviewed', 'complete'].includes(file.status);
            const sasDone = ['sas_uploaded', 'validated', 'reviewed', 'complete'].includes(file.status);
            const valDone = ['validated', 'reviewed', 'complete'].includes(file.status);

            return (
              <tr key={file.id} className="workflow-row">
                <td className="folder-path">{file.folderPath}</td>
                <td className="status-cell">
                  {file.status === 'not_started' ? (
                    <span className="badge not-started">Not Started</span>
                  ) : (
                    <StepFlow pysparkDone={pyDone} sasDone={sasDone} validatedDone={valDone} />
                  )}
                </td>
                <td className="action-cell">
                  {getActionButton(file, handleAction)}
                </td>
                <td className="select-cell">
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => toggleSelect(file.id)}
                  />
                  <div className="kebab-wrapper">
                    <button className="kebab-btn" onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}>⋮</button>
                    {menuOpenId === file.id && (
                      <div className="kebab-menu">
                        <button onClick={() => { handleAction(file, 'pyspark'); setMenuOpenId(null); }}>Re-upload PySpark</button>
                        <button onClick={() => { handleAction(file, 'sas'); setMenuOpenId(null); }}>Re-upload SAS</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {uploadModal && (
        <UploadModal
          type={uploadModal.type}
          file={uploadModal.file}
          onUpload={() => handleUploadDone(uploadModal.file, uploadModal.type)}
          onCancel={() => setUploadModal(null)}
        />
      )}
    </div>
  );
};
