# models.py file 
"""
Database models for UAT Tool.
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Float, JSON, Enum
from datetime import datetime
import enum
from db import Base


class User(Base):
    """A login account for the UAT tool."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)  # developer, business_user, admin
    is_active = Column(Integer, default=1)  # 0=No, 1=Yes
    created_at = Column(DateTime, default=datetime.utcnow)


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
    descoped = "descoped"
    production = "production"


class UploadedFile(Base):
    """Stores metadata for uploaded files."""
    __tablename__ = "uploaded_files"

    id = Column(String(36), primary_key=True)  # UUID
    # NOT unique anymore: the same bytes can exist once as a PySpark (developer)
    # upload and once as a SAS (client) upload. Dedup is handled in the route,
    # scoped by user_type.
    file_hash = Column(String(64), index=True)
    original_filename = Column(String(255), nullable=False)
    saved_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)   # relative {BU}/{type}/{filepath}/file
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(10), nullable=False)    # csv, json, parquet, etc
    upload_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_type = Column(String(20), nullable=False)    # developer or client

    # ---- metadata broken out into real columns (visible directly in pgAdmin) ----
    bu = Column(String(100), nullable=True)
    upload_type = Column(String(20), nullable=True)          # pyspark / sas
    save_path = Column(String(500), nullable=True)           # the {BU}/{type}/{filepath} folder
    disk_path = Column(String(700), nullable=True)           # absolute path on disk
    workflow_file_name = Column(String(255), nullable=True)
    workflow_file_path = Column(String(500), nullable=True)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    sql_query = Column(Text, nullable=True)
    headers = Column(JSON, nullable=True)                    # list of column names
    data = Column(JSON, nullable=True)                       # the ACTUAL file rows (list of dicts)

    # kept for backward compatibility / anything extra
    file_metadata = Column(JSON, nullable=True)


class WorkflowFile(Base):
    """Represents a file in the UAT workflow."""
    __tablename__ = "workflow_files"

    id = Column(Integer, primary_key=True)
    bu_name = Column(String(100), nullable=True, index=True)  # BU Name from excel
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

    # Who most recently uploaded the GCP/SAS output — set server-side from the
    # authenticated user, not client-supplied (see routes/workflow.py).
    developer_email = Column(String(255), nullable=True)
    business_user_email = Column(String(255), nullable=True)

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