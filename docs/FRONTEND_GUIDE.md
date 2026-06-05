# Frontend Developer Guide

## Starting the Dev Server

```bash
cd frontend
npm install
npm start        # http://localhost:3000
```

Make sure the backend is running on `http://localhost:8000` first, or set `REACT_APP_API_URL` in `frontend/.env`.

---

## Entry Points

| File | Purpose |
|------|---------|
| `src/index.jsx` | React root — mounts `<App />` into `#root` |
| `src/App.jsx` | Root component — owns all top-level state, fetches workflow files, routes between Landing and Detail view |
| `src/services/api.js` | All Axios API calls. **Never call `fetch`/`axios` directly in a component — use this module.** |
| `src/constants/businessUnits.js` | List of allowed department/BU names |

---

## Component Map

```
App.jsx
├── Header.jsx                      ← top nav (role toggle, search, move to prod)
├── LandingPage.jsx                 ← BU grid (shown when no BU is selected)
└── MergedFileWorkflowTable.jsx     ← main table + modal orchestration
    ├── UploadModal.jsx             ← drag-drop upload (PySpark or SAS)
    ├── UploadFileListModal.jsx     ← bulk CSV import of file list
    ├── SASQueriesModal.jsx         ← read-only SQL query view
    ├── DeviationModal.jsx          ← comparison results + approve/reject
    ├── IssueModal.jsx              ← report issue form (BU)
    └── IssueViewModal.jsx          ← read-only issue view (Developer)
```

**Legacy components** (kept for reference, not used in current flow):  
`FileUpload.jsx`, `ComparisonViewer.jsx`, `Dashboard.jsx`, `WorkflowTable.jsx`, `AddFilesModal.jsx`

---

## App.jsx — State and Data Flow

`App.jsx` is the single source of truth for the file list.

```
State
─────
role        "developer" | "business_user"
files       WorkflowFile[]  ← fetched from GET /api/workflow-files
loading     bool
searchQuery string
selectedIds Set<number>     ← files checked for "Move to Production"
selectedBU  string | null   ← null = show LandingPage, string = show table
```

**On mount:** fetches `GET /api/workflow-files` and populates `files`.

**Key handlers passed as props to child components:**

```
handleUpdateFile(id, updates)
  → PATCH /api/workflow-files/{id}
  → Merges updates into local state (optimistic update)

handleAddFiles(newRows)
  → POST /api/workflow-files with bulk array
  → Appends returned records to state

handleMoveToProduction(ids)
  → PATCH each selected id with { status: "production" }

handleDeleteFile(id)
  → DELETE /api/workflow-files/{id}
  → Removes from state
```

**Search** is applied client-side: filters `files` by `department`, `file_name`, `file_path`, `owner` (case-insensitive `includes` match).

---

## MergedFileWorkflowTable.jsx — Modal State Machine

This is the most complex component. It renders the workflow table and manages which modal is open.

### Modal State Variables

```javascript
uploadModal      // { file, type: "pyspark"|"sas" } | null
showAddFiles     // bool
sasQueriesFile   // WorkflowFile | null
issueFile        // WorkflowFile | null
deviationFile    // WorkflowFile | null
issueViewFile    // WorkflowFile | null
approveConfirmFile // WorkflowFile | null
```

Each modal is rendered at the bottom of the JSX with a conditional — e.g.:
```jsx
{uploadModal && (
  <UploadModal
    file={uploadModal.file}
    type={uploadModal.type}
    onDone={handleUploadDone}
    onClose={() => setUploadModal(null)}
  />
)}
```

### Action Buttons by Role and Status

| Status | Developer sees | Business User sees |
|--------|---------------|--------------------|
| `not_started` | Upload PySpark Output | Awaiting Developer (disabled) |
| `pyspark_uploaded` | Mark UAT Ready | Awaiting Developer (disabled) |
| `uat_ready` | Awaiting Business User | Start UAT · Approve |
| `uat_in_progress` | Awaiting Business User | View SQL · Upload SAS · Approve |
| `sas_uploaded` | Awaiting Business User | Run Validation · Approve |
| `compared` | Awaiting Business User | Review Validation · Approve |
| `uat_done` | Move to Production | Awaiting Production Move (disabled) |
| `issue_reported` | View Issue | View Issue |
| `production` | — | — |

### Key Handlers

**`handleUploadDone(uploadedFile, type)`**  
Called by `UploadModal` on success. Updates the workflow record:
- If `type === "pyspark"`: sets `status = "pyspark_uploaded"`, stores `pysparkUploadId`, `pysparkFile`, `pysparkSqlQuery`
- If `type === "sas"`: sets `status = "sas_uploaded"`, stores `sasUploadId`, `sasFile`

