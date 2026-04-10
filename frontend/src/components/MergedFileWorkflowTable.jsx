import React, { useState } from 'react';
import { UploadModal } from './UploadModal';
import { UploadFileListModal } from './UploadFileListModal';
import { SASQueriesModal } from './SASQueriesModal';
import { IssueModal } from './IssueModal';
import { DeviationModal } from './DeviationModal';
import './MergedFileWorkflowTable.css';

// ── Step flow visual indicators ─────────────────────────────────────────────
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
  if (state === 'active') return <span className="step-icon active" />;
  if (state === 'issue')  return <span className="step-icon issue">!</span>;
  return <span className="step-icon pending" />;
};

// Maps status → which step is done/active/pending
const getStepStates = (status) => {
  switch (status) {
    case 'not_started':      return { py: 'active',  sas: 'pending', val: 'pending' };
    case 'pyspark_uploaded': return { py: 'done',    sas: 'active',  val: 'pending' };
    case 'uat_ready':        return { py: 'done',    sas: 'active',  val: 'pending', tag: 'UAT Ready' };
    case 'uat_in_progress':  return { py: 'done',    sas: 'active',  val: 'pending', tag: 'In Progress' };
    case 'sas_uploaded':     return { py: 'done',    sas: 'done',    val: 'active'  };
    case 'compared':         return { py: 'done',    sas: 'done',    val: 'active',  tag: 'Review Pending' };
    case 'uat_done':         return { py: 'done',    sas: 'done',    val: 'done',    tag: 'UAT Done' };
    case 'issue_reported':   return { py: 'done',    sas: 'done',    val: 'issue',   tag: 'Issue Reported' };
    case 'production':       return { py: 'done',    sas: 'done',    val: 'done',    tag: 'In Production' };
    default:                 return { py: 'pending', sas: 'pending', val: 'pending' };
  }
};

const StatusStepFlow = ({ status }) => {
  if (status === 'not_applicable') {
    return <span className="step-na-badge">Not Applicable</span>;
  }
  const s = getStepStates(status);
  return (
    <div className="step-flow">
      <div className="step-item">
        <StepIcon state={s.py} />
        <span className="step-label">PySpark</span>
      </div>
      <span className="step-connector" />
      <div className="step-item">
        <StepIcon state={s.sas} />
        <span className="step-label">SAS</span>
      </div>
      <span className="step-connector" />
      <div className="step-item">
        <StepIcon state={s.val} />
        <span className="step-label">Validated</span>
      </div>
      {s.tag && <span className={`step-tag step-tag-${status}`}>{s.tag}</span>}
    </div>
  );
};

// ── Action buttons by role + status ─────────────────────────────────────────
const ActionCell = ({ file, role, onAction }) => {
  const { status } = file;

  if (status === 'not_applicable') {
    return role === 'developer'
      ? <button className="act-link" onClick={() => onAction(file, 'restore')}>Restore</button>
      : <span className="act-na">—</span>;
  }

  if (status === 'production') {
    return <button className="act-btn complete" disabled>✓ In Production</button>;
  }

  if (role === 'developer') {
    switch (status) {
      case 'not_started':
        return <button className="act-btn primary" onClick={() => onAction(file, 'upload_pyspark')}>Upload PySpark Output</button>;
      case 'pyspark_uploaded':
        return <button className="act-btn primary" onClick={() => onAction(file, 'mark_uat_ready')}>Mark UAT Ready</button>;
      case 'uat_ready':
      case 'uat_in_progress':
      case 'sas_uploaded':
      case 'compared':
        return <span className="act-waiting">Awaiting Business User</span>;
      case 'uat_done':
        return <button className="act-btn complete-outline" onClick={() => onAction(file, 'move_to_production_single')}>Move to Production</button>;
      case 'issue_reported':
        return <button className="act-btn issue" onClick={() => onAction(file, 'view_issue')}>View Issue</button>;
      default:
        return null;
    }
  }

  // Business user
  switch (status) {
    case 'not_started':
    case 'pyspark_uploaded':
      return <span className="act-waiting">Awaiting Developer</span>;
    case 'uat_ready':
      return <button className="act-btn primary" onClick={() => onAction(file, 'start_uat')}>Start UAT</button>;
    case 'uat_in_progress':
      return (
        <div className="act-group">
          {file.pysparkSqlQuery && (
            <button className="act-btn secondary" onClick={() => onAction(file, 'view_sql')}>View SQL</button>
          )}
          <button className="act-btn primary" onClick={() => onAction(file, 'upload_sas')}>Upload SAS Output</button>
        </div>
      );
    case 'sas_uploaded':
      return <button className="act-btn primary" onClick={() => onAction(file, 'compare')}>Run Validation</button>;
    case 'compared':
      return <button className="act-btn primary" onClick={() => onAction(file, 'view_deviations')}>Review Validation</button>;
    case 'uat_done':
      return <span className="act-done-badge">✓ UAT Done</span>;
    case 'issue_reported':
      return <span className="act-issue-sent">Issue Sent to Developer</span>;
    default:
      return null;
  }
};

