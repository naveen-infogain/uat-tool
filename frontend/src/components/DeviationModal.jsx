import React from 'react';
import './DeviationModal.css';

export const DeviationModal = ({ file, onConfirm, onReportIssue, onClose }) => {
  const result = file?.comparisonResult;
  
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
    { metric: 'Total Records Compared', value: stats.total_rows_compared || '—' },
    { metric: 'Matched Records', value: stats.matched_rows || '—' },
    { metric: 'Unmatched (File 1)', value: stats.unmatched_file1 || '—' },
    { metric: 'Unmatched (File 2)', value: stats.unmatched_file2 || '—' },
    { metric: 'Match Rate', value: `${stats.match_percentage || 0}%` },
    { metric: 'Quality Score', value: result.quality_score || '—' },
  ];

  const deviations = (rows.matched_rows || []).filter(r => r.differences && r.differences.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="deviation-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title">Review Validation Results</h2>
        <p className="modal-subtitle"><strong>{file.fileName}</strong> — Review the comparison results below. Approve to mark UAT done, or Reject to report an issue back to the developer.</p>

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

        {/* Detailed deviations */}
        {deviations.length > 0 ? (
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
                {deviations.map((row, idx) => (
                  <React.Fragment key={idx}>
                    {row.differences.map((diff, diffIdx) => (
                      <tr key={`${idx}-${diffIdx}`}>
                        {diffIdx === 0 && <td rowSpan={row.differences.length} className="mono">{row.file1_row}</td>}
                        <td className="mono">{diff.column}</td>
                        <td className="mono">{diff.file1_value}</td>
                        <td className="mono">{diff.file2_value}</td>
                        {diffIdx === 0 && <td rowSpan={row.differences.length}><span className="within-badge">{Math.round(row.similarity * 100)}%</span></td>}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        ) : (
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
