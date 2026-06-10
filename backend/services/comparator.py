"""
Data comparison service for deep diff analysis of PySpark vs SAS output.

Scoring philosophy (UAT):
  - Two rows are *paired* (aligned) when they clearly represent the same record.
  - A paired row only counts as a MATCH when it is identical on every shared column.
  - ANY real cell difference, incompatible column type, or extra/missing column
    is a deviation that lowers Match Rate AND Quality Score and is surfaced.

Tolerances (configurable via the class constants below):
  - integer vs float is NOT a type mismatch (same numeric family).
  - numeric values that differ only in the decimal portion (same whole-number
    part, e.g. 5247.83 vs 5247.38) are treated as a match.

File 1 = PySpark output, File 2 = SAS output.
"""


class DataComparator:
    """Compare two datasets with multiple comparison modes."""

    COMPARISON_MODES = {
        'exact': 'Exact match (case-sensitive, format-sensitive)',
        'loose': 'Loose match (case-insensitive, decimal tolerance)',
        'structural': 'Structural match (ignore empty rows/cols)'
    }

    # Minimum similarity for two rows to be treated as "the same record"
    # (alignment only; a paired row with any real difference is still a deviation).
    PAIR_THRESHOLD = 0.6

    # Types that are considered the same family for schema comparison.
    NUMERIC_TYPES = {'integer', 'float'}

    # When True (loose/structural modes), two numbers match if their whole-number
    # parts are equal — i.e. a difference only in the decimal portion passes.
    # Set to False to require exact numeric equality, or change _numbers_match
    # to use an absolute tolerance instead (see comment in that method).
    IGNORE_DECIMAL_DIFFERENCES = True

    def __init__(self, data1, data2, mode='exact'):
        self.data1 = data1
        self.data2 = data2
        self.mode = mode
        self.dtypes1 = (data1.get('dtypes') or {})
        self.dtypes2 = (data2.get('dtypes') or {})
        self.comparison_result = None

    # ── header helpers ────────────────────────────────────────────────────────
    def _shared_headers(self):
        headers1 = self.data1.get('headers', [])
        headers2 = set(self.data2.get('headers', []))
        return [h for h in headers1 if h in headers2]

    def _all_headers(self):
        headers = list(self.data1.get('headers', []))
        for h in self.data2.get('headers', []):
            if h not in headers:
                headers.append(h)
        return headers

    def _type_category(self, t):
        """Collapse integer/float into one 'numeric' category."""
        if t in self.NUMERIC_TYPES:
            return 'numeric'
        return t

    @staticmethod
    def _clean_row(row):
        """Make a row dict safe to store as JSON (stringify values)."""
        return {k: ('' if v == '' else str(v)) for k, v in row.items()}

    # ── public entry point ─────────────────────────────────────────────────────
    def compare(self):
        header_diff = self._compare_headers()
        row_diff = self._compare_rows()
        stats = self._calculate_statistics(header_diff, row_diff)
        self.comparison_result = {
            'mode': self.mode,
            'headers': header_diff,
            'rows': row_diff,
            'statistics': stats,
            'quality_score': self._calculate_quality_score(stats),
        }
        return self.comparison_result

    # ── column comparison ───────────────────────────────────────────────────────
    def _compare_headers(self):
        headers1 = self.data1.get('headers', [])
        headers2 = self.data2.get('headers', [])
        shared = self._shared_headers()
        union = self._all_headers()

        missing_in_file2 = [h for h in headers1 if h not in headers2]  # PySpark only
        extra_in_file2 = [h for h in headers2 if h not in headers1]    # SAS only

        column_deviations = []
        for h in missing_in_file2:
            column_deviations.append({
                'column': h, 'type': 'missing_in_sas',
                'pyspark': self.dtypes1.get(h, 'present'), 'sas': '—',
                'detail': 'Column exists in PySpark output but not in SAS output',
            })
        for h in extra_in_file2:
            column_deviations.append({
                'column': h, 'type': 'extra_in_sas',
                'pyspark': '—', 'sas': self.dtypes2.get(h, 'present'),
                'detail': 'Column exists in SAS output but not in PySpark output',
            })

        # Only flag a datatype mismatch when the families are incompatible.
        # integer vs float -> same 'numeric' family -> NOT a mismatch.
        # string vs integer/float -> mismatch (reported).
        dtype_mismatches = []
        for h in shared:
            t1 = self.dtypes1.get(h)
            t2 = self.dtypes2.get(h)
            if t1 and t2 and self._type_category(t1) != self._type_category(t2):
                dtype_mismatches.append(h)
                column_deviations.append({
                    'column': h, 'type': 'dtype_mismatch',
                    'pyspark': t1, 'sas': t2,
                    'detail': f'Incompatible datatypes: PySpark={t1}, SAS={t2}',
                })

        return {
            'file1_headers': headers1,
            'file2_headers': headers2,
            'shared_headers': shared,
            'matched_count': len(shared),
            'missing_in_file2': missing_in_file2,
            'extra_in_file2': extra_in_file2,
            'dtype_mismatches': dtype_mismatches,
            'column_deviations': column_deviations,
            'total_columns': len(union),
        }

    # ── row comparison ──────────────────────────────────────────────────────────
    def _compare_rows(self):
        rows1 = self.data1.get('data', [])
        rows2 = self.data2.get('data', [])

        matched_rows = []
        unmatched_rows_file1 = []
        unmatched_rows_file2 = []
        matched_indices_file2 = set()

        for i, row1 in enumerate(rows1):
            best_match_idx = None
            best_similarity = 0.0
            for j, row2 in enumerate(rows2):
                if j in matched_indices_file2:
                    continue
                similarity = self._calculate_row_similarity(row1, row2)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_idx = j

            if best_match_idx is not None and best_similarity >= self.PAIR_THRESHOLD:
                matched_indices_file2.add(best_match_idx)
                differences = self._get_cell_differences(row1, rows2[best_match_idx])
                matched_rows.append({
                    'file1_row': i,
                    'file2_row': best_match_idx,
                    'similarity': round(best_similarity, 2),
                    'is_identical': len(differences) == 0,
                    'differences': differences,
                })
            else:
                unmatched_rows_file1.append({'row_index': i, 'data': self._clean_row(row1)})

        for j, row2 in enumerate(rows2):
            if j not in matched_indices_file2:
                unmatched_rows_file2.append({'row_index': j, 'data': self._clean_row(row2)})

        return {
            'matched_rows': matched_rows,
            'unmatched_in_file1': unmatched_rows_file1,
            'unmatched_in_file2': unmatched_rows_file2,
            'total_rows_file1': len(rows1),
            'total_rows_file2': len(rows2),
        }

    def _calculate_row_similarity(self, row1, row2):
        headers = self._shared_headers() or self._all_headers()
        if not headers:
            return 0.0
        matching = sum(1 for h in headers if self._cells_match(row1.get(h, ''), row2.get(h, '')))
        return matching / len(headers)

    def _get_cell_differences(self, row1, row2):
        """Cell-level differences on SHARED columns only, using the active rules."""
        differences = []
        for key in self._shared_headers():
            v1 = row1.get(key, '')
            v2 = row2.get(key, '')
            if not self._cells_match(v1, v2):
                differences.append({
                    'column': key,
                    'file1_value': str(v1),
                    'file2_value': str(v2),
                })
        return differences

    # ── matching rules (shared by similarity + differences) ──────────────────────
    def _cells_match(self, v1, v2):
        if self.mode == 'exact':
            return self._exact_match(v1, v2)
        if self.mode == 'loose':
            return self._loose_match(v1, v2)
        return self._structural_match(v1, v2)

    def _numbers_match(self, val1, val2):
        """
        Returns True/False if both values are numeric, else None.
        Whole-number comparison: 5247.83 and 5247.38 match (both 5247).
        To use an absolute tolerance instead, replace the body with:
            return abs(f1 - f2) <= 0.01
        """
        try:
            f1 = float(val1)
            f2 = float(val2)
        except (ValueError, TypeError):
            return None
        if self.IGNORE_DECIMAL_DIFFERENCES:
            return int(f1) == int(f2)
        return abs(f1 - f2) < 1e-9

    def _exact_match(self, val1, val2):
        """Exact, but treat 100 and 100.0 as equal numerically."""
        if val1 == val2:
            return True
        try:
            return float(val1) == float(val2)
        except (ValueError, TypeError):
            return str(val1) == str(val2)

    def _loose_match(self, val1, val2):
        """Case-insensitive strings; whole-number tolerance for numbers."""
        num = self._numbers_match(val1, val2)
        if num is not None:
            return num
        return str(val1).strip().lower() == str(val2).strip().lower()

    def _structural_match(self, val1, val2):
        """Ignore surrounding whitespace; tolerate decimal-only numeric diffs."""
        num = self._numbers_match(val1, val2)
        if num is not None:
            return num
        s1, s2 = str(val1).strip(), str(val2).strip()
        if s1 == '' and s2 == '':
            return True
        return s1 == s2

    # ── statistics ────────────────────────────────────────────────────────────────
    def _calculate_statistics(self, header_diff, row_diff):
        total_rows = max(row_diff['total_rows_file1'], row_diff['total_rows_file2'])
        paired_rows = len(row_diff['matched_rows'])
        identical_rows = sum(1 for r in row_diff['matched_rows'] if r.get('is_identical'))
        rows_with_differences = paired_rows - identical_rows

        total_columns = max(header_diff['total_columns'], 1)
        matched_columns = header_diff['matched_count']
        dtype_mismatch_count = len(header_diff.get('dtype_mismatches', []))
        clean_columns = max(matched_columns - dtype_mismatch_count, 0)

        return {
            'total_rows_compared': total_rows,
            'matched_rows': identical_rows,
            'paired_rows': paired_rows,
            'rows_with_differences': rows_with_differences,
            'unmatched_file1': len(row_diff['unmatched_in_file1']),
            'unmatched_file2': len(row_diff['unmatched_in_file2']),
            'match_percentage': round((identical_rows / total_rows * 100) if total_rows else 0, 2),
            'total_columns': header_diff['total_columns'],
            'matched_columns': matched_columns,
            'clean_columns': clean_columns,
            'comparable_columns': matched_columns,
            'dtype_mismatches': dtype_mismatch_count,
            'missing_columns': len(header_diff.get('missing_in_file2', [])),
            'extra_columns': len(header_diff.get('extra_in_file2', [])),
            'column_match_percentage': round((matched_columns / total_columns * 100), 2),
            'row_match_basis': matched_columns,
        }

    def _calculate_quality_score(self, stats):
        total_rows = stats['total_rows_compared'] or 1
        total_columns = stats['total_columns'] or 1
        row_quality = stats['matched_rows'] / total_rows
        schema_quality = stats['clean_columns'] / total_columns
        return round((row_quality * 0.7 + schema_quality * 0.3) * 100, 2)