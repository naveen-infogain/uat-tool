# Backend Developer Guide

## Entry Point — `backend/app.py`

FastAPI is initialized here. All routers are registered and the database tables are created on startup.

```python
app = FastAPI()
app.include_router(upload_router,   prefix="/api")
app.include_router(compare_router,  prefix="/api")
app.include_router(export_router,   prefix="/api")
app.include_router(workflow_router, prefix="/api")

@app.on_event("startup")
def startup():
    init_db()   # creates tables if they don't exist
```

CORS is configured to allow the frontend origin (`http://localhost:3000` by default).

---

## Configuration — `backend/config.py`

Uses `pydantic-settings` to load all config from `.env`. Access anywhere with:

```python
from config import settings

settings.upload_folder       # /tmp/uat_uploads
settings.max_file_size       # 104857600
settings.brevo_api_key       # ...
```

Never hard-code values — add them to `Settings` and `.env.example` instead.

---

## Database — `backend/db.py`

SQLAlchemy ORM with SQLite (dev) or PostgreSQL (prod).

```python
from db import get_db     # FastAPI dependency

# In a route:
def my_route(db: Session = Depends(get_db)):
    db.query(WorkflowFile).all()
```

`init_db()` is called on startup to auto-create all tables. It also runs a schema migration to add any new columns (e.g., `extras`) to an existing database.

---

## Models — `backend/models.py`

Four ORM classes map to four database tables.

### `UploadedFile`
Created when any file is uploaded. Stores metadata + file path on disk.

```
id (UUID)  file_hash (SHA256)  original_filename  file_path
file_type  file_size  upload_timestamp  user_type
file_metadata (JSON)  ← contains: headers, row_count, col_count, sql_query
```

**Deduplication:** if `file_hash` already exists, the existing record is returned — the same bytes aren't stored twice.

### `WorkflowFile`
One row per file being tracked through UAT. This is the central record that everything links to.

```
id  department  file_name  file_path  owner  save_path  ready_for_uat
status  ← drives all UI behaviour
pyspark_upload_id → UploadedFile
sas_upload_id     → UploadedFile
comparison_id     → Comparison
issue_comment
extras (JSON)  ← pysparkFile, sasFile, comparisonResult, issueAttachment, pysparkSqlQuery
created_at  updated_at
```

### `Comparison`
Created when `/api/compare` is called. Stores the full diff result so it can be retrieved without re-running.

```
id (UUID)  workflow_file_id  pyspark_upload_id  sas_upload_id
mode  headers_diff (JSON)  rows_diff (JSON)  statistics (JSON)
quality_score  created_at
```

### `Issue`
Created when a business user reports a problem.

```
id (UUID)  workflow_file_id  comparison_id
comment  reported_by  status (open|resolved|wontfix)
created_at  updated_at
```

### `FileStatus` Enum

```
not_started → pyspark_uploaded → uat_ready → uat_in_progress
→ sas_uploaded → compared → uat_done → production
                          → issue_reported
                          → not_applicable
```

---

## Routes

### Upload — `routes/upload.py`

**`POST /api/upload`**

Accepts a multipart form:
- `file` — the actual file bytes
- `user_type` — `"developer"` or `"client"`
- `sql_query` — optional, stored in `file_metadata.sql_query`

Flow:
1. Calls `FileHandler.process()` to save file to disk and parse it
2. Checks if `file_hash` already exists in `uploaded_files`
3. If new: inserts `UploadedFile` record
4. Returns `upload_id`, file info, and `data_summary` (headers, row/col counts)

**`GET /api/upload/{upload_id}`**

Returns full metadata for one upload including the SQL query.

---

### Compare — `routes/compare.py`

**`POST /api/compare`**

Body:
```json
{ "upload_id_1": "...", "upload_id_2": "...", "mode": "loose" }
```

Flow:
1. Looks up both `UploadedFile` records
2. Re-parses the files from disk via `FileHandler`
3. Runs `DataComparator.compare(data1, data2, mode)`
4. Inserts `Comparison` record
5. Returns full comparison result + `comparison_id`

**`GET /api/comparison/{comparison_id}`**

Returns the stored comparison result without re-running.

---

### Workflow — `routes/workflow.py`

**`GET /api/workflow-files`**

Returns all workflow records ordered by creation date.

**`POST /api/workflow-files`**

Accepts a list of objects (from a bulk CSV import):
```json
[{ "department": "Finance", "fileName": "output.csv", "filePath": "/data/...", ... }]
```

**`PATCH /api/workflow-files/{file_id}`**

Partial update — only provided fields are changed. Supported fields:
```
status, pysparkUploadId, sasUploadId, comparisonId, issueComment,
pysparkFile, sasFile, comparisonResult, issueAttachment, pysparkSqlQuery
```

