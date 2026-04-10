import React, { useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { WorkflowTable } from './components/WorkflowTable';
import { ReviewMetrics } from './components/ReviewMetrics';
import './App.css';

// Seed data matching the Figma design
const INITIAL_FILES = [
  { id: 1, department: 'Finance', fileName: 'quarterly_revenue_report_Q4_2025.csv', filePath: '/data/finance/reports/Q4_2025/revenue.csv', folderPath: '/finance/reports/quarterly', status: 'not_started', pysparkUploadId: null, sasUploadId: null, comparisonId: null },
  { id: 2, department: 'Marketing', fileName: 'customer_engagement_metrics.parquet', filePath: '/data/marketing/analytics/engagement_2025.parquet', folderPath: '/marketing/analytics', status: 'sas_uploaded', pysparkUploadId: 'mock-1', sasUploadId: null, comparisonId: null },
  { id: 3, department: 'Operations', fileName: 'supply_chain_inventory_snapshot.csv', filePath: '/data/operations/inventory/snapshot_2026_03.csv', folderPath: '/operations/inventory', status: 'validated', pysparkUploadId: 'mock-2', sasUploadId: 'mock-3', comparisonId: null },
  { id: 4, department: 'Human Resources', fileName: 'employee_performance_reviews.xlsx', filePath: '/data/hr/performance/annual_reviews_2025.xlsx', folderPath: '/hr/performance', status: 'reviewed', pysparkUploadId: 'mock-4', sasUploadId: 'mock-5', comparisonId: 'mock-c1' },
  { id: 5, department: 'Sales', fileName: 'regional_sales_pipeline_forecast.csv', filePath: '/data/sales/forecasting/regional_pipeline_Q1_2026.csv', folderPath: '/sales/forecasting', status: 'complete', pysparkUploadId: 'mock-6', sasUploadId: 'mock-7', comparisonId: 'mock-c2' },
];

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'workflow' | 'review'
  const [files, setFiles] = useState(INITIAL_FILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [reviewFile, setReviewFile] = useState(null);

  const handleUpdateFile = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const filteredFiles = files.filter(f => {
    const q = searchQuery.toLowerCase();
    return (
      f.department.toLowerCase().includes(q) ||
      f.fileName.toLowerCase().includes(q) ||
      f.filePath.toLowerCase().includes(q) ||
      f.folderPath.toLowerCase().includes(q)
    );
  });

  const canMoveToProduction = selectedIds.length > 0 &&
    selectedIds.every(id => files.find(f => f.id === id)?.status === 'complete');

  const handleReview = (file) => {
    setReviewFile(file);
    setView('review');
  };

  const handleApprove = () => {
    if (reviewFile) {
      handleUpdateFile(reviewFile.id, { status: 'complete' });
    }
    setView('workflow');
    setReviewFile(null);
  };

  const handleReject = () => {
    if (reviewFile) {
      handleUpdateFile(reviewFile.id, { status: 'sas_uploaded' });
    }
    setView('workflow');
    setReviewFile(null);
  };

  return (
    <div className="app">
      {view !== 'review' && (
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMoveToProduction={() => alert('Moving selected to Production...')}
          canMoveToProduction={canMoveToProduction}
          view={view}
          onViewChange={setView}
        />
      )}
      <main className="app-main">
        {view === 'dashboard' && (
          <Dashboard
            files={filteredFiles}
            onSelectFile={() => setView('workflow')}
          />
        )}
        {view === 'workflow' && (
          <WorkflowTable
            files={filteredFiles}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            onUpdateFile={handleUpdateFile}
            onReview={handleReview}
          />
        )}
        {view === 'review' && reviewFile && (
          <ReviewMetrics
            file={reviewFile}
            onBack={() => { setView('workflow'); setReviewFile(null); }}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </main>
    </div>
  );
}

export default App;
