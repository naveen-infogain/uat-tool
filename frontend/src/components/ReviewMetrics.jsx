import React, { useState } from 'react';
import './ReviewMetrics.css';

// Mock detailed deviation data matching the Figma screenshot
const MOCK_DEVIATIONS = [
  { id: 1, record: 'EMP_00423', attribute: 'gross_pay', pysparkOutput: '5247.83', sasOutput: '5247.38', deviation: '+0.45 (0.01%)' },
  { id: 2, record: 'EMP_00891', attribute: 'tax_withheld', pysparkOutput: '1123.50', sasOutput: '1124.00', deviation: '-0.50 (0.04%)' },
  { id: 3, record: 'EMP_01102', attribute: 'net_pay', pysparkOutput: '3890.20', sasOutput: '3889.95', deviation: '+0.25 (0.01%)' },
  { id: 4, record: 'EMP_01340', attribute: 'overtime_pay', pysparkOutput: '450.00', sasOutput: '452.25', deviation: '-2.25 (0.50%)' },
  { id: 5, record: 'EMP_01567', attribute: 'bonus', pysparkOutput: '2000.00', sasOutput: '1998.75', deviation: '+1.25 (0.06%)' },
];

const MOCK_SUMMARY = [
  { metric: 'Total Records Compared', pyspark: '1,247', sas: '1,247', deviation: '0' },
  { metric: 'Attributes Compared', pyspark: '18', sas: '18', deviation: '0' },
  { metric: 'Matched Records', pyspark: '1,242', sas: '1,242', deviation: '99.6%' },
  { metric: 'Records with Deviations', pyspark: '5', sas: '5', deviation: '0.4%' },
];

export const ReviewMetrics = ({ file, onBack, onApprove, onReject }) => {
  const [attributeFilter, setAttributeFilter] = useState('All Attributes');
  const [filterOpen, setFilterOpen] = useState(false);

  const attributes = ['All Attributes', ...new Set(MOCK_DEVIATIONS.map(d => d.attribute))];

  const filteredDeviations = attributeFilter === 'All Attributes'
    ? MOCK_DEVIATIONS
    : MOCK_DEVIATIONS.filter(d => d.attribute === attributeFilter);

  const isPositive = (dev) => dev.startsWith('+');

  return (
    <div className="review-page">
      {/* Back button */}
      <button className="back-btn" onClick={onBack}>
        ← Back to Dashboard
      </button>

      {/* Page header */}
      <div className="review-header">
        <div className="review-title-block">
          <h2 className="review-title">Review Deviation Metrics</h2>
          <p className="review-subtitle">
            Compare PySpark and SAS outputs: <strong>{file?.fileName}</strong>
          </p>
        </div>
        <div className="review-actions">
          <button className="btn-reject" onClick={onReject}>Reject</button>
          <button className="btn-approve" onClick={onApprove}>Approve</button>
        </div>
      </div>

      {/* Validation Completed Banner */}
      <div className="validation-banner">
        <div className="banner-left">
          <span className="banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
              <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="2" fill="#dcfce7" />
              <polyline points="9 12 11 14 15 10" stroke="#16a34a" strokeWidth="2.5" />
            </svg>
          </span>
          <span className="banner-text">Validation Completed</span>
        </div>
        <div className="banner-stats">
          <span>Matched: <strong className="stat-green">1,242</strong></span>
          <span>Mismatched: <strong className="stat-red">5</strong></span>
          <span>Errors: <strong>0</strong></span>
        </div>
      </div>

      {/* Deviation Summary Table */}
      <div className="metrics-card">
        <h3 className="card-title">Deviation Summary</h3>
        <table className="metrics-table">
          <thead>
            <tr>
              <th>METRIC</th>
              <th>PYSPARK</th>
              <th>SAS</th>
              <th>DEVIATION</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SUMMARY.map((row, i) => (
              <tr key={i}>
                <td className="metric-name">{row.metric}</td>
                <td className="metric-val blue">{row.pyspark}</td>
                <td className="metric-val blue">{row.sas}</td>
                <td className="metric-val">{row.deviation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Deviation Report */}
      <div className="metrics-card">
        <div className="card-header-row">
          <h3 className="card-title">Detailed Deviation Report</h3>
          <div className="card-header-actions">
            <div className="dropdown-wrapper">
              <button className="dropdown-btn" onClick={() => setFilterOpen(o => !o)}>
                {attributeFilter}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 6 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {filterOpen && (
                <div className="dropdown-menu">
                  {attributes.map(attr => (
                    <button
                      key={attr}
                      className={attr === attributeFilter ? 'active' : ''}
                      onClick={() => { setAttributeFilter(attr); setFilterOpen(false); }}
                    >
                      {attr}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="download-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Report
            </button>
          </div>
        </div>

        <table className="deviation-table">
          <thead>
            <tr>
              <th>#</th>
              <th>RECORD</th>
              <th>ATTRIBUTE</th>
              <th>PYSPARK OUTPUT</th>
              <th>SAS OUTPUT</th>
              <th>DEVIATION</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeviations.map(row => (
              <tr key={row.id}>
                <td className="dev-id blue">{row.id}</td>
                <td>{row.record}</td>
                <td className="blue">{row.attribute}</td>
                <td>{row.pysparkOutput}</td>
                <td>{row.sasOutput}</td>
                <td className={`deviation-val ${isPositive(row.deviation) ? 'positive' : 'negative'}`}>
                  {row.deviation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
