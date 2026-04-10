# UAT Data Comparison Tool

Full-stack tool for comparing Excel/CSV/Parquet/SAS data files between developer and client uploads.

## Tech Stack

- **Backend:** FastAPI (Python 3.11+) — note: README mentions Flask but `app.py` uses FastAPI
- **Frontend:** React (Node.js 18+)
- **Key libraries:** `openpyxl`, `pandas`, `difflib`, `pydantic-settings`

## Common Commands

### Backend
```bash
cd backend
source venv/Scripts/activate          # Windows
# source venv/bin/activate            # macOS/Linux
uvicorn app:app --reload              # Dev server on http://localhost:8000
python -m pytest tests/              # Run tests
```

### Frontend
```bash
cd frontend
npm install
npm start                             # Dev server on http://localhost:3000
npm test
```

### Docker
```bash
docker-compose up --build
```

## Architecture

### Backend Services (`backend/services/`)
- **`DataComparator`** — Core diff engine. Compares two datasets with three modes:
  - `exact` — case-sensitive, format-sensitive
  - `loose` — case-insensitive, numeric tolerance ±0.01
  - `structural` — ignores empty rows/columns
  - 80% similarity threshold for row matching; quality score = 70% row score + 30% column score
- **`ExportService`** — Generates Excel reports (4 sheets: Summary, Matched Rows, Unmatched, Differences) and CSV summaries

### Backend Routes (`backend/routes/`)
- `POST /api/upload` — Upload file, returns `upload_id`
- `POST /api/compare` — Compare two `upload_id`s with a chosen mode
- `GET /api/export/<id>/excel` — Download comparison as Excel
- `GET /api/export/<id>/csv` — Download comparison as CSV
- `GET /api/health` — Health check

### Config (`backend/config.py`)
- `UPLOAD_FOLDER` — default `/tmp/uat_uploads`
- `CORS_ORIGINS` — default `http://localhost:3000`
- Max file size: 100 MB
- Allowed extensions: `xlsx`, `xls`, `csv`, `parquet`, `json`, `sas7bdat`
- Comparison timeout: 600s

### Frontend Components (`frontend/src/components/`)
- **`FileUpload`** — Dual-file input (developer + client)
- **`ComparisonViewer`** — Results visualization with diff highlighting

## Key Constraints

- Never persist raw uploads permanently — files are stored temporarily in `UPLOAD_FOLDER`
- Upload sessions are in-memory (`dict`) — replace with a database for production
- Stream/batch large files to avoid memory overload
- Validate file encoding (handle non-ASCII)
