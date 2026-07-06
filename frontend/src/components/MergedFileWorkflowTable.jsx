import React, { useState, useMemo } from 'react';
import { UploadModal } from './UploadModal';
import { UploadFileListModal } from './UploadFileListModal';
import { SASQueriesModal } from './SASQueriesModal';
import { IssueModal } from './IssueModal';
import { IssueViewModal } from './IssueViewModal';
import { DeviationModal } from './DeviationModal';
import './MergedFileWorkflowTable.css';

const STATUS_LABELS = {
  not_started:      'New',
  pyspark_uploaded: 'New',
  uat_ready:        'UAT Ready',
  uat_in_progress:  'In Progress',   // ✅ business user view -> "UAT Ready" (override below)
  sas_uploaded:     'UAT Started',
  compared:         'UAT Started',
  uat_done:         'UAT Done',
  issue_reported:   'Issue Reported',
  production:       'In Production',
  descoped:         'Descoped',
};

// label -> css color key
const STATE_KEYS = {
  'New':            'new',
  'UAT Ready':      'uat_ready',
  'In Progress':    'in_progress',
  'UAT Started':    'uat_started',
  'UAT Done':       'uat_done',
  'Issue Reported': 'issue_reported',
  'In Production':  'production',
  'Descoped':       'descoped',
};

// ✅ Displayed state label (role-aware)
const getStateLabel = (status, role) => {
  if (role === 'business_user' && status === 'uat_in_progress') return 'UAT Ready';
  return STATUS_LABELS[status] || 'New';
};

const getStateKey = (status, role) => STATE_KEYS[getStateLabel(status, role)] || 'new';

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
  if (status === 'descoped') {
    return <span className="step-na-badge">Descoped</span>;
  }
  const s = getStepStates(status);
  return (
    <div className="step-flow">
      <div className="step-item">
        <StepIcon state={s.py} />
        <span className="step-label">GCP</span>
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
    </div>
  );
};

