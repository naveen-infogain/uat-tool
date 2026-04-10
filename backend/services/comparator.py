"""
Data comparison service for deep diff analysis of Excel data.
"""
from difflib import SequenceMatcher
import json


class DataComparator:
    """Compare two datasets with multiple comparison modes."""
    
    COMPARISON_MODES = {
        'exact': 'Exact match (case-sensitive, format-sensitive)',
        'loose': 'Loose match (case-insensitive, number tolerance)',
        'structural': 'Structural match (ignore empty rows/cols)'
    }
    
    def __init__(self, data1, data2, mode='exact'):
        """
        Initialize comparator.
        
        Args:
            data1: First dataset dict with 'headers', 'rows', 'data'
            data2: Second dataset dict with 'headers', 'rows', 'data'
            mode: Comparison mode ('exact', 'loose', 'structural')
        """
        self.data1 = data1
        self.data2 = data2
        self.mode = mode
        self.comparison_result = None
    
    def compare(self):
        """Execute comparison and return detailed results."""
        
        # Compare headers
        header_diff = self._compare_headers()
        
        # Compare rows
        row_diff = self._compare_rows()
        
        # Calculate statistics
        stats = self._calculate_statistics(header_diff, row_diff)
        
        self.comparison_result = {
            'mode': self.mode,
            'headers': header_diff,
            'rows': row_diff,
            'statistics': stats,
            'quality_score': self._calculate_quality_score(stats)
        }
        
        return self.comparison_result
    
    def _compare_headers(self):
        """Compare column headers."""
        headers1 = self.data1.get('headers', [])
        headers2 = self.data2.get('headers', [])
        
        return {
            'file1_headers': headers1,
            'file2_headers': headers2,
            'matched_count': sum(1 for h1 in headers1 if h1 in headers2),
            'missing_in_file2': [h for h in headers1 if h not in headers2],
            'extra_in_file2': [h for h in headers2 if h not in headers1],
            'total_columns': max(len(headers1), len(headers2))
        }
    
    def _compare_rows(self):
        """Compare data rows."""
        rows1 = self.data1.get('data', [])
        rows2 = self.data2.get('data', [])
        
        matched_rows = []
        unmatched_rows_file1 = []
        unmatched_rows_file2 = []
        
        # Track matched indices
        matched_indices_file2 = set()
        
        for i, row1 in enumerate(rows1):
            best_match_idx = None
            best_similarity = 0
            
            for j, row2 in enumerate(rows2):
                if j in matched_indices_file2:
                    continue
                
                similarity = self._calculate_row_similarity(row1, row2)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_idx = j
            
            if best_match_idx is not None and best_similarity > 0.8:  # 80% threshold
                matched_indices_file2.add(best_match_idx)
                matched_rows.append({
                    'file1_row': i,
                    'file2_row': best_match_idx,
                    'similarity': round(best_similarity, 2),
                    'differences': self._get_cell_differences(row1, rows2[best_match_idx])
                })
            else:
                unmatched_rows_file1.append({'row_index': i, 'data': row1})
        
        # Remaining unmatched rows from file2
        for j, row2 in enumerate(rows2):
            if j not in matched_indices_file2:
                unmatched_rows_file2.append({'row_index': j, 'data': row2})
        
        return {
            'matched_rows': matched_rows,
            'unmatched_in_file1': unmatched_rows_file1,
            'unmatched_in_file2': unmatched_rows_file2,
            'total_rows_file1': len(rows1),
            'total_rows_file2': len(rows2)
        }
    
    def _calculate_row_similarity(self, row1, row2):
        """Calculate similarity between two rows."""
        if self.mode == 'exact':
            matching_cells = sum(1 for v1, v2 in zip(row1.values(), row2.values()) if v1 == v2)
        elif self.mode == 'loose':
            matching_cells = sum(1 for v1, v2 in zip(row1.values(), row2.values()) 
                                if self._loose_match(v1, v2))
        else:  # structural
            matching_cells = sum(1 for v1, v2 in zip(row1.values(), row2.values()) 
                                if self._structural_match(v1, v2))
        
        total_cells = max(len(row1), len(row2))
        return matching_cells / total_cells if total_cells > 0 else 0
    
    def _get_cell_differences(self, row1, row2):
        """Identify cell-level differences between rows."""
        differences = []
        
        for key in row1:
            v1 = row1.get(key, '')
            v2 = row2.get(key, '')
            
            if v1 != v2:
                differences.append({
                    'column': key,
                    'file1_value': str(v1),
                    'file2_value': str(v2)
                })
        
        return differences
    
    def _loose_match(self, val1, val2):
        """Loose matching: case-insensitive, number tolerance."""
        try:
            v1_str = str(val1).strip().lower()
            v2_str = str(val2).strip().lower()
            
            if v1_str == v2_str:
                return True
            
            # Try numeric comparison
            v1_num = float(val1)
            v2_num = float(val2)
            return abs(v1_num - v2_num) < 0.01  # 0.01 tolerance
        except:
            return False
    
    def _structural_match(self, val1, val2):
        """Structural matching: ignore empty cells."""
        if str(val1).strip() == '' and str(val2).strip() == '':
            return True
        return str(val1).strip() == str(val2).strip()
    
    def _calculate_statistics(self, header_diff, row_diff):
        """Calculate comparison statistics."""
        total_rows = max(row_diff['total_rows_file1'], row_diff['total_rows_file2'])
        matched_rows = len(row_diff['matched_rows'])
        
        return {
            'total_rows_compared': total_rows,
            'matched_rows': matched_rows,
            'unmatched_file1': len(row_diff['unmatched_in_file1']),
            'unmatched_file2': len(row_diff['unmatched_in_file2']),
            'match_percentage': round((matched_rows / total_rows * 100) if total_rows > 0 else 0, 2),
            'total_columns': header_diff['total_columns'],
            'matched_columns': header_diff['matched_count'],
            'column_match_percentage': round((header_diff['matched_count'] / max(header_diff['total_columns'], 1) * 100), 2)
        }
    
    def _calculate_quality_score(self, stats):
        """Calculate overall data quality score (0-100)."""
        row_score = stats['match_percentage']
        col_score = stats['column_match_percentage']
        
        return round((row_score * 0.7 + col_score * 0.3), 2)
