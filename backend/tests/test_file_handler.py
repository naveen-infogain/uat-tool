"""
Tests for file handler service.
"""
import pytest
import os
import tempfile
import pandas as pd
from services.file_handler import FileHandler


class TestFileHandler:
    """Test suite for FileHandler service."""
    
    def test_allowed_extensions(self):
        """Test that ALLOWED_EXTENSIONS contains expected formats."""
        expected = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}
        assert FileHandler.ALLOWED_EXTENSIONS == expected
    
    def test_process_csv_file(self):
        """Test processing a CSV file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test CSV
            csv_content = b"name,age\nJohn,30\nSarah,25"
            
            file_info, parsed_data = FileHandler.process(
                csv_content,
                "test.csv",
                tmpdir
            )
            
            assert file_info['original_filename'] == 'test.csv'
            assert file_info['file_size'] == len(csv_content)
            assert len(file_info['file_hash']) == 64  # SHA256
            assert parsed_data['row_count'] == 2
            assert parsed_data['column_count'] == 2
            assert parsed_data['headers'] == ['name', 'age']
    
    def test_process_json_file(self):
        """Test processing a JSON file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            json_content = b'[{"id": 1, "name": "John"}, {"id": 2, "name": "Sarah"}]'
            
            file_info, parsed_data = FileHandler.process(
                json_content,
                "test.json",
                tmpdir
            )
            
            assert parsed_data['row_count'] == 2
            assert 'id' in parsed_data['headers']
            assert 'name' in parsed_data['headers']
    
    def test_process_invalid_file(self):
        """Test processing invalid data raises error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Invalid CSV - will cause parse error
            bad_content = b'\x80\x81\x82'  # Invalid UTF-8
            
            with pytest.raises(ValueError, match="Error parsing file"):
                FileHandler.process(bad_content, "bad.csv", tmpdir)
