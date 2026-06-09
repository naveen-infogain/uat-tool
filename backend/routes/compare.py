"""
Comparison routes with database persistence.
"""
import os
import uuid
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models import UploadedFile, Comparison
from services.file_handler import FileHandler
from services.comparator import DataComparator
from config import settings


def _disk_path(upload: UploadedFile) -> str:
    """
    Return the actual file path on disk.
    New uploads store the logical path in file_path and the real path in file_metadata["disk_path"].
    Old uploads stored the absolute disk path directly in file_path.
    """
    metadata = upload.file_metadata or {}
    if metadata.get("disk_path"):
        return metadata["disk_path"]
    return upload.file_path

router = APIRouter()


class CompareRequest(BaseModel):
    upload_id_1: str
    upload_id_2: str
    mode: str = "exact"


@router.post("/compare")
async def create_comparison(body: CompareRequest, db: Session = Depends(get_db)):
    """Compare two uploaded files and store results in database."""
    if body.mode not in DataComparator.COMPARISON_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Allowed: {list(DataComparator.COMPARISON_MODES.keys())}",
        )

    # Get both uploaded files from database
    file1 = db.query(UploadedFile).filter(UploadedFile.id == body.upload_id_1).first()
    file2 = db.query(UploadedFile).filter(UploadedFile.id == body.upload_id_2).first()

    if not file1:
        raise HTTPException(status_code=404, detail=f"Upload not found: {body.upload_id_1}")
    if not file2:
        raise HTTPException(status_code=404, detail=f"Upload not found: {body.upload_id_2}")

    try:
        # Re-parse files from disk
        ext1 = file1.file_type.lower() if file1.file_type else 'csv'
        ext2 = file2.file_type.lower() if file2.file_type else 'csv'

        parsed_data1 = FileHandler.parse_file(_disk_path(file1), ext1)
        parsed_data2 = FileHandler.parse_file(_disk_path(file2), ext2)

        # When both uploads resolve to the same file (hash deduplication),
        # return a perfect 100% match result without running the comparator.
        if body.upload_id_1 == body.upload_id_2:
            headers = parsed_data1.get("headers", [])
            total_rows = len(parsed_data1.get("rows", []))
            matched_rows_list = [
                {"file1_row": i, "file2_row": i, "similarity": 1.0, "differences": []}
                for i in range(total_rows)
            ]
            result = {
                "mode": body.mode,
                "headers": {
                    "file1_headers": headers,
                    "file2_headers": headers,
                    "shared_headers": headers,
                    "matched_count": len(headers),
                    "missing_in_file2": [],
                    "extra_in_file2": [],
                    "total_columns": len(headers),
                },
                "rows": {
                    "matched_rows": matched_rows_list,
                    "unmatched_in_file1": [],
                    "unmatched_in_file2": [],
                    "total_rows_file1": total_rows,
                    "total_rows_file2": total_rows,
                },
                "statistics": {
                    "total_rows_compared": total_rows,
                    "matched_rows": total_rows,
                    "unmatched_file1": 0,
                    "unmatched_file2": 0,
                    "match_percentage": 100.0,
                    "total_columns": len(headers),
                    "matched_columns": len(headers),
                    "comparable_columns": len(headers),
                    "column_match_percentage": 100.0,
                    "row_match_basis": total_rows,
                },
                "quality_score": 100.0,
            }
        else:
            # Run comparison
            comparator = DataComparator(parsed_data1, parsed_data2, mode=body.mode)
            result = comparator.compare()

        # Store comparison result in database
        comparison_id = str(uuid.uuid4())
        comparison = Comparison(
            id=comparison_id,
            workflow_file_id=0,  # Will be updated when tied to workflow file
            pyspark_upload_id=body.upload_id_1,
            sas_upload_id=body.upload_id_2,
            mode=body.mode,
            headers_diff=result.get("headers"),
            rows_diff=result.get("rows"),
            statistics=result.get("statistics"),
            quality_score=result.get("quality_score"),
        )
        db.add(comparison)
        db.commit()
        db.refresh(comparison)

        return {
            "success": True,
            "comparison_id": comparison_id,
            "comparison_result": result
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.get("/comparison/{comparison_id}")
async def get_comparison(comparison_id: str, db: Session = Depends(get_db)):
    """Get stored comparison results."""
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    return {
        "success": True,
        "comparison_id": comparison_id,
        "mode": comparison.mode,
        "quality_score": comparison.quality_score,
        "statistics": comparison.statistics,
        "headers": comparison.headers_diff,
        "rows": comparison.rows_diff,
    }


@router.get("/comparisons")
async def list_comparisons(db: Session = Depends(get_db)):
    """List all stored comparisons."""
    comparisons = db.query(Comparison).all()
    return {
        "comparisons": [
            {
                "comparison_id": c.id,
                "upload_id_1": c.upload_id_1,
                "upload_id_2": c.upload_id_2,
                "mode": c.mode,
                "quality_score": c.quality_score,
            }
            for c in comparisons
        ]
    }

