"""
File handling service for Excel and CSV file uploads.
"""
import os
import hashlib
from datetime import datetime
from pathlib import Path
import pandas as pd


class FileHandler:
    """Handle file uploads, validation, and parsing."""

    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}

    @staticmethod
    def process(file_bytes: bytes, filename: str, upload_folder: str):
        """
        Save raw bytes to disk ONLY if file is new (hash not seen before).
        If duplicate hash found on disk, reuse existing file.

        Returns:
            tuple: (file_info dict, parsed_data dict)
        """
        ext = (filename or "").rsplit(".", 1)[-1].lower()
        safe_name = Path(filename).name
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        os.makedirs(upload_folder, exist_ok=True)

        # ✅ Check disk for existing file with same hash
        # (DB check already happens in upload.py — this prevents duplicate disk writes)
        existing_path = FileHandler._find_by_hash(upload_folder, file_hash)
        if existing_path:
            parsed_data = FileHandler.parse_file(existing_path, ext)
            file_info = {
                "original_filename": safe_name,
                "saved_filename": Path(existing_path).name,
                "file_path": existing_path,
                "file_hash": file_hash,
                "file_size": len(file_bytes),
                "uploaded_at": datetime.now().strftime("%Y%m%d_%H%M%S"),
            }
            return file_info, parsed_data

        # 🆕 New file — save to disk
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{safe_name}"
        file_path = os.path.join(upload_folder, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Save hash sidecar to enable disk-level duplicate detection
        with open(file_path + ".hash", "w") as f:
            f.write(file_hash)

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
    def _find_by_hash(upload_folder: str, file_hash: str):
        """
        Scan upload folder for .hash sidecar matching given hash.
        Returns file path if found, else None.
        """
        try:
            for fname in os.listdir(upload_folder):
                if not fname.endswith(".hash"):
                    continue
                hash_path = os.path.join(upload_folder, fname)
                with open(hash_path, "r") as f:
                    if f.read().strip() == file_hash:
                        original_path = hash_path.replace(".hash", "")
                        if os.path.exists(original_path):
                            return original_path
        except Exception:
            pass
        return None

    @staticmethod
    def parse_file(file_path: str, ext: str = None):
        """Parse file into structured data."""
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
        """Remove uploaded file and its hash sidecar from disk."""
        if os.path.exists(file_path):
            os.remove(file_path)
        hash_path = file_path + ".hash"
        if os.path.exists(hash_path):
            os.remove(hash_path)