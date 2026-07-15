"""
Export routes for generating reports.
"""
import io
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models import Comparison, UploadedFile
from services.exporter import ExportService

router = APIRouter()


class DashboardStats(BaseModel):
    name: str = ''
    total: int = 0
    inProgress: int = 0
    done: int = 0
    issues: int = 0
    production: int = 0
    notStarted: int = 0
    completionPct: int = 0


class DashboardExportRequest(BaseModel):
    overall: DashboardStats
    businessUnits: List[DashboardStats]


def _load_comparison_data(comparison_id: str, db: Session):
    """Fetch a comparison and its source files, and assemble exporter inputs."""
    comparison = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    file1 = db.query(UploadedFile).filter(UploadedFile.id == comparison.pyspark_upload_id).first()
    file2 = db.query(UploadedFile).filter(UploadedFile.id == comparison.sas_upload_id).first()

    if not file1 or not file2:
        raise HTTPException(status_code=404, detail="One or both files not found")

    file_info_1 = {"filename": file1.original_filename, "size": file1.file_size, "type": file1.file_type}
    file_info_2 = {"filename": file2.original_filename, "size": file2.file_size, "type": file2.file_type}

    result = {
        "headers": comparison.headers_diff,
        "rows": comparison.rows_diff,
        "statistics": comparison.statistics,
        "quality_score": comparison.quality_score,
    }

    return result, file_info_1, file_info_2


@router.get("/export/{comparison_id}/excel")
async def export_excel(comparison_id: str, db: Session = Depends(get_db)):
    """Export comparison results as Excel file."""
    result, file_info_1, file_info_2 = _load_comparison_data(comparison_id, db)
    buffer = ExportService.export_to_excel(result, file_info_1, file_info_2)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.xlsx"},
    )


@router.get("/export/{comparison_id}/pdf")
async def export_pdf(comparison_id: str, db: Session = Depends(get_db)):
    """Export comparison results as PDF file."""
    result, file_info_1, file_info_2 = _load_comparison_data(comparison_id, db)
    buffer = ExportService.export_to_pdf(result, file_info_1, file_info_2)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.pdf"},
    )


@router.post("/export/dashboard/excel")
async def export_dashboard_excel(body: DashboardExportRequest):
    """Export the landing-page dashboard summary (Overall + per-BU stats) as Excel."""
    buffer = ExportService.export_dashboard_to_excel(
        body.overall.dict(),
        [bu.dict() for bu in body.businessUnits],
    )

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=gcp_sas_compare_dashboard_summary.xlsx"},
    )


@router.get("/export/{comparison_id}/csv")
async def export_csv(comparison_id: str, db: Session = Depends(get_db)):
    """Export comparison results as CSV file."""
    result, file_info_1, file_info_2 = _load_comparison_data(comparison_id, db)
    csv_content = ExportService.export_to_csv(result, file_info_1, file_info_2)

    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.csv"},
    )
