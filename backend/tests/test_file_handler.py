"""
Tests for file handler service.
"""
import pytest
import os
from io import BytesIO
from services.file_handler import FileHandler


class TestFileHandler:
    """Test suite for FileHandler service."""
    
    def test_allowed_file_valid(self):
        """Test allowed_file with valid extensions."""
        assert FileHandler.allowed_file('data.xlsx')
        assert FileHandler.allowed_file('data.csv')
        assert FileHandler.allowed_file('data.xls')
    
    def test_allowed_file_invalid(self):
        """Test allowed_file with invalid extensions."""
        assert not FileHandler.allowed_file('data.txt')
        assert not FileHandler.allowed_file('data.pdf')
        assert not FileHandler.allowed_file('data')
    
    def test_validate_file_no_file(self):
        """Test validate_file with no file."""
        is_valid, error = FileHandler.validate_file(None)
        assert not is_valid
        assert 'No file provided' in error
    
    def test_validate_file_invalid_type(self):
        """Test validate_file with invalid file type."""
        file_obj = BytesIO(b'test')
        file_obj.filename = 'test.txt'
        is_valid, error = FileHandler.validate_file(file_obj)
        assert not is_valid
        assert 'File type not allowed' in error
    
    def test_generate_file_hash(self):
        """Test file hash generation."""
        content = b'test data'
        file_obj = BytesIO(content)
        file_obj.filename = 'test.csv'
        
        hash1 = FileHandler.generate_file_hash(file_obj)
        hash2 = FileHandler.generate_file_hash(file_obj)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length
