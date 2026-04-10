import React from 'react';
import './Dashboard.css';


export const Dashboard = ({ files, onSelectFile }) => {
  return (
    <div className="dashboard">
      <table className="file-table">
        <thead>
          <tr>
            <th>DEPARTMENT</th>
            <th>FILE NAME</th>
            <th>FILE PATH</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id} onClick={() => onSelectFile(file)} className="file-row">
              <td className="dept-cell">{file.department}</td>
              <td className="filename-cell">{file.fileName}</td>
              <td className="filepath-cell">{file.filePath}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
