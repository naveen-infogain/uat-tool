import React from 'react';
import './DeviationModal.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const DeviationModal = ({ file, onConfirm, onReportIssue, onClose }) => {
  const result = file?.comparisonResult;
  const comparisonId = file?.comparisonId;

  if (!result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="deviation-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <h2 className="modal-title">Comparison Results</h2>
          <p>No comparison data available.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const stats = result.statistics || {};
  const rows = result.rows || {};
  const headers = result.headers || {};

  const summaryData = [
    { metric: 'Total Records Compared', value: stats.total_rows_compared ?? '—' },
    { metric: 'Matched Records (identical)', value: stats.matched_rows ?? '—' },
    { metric: 'Records with Differences', value: stats.rows_with_differences ?? 0 },
    { metric: 'Additional Rows (PySpark only)', value: stats.unmatched_file1 ?? 0 },
    { metric: 'Additional Rows (SAS only)', value: stats.unmatched_file2 ?? 0 },
    { metric: 'Column Match', value: `${stats.matched_columns ?? 0}/${stats.total_columns ?? 0}` },
    { metric: 'Match Rate', value: `${stats.match_percentage ?? 0}%` },
    { metric: 'Quality Score', value: result.quality_score ?? '—' },
  ];

  const deviations = (rows.matched_rows || []).filter(
    r => r.differences && r.differences.length > 0
  );

  const columnDeviations = headers.column_deviations || [];

  const colTypeLabel = {
    missing_in_sas: 'Missing in SAS',
    extra_in_sas: 'Extra in SAS',
    dtype_mismatch: 'Datatype mismatch',
  };

  // Extra rows that exist in only one file
  const additionalRows = [
    ...(rows.unmatched_in_file1 || []).map(r => ({ source: 'PySpark', ...r })),
    ...(rows.unmatched_in_file2 || []).map(r => ({ source: 'SAS', ...r })),
  ];

  const formatRowData = (data) =>
    Object.entries(data || {})
      .map(([k, v]) => `${k}: ${v === '' ? '—' : v}`)
      .join('  ·  ');

  // Dark divider drawn above each new File1 row group so groups are easy to tell apart.
  const groupDivider = { borderTop: '2px solid #0f172a' };

  const noDeviations =
    deviations.length === 0 &&
    columnDeviations.length === 0 &&
    additionalRows.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="deviation-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title">Review Validation Results</h2>
        <p className="modal-subtitle"><strong>{file.fileName}</strong> — Review the comparison results below. Approve to mark UAT done, or Reject to report an issue back to the developer.</p>

        {comparisonId && (
          <div className="download-actions">
            <a
              className="btn-download"
              href={`${API}/export/${comparisonId}/excel`}
              download
            >
              Download Excel
            </a>
            <a
              className="btn-download"
              href={`${API}/export/${comparisonId}/pdf`}
              download
            >
              Download PDF
            </a>
          </div>
        )}

        {/* Summary */}
        <h3 className="section-heading">Summary</h3>
        <table className="dev-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((r, i) => (
              <tr key={i}>
                <td className="metric-label">{r.metric}</td>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Schema / column deviations */}
        {columnDeviations.length > 0 && (
          <>
            <h3 className="section-heading" style={{ marginTop: 24 }}>
              Schema / Column Deviations ({columnDeviations.length})
            </h3>
            <table className="dev-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>PySpark</th>
                  <th>SAS</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {columnDeviations.map((c, i) => (
                  <tr key={i}>
                    <td className="mono">{c.column}</td>
                    <td>{colTypeLabel[c.type] || c.type}</td>
                    <td className="mono">{c.pyspark}</td>
                    <td className="mono">{c.sas}</td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Cell-level row deviations */}
        {deviations.length > 0 && (
          <>
            <h3 className="section-heading" style={{ marginTop: 24 }}>Detailed Deviations ({deviations.length} rows with differences)</h3>
            <table className="dev-table">
              <thead>
                <tr>
                  <th>Row (File1)</th>
                  <th>Column</th>
                  <th>PySpark Value</th>
                  <th>SAS Value</th>
                  <th>Similarity</th>
                </tr>
              </thead>
              <tbody>
                {deviations.map((row, idx) => {
                  const topBorder = idx > 0 ? groupDivider : undefined;
                  return (
                    <React.Fragment key={idx}>
                      {row.differences.map((diff, diffIdx) => (
                        <tr key={`${idx}-${diffIdx}`}>
                          {diffIdx === 0 && <td rowSpan={row.differences.length} className="mono" style={topBorder}>{row.file1_row + 1}</td>}
                          <td className="mono" style={diffIdx === 0 ? topBorder : undefined}>{diff.column}</td>
                          <td className="mono" style={diffIdx === 0 ? topBorder : undefined}>{diff.file1_value}</td>
                          <td className="mono" style={diffIdx === 0 ? topBorder : undefined}>{diff.file2_value}</td>
                          {diffIdx === 0 && <td rowSpan={row.differences.length} style={topBorder}><span className="within-badge">{Math.round(row.similarity * 100)}%</span></td>}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Additional rows present in only one file */}
        {additionalRows.length > 0 && (
          <>
            <h3 className="section-heading" style={{ marginTop: 24 }}>
              Additional Rows ({additionalRows.length} rows in only one file)
            </h3>
            <table className="dev-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Row #</th>
                  <th>Row Data</th>
                </tr>
              </thead>
              <tbody>
                {additionalRows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className="within-badge">{r.source}</span>
                    </td>
                    <td className="mono">{r.row_index + 1}</td>
                    <td className="mono">{formatRowData(r.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {noDeviations && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', margin: '20px 0' }}>
            ✓ All records match perfectly! No deviations found.
          </div>
        )}

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-danger-outline" onClick={onReportIssue}>
            Reject
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};