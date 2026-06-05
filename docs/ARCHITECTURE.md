# UAT Tool — System Architecture

## Overview

The UAT Data Comparison Tool is a full-stack web app that lets **developers** upload PySpark output and **business users** upload SAS output, then automatically compares them to validate data equivalence.

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (React)                      │
│  Role: Developer  ◄──────────────────►  Role: BU User   │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTP / REST API
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                        │
│                                                          │
│  Routes          Services           Database             │
│  ─────────       ────────────       ────────             │
│  /upload    ──►  FileHandler   ──►  UploadedFile         │
│  /compare   ──►  DataComparator──►  Comparison           │
│  /workflow  ──►  Notifications ──►  WorkflowFile         │
│  /export    ──►  ExportService      Issue                │
└─────────────────────────────────────────────────────────┘
        │                                    │
   File Storage                       SQLite / PostgreSQL
   /tmp/uat_uploads
```

---

## Tech Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Frontend    | React 18, Axios                     |
| Backend     | FastAPI (Python 3.11+)              |
| ORM         | SQLAlchemy                          |
| Database    | SQLite (dev) / PostgreSQL (prod)    |
| File Parsing| pandas                              |
| Export      | openpyxl                            |
| Email       | Brevo API                           |
| Alerts      | Microsoft Teams Webhook             |
| Container   | Docker Compose                      |

---

## Folder Structure

```
uat-tool/
├── backend/
│   ├── app.py                  ← FastAPI entry point, router registration
│   ├── config.py               ← Settings loaded from .env
│   ├── db.py                   ← SQLAlchemy engine + session + table init
│   ├── models.py               ← ORM models (4 tables)
│   ├── routes/
│   │   ├── upload.py           ← POST /api/upload, GET /api/upload/{id}
│   │   ├── compare.py          ← POST /api/compare, GET /api/comparison/{id}
│   │   ├── export.py           ← GET /api/export/{id}/excel|csv
│   │   └── workflow.py         ← GET/POST/PATCH/DELETE /api/workflow-files
│   └── services/
│       ├── comparator.py       ← Core diff engine (DataComparator class)
│       ├── file_handler.py     ← File parsing → structured dict (FileHandler)
│       ├── exporter.py         ← Excel/CSV report generator (ExportService)
│       └── notification.py     ← Email + Teams alerts (NotificationService)
│
├── frontend/
│   └── src/
│       ├── App.jsx             ← Root: state, role toggle, BU landing vs detail
│       ├── services/api.js     ← Axios client (all API calls live here)
│       ├── constants/businessUnits.js
│       └── components/
│           ├── Header.jsx
│           ├── LandingPage.jsx
│           ├── MergedFileWorkflowTable.jsx  ← Main table + modal state machine
│           ├── UploadModal.jsx
│           ├── UploadFileListModal.jsx
│           ├── DeviationModal.jsx
│           ├── IssueModal.jsx
│           ├── IssueViewModal.jsx
│           └── SASQueriesModal.jsx
│
├── docker-compose.yml
├── .env                        ← Local secrets (not committed)
└── start.ps1                   ← One-command local startup
```

---

## Database Schema

```
uploaded_files
  id (UUID, PK)
  file_hash (SHA256, unique — prevents duplicate uploads)
  original_filename, saved_filename, file_path
  file_type, file_size, upload_timestamp
  user_type: "developer" | "client"
  file_metadata (JSON): { row_count, col_count, headers, sql_query }

workflow_files                          ← Central workflow tracker
  id (INT, PK auto-increment)
  department, file_name, file_path, owner, save_path
  ready_for_uat (0|1)
  status (VARCHAR) — see status lifecycle below
  pyspark_upload_id → uploaded_files.id
  sas_upload_id     → uploaded_files.id
  comparison_id     → comparisons.id
  issue_comment
  extras (JSON): { pysparkFile, sasFile, comparisonResult,
                   issueAttachment, pysparkSqlQuery }
  created_at, updated_at

comparisons
  id (UUID, PK)
  workflow_file_id, pyspark_upload_id, sas_upload_id
  mode: "exact" | "loose" | "structural"
  headers_diff, rows_diff, statistics (all JSON)
  quality_score (float 0–100)
  created_at

issues
  id (UUID, PK)
  workflow_file_id, comparison_id
  comment, reported_by
  status: "open" | "resolved" | "wontfix"
  created_at, updated_at
