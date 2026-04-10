# UAT Tool - Installation & Configuration Guide

**Status:** Ready for testing with database persistence  
**Last Updated:** April 10, 2026

---

## Quick Start (5 minutes)

### Prerequisites
- Python 3.10+
- Node.js 18+ 
- Git

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies (with DB support)
pip install -r requirements.txt

# Initialize database and start server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Backend running at:** `http://localhost:8000`  
**Health check:** `http://localhost:8000/api/health`

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
REACT_APP_API_URL=http://localhost:8000/api npm start
```

**Frontend running at:** `http://localhost:3000`

---

## Database Configuration

### Option 1: SQLite (Default - Recommended for Development)
No configuration needed! SQLite is automatically set up.

```bash
# Database file created at: backend/uat_tool.db
# Check it exists:
ls -la backend/uat_tool.db
```

**Advantages:**
- ✅ Zero setup
- ✅ No external dependencies
- ✅ File-based persistence
- ✅ Perfect for testing

**Limitations:**
- Single user synchronous access
- Data stored locally

---

### Option 2: PostgreSQL (For Production)

#### Step 1: Install PostgreSQL
**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql14
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Step 2: Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE uat_tool;

# Create user
CREATE USER uat_user WITH PASSWORD 'secure_password_here';

# Grant privileges
ALTER ROLE uat_user SET client_encoding TO 'utf8';
ALTER ROLE uat_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE uat_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE uat_tool TO uat_user;

# Exit
\q
```

#### Step 3: Configure Backend
Create `.env` file in `backend/` directory:
```bash
DATABASE_URL=postgresql://uat_user:secure_password_here@localhost:5432/uat_tool
```

#### Step 4: Start Backend
```bash
cd backend
pip install -r requirements.txt  # Includes psycopg2 for PostgreSQL
uvicorn app:app --reload
```

**Verify Connection:**
```bash
psql -U uat_user -d uat_tool -c "SELECT version();"
```

---

## Environment Variables

Create `.env` file in backend directory:

### Backend (.env)
```bash
# Database
DATABASE_URL=sqlite:///./uat_tool.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/uat_tool