After saving, triggers background notification tasks based on the new status:
- `uat_ready` → `notify_uat_ready()`
- `uat_done` → `notify_uat_approved()`
- `issue_reported` → `notify_issue_reported()`

**`DELETE /api/workflow-files/{file_id}`**

Removes the workflow record.

---

### Export — `routes/export.py`

**`GET /api/export/{comparison_id}/excel`**

Generates and streams an Excel file with four sheets:
1. **Summary** — quality score, row/col counts, match percentages
2. **Matched Rows** — paired rows with similarity %
3. **Unmatched** — rows that exist only in PySpark or only in SAS
4. **Differences** — cell-level diff for matched rows that differ

**`GET /api/export/{comparison_id}/csv`**

Generates a plain CSV summary.

---

## Services

### `FileHandler` — `services/file_handler.py`

**`process(file_bytes, filename, upload_folder)`**

1. Saves file to disk as `{timestamp}_{filename}`
2. Computes SHA256 hash
3. Calls `parse_file(path, ext)`
4. Returns `(file_info dict, parsed_data dict)`

**`parse_file(file_path, ext)`**

Uses pandas to read any supported format into a common structure:

```python
{
  "headers": ["col1", "col2", ...],
  "rows": [["val", "val", ...], ...],
  "row_count": 1000,
  "column_count": 10,
  "data": [{"col1": "val", "col2": "val"}, ...]  # list of dicts
}
```

NaN values are replaced with `""`. String values are stripped of whitespace.

**Supported extensions:** `.csv`, `.xlsx`, `.xls`, `.parquet`, `.json`, `.sas7bdat`

---

### `DataComparator` — `services/comparator.py`

The core diff engine. Instantiate with a mode, then call `compare()`.

```python
comparator = DataComparator(mode="loose")
result = comparator.compare(data1, data2)
```

**Internal steps:**

1. **`_compare_headers()`** — Finds shared columns, columns only in file1, columns only in file2
2. **`_compare_rows()`** — For each row in file1, finds the best matching row in file2 using similarity scoring; rows above 80% threshold are "matched"
3. **`_calculate_row_similarity(row1, row2)`** — Compares cell values. In `loose` mode: case-insensitive + numeric tolerance ±0.01. In `structural` mode: ignores blank cells
4. **`_get_cell_differences(row1, row2)`** — Returns list of `{column, value1, value2}` for cells that differ in matched rows
5. **`_calculate_statistics()`** — Aggregates counts + percentages
6. **`_calculate_quality_score()`** — `(row_match% × 0.7) + (col_match% × 0.3)`

**Return structure:**
```python
{
  "headers": { "matched": [...], "only_in_file1": [...], "only_in_file2": [...] },
  "rows": {
    "matched": [{ "row1": {...}, "row2": {...}, "similarity": 0.95, "differences": [...] }],
    "only_in_file1": [...],
    "only_in_file2": [...]
  },
  "statistics": {
    "total_rows_file1": 100, "total_rows_file2": 100,
    "matched_rows": 95, "match_percentage": 95.0, ...
  },
  "quality_score": 91.5
}
```

---

### `NotificationService` — `services/notification.py`

Called as a FastAPI `BackgroundTask` from `workflow.py`.

```python
background_tasks.add_task(notify_uat_ready, file_name, developer_email)
```

Three methods:
- `notify_uat_ready()` — sends email + Teams when dev marks UAT ready
- `notify_issue_reported()` — sends email + Teams when BU reports issue
- `notify_uat_approved()` — sends email + Teams on approval

Email provider: **Brevo** (free tier: 300 emails/day). Configure `BREVO_API_KEY` in `.env`.  
Teams alerts: configure `TEAMS_WEBHOOK_URL` in `.env`.

---

## Adding a New Route

1. Create (or edit) a file in `routes/`
2. Define an `APIRouter`
3. Register it in `app.py` with `app.include_router(..., prefix="/api")`

Example:
```python
# routes/myfeature.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db

router = APIRouter()

@router.get("/my-endpoint")
def my_endpoint(db: Session = Depends(get_db)):
    return {"ok": True}
```

```python
# app.py
from routes.myfeature import router as myfeature_router
app.include_router(myfeature_router, prefix="/api")
```

---

## Adding a New Model

1. Define the class in `models.py` inheriting from `Base`
2. `init_db()` will auto-create the table on next startup (it calls `Base.metadata.create_all`)

---

## Running Tests

```bash
cd backend
source venv/Scripts/activate   # Windows
python -m pytest tests/
```

Test files:
- `tests/test_comparator.py` — unit tests for the diff engine
- `tests/test_file_handler.py` — unit tests for file parsing
