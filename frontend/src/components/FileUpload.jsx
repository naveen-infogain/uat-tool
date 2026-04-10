/**
 * File Upload Component - Dual upload for developer and client.
 */
import React, { useState, useRef } from 'react';
import { apiService } from '../services/api';
import './FileUpload.css';

export const FileUpload = ({ onUploadSuccess, onUploadError }) => {
  const [devFile, setDevFile] = useState(null);
  const [clientFile, setClientFile] = useState(null);
  const [devLoading, setDevLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [devUploadId, setDevUploadId] = useState(null);
  const [clientUploadId, setClientUploadId] = useState(null);
  const devInputRef = useRef(null);
  const clientInputRef = useRef(null);

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        onUploadError('Invalid file type. Please upload Excel or CSV files.');
        return;
      }
      setFile(file);
    }
  };

  const handleUpload = async (file, userType, setLoading, setUploadId) => {
    if (!file) {
      onUploadError('No file selected');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.uploadFile(file, userType);
      setUploadId(result.upload_id);
      onUploadSuccess({
        uploadId: result.upload_id,
        userType: userType,
        fileName: result.file_info.original_filename,
        rowCount: result.data_summary.row_count,
        columnCount: result.data_summary.column_count
      });
    } catch (error) {
      onUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDevUpload = () => {
    handleUpload(devFile, 'developer', setDevLoading, setDevUploadId);
  };

  const handleClientUpload = () => {
    handleUpload(clientFile, 'client', setClientLoading, setClientUploadId);
  };

  return (
    <div className="file-upload-container">
      <h2>Data Comparison Tool</h2>
      <p className="subtitle">Upload Excel files to compare developer and client data</p>

      <div className="upload-section">
        {/* Developer Upload */}
        <div className="upload-box">
          <h3>👨‍💻 Developer File</h3>
          <div className="file-input-wrapper">
            <input
              ref={devInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileChange(e, setDevFile)}
              disabled={devLoading}
            />
            <label onClick={() => devInputRef.current?.click()}>
              {devFile ? '✓ ' + devFile.name : 'Choose Developer File'}
            </label>
          </div>
          <button
            onClick={handleDevUpload}
            disabled={!devFile || devLoading || devUploadId}
            className={devLoading ? 'loading' : ''}
          >
            {devLoading ? 'Uploading...' : devUploadId ? '✓ Uploaded' : 'Upload'}
          </button>
          {devUploadId && <p className="upload-id">ID: {devUploadId.slice(0, 8)}...</p>}
        </div>

        {/* Client Upload */}
        <div className="upload-box">
          <h3>👥 Client File</h3>
          <div className="file-input-wrapper">
            <input
              ref={clientInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileChange(e, setClientFile)}
              disabled={clientLoading}
            />
            <label onClick={() => clientInputRef.current?.click()}>
              {clientFile ? '✓ ' + clientFile.name : 'Choose Client File'}
            </label>
          </div>
          <button
            onClick={handleClientUpload}
            disabled={!clientFile || clientLoading || clientUploadId}
            className={clientLoading ? 'loading' : ''}
          >
            {clientLoading ? 'Uploading...' : clientUploadId ? '✓ Uploaded' : 'Upload'}
          </button>
          {clientUploadId && <p className="upload-id">ID: {clientUploadId.slice(0, 8)}...</p>}
        </div>
      </div>

      {devUploadId && clientUploadId && (
        <div className="both-ready">
          ✓ Both files uploaded! Ready to compare.
        </div>
      )}
    </div>
  );
};
