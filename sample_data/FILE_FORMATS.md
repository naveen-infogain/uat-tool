# Supported File Formats & Examples

## CSV Format (Recommended)

**Extension:** `.csv`  
**Encoding:** UTF-8  
**Max Size:** 100 MB  

### Example
```csv
employee_id,name,salary,status
EMP001,John Smith,85000,Active
EMP002,Sarah Johnson,95000,Active
EMP003,Mike Brown,65000,Inactive
```

**Best For:** Payroll, invoices, accounting data  
**Pro:** Universal compatibility, human-readable, easy to edit  

---

## JSON Format

**Extension:** `.json`  
**Encoding:** UTF-8  
**Max Size:** 100 MB  

### Example (Array of Objects)
```json
[
  {
    "employee_id": "EMP001",
    "name": "John Smith",
    "salary": 85000,
    "status": "Active"
  },
  {
    "employee_id": "EMP002",
    "name": "Sarah Johnson",
    "salary": 95000,
    "status": "Active"
  }
]
```

### Example (Single Object)
```json
{
  "employees": [
    {"id": "E001", "name": "John", "salary": 85000},
    {"id": "E002", "name": "Sarah", "salary": 95000}
  ]
}
```

**Best For:** API outputs, nested data  
**Pro:** Supports nested structures, widely used  
**Note:** Nested objects are flattened by backend

---

## Excel Format

**Extension:** `.xlsx` (preferred) or `.xls`  
**Max Size:** 100 MB  
**What We Read:** First sheet, first row = headers  

### How to Create
1. Open Excel
2. Put headers in row 1 (department, file_name, etc.)
3. Put data starting in row 2
4. Save as `.xlsx` (File → Save As → Format: Excel Workbook)
5. Upload to the tool

**Best For:** Pre-requisite file lists, when non-technical users prepare data  
**Pro:** User-friendly, preserves formatting  

---

## Parquet Format

**Extension:** `.parquet`  
**Encoding:** Binary columnar format  
**Max Size:** 100 MB  

### How to Create (Python)
```python
import pandas as pd

df = pd.read_csv('payroll_data.csv')
df.to_parquet('payroll_data.parquet')
```

**Best For:** Large datasets (1M+ rows), performance-critical  
**Pro:** Highly compressed, fast read  
**Con:** Requires special tools to view

---

## SAS7BDAT Format

**Extension:** `.sas7bdat`  
**Encoding:** Binary SAS format  
**Max Size:** 100 MB  

### How It's Used
1. SAS generates native `.sas7bdat` files
2. Upload directly to the tool
3. Backend converts to pandas DataFrame
4. Compared with PySpark CSV/JSON output

**Best For:** Direct SAS output without conversion  
**Note:** Must have `pyarrow` or `sas7bdat` library on backend

---

## Format Comparison Matrix

| Format | File Size | Read Speed | Human Readable | Compression | Best Use |
|--------|-----------|-----------|---|---|---|
| CSV | Medium | Fast | ✅ Yes | None | General data |
| JSON | Medium | Fast | ✅ Yes | Minimal | API outputs |
| Excel | Medium | Slower | ✅ Yes (visual) | Yes | Business users |
| Parquet | Small | Very Fast | ❌ No | High | Big data |
| SAS7BDAT | Small | Medium | ❌ No | High | SAS native |

---

## Data Type Handling

### Numeric
```
Accepted: 123, 123.45, -123.45, 1.23e5, 0.001
Note: Backend uses loose matching (±0.01 tolerance)
```

### Text
```
Accepted: "John", "New York", "Active Status"
Case Sensitivity: Depends on comparison mode
  - exact: Case-sensitive
  - loose: Case-insensitive
  - structural: Case-insensitive
```

### Dates
```
Accepted Formats: 
  - 2024-01-15 (ISO)
  - 01/15/2024 (US)
  - 15/01/2024 (EU)
  - Jan 15, 2024
Note: Treated as text, requires exact match
```

### Booleans
```
Accepted: 1/0, true/false, yes/no, Y/N, Active/Inactive
Note: Converted to string for comparison
```

### Null/Empty
```
Accepted: NULL, null, N/A, NA, empty string, blank cell
Behavior: Ignored in structural mode, exact match in others
```

---

## Character Encoding

**Supported Encodings:**
- UTF-8 (recommended)
- ASCII
- ISO-8859-1 (Latin-1)
- Windows-1252

**How to Check Encoding (Windows):**
1. Open file in Notepad
2. File → Save As
3. Look at "Encoding" dropdown
4. Should be "UTF-8"

**How to Convert to UTF-8 (Python):**
```python
import pandas as pd
df = pd.read_csv('file.csv', encoding='iso-8859-1')
df.to_csv('file_utf8.csv', encoding='utf-8', index=False)
```

---

## Common Issues & Solutions

### ❌ Error: "File type not supported"
**Cause:** File extension not in allowed list  
**Solution:** Convert to CSV, JSON, Parquet, or Excel format  
**Allowed:** .csv, .parquet, .json, .xlsx, .xls, .sas7bdat

### ❌ Error: "No data found in file"
**Cause:** File is empty or headers not recognized  
**Solution:** 
- Ensure first row contains column names
- Check encoding (should be UTF-8)
- Verify file not corrupted

### ❌ Error: "0% match - column names don't match"
**Cause:** Column headers differ between files  
**Solution:**
- Ensure exact column name match (case-sensitive in exact mode)
- Rename columns to match (e.g., "EMPLOYEE_ID" → "employee_id")

### ❌ Error: "File too large"
**Cause:** File exceeds 100 MB limit  
**Solution:**
- Filter data to smaller subset
- Split into multiple files by date range or department
- Compress data by removing unnecessary columns

### ⚠️ Warning: "Unusual row length"
**Cause:** Some rows have different number of columns  
**Solution:**
- Check for extra commas in CSV
- Ensure all rows have same column count
- Use CSV validator tool: https://csvlint.io/

---

## File Validation Checklist

Before uploading, verify:

- [ ] File extension is supported (.csv, .json, .xlsx, .parquet, etc.)
- [ ] File size under 100 MB
- [ ] Encoding is UTF-8 (for text formats)
- [ ] First row contains headers
- [ ] All rows have same number of columns
- [ ] No special characters in column names (use letters, numbers, underscores)
- [ ] Numeric values use period as decimal separator (1234.56 not 1234,56)
- [ ] Dates in consistent format (YYYY-MM-DD recommended)
- [ ] No blank rows in middle of data
- [ ] No trailing/leading whitespace in column names

---

## Tools for Format Conversion

### Online Converters
- CSV ↔ JSON: https://www.convertcsv.com/
- Excel to CSV: Built-in (File → Save As → CSV)
- Parquet preview: https://github.com/ironspider/parquet-viewer

### Python (Recommended)
```python
import pandas as pd

# CSV to JSON
df = pd.read_csv('file.csv')
df.to_json('file.json', orient='records')

# JSON to CSV
df = pd.read_json('file.json')
df.to_csv('file.csv', index=False)

# Excel to CSV
df = pd.read_excel('file.xlsx')
df.to_csv('file.csv', index=False)

# CSV to Parquet
df = pd.read_csv('file.csv')
df.to_parquet('file.parquet')
```

---

**Last Updated:** April 10, 2026  
**Version:** 1.0
