# Quick Start Guide - Sample Data

## 🚀 Get Started in 5 Minutes

### Step 1: Upload File List (Developer View)
1. Open the app at `http://localhost:3000`
2. Make sure you're viewing as **Developer**
3. Click **"Upload File List"** button
4. Drag & drop or select `FILE_LIST_TEMPLATE.csv` from this folder
5. Review the preview, click **"Upload"**
6. ✅ 6 files appear in the table

---

### Step 2: Upload PySpark Output
1. In the table, find a file with status **"not_started"** (e.g., "Q1_Payroll_2024")
2. Click **"Upload PySpark Output"** button
3. Select `PYSPARK_Q1_PAYROLL_2024.csv`
4. (Optional) Add SQL query: `SELECT * FROM payroll WHERE year=2024`
5. Click **"Upload"** 
6. ✅ Status changes to **"pyspark_uploaded"**

---

### Step 3: Mark UAT Ready
1. Same row, click **"Mark UAT Ready"** button
2. ✅ Status changes to **"uat_ready"**
3. Now waiting for Business User

---

### Step 4: Switch to Business User View
1. Top left, click **"Business User"** button
2. ✅ Different action buttons appear
3. Find your file with status **"uat_ready"**

---

### Step 5: Start UAT
1. Click **"Start UAT"** button on the "uat_ready" file
2. ✅ Status changes to **"uat_in_progress"** (orange indicator)

---

### Step 6: Upload SAS Output
1. Click **"Upload SAS Output"** button
2. Select `SAS_Q1_PAYROLL_2024.csv`
3. Click **"Upload"**
4. ✅ Status changes to **"sas_uploaded"**

---

### Step 7: Run Validation
1. Click **"Run Validation"** button
2. ✅ Backend compares files
3. Status changes to **"compared"** (blue indicator)

---

### Step 8: Review Metrics
1. Click **"Review Metrics"** button
2. See comparison summary:
   - Total Records: 10
   - Matched: 9-10 (depending on loose vs exact mode)
   - Quality Score: ~99%
3. Scroll down to see detailed deviations (if any)
4. Two options:
   - **✓ Confirm UAT & Mark Done** → Status = "uat_done" (green)
   - **✗ Report Issue** → Opens comment dialog

---

### Step 9 (Optional): Report Issue
1. In Review Metrics, click **"Report Issue"**
2. Type comment: `"EMP003 overtime pay discrepancy - needs clarification"`
3. Click **"Submit"**
4. ✅ Status changes to **"issue_reported"** (red)
5. Backend sends email to developer

---

### Step 10: Move to Production
1. Switch back to **Developer** view
2. Find file with status **"uat_done"** (green checkmark)
3. Checkbox in the SELECT column should now be **enabled**
4. Check the box
5. Click **"Move to Production"** button (top right)
6. ✅ File **disappears** from the list (moved to production)

---

## 📊 Testing Different Scenarios

### Scenario A: Perfect Match (No Deviations)
1. Upload `PYSPARK_Q1_INVOICES_2024.csv` (PySpark)
2. Upload `SAS_Q1_INVOICES_2024.csv` (SAS)
3. Run Validation → All 10 records match perfectly ✓
4. Confirm UAT → Status = "uat_done"

### Scenario B: Minor Deviations (Loose Match)
1. Upload `PYSPARK_Q1_PAYROLL_2024.csv` (PySpark)
2. Upload `SAS_Q1_PAYROLL_2024.csv` (SAS)
3. Run Validation
4. In comparison mode "loose": Shows ~99% match
5. Detailed deviations show row 3 overtime discrepancy
6. Decide Approve or Reject

### Scenario C: Test Different File Types
- Try `.json` format: `PYSPARK_PAYROLL_SAMPLE.json`
- Try `.xlsx` format: Create one from CSV in Excel
- Try `.parquet` format: Requires pyarrow on backend

---

## 💡 Key Points

✅ **File List** must have these columns (case-insensitive):
- Department
- File Name  
- File Path
- Owner
- Ready for UAT
- Where to Save?

✅ **Data Files** (PySpark/SAS outputs) should have:
- CSV, JSON, or Parquet format
- UTF-8 encoding
- First row as headers
- Consistent data types per column

✅ **Status Flow:**
```
not_started 
   ↓ (dev uploads PySpark + marks ready)
pyspark_uploaded → uat_ready 
   ↓ (business user starts UAT)
uat_in_progress 
   ↓ (business user uploads SAS)
sas_uploaded 
   ↓ (business user runs validation)
compared 
   ↓ (review metrics)
├─ uat_done (approved) → move to production → DELETED
└─ issue_reported (rejected) → cycle back or resolve
```

✅ **Move to Production:**
- Only "uat_done" files can be selected
- Clicking button removes them from the list
- In production, files are tracked elsewhere (database)

---

## 🆘 Troubleshooting

**File upload fails with "File type not supported"**
- Check extension: must be .csv, .parquet, .json, .xlsx, .xls
- Verify file is under 100 MB

**Checkbox not appearing**
- Make sure you're in Developer view
- Status must be "uat_done" for checkbox to be enabled

**Comparison shows 0% match**
- Column headers must be **exact match** (case-sensitive)
- Check if data types are consistent

**Backend API not responding**
- Verify backend is running: `http://localhost:8000/api/health`
- Check browser console for CORS errors
- Restart both servers if needed

---

**Ready to test?** Start with Step 1! 🎯
