"""
Configuration settings using pydantic-settings.
"""
import os
from typing import List


class Settings:
    upload_folder: str = os.getenv("UPLOAD_FOLDER", "/tmp/uat_uploads")
    max_file_size: int = 100 * 1024 * 1024  # 100 MB
    allowed_extensions: set = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}
    cors_origins: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    comparison_timeout: int = 600


settings = Settings()