const ActionCell = ({ file, role, onAction }) => {
  const { status } = file;

  if (status === 'descoped') {
    return role === 'developer'
      ? <button className="act-link" onClick={() => onAction(file, 'restore')}>Restore</button>
      : <span className="act-na">—</span>;
  }

  if (status === 'production') {
    return <span className="act-in-prod">✓ In Production</span>;
  }

  if (role === 'developer') {
    switch (status) {
      case 'not_started':
        return <button className="act-btn primary" onClick={() => onAction(file, 'upload_pyspark')}>Upload GCP output</button>;
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

  switch (status) {
    case 'not_started':
    case 'pyspark_uploaded':
      return <span className="act-waiting">Awaiting Developer</span>;
    case 'uat_ready':
      return (
        <div className="act-group">
          <button className="act-btn primary" onClick={() => onAction(file, 'start_uat')}>Start UAT</button>
          <button className="act-btn approve" disabled title="Upload SAS output first to enable approval">Approve</button>
        </div>
      );
    case 'uat_in_progress':
      return (
        <div className="act-group">
          {file.pysparkSqlQuery && (
            <button className="act-btn secondary" onClick={() => onAction(file, 'view_sql')}>View SQL</button>
          )}
          <button className="act-btn primary" onClick={() => onAction(file, 'upload_sas')}>Upload SAS Output</button>
          <button className="act-btn approve" disabled title="Upload SAS output first to enable approval">Approve</button>
        </div>
      );
    case 'sas_uploaded':
      return (
        <div className="act-group">
          <button className="act-btn primary" onClick={() => onAction(file, 'compare')}>Run Validation</button>
          <button className="act-btn approve" disabled title="Run validation first to enable approval">Approve</button>
        </div>
      );


    case 'compared':
      return (
        <div className="act-group">
          <button className="act-btn primary" onClick={() => onAction(file, 'view_deviations')}>Review Validation</button>
          <button className="act-btn approve" onClick={() => onAction(file, 'approve_direct')}>Approve</button>
        </div>
      );
    case 'uat_done':
      return <span className="act-waiting">Awaiting Production Move</span>;
    case 'issue_reported':
      return <span className="act-issue-sent">Issue Sent to Developer</span>;
    default:
      return null;
  }
};


export const MergedFileWorkflowTable = ({
  files, role, selectedIds, onSelectChange,
  onUpdateFile, onDeleteFile, onMoveToProduction,
  onAddFiles,
  currentDepartment,            // ✅ NEW
  searchQuery = '',             // ✅ NEW — Header se
  filterField = 'department',   // ✅ NEW — Header se
}) => {
  const [uploadModal, setUploadModal]             = useState(null);
  const [showAddFiles, setShowAddFiles]           = useState(false);
  const [sasQueriesFile, setSasQueriesFile]       = useState(null);
  const [issueFile, setIssueFile]                 = useState(null);
  const [deviationFile, setDeviationFile]         = useState(null);
  const [issueViewFile, setIssueViewFile]         = useState(null);
  const [approveConfirmFile, setApproveConfirmFile] = useState(null);
  const [menuOpenId, setMenuOpenId]               = useState(null);
  const [comparing, setComparing]                 = useState(false);
  const [comparisonMode, setComparisonMode]       = useState('loose');

  // ✅ Filtering ab Header ke searchQuery + filterField par based hai
  const filteredFiles = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return files;
    return files.filter(file => {
      switch (filterField) {
        case 'department':
          return (
            (file.buName || '').toLowerCase().includes(q) ||
            (file.department || '').toLowerCase().includes(q)
          );
        case 'fileName':
          return (file.fileName || '').toLowerCase().includes(q);
        case 'owner':
          return (file.owner || '').toLowerCase().includes(q);
        case 'status':
          // displayed state label ("New", "UAT Ready"...) aur raw status dono match
          return (
            getStateLabel(file.status, role).toLowerCase().includes(q) ||
            (file.status || '').toLowerCase().includes(q)
          );
        default:
          return true;
      }
    });
  }, [files, filterField, searchQuery, role]);

  const handleAction = (file, type) => {
    setMenuOpenId(null);
    switch (type) {
      case 'mark_na':                   return onUpdateFile(file.id, { status: 'descoped' });
      case 'restore':                   return onUpdateFile(file.id, { status: 'not_started' });
      case 'descope':                   return onUpdateFile(file.id, { status: 'uat_done' });
      case 'mark_uat_ready':            return onUpdateFile(file.id, { status: 'uat_ready' });
      case 'start_uat':                 return onUpdateFile(file.id, { status: 'uat_in_progress' });
      case 'compare':                   return handleCompare(file);
      case 'upload_pyspark':            return setUploadModal({ file, type: 'pyspark' });
      case 'upload_sas':                return setUploadModal({ file, type: 'sas' });
      case 'view_sas_queries':          return handleViewSql(file);
      case 'view_sql':                  return handleViewSql(file);
      case 'delete':                    return onDeleteFile(file.id);
      case 'move_to_production_single': return onMoveToProduction([file.id]);
      case 'view_deviations':           return setDeviationFile(file);
      case 'view_issue':                return setIssueViewFile(file);
      case 'approve_direct':            return setApproveConfirmFile(file);
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
      setDeviationFile({
        ...file,
        comparisonId: result.comparison_id,
        comparisonResult: result.comparison_result
      });
    } catch (err) {
      alert(`Comparison error: ${err.message}`);
      console.error('Compare error:', err);
    } finally {
      setComparing(false);
    }
  };

  const handleViewSql = async (file) => {
    if (file.pysparkSqlQuery) {
      setSasQueriesFile(file);
      return;
    }
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

  const handleDeviationReportIssue = (resolvedDeviationFile) => {
    setDeviationFile(null);
    setIssueFile(resolvedDeviationFile);
  };

  const handleIssueSubmit = (comment, attachment) => {
    onUpdateFile(issueFile.id, {
      status: 'issue_reported',
      issueComment: comment,
      issueAttachment: attachment || null,
    });
    setIssueFile(null);
  };

  const toggleSelect = (id) => {
    onSelectChange(selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    );
  };

  const isSearching = (searchQuery || '').trim().length > 0;

  return (
    <div className="merged-file-workflow-wrap">
      <div className="table-toolbar">
        <span className="table-count">
          {isSearching
            ? `${filteredFiles.length} of ${files.length} file${files.length !== 1 ? 's' : ''}`
            : `${files.length} file${files.length !== 1 ? 's' : ''}`}
        </span>
        {role === 'developer' && (
          <button className="add-files-btn" onClick={() => setShowAddFiles(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload File List
          </button>
        )}
      </div>

      <div className="table-scroll-wrap">
        <table className="merged-table">
          <thead>
            <tr>
              <th>BU NAMES</th>
              <th>DEPARTMENT</th>
              <th>FILE NAME</th>
              <th>FILE PATH</th>
              <th>OWNER</th>
              <th>STATUS</th>
              <th>STATE</th>
              <th>ACTION</th>
              {role === 'developer' && <th className="th-select">SELECT</th>}
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length === 0 && (
              <tr>
                <td colSpan={role === 'developer' ? 9 : 8} className="empty-row">
                  {files.length === 0
                    ? `No files found. ${role === 'developer' ? 'Use "Upload File List" to add files.' : 'No files available for UAT.'}`
                    : 'No files match your search.'}
                </td>
              </tr>
            )}
            {filteredFiles.map(file => (
              <tr
                key={file.id}
                className={`merged-row ${
                  file.status === 'descoped' ? 'row-na' : ''
                } ${
                  file.status === 'uat_done' || file.status === 'production' ? 'row-done' : ''
                }`}
              >
                <td className="bu-cell" title={file.businessUnit || file.buName || currentDepartment || ''}>
                  {file.businessUnit || file.buName || currentDepartment || '—'}
                </td>
                <td className="dept-cell">{file.department || '—'}</td>
                <td className="filename-cell" title={file.fileName}>{file.fileName}</td>
                <td className="filepath-cell" title={file.filePath}>{file.filePath || '—'}</td>
                <td className="owner-cell" title={file.owner}>{file.owner || '—'}</td>
                <td className="status-td"><StatusStepFlow status={file.status} /></td>
                <td className="state-cell">
                  <span className={`state-badge state-${getStateKey(file.status, role)}`}>
                    {getStateLabel(file.status, role)}
                  </span>
                </td>
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
                          {file.status !== 'descoped'
                            ? <button className="kebab-danger" onClick={() => handleAction(file, 'mark_na')}>Mark as Descoped</button>
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

      {/* ✅ departmentFilter pass kiya */}
      {showAddFiles && (
        <UploadFileListModal
          onAdd={(rows, deptFilter) => {
            onAddFiles(rows, deptFilter);
            setShowAddFiles(false);
          }}
          onCancel={() => setShowAddFiles(false)}
          departmentFilter={currentDepartment}  // ✅ KEY CHANGE
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

      {issueViewFile && (
        <IssueViewModal
          file={issueViewFile}
          onClose={() => setIssueViewFile(null)}
        />
      )}

      {approveConfirmFile && (
        <div className="modal-overlay" onClick={() => setApproveConfirmFile(null)}>
          <div className="approve-confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setApproveConfirmFile(null)}>✕</button>
            <div className="acm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 className="acm-title">Approve without SAS Upload?</h2>
            <p className="acm-desc">
              You are approving <strong>{approveConfirmFile.fileName}</strong> directly.<br/>
              The file will be marked as <strong>UAT Done</strong> without SAS validation.
            </p>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setApproveConfirmFile(null)}>Cancel</button>
              <button
                className="btn-approve"
                onClick={() => {
                  onUpdateFile(approveConfirmFile.id, { status: 'uat_done' });
                  setApproveConfirmFile(null);
                }}
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
