# Sample Data for UAT Tool Testing

This directory contains sample data files for testing the UAT Data Comparison Tool.

## Files

### 1. **FILE_LIST_TEMPLATE.csv**
Pre-requisites file list template that developers can upload to seed the file workflow.

**Format:**
- Department: Business unit
- File Name: Name of the file to be validated
- File Path: Source path
- Owner: Email or username of file owner
- Ready for UAT: Yes/No flag
- Where to Save?: Destination path in production

**How to Use:**
1. Download this file
2. Edit to add your files
3. Upload via "Upload File List" button in developer view
4. Files will be prepended to the workflow list

---

### 2. **PYSPARK_Q1_PAYROLL_2024.csv** & **SAS_Q1_PAYROLL_2024.csv**
Payroll data sample files for testing the comparison workflow.

**Note:** These files have intentional differences:
- Row 1 (EMP001): `gross_pay` differs slightly (5247.83 vs 5247.38) - _loose match will pass_
- Row 3 (EMP003): `overtime_pay` differs (600 vs 650) - _will show as deviation_
- Row 5 (EMP005): `gross_pay` differs (6200.75 vs 6202.75), `tax_withheld` differs slightly - _loose match may pass_

**How to Use:**
1. Developer: Uploads `PYSPARK_Q1_PAYROLL_2024.csv` as PySpark Output
2. Mark as UAT Ready
3. Business User: Starts UAT
4. Business User: Uploads `SAS_Q1_PAYROLL_2024.csv` as SAS Output
5. Click "Run Validation"
6. Review Metrics shows deviations

**Comparison Modes:**
- **exact**: Will show all 4 deviations
- **loose** (recommended): Will ignore minor numeric differences (< 0.01), showing meaningful differences only
- **structural**: Ignores empty cells

---

### 3. **PYSPARK_Q1_INVOICES_2024.csv** & **SAS_Q1_INVOICES_2024.csv**
Invoice/accounting data for testing with categorical data.

**Note:** These files are **identical** (perfect match scenario for testing approval flow)

**How to Use:** Same workflow as payroll - test the "All records match perfectly!" scenario

---

### 4. **PYSPARK_PAYROLL_SAMPLE.json** 
JSON format sample of payroll data (first 3 rows).

**How to Use:** Upload as PySpark Output to test JSON file type support

---

## Testing Scenarios

### Scenario 1: Successful UAT (Perfect Match)
1. Use payroll CSVs
2. Select "loose" comparison mode
3. Review should show most records match
4. Click "Confirm UAT & Mark Done"
5. Files move to Production status

### Scenario 2: With Deviations
1. Use invoices CSVs (identical records)
2. Try exact mode - should match perfectly
3. Then use payroll CSVs with loose mode to see actual deviations
4. Review deviations and decide Approve/Reject

### Scenario 3: Issue Report
1. During Review Metrics step
2. Click "Report Issue"
3. Add comment: "Overtime pay discrepancy detected - needs investigation"
4. Status changes to "Issue Reported"
5. Backend sends email to developer

### Scenario 4: Move to Production
1. Complete multiple UAT workflows
2. Mark files as "uat_done"
3. Developer checks multiple checkboxes
4. Click "Move to Production" button
5. Files disappear from list (moved to production)

---

## File Specifications

### CSV Format
- UTF-8 encoding
- Comma-separated values
- First row = headers
- All numeric values as decimals with periods (1234.56)
- Dates in YYYY-MM-DD format
- Max file size: 100 MB

### JSON Format
- UTF-8 encoding
- Array of objects or objects
- Max file size: 100 MB

### Parquet Format
- Binary columnar storage
- Run `pip install pyarrow` on backend if needed
- Max file size: 100 MB

---

## Column Definitions

### Payroll Data
- `employee_id`: Unique identifier (EMP001, EMP002, etc)
- `employee_name`: Full name
- `department`: Business unit
- `gross_pay`: Total salary before deductions
- `tax_withheld`: Income tax withheld
- `net_pay`: Take-home pay after deductions
- `overtime_pay`: Extra pay for hours beyond 40/week
- `bonus`: Performance/annual bonus
- `fica_rate`: Social security rate (6.2% for employees)
- `status`: Active/Inactive/Terminated

### Invoice Data
- `invoice_id`: Unique identifier (INV00001, etc)
- `vendor_name`: Supplier name
- `amount`: Invoice amount in USD
- `invoice_date`: When invoice was received
- `due_date`: Payment due date
- `status`: Paid/Pending/Overdue
- `department`: Which department received goods/services

---

## Modifying Sample Data

To create your own test scenarios:

1. **Clone a CSV file**: `cp PYSPARK_Q1_PAYROLL_2024.csv YOUR_FILE.csv`
2. **Edit in Excel/Google Sheets**: Open as CSV, make changes
3. **Create differences**:
   - Change a numeric value slightly (will be caught in exact mode, not loose mode)
   - Add/remove rows
   - Change column names
4. **Upload and test**

### Common Variations to Test
- Add more rows: Copy-paste existing rows, change IDs/names
- Add more columns: Add new column headers and data
- Change numeric precision: Use different decimal places
- Add empty rows: Leave some rows completely blank
- Different case: Change "Finance" to "finance" or "FINANCE"
- Extra whitespace: Add spaces around values

---

## Tips for Testing

✅ **Do's**
- Use loose comparison mode for realistic scenarios (accounts for rounding errors)
- Test with CSV first (most common format)
- Try both matching and non-matching file pairs
- Test with files of different sizes (10 rows, 100 rows, 1000 rows)

❌ **Don'ts**
- Don't modify column headers (causes structure mismatch)
- Don't mix data types (number vs text in same column)
- Don't create files > 100 MB (upload limit)
- Don't use non-ASCII characters (may cause encoding issues)

---

**Last Updated:** April 10, 2026  
**Sample Data Version:** 1.0