**`handleCompare(file)`**  
Calls `POST /api/compare` with both upload IDs and mode `"loose"`. On success:
- Sets `status = "compared"`
- Stores `comparisonId` and full `comparisonResult` in `extras`
- Opens `DeviationModal`

**`handleConfirmUAT(file)`**  
Sets `status = "uat_done"`. Triggers `notify_uat_approved` on the backend.

**`handleReportIssue(comment, attachment)`**  
Sets `status = "issue_reported"`, stores `issueComment` and `issueAttachment`.

---

## UploadModal.jsx

Used for both PySpark and SAS uploads. The `type` prop controls what file extensions are accepted and whether the SQL query textarea is shown.

```
Props
─────
file    WorkflowFile         ← the file being worked on (for display)
type    "pyspark" | "sas"
onDone  (uploadedFile, type) ← called with the API response on success
onClose ()                   ← close the modal
```

**Accepted extensions:**
- `pyspark`: `.csv`, `.parquet`, `.json`, `.xlsx`, `.xls`
- `sas`: `.csv`, `.parquet`, `.sas7bdat`, `.xlsx`, `.xls`

**Upload flow:**
1. User drags a file or clicks the zone
2. Client-side validation: extension + size (max 100 MB)
3. `FormData` built with `file`, `user_type`, and optionally `sql_query`
4. `POST /api/upload` — progress tracked
5. On success: `onDone(response.data, type)` is called

---

## DeviationModal.jsx

Displays the comparison result stored in `file.extras.comparisonResult`.

```
Sections
────────
Summary table   ← quality_score, total rows, matched %, unmatched counts
Deviations      ← one row per cell difference: column, PySpark value, SAS value
Action buttons  ← "Confirm UAT ✓"  and  "Report Issue"
```

"Confirm UAT" calls `handleConfirmUAT` on the parent.  
"Report Issue" closes this modal and opens `IssueModal`.

---

## UploadFileListModal.jsx

Allows a developer to bulk-import a list of files from a CSV/Excel spreadsheet.

Expected columns (case-insensitive): `department`, `fileName`, `filePath`, `owner`, `readyForUAT`, `savePath`

Uses the `xlsx` npm package to parse the file client-side, then calls `onAdd(rows)` which triggers `POST /api/workflow-files`.

---

## API Layer — `src/services/api.js`

All backend communication is centralised here. Components import specific functions:

```javascript
import { uploadFile, compareFiles, updateWorkflowFile } from "../services/api";
```

Common functions:

```javascript
uploadFile(formData)                        // POST /api/upload
compareFiles(id1, id2, mode)               // POST /api/compare
getWorkflowFiles()                         // GET  /api/workflow-files
createWorkflowFiles(rows)                  // POST /api/workflow-files
updateWorkflowFile(id, updates)            // PATCH /api/workflow-files/{id}
deleteWorkflowFile(id)                     // DELETE /api/workflow-files/{id}
getExportUrl(comparisonId, format)         // returns download URL string
```

The base URL is read from `process.env.REACT_APP_API_URL` (defaults to `http://localhost:8000/api`).

---

## Adding a New Component

1. Create the file in `frontend/src/components/`
2. If it needs API access, add the call to `services/api.js` and import from there
3. If it needs to trigger a workflow update, receive `onUpdate` as a prop and call `updateWorkflowFile` through it
4. Wire it into `MergedFileWorkflowTable.jsx` — add a state variable for the modal and render it conditionally

---

## Adding a New API Call

Edit `src/services/api.js`:

```javascript
export const myNewCall = async (param) => {
  const response = await axios.post(`${API_URL}/my-endpoint`, { param });
  return response.data;
};
```

---

## Role Toggle

The `role` state in `App.jsx` controls which action buttons are shown in `MergedFileWorkflowTable`. It is passed down as a prop. There is no authentication — the toggle is purely for UI demonstration purposes in the current version.

---

## Status Step Visualizer

Each row shows a three-step progress indicator: **PySpark → SAS → Validated**.

- A step turns green (✓) once the corresponding upload/comparison is complete
- A status tag badge overlays the row: `UAT Ready`, `In Progress`, `Review Pending`, `UAT Done`, `In Production`, `Issue Reported`

This is rendered inside `MergedFileWorkflowTable.jsx` — search for `step-flow` or the status badge logic to find it.

---

## Styling

- Global styles: `src/index.css`
- App-level styles: `src/App.css`
- Component styles are either inline or co-located (no CSS modules currently)

There is no UI library (no MUI/Ant/Chakra) — all styles are hand-written CSS.

---

## Running Tests

```bash
cd frontend
npm test
```
