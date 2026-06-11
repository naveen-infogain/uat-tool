import React, { useMemo } from 'react';
import { ALLOWED_BUSINESS_UNITS, ALLOWED_BUSINESS_UNIT_SET } from '../constants/businessUnits';
import './LandingPage.css';

const STATUS_ORDER = [
  'not_started',
  'pyspark_uploaded',
  'uat_ready',
  'uat_in_progress',
  'sas_uploaded',
  'compared',
  'uat_done',
  'issue_reported',
  'production',
  'not_applicable',
];

function deriveBUStats(files) {
  const map = Object.fromEntries(
    ALLOWED_BUSINESS_UNITS.map(name => [name, {
      name,
      total: 0,
      done: 0,
      inProgress: 0,
      issues: 0,
      notStarted: 0,
      production: 0,
    }])
  );

  for (const f of files) {
    const bu = f.buName || f.department || '';
    if (!ALLOWED_BUSINESS_UNIT_SET.has(bu)) {
      continue;
    }

    const s = map[bu];
    s.total += 1;
    if (f.status === 'uat_done')            s.done       += 1;
    else if (f.status === 'issue_reported') s.issues     += 1;
    else if (f.status === 'production')     s.production += 1;
    else if (f.status === 'not_started')    s.notStarted += 1;
    else                                    s.inProgress += 1;
  }

  return ALLOWED_BUSINESS_UNITS.map(name => map[name]);
}

function GlobalStats({ files }) {
  const total      = files.length;
  const done       = files.filter(f => f.status === 'uat_done').length;
  const issues     = files.filter(f => f.status === 'issue_reported').length;
  const production = files.filter(f => f.status === 'production').length;
  const inProgress = files.filter(f =>
    !['not_started', 'uat_done', 'issue_reported', 'production', 'not_applicable'].includes(f.status)
  ).length;
  const completionPct = total ? Math.round(((done + production) / total) * 100) : 0;

  return (
    <div className="global-stats">
      <div className="stat-card stat-total">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total Files</span>
      </div>
      <div className="stat-card stat-progress">
        <span className="stat-value">{inProgress}</span>
        <span className="stat-label">In Progress</span>
      </div>
      <div className="stat-card stat-done">
        <span className="stat-value">{done}</span>
        <span className="stat-label">UAT Done</span>
      </div>
      <div className="stat-card stat-issues">
        <span className="stat-value">{issues}</span>
        <span className="stat-label">Issues</span>
      </div>
      <div className="stat-card stat-production">
        <span className="stat-value">{production}</span>
        <span className="stat-label">In Production</span>
      </div>
      <div className="stat-card stat-pct">
        <span className="stat-value">{completionPct}%</span>
        <span className="stat-label">Completion</span>
      </div>
    </div>
  );
}

function BUCard({ bu, onClick }) {
  const completionPct = bu.total
    ? Math.round(((bu.done + bu.production) / bu.total) * 100)
    : 0;

  const progressColor =
    completionPct >= 80 ? '#22c55e' :
    completionPct >= 40 ? '#f59e0b' :
                          '#3b82f6';

  return (
    <div className="bu-card" onClick={() => onClick(bu.name)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(bu.name)}>
      <div className="bu-card-header">
        <span className="bu-name">{bu.name}</span>
        <span className="bu-total-badge">{bu.total} files</span>
      </div>

      {/* Progress bar */}
      <div className="bu-progress-track">
        <div
          className="bu-progress-fill"
          style={{ width: `${completionPct}%`, background: progressColor }}
        />
      </div>
      <div className="bu-pct-label">{completionPct}% complete</div>

      {/* Mini stats row */}
      <div className="bu-mini-stats">
        {bu.inProgress > 0 && (
          <span className="bu-stat bu-stat-progress">{bu.inProgress} in progress</span>
        )}
        {bu.done > 0 && (
          <span className="bu-stat bu-stat-done">{bu.done} UAT done</span>
        )}
        {bu.issues > 0 && (
          <span className="bu-stat bu-stat-issue">{bu.issues} issue{bu.issues > 1 ? 's' : ''}</span>
        )}
        {bu.production > 0 && (
          <span className="bu-stat bu-stat-prod">{bu.production} production</span>
        )}
        {bu.notStarted > 0 && (
          <span className="bu-stat bu-stat-ns">{bu.notStarted} not started</span>
        )}
      </div>

      <div className="bu-card-arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}

export function LandingPage({ files, onSelectBU }) {
  const buList = useMemo(() => deriveBUStats(files), [files]);

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1 className="landing-title"> GCP-SAS Compare</h1>
        <p className="landing-subtitle">UAT Data Comparison Dashboard — select a Business Unit to begin</p>
      </div>

      <div className="landing-body">
        <section className="section-block">
          <h2 className="section-heading">Overall Statistics</h2>
          <GlobalStats files={files} />
        </section>

        <section className="section-block">
          <h2 className="section-heading">Business Units ({buList.length})</h2>
          {buList.length === 0 ? (
            <p className="empty-hint">No files loaded yet. Upload file list to get started.</p>
          ) : (
            <div className="bu-grid">
              {buList.map(bu => (
                <BUCard key={bu.name} bu={bu} onClick={onSelectBU} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}