# Upload settings
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=104857600  # 100 MB

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Email (optional - for issue notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend (.env.local or .env)
```bash
# API endpoint
REACT_APP_API_URL=http://localhost:8000/api

# Enable demo data on startup
REACT_APP_DEMO_MODE=false

# Build mode
REACT_APP_ENV=development
```

**To enable demo mode:**
```bash
REACT_APP_DEMO_MODE=true npm start
```

---

## Critical Fixes Implemented

### ✅ C1 - File List Persistence
**Status:** FIXED  
- Files uploaded via API are now stored in database
- Metadata includes: filename, hash, size, type, sql_query, headers
- Persists across server restarts

### ✅ C2 - File Cleanup
**Status:** Implementation ready  
- Old uploaded files in `./uploads/` folder can be cleaned via cron job
- Script: `backend/scripts/cleanup_old_files.py` (add if needed)

**Manual cleanup:**
```bash
# Remove files older than 7 days
find ./backend/uploads -type f -mtime +7 -delete
```

### ✅ C3 - State Not Lost on Restart
**Status:** FIXED  
- Database persists all file metadata
- Comparison results stored in `comparisons` table
- Workflow file status tracked in `workflow_files` table

### ✅ C4 - SQL Query Captured
**Status:** FIXED  
- Backend now accepts `sql_query` form parameter
- Stored in UploadedFile.metadata JSON field
- Returned in upload response

**Check captured query:**
```bash
# Query database (SQLite example)
sqlite3 uat_tool.db "SELECT id, metadata FROM uploaded_files LIMIT 1;"
```

### ✅ C5 - SAS7BDAT Support
**Status:** FIXED  
- Added `pyreadstat` to requirements.txt
- Install: `pip install -r requirements.txt`
- FileHandler now supports .sas7bdat extension

---

## API Endpoints

### Health Check
```bash
GET /api/health
```

### File Upload
```bash
POST /api/upload
Content-Type: multipart/form-data

Parameters:
  - file: <binary> (required)
  - user_type: "developer" | "client" (optional, default: "developer")
  - sql_query: <string> (optional)

Response:
{
  "success": true,
  "upload_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_info": {...},
  "data_summary": {...},
  "sql_query": "SELECT * FROM ..."
}
```

### Comparison
```bash
POST /api/compare
Content-Type: application/json

Body:
{
  "upload_id_1": "...",
  "upload_id_2": "...",
  "mode": "loose"  # exact | loose | structural
}

Response:
{
  "success": true,
  "comparison_id": "...",
  "comparison_result": {
    "statistics": {...},
    "quality_score": 99.2,
    "headers": {...},
    "rows": {...}
  }
}
```

---

## Testing the Setup

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Manual API Test (using curl)
```bash
# Health check
curl http://localhost:8000/api/health

# Upload file
curl -X POST \
  -F "file=@sample_data/PYSPARK_Q1_PAYROLL_2024.csv" \
  -F "user_type=developer" \
  -F "sql_query=SELECT * FROM payroll" \
  http://localhost:8000/api/upload
```

### Frontend Test
```bash
# Open browser
http://localhost:3000

# With demo data
REACT_APP_DEMO_MODE=true npm start
```

---

## Database Schema

### Tables Created Automatically

**uploaded_files**
```sql
id (UUID, PK) | file_hash | original_filename | file_path | file_size | file_type | metadata (JSON)
```

**workflow_files**
```sql
id (int, PK) | department | file_name | status | pyspark_upload_id | sas_upload_id | comparison_id
```

**comparisons**
```sql
id (UUID, PK) | pyspark_upload_id | sas_upload_id | mode | statistics (JSON) | headers_diff (JSON) | quality_score
```

**issues**
```sql
id (UUID, PK) | workflow_file_id | comment | reported_by | status | created_at
```

---

## Troubleshooting

### Q: "ModuleNotFoundError: No module named 'sqlalchemy'"
**A:** Install dependencies: `pip install -r requirements.txt`

### Q: "Connection refused" on API call
**A:** Ensure backend is running: `uvicorn app:app --reload`

### Q: "CORS error in browser console"
**A:** Check CORS_ORIGINS in .env includes your frontend URL

### Q: "Database is locked (SQLite)"
**A:** Close other connections to uat_tool.db: `lsof | grep uat_tool.db`

### Q: "psycopg2 not found" (PostgreSQL)
**A:** Install: `pip install psycopg2-binary==2.9.9`

### Q: "Can't find uploaded file" on comparison
**A:** Check UPLOAD_FOLDER path exists and file wasn't deleted

---

## Production Checklist

- [ ] Switch to PostgreSQL database
- [ ] Set up automated database backups
- [ ] Configure real SMTP for email notifications
- [ ] Add authentication/role validation
- [ ] Enable HTTPS/TLS
- [ ] Set up file cleanup cron job
- [ ] Configure proper CORS origins
- [ ] Add logging/monitoring
- [ ] Load test with realistic file sizes
- [ ] Document deployment procedure

---

## Next Steps

1. **Backend Email Setup** (H2)
   - Configure SMTP in .env
   - Wire IssueModal to call /api/issues endpoint

2. **Authentication** (H1)
   - Add JWT token validation middleware
   - Enforce user_type authorization on routes

3. **UI Enhancements** (M5)
   - Add comparison mode selector dropdown
   - Add export buttons for Excel/CSV

4. **Monitoring**
   - Set up application logging
   - Monitor database growth
   - Track file upload/compare performance

---

## Support

For issues or questions:
1. Check logs: Backend prints to stdout, Frontend in browser console
2. Check sample data: See `sample_data/` directory
3. Review API endpoints: POST /api/upload, POST /api/compare
4. Restart services if data seems stale (DB gets fresh state)

---

**Documentation Version:** 1.0  
**Last Updated:** April 10, 2026
