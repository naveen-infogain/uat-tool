"""
Export routes for generating reports.
"""
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from routes.upload import upload_sessions
from routes.compare import comparisons
from services.exporter import ExportService

router = APIRouter()


@router.get("/export/{comparison_id}/excel")
async def export_excel(comparison_id: str):
    if comparison_id not in comparisons:
        raise HTTPException(status_code=404, detail="Comparison not found")

    comp = comparisons[comparison_id]
    file_info_1 = upload_sessions[comp["upload_id_1"]]["file_info"]
    file_info_2 = upload_sessions[comp["upload_id_2"]]["file_info"]

    buffer = ExportService.export_to_excel(comp["result"], file_info_1, file_info_2)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.xlsx"},
    )


@router.get("/export/{comparison_id}/csv")
async def export_csv(comparison_id: str):
    if comparison_id not in comparisons:
        raise HTTPException(status_code=404, detail="Comparison not found")

    comp = comparisons[comparison_id]
    file_info_1 = upload_sessions[comp["upload_id_1"]]["file_info"]
    file_info_2 = upload_sessions[comp["upload_id_2"]]["file_info"]

    csv_content = ExportService.export_to_csv(comp["result"], file_info_1, file_info_2)

    return StreamingResponse(
        io.BytesIO(csv_content.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=comparison_{comparison_id}.csv"},
    )

