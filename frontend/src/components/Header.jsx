import React from 'react';
import './Header.css';

export const Header = ({
  searchQuery,
  onSearchChange,
  onMoveToProduction,
  canMoveToProduction,
  view,
  onViewChange,
}) => {
  return (
    <div className="header-wrapper">
      <header className="header">
        <h1 className="header-title">SparkSAS Compare</h1>
      </header>

      <div className="header-toolbar">
        <div className="toolbar-left">
          <button className="filter-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div className="view-tabs">
            <button
              className={`view-tab ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => onViewChange('dashboard')}
            >
              Files
            </button>
            <button
              className={`view-tab ${view === 'workflow' ? 'active' : ''}`}
              onClick={() => onViewChange('workflow')}
            >
              Workflow
            </button>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search files, departments, or owners..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className={`move-to-prod-btn ${canMoveToProduction ? 'enabled' : ''}`}
            onClick={onMoveToProduction}
            disabled={!canMoveToProduction}
          >
            Move to Production
          </button>
        </div>
      </div>
    </div>
  );
};