```

---

## Workflow Status Lifecycle

```
not_started
    │  Developer uploads PySpark file
    ▼
pyspark_uploaded
    │  Developer clicks "Mark UAT Ready"  → sends email + Teams alert
    ▼
uat_ready
    │  Business user clicks "Start UAT"
    ▼
uat_in_progress
    │  Business user uploads SAS file
    ▼
sas_uploaded
    │  Business user clicks "Run Validation"
    ▼
compared
    │                      │
    │ Approve              │ Report Issue  → sends email + Teams alert
    ▼                      ▼
uat_done            issue_reported
    │
    │  Developer clicks "Move to Production"
    ▼
production
```

Also: `not_applicable` (bypasses UAT entirely)

---

## API Endpoints

| Method | Endpoint                         | Purpose                               |
|--------|----------------------------------|---------------------------------------|
| POST   | `/api/upload`                    | Upload file, returns upload_id        |
| GET    | `/api/upload/{id}`               | Get upload metadata                   |
| POST   | `/api/compare`                   | Run comparison, returns result        |
| GET    | `/api/comparison/{id}`           | Get stored comparison result          |
| GET    | `/api/export/{id}/excel`         | Download Excel report (4 sheets)      |
| GET    | `/api/export/{id}/csv`           | Download CSV summary                  |
| GET    | `/api/workflow-files`            | List all workflow records             |
| POST   | `/api/workflow-files`            | Bulk-create workflow records          |
| PATCH  | `/api/workflow-files/{id}`       | Update status, upload IDs, extras     |
| DELETE | `/api/workflow-files/{id}`       | Remove workflow record                |
| GET    | `/api/health`                    | Health check                          |

API docs (Swagger): http://localhost:8000/docs

---

## Comparison Engine — Quality Score

```
Quality Score = (Row Match % × 0.70) + (Column Match % × 0.30)

Row Match %    = matched_rows / total_rows × 100
Column Match % = matched_cols / total_cols × 100
```

**Row matching threshold:** 80% similarity required to count a row as matched.

**Comparison modes:**
- `exact` — case-sensitive, format-sensitive
- `loose` — case-insensitive, numeric tolerance ±0.01
- `structural` — ignores empty rows/columns

**Quality score colours:** ≥90% green · 70–89% orange · <70% red

---

## Supported File Formats

| Format     | Extension      | Read | Write (export) |
|------------|----------------|------|----------------|
| Excel      | .xlsx, .xls    | ✓    | ✓              |
| CSV        | .csv           | ✓    | ✓              |
| Parquet    | .parquet       | ✓    |                |
| JSON       | .json          | ✓    |                |
| SAS        | .sas7bdat      | ✓    |                |

---

## Notification Flow

| Event                 | Trigger                        | Recipients               |
|-----------------------|--------------------------------|--------------------------|
| UAT Ready             | Dev marks "Mark UAT Ready"     | Business User (email + Teams) |
| Issue Reported        | BU clicks "Report Issue"       | Developer (email + Teams) |
| UAT Approved          | BU approves / uat_done status  | Developer (email + Teams) |

Emails are sent via **Brevo API** (free: 300/day).  
Teams alerts use an **incoming webhook URL**.

---

## Environment Variables (`.env`)

```env
# Database
DATABASE_URL=sqlite:///./uat_tool.db

# File storage
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=104857600         # 100 MB

# CORS
CORS_ORIGINS=http://localhost:3000

# Notifications
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=noreply@yourcompany.com
DEVELOPER_EMAIL=dev@yourcompany.com
BUSINESS_USER_EMAIL=bu@yourcompany.com
APP_URL=http://localhost:3000
TEAMS_WEBHOOK_URL=https://yourorg.webhook.office.com/...
```

Frontend (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_DEMO_MODE=false
```

---

## Starting Locally

```powershell
# One command (Windows)
.\start.ps1

# Manual
cd backend && venv\Scripts\activate && uvicorn app:app --reload
cd frontend && npm start
```

```bash
# Docker
docker-compose up --build
```

| Service  | URL                            |
|----------|--------------------------------|
| Frontend | http://localhost:3000          |
| Backend  | http://localhost:8000/api      |
| Swagger  | http://localhost:8000/docs     |
