"""
File handling service for Excel and CSV file uploads.
"""
import os
import re
import hashlib
from datetime import datetime
from pathlib import Path
import pandas as pd


class FileHandler:
    """Handle file uploads, validation, and parsing."""

    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}

    @staticmethod
    def build_subfolder(bu: str, workflow_file_path: str, upload_type: str = "") -> str:
        """
        Build a structured subfolder path: {BU}/{file_path_segments}
        Example: EU_Marketing/data/eu_marketing/campaign_review

        Both PySpark and SAS outputs are saved into this same folder.
        The upload_type argument is still accepted (so the existing upload
        route keeps working) but is no longer added to the path.
        """
        parts = []
        if bu:
            parts.append(FileHandler._sanitize_segment(bu))
        if workflow_file_path:
            for seg in re.split(r'[/\\]', workflow_file_path):
                clean = FileHandler._sanitize_segment(seg)
                if clean:
                    parts.append(clean)
        return os.path.join(*parts) if parts else ""

    @staticmethod
    def _sanitize_segment(segment: str) -> str:
        """Remove characters unsafe for folder names."""
        segment = segment.strip()
        segment = re.sub(r'[<>:"|?*]', '_', segment)
        segment = re.sub(r'\s+', '_', segment)
        return segment.strip('._')

    @staticmethod
    def process(file_bytes: bytes, filename: str, upload_folder: str, subfolder: str = ""):
        """
        Save raw bytes to disk under upload_folder/subfolder/.
        Reuses existing file if the same hash is found anywhere under upload_folder.

        Returns:
            tuple: (file_info dict, parsed_data dict)
        """
        ext = (filename or "").rsplit(".", 1)[-1].lower()
        safe_name = Path(filename).name
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        target_folder = os.path.join(upload_folder, subfolder) if subfolder else upload_folder
        os.makedirs(target_folder, exist_ok=True)

        # Check recursively across all BU/filepath subfolders for duplicate hash
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

        # New file — save to structured target folder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{safe_name}"
        file_path = os.path.join(target_folder, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

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
        Recursively scan upload_folder (including BU/filepath subfolders)
        for a .hash sidecar matching the given hash.
        Returns the file path if found, else None.
        """
        try:
            for root, _dirs, files in os.walk(upload_folder):
                for fname in files:
                    if not fname.endswith(".hash"):
                        continue
                    hash_path = os.path.join(root, fname)
                    with open(hash_path, "r") as f:
                        if f.read().strip() == file_hash:
                            original_path = hash_path[:-5]  # strip ".hash"
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