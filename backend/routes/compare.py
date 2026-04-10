"""
Comparison routes.
"""
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from routes.upload import upload_sessions
from services.comparator import DataComparator

router = APIRouter()

# In-memory storage for comparisons
comparisons: dict = {}


class CompareRequest(BaseModel):
    upload_id_1: str
    upload_id_2: str
    mode: str = "exact"


@router.post("/compare")
async def create_comparison(body: CompareRequest):
    if body.upload_id_1 == body.upload_id_2:
        raise HTTPException(status_code=400, detail="Cannot compare file with itself")

    for uid in (body.upload_id_1, body.upload_id_2):
        if uid not in upload_sessions:
            raise HTTPException(status_code=404, detail=f"Upload not found: {uid}")

    if body.mode not in DataComparator.COMPARISON_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Allowed: {list(DataComparator.COMPARISON_MODES.keys())}",
        )

    data1 = upload_sessions[body.upload_id_1]["parsed_data"]
    data2 = upload_sessions[body.upload_id_2]["parsed_data"]

    comparator = DataComparator(data1, data2, mode=body.mode)
    result = comparator.compare()

    comparison_id = str(uuid.uuid4())
    comparisons[comparison_id] = {
        "upload_id_1": body.upload_id_1,
        "upload_id_2": body.upload_id_2,
        "mode": body.mode,
        "result": result,
    }

    return {"success": True, "comparison_id": comparison_id, "comparison_result": result}


@router.get("/comparison/{comparison_id}")
async def get_comparison(comparison_id: str):
    if comparison_id not in comparisons:
        raise HTTPException(status_code=404, detail="Comparison not found")
    comp = comparisons[comparison_id]
    return {
        "success": True,
        "comparison_id": comparison_id,
        "upload_id_1": comp["upload_id_1"],
        "upload_id_2": comp["upload_id_2"],
        "mode": comp["mode"],
        "result": comp["result"],
    }


@router.get("/comparisons")
async def list_comparisons():
    return {
        "comparisons": [
            {
                "comparison_id": cid,
                "upload_id_1": c["upload_id_1"],
                "upload_id_2": c["upload_id_2"],
                "mode": c["mode"],
                "quality_score": c["result"].get("quality_score"),
            }
            for cid, c in comparisons.items()
        ]
    }

