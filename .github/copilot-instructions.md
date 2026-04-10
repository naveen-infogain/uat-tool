# UAT Data Comparison Tool - Workspace Instructions

## Project Overview

**Type:** Full-stack data comparison and UAT tool  
**Purpose:** Enable side-by-side comparison of Excel files and data between developer and client uploads  
**Tech Stack:** Python backend (Flask/FastAPI) + React frontend  
**User Model:** Two-user system (developer uploads file 1, client uploads file 2, both view comparison results)

## Architecture

### Backend (Python)
- **Framework:** Flask or FastAPI (fast async file processing)
- **Key Components:**
  - File upload/validation service (Excel, CSV parsing)
  - Data comparison engine (deep diff, cell-level matching)
  - Session management (track comparison state per user pair)
  - Export/reporting (generate comparison reports)
- **Key Libraries:** `openpyxl`, `pandas`, `difflib`, `Flask/FastAPI`

### Frontend (React)
- **Key Components:**
  - File upload interface (dual-file input for dev + client)
  - Comparison viewer (split-view or unified diff display)
  - Results dashboard (highlight differences, statistics)
  - Data explorer/filter interface (per Figma design)
- **State Management:** Context API or Redux
- **Key Libraries:** React, React Router, `xlsx`/`react-excel-workbook`

### Data Comparison Flow
1. Developer uploads Excel file → backend parses & stores
2. Client uploads Excel file → backend parses
3. Backend runs diff algorithm (row/cell level comparison)
4. Frontend displays results with:
   - Highlighted differences
   - Match statistics
   - Row/column alignment
5. User can export comparison report

## Development Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run  # or: uvicorn app:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start  # Runs on http://localhost:3000
```

### Database (if needed)
- SQLite for dev, PostgreSQL for production (optional for session persistence)

## Key Development Patterns

### File Upload Handling
- Validate file type (`.xlsx`, `.xls`, `.csv` only)
- Limit file size (prevent abuse)
- Parse into memory/temp storage, don't persist raw uploads
- Return upload ID for comparison reference

### Data Comparison
- Normalize data (trim whitespace, handle number formats)
- Support configurable comparison modes:
  - Exact match (sensitive to case/formatting)
  - Loose match (case-insensitive, number tolerance)
  - Structural match (ignore empty rows)
- Generate detailed diff metadata (row/col indices, change type)

### API Design
```
POST /api/upload         → upload file (returns upload_id, file_hash)
POST /api/compare        → compares two upload_ids
GET  /api/comparison/<id> → fetch comparison results
GET  /api/export/<id>    → export report as Excel/CSV
```

### Frontend State
- Store uploaded files metadata (name, size, hash, timestamp)
- Cache comparison results during session
- Real-time sync between dual-upload interface

## Testing

### Backend Tests
```bash
pytest tests/
```

### Frontend Tests
```bash
npm test
```

### Integration Tests
- Test file upload + comparison workflow end-to-end
- Edge cases: empty files, large datasets, special characters

## Deployment

- **Backend:** Docker container, gunicorn/uvicorn server
- **Frontend:** Build → static files served by backend (or separate CDN)
- **File Storage:** Temporary `/tmp` directory or cloud storage (S3)

## Important Constraints & Patterns

- **Never store raw user uploads permanently** (privacy, storage)
- **Stream large Excel files** to avoid memory overload
- **Implement request timeout** (5-10 min for large comparisons)
- **Validate file encoding** (handle non-ASCII characters)
- **Provide granular comparison modes** for different use cases
- **Log comparison operations** (for audit trail)

## Project Structure (Recommended)

```
uat-tool/
├── backend/
│   ├── app.py (or main.py)
│   ├── requirements.txt
│   ├── config.py
│   ├── services/
│   │   ├── file_handler.py
│   │   ├── comparator.py
│   │   └── exporter.py
│   ├── routes/
│   │   ├── upload.py
│   │   ├── compare.py
│   │   └── export.py
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── ComparisonViewer.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── .github/
│   └── copilot-instructions.md (this file)
└── docker-compose.yml
```

## UI Reference

Figma Design: https://www.figma.com/make/O6JOkhtMPt6rPWc1LzQdqN/Data-Management-Dashboard-UI?t=xPiJ24P46dUJcwlI-1

**Key UI Pages:**
- Upload page (dual file input for dev + client)
- Comparison results page (split-view diff with highlights)
- Statistics/summary panel (rows matched, rows added/removed, data quality score)
- Export/download report

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start both backend + frontend (from root if dev script exists) |
| `python -m pytest` | Run all tests |
| `npm test` | Run frontend tests |
| `docker-compose up` | Run full stack in Docker |

## Next Steps to Build

1. **Initialize project structure** (folders, git repo, .gitignore)
2. **Backend:** Set up Flask/FastAPI boilerplate, file upload route
3. **Frontend:** Create React app, upload interface component
4. **Core Logic:** Implement Excel parser + basic diff algorithm
5. **UI Build:** Side-by-side comparison viewer based on Figma
6. **Testing:** Add unit tests for comparator
7. **Deploy:** Docker setup, cloud deployment

---

**Last Updated:** April 10, 2026  
**Status:** Initial workspace bootstrap
