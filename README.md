# UAT Data Comparison Tool

Full-stack tool for validating PySpark and SAS output files. The developer runs a PySpark job, uploads the output with the SQL query used. The business user copies that SQL, runs it in SAS, uploads the SAS output, and the tool compares both datasets side-by-side.

## How It Works

| Role | What they do |
|------|-------------|
| **Developer** | Uploads a file list → uploads PySpark output + SQL query → marks UAT ready |
| **Business User** | Copies the SQL → runs it in SAS → uploads SAS output → runs validation → reviews deviations → approves or reports issue |

---

## Quick Start

### Prerequisites
- Python 3.10+ ([python.org](https://python.org))
- Node.js 18+ ([nodejs.org](https://nodejs.org))

---

## Case 1 — One-Command Start (Recommended)

Run this once from the project root in PowerShell:

```powershell
.\start.ps1
```

This will:
1. Check Python and Node.js are installed
2. Create the Python virtual environment (first run only)
3. Install all backend and frontend dependencies (first run only)
4. Open two terminal windows — one for the backend, one for the frontend

**URLs after startup:**

| Service | URL |
|---------|-----|
| Frontend app | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

> If PowerShell blocks the script: run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, then retry.

---

## Case 2 — Manual Start (Two Terminals)

**Terminal 1 — Backend:**

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**

```powershell
cd frontend
npm install
set REACT_APP_API_URL=http://localhost:8000/api
npm start
```

---

## User Workflows

### Developer workflow
1. Switch role to **Developer** (top-right toggle)
2. Click **Upload File List** → upload the prerequisite CSV with file names
3. For each file: click **Upload PySpark Output** → drag & drop the CSV/Parquet/Excel file → paste the SQL query used → Upload
4. Click **Mark UAT Ready** → business user is now unblocked
5. After review: if issue reported, re-upload PySpark and repeat
6. Once **UAT Done**: click **Move to Production** (removes from list) or **Delete** to discard

### Business user workflow
1. Switch role to **Business User**
2. Click **Start UAT** on a ready file
3. Click **View SQL** → copy the SQL query the developer used
4. Run that SQL in your SAS environment to produce the output file
5. Click **Upload SAS Output** → upload the SAS result file
6. Click **Run Validation** → comparison runs automatically
7. Click **Review Metrics** → inspect row-level deviations and quality score
8. Click **Approve UAT** (marks done) or **Report Issue** (sends issue to developer)

---

## Tech Stack

### Backend
- **FastAPI** — async REST API
- **SQLAlchemy** — ORM with SQLite (default) or PostgreSQL
- **pandas** — file parsing (CSV, Excel, Parquet, JSON, SAS7BDAT)
- **uvicorn** — ASGI server

### Frontend
- **React 18** — UI framework
- **Component-based** — UploadModal, MergedFileWorkflowTable, DeviationModal, SASQueriesModal

## Supported File Types

`.xlsx` · `.xls` · `.csv` · `.parquet` · `.json` · `.sas7bdat`

---

## Database

SQLite is used by default — no setup required. The database file `backend/uat_tool.db` is created automatically on first start.

To use PostgreSQL instead, set this environment variable before starting the backend:

```
DATABASE_URL=postgresql://user:password@localhost:5432/uat_tool
```

---

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a file (returns `upload_id`) |
| `GET` | `/api/upload/{id}` | Get upload details + SQL query |
| `GET` | `/api/uploads` | List all uploads |
| `POST` | `/api/compare` | Compare two uploads |
| `GET` | `/api/comparison/{id}` | Get comparison results |
| `GET` | `/api/export/{id}/excel` | Download Excel report |
| `GET` | `/api/export/{id}/csv` | Download CSV report |
| `GET` | `/api/health` | Health check |

### Comparison modes
- `exact` — case-sensitive, format-sensitive
- `loose` — case-insensitive, numeric tolerance ±0.01
- `structural` — ignores empty rows/columns

---

## Docker

```bash
docker-compose up --build
```

---

## Project Structure

```
uat-tool/
├── start.ps1                 ← one-command startup
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── db.py                 ← SQLAlchemy setup
│   ├── models.py             ← DB table definitions
│   ├── requirements.txt
│   ├── routes/
│   │   ├── upload.py
│   │   ├── compare.py
│   │   └── export.py
│   └── services/
│       ├── comparator.py
│       ├── exporter.py
│       └── file_handler.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── MergedFileWorkflowTable.jsx
│           ├── UploadModal.jsx
│           ├── SASQueriesModal.jsx
│           ├── DeviationModal.jsx
│           └── IssueModal.jsx
└── sample_data/              ← test files for manual testing


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
