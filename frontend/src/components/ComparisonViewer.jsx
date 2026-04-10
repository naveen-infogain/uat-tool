/**
 * Comparison Viewer Component - Display side-by-side comparison results.
 */
import React, { useState, useEffect } from 'react';
import './ComparisonViewer.css';

export const ComparisonViewer = ({ comparisonResult, onExport }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [filter, setFilter] = useState('all');

  if (!comparisonResult) {
    return <div className="comparison-viewer"><p>No comparison data</p></div>;
  }

  const stats = comparisonResult.statistics || {};
  const rows = comparisonResult.rows || {};
  const qualityScore = comparisonResult.quality_score || 0;

  const getScoreColor = (score) => {
    if (score >= 90) return '#2ecc71';
    if (score >= 70) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div className="comparison-viewer">
      {/* Summary Section */}
      <div className="summary-section">
        <div className="quality-score" style={{ borderColor: getScoreColor(qualityScore) }}>
          <div className="score-circle" style={{ backgroundColor: getScoreColor(qualityScore) }}>
            <span className="score-text">{qualityScore}%</span>
          </div>
          <p className="score-label">Quality Score</p>
        </div>

        <div className="statistics-grid">
          <div className="stat-box">
            <span className="stat-label">Matched Rows</span>
            <span className="stat-value">{stats.matched_rows || 0}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Unmatched (File 1)</span>
            <span className="stat-value">{stats.unmatched_file1 || 0}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Unmatched (File 2)</span>
            <span className="stat-value">{stats.unmatched_file2 || 0}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Matched Columns</span>
            <span className="stat-value">{stats.matched_columns || 0}/{stats.total_columns || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab ${activeTab === 'matched' ? 'active' : ''}`}
          onClick={() => setActiveTab('matched')}
        >
          Matched Rows ({rows.matched_rows?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'unmatched' ? 'active' : ''}`}
          onClick={() => setActiveTab('unmatched')}
        >
          Unmatched
        </button>
        <button
          className={`tab ${activeTab === 'differences' ? 'active' : ''}`}
          onClick={() => setActiveTab('differences')}
        >
          Differences
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'summary' && (
          <div className="summary-details">
            <h3>Comparison Statistics</h3>
            <table>
              <tbody>
                <tr>
                  <td>Mode</td>
                  <td>{comparisonResult.mode}</td>
                </tr>
                <tr>
                  <td>Total Rows (File 1)</td>
                  <td>{stats.total_rows_file1 || 0}</td>
                </tr>
                <tr>
                  <td>Total Rows (File 2)</td>
                  <td>{stats.total_rows_file2 || 0}</td>
                </tr>
                <tr>
                  <td>Match Percentage</td>
                  <td>{stats.match_percentage || 0}%</td>
                </tr>
                <tr>
                  <td>Column Match Percentage</td>
                  <td>{stats.column_match_percentage || 0}%</td>
                </tr>
              </tbody>
            </table>

            <div className="export-buttons">
              <button onClick={() => onExport('excel')} className="export-btn excel">
                📊 Export as Excel
              </button>
              <button onClick={() => onExport('csv')} className="export-btn csv">
                📄 Export as CSV
              </button>
            </div>
          </div>
        )}

        {activeTab === 'matched' && (
          <div className="matched-rows">
            <h3>Matched Rows</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>File 1 Row</th>
                  <th>File 2 Row</th>
                  <th>Similarity</th>
                  <th>Differences</th>
                </tr>
              </thead>
              <tbody>
                {(rows.matched_rows || []).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.file1_row}</td>
                    <td>{row.file2_row}</td>
                    <td>
                      <div className="similarity-bar">
                        <div
                          className="similarity-fill"
                          style={{ width: `${row.similarity * 100}%` }}
                        />
                      </div>
                      {(row.similarity * 100).toFixed(0)}%
                    </td>
                    <td>{row.differences?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'unmatched' && (
          <div className="unmatched-rows">
            <h3>Unmatched Rows</h3>
            <div className="unmatched-columns">
              <div className="unmatched-col">
                <h4>File 1 Only</h4>
                <ul>
                  {(rows.unmatched_in_file1 || []).map((row, idx) => (
                    <li key={idx}>Row {row.row_index}</li>
                  ))}
                </ul>
              </div>
              <div className="unmatched-col">
                <h4>File 2 Only</h4>
                <ul>
                  {(rows.unmatched_in_file2 || []).map((row, idx) => (
                    <li key={idx}>Row {row.row_index}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'differences' && (
          <div className="differences">
            <h3>Cell-Level Differences</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>File 1 Row</th>
                  <th>File 2 Row</th>
                  <th>Column</th>
                  <th>File 1 Value</th>
                  <th>File 2 Value</th>
                </tr>
              </thead>
              <tbody>
                {(rows.matched_rows || []).flatMap((row) =>
                  (row.differences || []).map((diff, idx) => (
                    <tr key={`${row.file1_row}-${idx}`}>
                      <td>{row.file1_row}</td>
                      <td>{row.file2_row}</td>
                      <td><strong>{diff.column}</strong></td>
                      <td className="diff-value-1">{diff.file1_value}</td>
                      <td className="diff-value-2">{diff.file2_value}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
