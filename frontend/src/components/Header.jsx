import React, { useState } from 'react';
import './Header.css';

const FILTER_OPTIONS = [
  { value: 'department', label: 'Department Name' },
  { value: 'fileName',   label: 'File Name' },
  { value: 'owner',      label: 'Owner' },
  { value: 'status',     label: 'State' },
];

export const Header = ({
  role,
  onRoleChange,
  searchQuery,
  onSearchChange,
  onMoveToProduction,
  canMoveToProduction,
  selectedBU,
  onBackToLanding,
  filterField = 'department',   // ✅ NEW — which column the search applies to
  onFilterFieldChange,          // ✅ NEW
}) => {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const activeFilter = FILTER_OPTIONS.find(o => o.value === filterField) || FILTER_OPTIONS[0];

  return (
    <div className="header-wrapper">
      <header className="header">
        <div className="header-left">
          <div className="header-title-block">
            <h1
              className={`header-title${onBackToLanding ? ' header-title-link' : ''}`}
              onClick={onBackToLanding || undefined}
              title={onBackToLanding ? 'Back to home' : undefined}
            >
              SparkSAS Compare
            </h1>
            {selectedBU && (
              <span className="header-bu-crumb">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {selectedBU}
              </span>
            )}
          </div>
        </div>
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

      {selectedBU && (
        <div className="header-toolbar">
          <div className="toolbar-left">
            <div className="filter-dropdown">
              <button
                type="button"
                className="filter-btn"
                onClick={() => setFilterMenuOpen(o => !o)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {activeFilter.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {filterMenuOpen && (
                <>
                  <div className="filter-backdrop" onClick={() => setFilterMenuOpen(false)} />
                  <div className="filter-dropdown-menu">
                    {FILTER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`filter-dropdown-item ${opt.value === filterField ? 'active' : ''}`}
                        onClick={() => {
                          onFilterFieldChange?.(opt.value);
                          setFilterMenuOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
                placeholder={`Search by ${activeFilter.label.toLowerCase()}...`}
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
      )}
    </div>
  );
};
