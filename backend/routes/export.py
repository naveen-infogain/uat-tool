"""
Export routes for generating reports.
"""
import io
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from db import get_db
from models import Comparison, UploadedFile
from services.exporter import ExportService

router = APIRouter()


@router.get("/export/{comparison_id}/excel")
async def export_excel(comparison_id: str, db: Session = Depends(get_db)):
    """Export comparison results as Excel file."""
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    # Get uploaded files
    file1 = db.query(UploadedFile).filter(UploadedFile.id == comparison.upload_id_1).first()
    file2 = db.query(UploadedFile).filter(UploadedFile.id == comparison.upload_id_2).first()
    
    if not file1 or not file2:
        raise HTTPException(status_code=404, detail="One or both files not found")

    file_info_1 = {
        "filename": file1.original_filename,
        "size": file1.file_size,
        "type": file1.file_type,
    }
    file_info_2 = {
        "filename": file2.original_filename,
        "size": file2.file_size,
        "type": file2.file_type,
    }

    result = {
        "headers_diff": comparison.headers_diff,
        "rows_diff": comparison.rows_diff,
        "statistics": comparison.statistics,
    }

    buffer = ExportService.export_to_excel(result, file_info_1, file_info_2)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.xlsx"},
    )


@router.get("/export/{comparison_id}/csv")
async def export_csv(comparison_id: str, db: Session = Depends(get_db)):
    """Export comparison results as CSV file."""
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    # Get uploaded files
    file1 = db.query(UploadedFile).filter(UploadedFile.id == comparison.upload_id_1).first()
    file2 = db.query(UploadedFile).filter(UploadedFile.id == comparison.upload_id_2).first()
    
    if not file1 or not file2:
        raise HTTPException(status_code=404, detail="One or both files not found")

    file_info_1 = {
        "filename": file1.original_filename,
        "size": file1.file_size,
        "type": file1.file_type,
    }
    file_info_2 = {
        "filename": file2.original_filename,
        "size": file2.file_size,
        "type": file2.file_type,
    }

    result = {
        "headers_diff": comparison.headers_diff,
        "rows_diff": comparison.rows_diff,
        "statistics": comparison.statistics,
    }

    csv_content = ExportService.export_to_csv(result, file_info_1, file_info_2)

    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.csv"},
    )

