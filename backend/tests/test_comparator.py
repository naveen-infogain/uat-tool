"""
Tests for data comparator service.
"""
import pytest
from services.comparator import DataComparator


class TestDataComparator:
    """Test suite for DataComparator service."""
    
    @pytest.fixture
    def sample_data(self):
        """Provide sample datasets for testing."""
        data1 = {
            'headers': ['Name', 'Age', 'City'],
            'rows': [
                ['Alice', '30', 'NYC'],
                ['Bob', '25', 'LA']
            ],
            'data': [
                {'Name': 'Alice', 'Age': '30', 'City': 'NYC'},
                {'Name': 'Bob', 'Age': '25', 'City': 'LA'}
            ]
        }
        
        data2 = {
            'headers': ['Name', 'Age', 'City'],
            'rows': [
                ['Alice', '30', 'NYC'],
                ['Bob', '26', 'LA']  # Different age
            ],
            'data': [
                {'Name': 'Alice', 'Age': '30', 'City': 'NYC'},
                {'Name': 'Bob', 'Age': '26', 'City': 'LA'}
            ]
        }
        
        return data1, data2
    
    def test_comparator_initialization(self, sample_data):
        """Test comparator initialization."""
        data1, data2 = sample_data
        comp = DataComparator(data1, data2, mode='exact')
        
        assert comp.data1 == data1
        assert comp.data2 == data2
        assert comp.mode == 'exact'
    
    def test_compare_returns_result(self, sample_data):
        """Test compare method returns valid result."""
        data1, data2 = sample_data
        comp = DataComparator(data1, data2, mode='exact')
        result = comp.compare()
        
        assert result is not None
        assert 'headers' in result
        assert 'rows' in result
        assert 'statistics' in result
        assert 'quality_score' in result
    
    def test_quality_score_calculation(self, sample_data):
        """Test quality score is between 0 and 100."""
        data1, data2 = sample_data
        comp = DataComparator(data1, data2, mode='exact')
        result = comp.compare()
        
        score = result['quality_score']
        assert 0 <= score <= 100
    
    def test_header_comparison(self, sample_data):
        """Test header comparison."""
        data1, data2 = sample_data
        comp = DataComparator(data1, data2, mode='exact')
        result = comp.compare()
        
        header_diff = result['headers']
        assert header_diff['file1_headers'] == header_diff['file2_headers']
        assert header_diff['matched_count'] == 3
