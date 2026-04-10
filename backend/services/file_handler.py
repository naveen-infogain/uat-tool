"""
File handling service for Excel and CSV file uploads.
"""
import os
import hashlib
import io
from datetime import datetime
from pathlib import Path
import pandas as pd


class FileHandler:
    """Handle file uploads, validation, and parsing."""

    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}

    @staticmethod
    def process(file_bytes: bytes, filename: str, upload_folder: str):
        """
        Save raw bytes to disk, parse into structured data.

        Returns:
            tuple: (file_info dict, parsed_data dict)
        """
        ext = (filename or "").rsplit(".", 1)[-1].lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = Path(filename).name  # strip any path traversal
        unique_filename = f"{timestamp}_{safe_name}"

        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        file_hash = hashlib.sha256(file_bytes).hexdigest()

        file_info = {
            "original_filename": safe_name,
            "saved_filename": unique_filename,
            "file_path": file_path,
            "file_hash": file_hash,
            "file_size": len(file_bytes),
            "uploaded_at": timestamp,
        }

        parsed_data = FileHandler.parse_file(file_path, ext)
        return file_info, parsed_data

    @staticmethod
    def parse_file(file_path: str, ext: str = None):
        """
        Parse file into structured data.

        Returns:
            dict with headers, rows, row_count, column_count, data
        """
        if ext is None:
            ext = file_path.rsplit(".", 1)[-1].lower()

        try:
            if ext == "csv":
                df = pd.read_csv(file_path)
            elif ext in ("xlsx", "xls"):
                df = pd.read_excel(file_path)
            elif ext == "parquet":
                df = pd.read_parquet(file_path)
            elif ext == "json":
                df = pd.read_json(file_path)
            elif ext == "sas7bdat":
                df = pd.read_sas(file_path)
            else:
                raise ValueError(f"Unsupported file format: {ext}")

            df = df.fillna("")
            df = df.map(lambda x: str(x).strip() if isinstance(x, str) else x)

            return {
                "headers": df.columns.tolist(),
                "rows": df.values.tolist(),
                "row_count": len(df),
                "column_count": len(df.columns),
                "data": df.to_dict("records"),
            }

        except Exception as e:
            raise ValueError(f"Error parsing file: {str(e)}")

    @staticmethod
    def cleanup_file(file_path: str):
        """Remove uploaded file from disk."""
        if os.path.exists(file_path):
            os.remove(file_path)

