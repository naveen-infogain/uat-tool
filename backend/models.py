"""
Database models for UAT Tool.
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Float, JSON, Enum
from datetime import datetime
import enum
from db import Base


class FileStatus(str, enum.Enum):
    """File status enum."""
    not_started = "not_started"
    pyspark_uploaded = "pyspark_uploaded"
    uat_ready = "uat_ready"
    uat_in_progress = "uat_in_progress"
    sas_uploaded = "sas_uploaded"
    compared = "compared"
    uat_done = "uat_done"
    issue_reported = "issue_reported"
    not_applicable = "not_applicable"
    production = "production"


class UploadedFile(Base):
    """Stores metadata for uploaded files."""
    __tablename__ = "uploaded_files"

    id = Column(String(36), primary_key=True)  # UUID
    file_hash = Column(String(64), unique=True, index=True)
    original_filename = Column(String(255), nullable=False)
    saved_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(10), nullable=False)  # csv, json, parquet, etc
    upload_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_type = Column(String(20), nullable=False)  # developer or client
    file_metadata = Column(JSON, nullable=True)  # Additional info like sql_query


class WorkflowFile(Base):
    """Represents a file in the UAT workflow."""
    __tablename__ = "workflow_files"

    id = Column(Integer, primary_key=True)
    department = Column(String(100), nullable=False)
    file_name = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500))
    owner = Column(String(255))
    ready_for_uat = Column(Integer, default=0)  # 0=No, 1=Yes
    save_path = Column(String(500))
    status = Column(String(30), default="not_started")
    
    # References to uploaded files
    pyspark_upload_id = Column(String(36), nullable=True)  # FK to UploadedFile
    sas_upload_id = Column(String(36), nullable=True)      # FK to UploadedFile
    
    issue_comment = Column(Text, nullable=True)
    comparison_id = Column(String(36), nullable=True)  # FK to Comparison
    extras = Column(JSON, nullable=True)  # pysparkFile, sasFile, comparisonResult etc.

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Comparison(Base):
    """Stores comparison results."""
    __tablename__ = "comparisons"

    id = Column(String(36), primary_key=True)  # UUID
    workflow_file_id = Column(Integer, nullable=False)
    pyspark_upload_id = Column(String(36), nullable=False)
    sas_upload_id = Column(String(36), nullable=False)
    mode = Column(String(20), default="loose")  # exact, loose, structural
    
    # Comparison results (stored as JSON)
    headers_diff = Column(JSON, nullable=True)
    rows_diff = Column(JSON, nullable=True)
    statistics = Column(JSON, nullable=True)
    quality_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class Issue(Base):
    """Stores issue reports."""
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True)  # UUID
    workflow_file_id = Column(Integer, nullable=False, index=True)
    comparison_id = Column(String(36), nullable=True)
    comment = Column(Text, nullable=False)
    reported_by = Column(String(255))  # email or user_id
    status = Column(String(20), default="open")  # open, resolved, wontfix
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