// ── Main component ───────────────────────────────────────────────────────────
export const MergedFileWorkflowTable = ({ files, role, selectedIds, onSelectChange, onUpdateFile, onDeleteFile, onMoveToProduction, onAddFiles }) => {
  const [uploadModal, setUploadModal]       = useState(null); // { file, type }
  const [showAddFiles, setShowAddFiles]     = useState(false);
  const [sasQueriesFile, setSasQueriesFile] = useState(null);
  const [issueFile, setIssueFile]           = useState(null);
  const [deviationFile, setDeviationFile]   = useState(null);
  const [issueViewText, setIssueViewText]   = useState(null); // view-only issue display
  const [menuOpenId, setMenuOpenId]         = useState(null);
  const [comparing, setComparing]           = useState(false); // loading state for comparison
  const [comparisonMode, setComparisonMode] = useState('loose'); // 'exact' | 'loose' | 'structural'

  const handleAction = (file, type) => {
    setMenuOpenId(null);
    switch (type) {
      case 'mark_na':                  return onUpdateFile(file.id, { status: 'not_applicable' });
      case 'restore':                  return onUpdateFile(file.id, { status: 'not_started' });
      case 'mark_uat_ready':           return onUpdateFile(file.id, { status: 'uat_ready' });
      case 'start_uat':                return onUpdateFile(file.id, { status: 'uat_in_progress' });
      case 'compare':                  return handleCompare(file);
      case 'upload_pyspark':           return setUploadModal({ file, type: 'pyspark' });
      case 'upload_sas':               return setUploadModal({ file, type: 'sas' });
      case 'view_sas_queries':         return handleViewSql(file);
      case 'view_sql':                 return handleViewSql(file);
      case 'delete':                   return onDeleteFile(file.id);
      case 'move_to_production_single': return onMoveToProduction([file.id]);
      case 'view_deviations':  return setDeviationFile(file);
      case 'view_issue':       return setIssueViewText(file.issueComment);
      default: break;
    }
  };

  const handleCompare = async (file) => {
    if (!file.pysparkUploadId || !file.sasUploadId) {
      alert('Missing upload IDs. Please upload both files first.');
      return;
    }

    setComparing(true);
    try {
      const response = await fetch('http://localhost:8000/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id_1: file.pysparkUploadId,
          upload_id_2: file.sasUploadId,
          mode: comparisonMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Comparison failed');
      }

      const result = await response.json();
      onUpdateFile(file.id, {
        status: 'compared',
        comparisonId: result.comparison_id,
        comparisonResult: result.comparison_result,
      });
      setDeviationFile({ ...file, comparisonId: result.comparison_id, comparisonResult: result.comparison_result });
    } catch (err) {
      alert(`Comparison error: ${err.message}`);
      console.error('Compare error:', err);
    } finally {
      setComparing(false);
    }
  };

  const handleViewSql = async (file) => {
    // Already have SQL in local state — show immediately
    if (file.pysparkSqlQuery) {
      setSasQueriesFile(file);
      return;
    }
    // Fetch from DB using the upload record
    if (file.pysparkUploadId) {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        const resp = await fetch(`${API_BASE}/upload/${file.pysparkUploadId}`);
        if (resp.ok) {
          const data = await resp.json();
          const sqlQuery = data.sql_query || null;
          onUpdateFile(file.id, { pysparkSqlQuery: sqlQuery });
          setSasQueriesFile({ ...file, pysparkSqlQuery: sqlQuery });
          return;
        }
      } catch (e) {
        console.error('Failed to fetch SQL from DB:', e);
      }
    }
    // Show modal anyway — will display "No SQL query" message
    setSasQueriesFile(file);
  };

  const handleUploadDone = (uploadedFile, type) => {
    const uploadId = uploadedFile.upload_id || null;
    if (type === 'pyspark') {
      onUpdateFile(uploadModal.file.id, {
        status: 'pyspark_uploaded',
        pysparkFile: uploadedFile.fileName || uploadedFile.name,
        pysparkUploadId: uploadId,
        pysparkSqlQuery: uploadedFile.sqlQuery || null,
      });
    } else {
      onUpdateFile(uploadModal.file.id, {
        status: 'sas_uploaded',
        sasFile: uploadedFile.fileName || uploadedFile.name,
        sasUploadId: uploadId,
      });
    }
    setUploadModal(null);
  };

  const handleConfirmUAT = () => {
    onUpdateFile(deviationFile.id, { status: 'uat_done' });
    setDeviationFile(null);
  };

  const handleReportIssue = () => {
    setDeviationFile(null);
    setIssueFile(deviationFile || issueFile); // keep reference
  };

  // Called after DeviationModal "Report Issue" → opens issue modal immediately
  const handleDeviationReportIssue = (resolvedDeviationFile) => {
    setDeviationFile(null);
    setIssueFile(resolvedDeviationFile);
  };

  const handleIssueSubmit = (comment) => {
    onUpdateFile(issueFile.id, { status: 'issue_reported', issueComment: comment });
    setIssueFile(null);
  };

  const toggleSelect = (id) => {
    onSelectChange(selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    );
  };

  return (
    <div className="merged-file-workflow-wrap">
      {/* Table toolbar */}
      <div className="table-toolbar">
        <span className="table-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        {role === 'developer' && (
          <button className="add-files-btn" onClick={() => setShowAddFiles(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload File List
          </button>
        )}
      </div>

      {/* Main table */}
      <div className="table-scroll-wrap">
        <table className="merged-table">
          <thead>
            <tr>
              <th>DEPARTMENT</th>
              <th>FILE NAME</th>
              <th>FILE PATH</th>
              <th>OWNER</th>
              <th>UAT READY</th>
              <th>SAVE PATH</th>
              <th>STATUS</th>
              <th>ACTION</th>
              {role === 'developer' && <th className="th-select">SELECT</th>}
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && (
              <tr>
                <td colSpan={role === 'developer' ? 9 : 8} className="empty-row">
                  No files found. {role === 'developer' ? 'Use "Upload File List" to load the pre-requisite file list.' : 'No files are currently available for UAT.'}
                </td>
              </tr>
            )}
            {files.map(file => (
              <tr
                key={file.id}
                className={`merged-row ${
                  file.status === 'not_applicable' ? 'row-na' : ''
                } ${
                  file.status === 'uat_done' || file.status === 'production' ? 'row-done' : ''
                }`}
              >
                <td className="dept-cell">{file.department || '—'}</td>
                <td className="filename-cell" title={file.fileName}>{file.fileName}</td>
                <td className="filepath-cell" title={file.filePath}>{file.filePath || '—'}</td>
                <td className="owner-cell">{file.owner || '—'}</td>
                <td className="uat-ready-cell">
                  {file.readyForUAT
                    ? <span className="badge-uat-yes">Yes</span>
                    : <span className="badge-uat-no">—</span>}
                </td>
                <td className="savepath-cell" title={file.savePath}>{file.savePath || '—'}</td>
                <td className="status-td"><StatusStepFlow status={file.status} /></td>
                <td className="action-td">
                  <ActionCell file={file} role={role} onAction={handleAction} />
                </td>
                {role === 'developer' && (
                  <td className="select-cell">
                    <input
                      type="checkbox"
                      className="row-checkbox"
                      checked={selectedIds.includes(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      disabled={file.status !== 'uat_done'}
                      title={file.status !== 'uat_done' ? 'Only UAT Done files can be moved to production' : 'Select to move to production'}
                    />
                    <div className="kebab-wrapper">
                      <button className="kebab-btn" onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}>⋮</button>
                      {menuOpenId === file.id && (
                        <div className="kebab-menu">
                          {['pyspark_uploaded','uat_ready','uat_in_progress','sas_uploaded','compared','issue_reported'].includes(file.status) && (
                            <button onClick={() => handleAction(file, 'upload_pyspark')}>Re-upload PySpark</button>
                          )}
                          {file.status === 'uat_in_progress' && (
                            <button onClick={() => handleAction(file, 'view_sas_queries')}>View SAS Queries</button>
                          )}
                          {file.status !== 'not_applicable'
                            ? <button className="kebab-danger" onClick={() => handleAction(file, 'mark_na')}>Mark as N/A</button>
                            : <button onClick={() => handleAction(file, 'restore')}>Restore</button>
                          }
                          <button className="kebab-danger" onClick={() => handleAction(file, 'delete')}>Delete Record</button>
                        </div>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAddFiles && (
        <UploadFileListModal
          onAdd={(rows) => { onAddFiles(rows); setShowAddFiles(false); }}
          onCancel={() => setShowAddFiles(false)}
        />
      )}

      {uploadModal && (
        <UploadModal
          type={uploadModal.type}
          file={uploadModal.file}
          onUpload={(uploadedFile) => handleUploadDone(uploadedFile, uploadModal.type)}
          onCancel={() => setUploadModal(null)}
        />
      )}

      {sasQueriesFile && (
        <SASQueriesModal
          file={sasQueriesFile}
          onClose={() => setSasQueriesFile(null)}
        />
      )}

      {deviationFile && (
        <DeviationModal
          file={deviationFile}
          onConfirm={handleConfirmUAT}
          onReportIssue={() => handleDeviationReportIssue(deviationFile)}
          onClose={() => setDeviationFile(null)}
        />
      )}

      {issueFile && (
        <IssueModal
          file={issueFile}
          onSubmit={handleIssueSubmit}
          onCancel={() => setIssueFile(null)}
        />
      )}

      {issueViewText !== null && (
        <div className="modal-overlay" onClick={() => setIssueViewText(null)}>
          <div className="issue-view-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" style={{ position: 'absolute', top: 14, right: 16 }} onClick={() => setIssueViewText(null)}>✕</button>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Issue Comment</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{issueViewText}</p>
          </div>
        </div>
      )}
    </div>
  );
};
