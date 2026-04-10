import React from 'react';
import './Header.css';

export const Header = ({
  role,
  onRoleChange,
  searchQuery,
  onSearchChange,
  onMoveToProduction,
  canMoveToProduction,
}) => {
  return (
    <div className="header-wrapper">
      <header className="header">
        <h1 className="header-title">SparkSAS Compare</h1>
        <div className="role-switcher">
          <span className="role-label">Viewing as:</span>
          <button
            className={`role-btn ${role === 'developer' ? 'active' : ''}`}
            onClick={() => onRoleChange('developer')}
          >
            Developer
          </button>
          <button
            className={`role-btn ${role === 'business_user' ? 'active' : ''}`}
            onClick={() => onRoleChange('business_user')}
          >
            Business User
          </button>
        </div>
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
              placeholder="Search files, departments, or business units..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="toolbar-right">
          {role === 'developer' && (
            <button
              className={`move-to-prod-btn ${canMoveToProduction ? 'enabled' : ''}`}
              onClick={onMoveToProduction}
              disabled={!canMoveToProduction}
              title={canMoveToProduction ? '' : 'Select UAT Done files to enable'}
            >
              Move to Production
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
