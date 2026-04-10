/**
 * API service for communicating with backend.
 */
import axios from 'axios';

const API_BASE = '/api';

export const apiService = {
  /**
   * Upload a file for comparison.
   */
  uploadFile: async (file, userType = 'developer') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_type', userType);

    const response = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
  },

  /**
   * Get upload details.
   */
  getUpload: async (uploadId) => {
    const response = await axios.get(`${API_BASE}/upload/${uploadId}`);
    return response.data;
  },

  /**
   * List all uploads in session.
   */
  listUploads: async () => {
    const response = await axios.get(`${API_BASE}/uploads`);
    return response.data;
  },

  /**
   * Compare two uploaded files.
   */
  compareFiles: async (uploadId1, uploadId2, mode = 'exact') => {
    const response = await axios.post(`${API_BASE}/compare`, {
      upload_id_1: uploadId1,
      upload_id_2: uploadId2,
      mode: mode
    });

    return response.data;
  },

  /**
   * Get comparison results.
   */
  getComparison: async (comparisonId) => {
    const response = await axios.get(`${API_BASE}/comparison/${comparisonId}`);
    return response.data;
  },

  /**
   * List all comparisons.
   */
  listComparisons: async () => {
    const response = await axios.get(`${API_BASE}/comparisons`);
    return response.data;
  },

  /**
   * Export comparison as Excel.
   */
  exportExcel: async (comparisonId) => {
    const response = await axios.get(
      `${API_BASE}/export/${comparisonId}/excel`,
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `comparison_${comparisonId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentElement.removeChild(link);
  },

  /**
   * Export comparison as CSV.
   */
  exportCsv: async (comparisonId) => {
    const response = await axios.get(
      `${API_BASE}/export/${comparisonId}/csv`,
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `comparison_${comparisonId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentElement.removeChild(link);
  }
};
