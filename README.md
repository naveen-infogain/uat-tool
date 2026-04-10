# UAT Data Comparison Tool

Full-stack data comparison tool for reviewing PySpark and SAS outputs through a Figma-based workflow UI.

## Current State

- Backend is implemented with FastAPI.
- Frontend is implemented in React.
- The UI currently matches the approved step-wise flow:
  - Files dashboard
  - Workflow table
  - Upload PySpark modal
  - Upload SAS modal
  - Review deviation metrics page
- The current frontend workflow uses seeded mock data for the Figma experience.
- Backend upload, comparison, and export APIs are implemented and ready to be wired into the workflow UI.

## Tech Stack

### Backend
- FastAPI
- pandas
- openpyxl
- python-multipart
- uvicorn

### Frontend
- React 18
- axios
- react-router-dom

## Supported File Types

Backend parsing currently supports:
- `.xlsx`
- `.xls`
- `.csv`
- `.parquet`
- `.json`
- `.sas7bdat`

## Quick Start

### Prerequisites
- Python 3.13 tested locally
- Node.js 18+
- Docker Desktop optional

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Backend URLs:
- API base: `http://localhost:8000/api`
- Swagger docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend URL:
- App: `http://localhost:3000`

The frontend dev server proxies API requests to `http://localhost:8000`.

### Docker Setup

```bash
docker-compose up --build
```

Docker ports:
- Frontend: `3000`
- Backend: `8000`

## Implemented UI Flow

The current React app follows the approved flow from the screenshots:

1. Files dashboard
   - Search bar
   - Filter button
   - Department / file name / file path table
2. Workflow table
   - Folder path
   - Step indicators for PySpark upload, SAS upload, validation
   - Action buttons
   - Row selection and move-to-production state
3. Upload PySpark modal
   - Drag and drop upload area
   - Optional SQL query input
4. Upload SAS modal
   - Drag and drop upload area
5. Review deviation metrics page
   - Summary banner
   - Deviation summary table
   - Detailed deviation report
   - Reject / Approve actions

## Backend API

### Upload
- `POST /api/upload`
- `GET /api/upload/{upload_id}`
- `GET /api/uploads`

### Compare
- `POST /api/compare`
- `GET /api/comparison/{comparison_id}`
- `GET /api/comparisons`

### Export
- `GET /api/export/{comparison_id}/excel`
- `GET /api/export/{comparison_id}/csv`

### Health
- `GET /api/health`

## API Examples

### Upload File

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@sample.csv" \
  -F "user_type=developer"
```

### Compare Two Uploads

```bash
curl -X POST http://localhost:8000/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "upload_id_1": "upload-id-1",
    "upload_id_2": "upload-id-2",
    "mode": "exact"
  }'
```

### Export Excel Report

```bash
curl -O http://localhost:8000/api/export/COMPARISON_ID/excel
```

## Comparison Modes

- `exact`: case-sensitive, format-sensitive matching
- `loose`: case-insensitive with numeric tolerance
- `structural`: ignores empty-value differences

## Project Structure

```text
uat-tool/
├── .github/
│   └── copilot-instructions.md
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routes/
│   │   ├── upload.py
│   │   ├── compare.py
│   │   └── export.py
│   ├── services/
│   │   ├── comparator.py
│   │   ├── exporter.py
│   │   └── file_handler.py
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── Header.jsx
│   │       ├── ReviewMetrics.jsx
│   │       ├── UploadModal.jsx
│   │       └── WorkflowTable.jsx
│   └── Dockerfile
├── .claudeignore
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Testing

### Backend

```bash
cd backend
pytest tests/
```

### Frontend

```bash
cd frontend
npm test
```

## Notes

- Uploaded files are stored temporarily under the configured upload folder.
- In-memory dictionaries are currently used for uploads and comparisons.
- The current React workflow screens are seeded with mock file rows for the approved Figma flow.
- The next integration step is wiring workflow actions to the FastAPI backend endpoints.
- `pandas==2.2.3` is pinned to avoid source-build issues on Windows with Python 3.13.

## Next Suggested Step

Wire the workflow buttons in the React UI to the FastAPI endpoints so the Figma flow uses real uploads, real validation results, and real export actions.
