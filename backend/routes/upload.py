"""
File upload routes.
"""
import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from services.file_handler import FileHandler
from config import settings

router = APIRouter()

# In-memory session storage (replace with DB in production)
upload_sessions: dict = {}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_type: str = Form(default="developer"),
):
    if user_type not in ("developer", "client"):
        raise HTTPException(status_code=400, detail="Invalid user_type")

    try:
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if len(file_bytes) > settings.max_file_size:
            raise HTTPException(status_code=400, detail="File too large (max 100 MB)")

        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(settings.allowed_extensions)}",
            )

        file_info, parsed_data = FileHandler.process(file_bytes, file.filename, settings.upload_folder)

        upload_id = str(uuid.uuid4())
        upload_sessions[upload_id] = {
            "user_type": user_type,
            "file_info": file_info,
            "parsed_data": parsed_data,
        }

        return {
            "success": True,
            "upload_id": upload_id,
            "file_info": {
                "original_filename": file_info["original_filename"],
                "file_size": file_info["file_size"],
                "file_hash": file_info["file_hash"],
                "uploaded_at": file_info["uploaded_at"],
            },
            "data_summary": {
                "row_count": parsed_data["row_count"],
                "column_count": parsed_data["column_count"],
                "columns": parsed_data["headers"],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/upload/{upload_id}")
async def get_upload(upload_id: str):
    if upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="Upload not found")
    session = upload_sessions[upload_id]
    parsed_data = session["parsed_data"]
    return {
        "success": True,
        "upload_id": upload_id,
        "user_type": session["user_type"],
        "file_info": session["file_info"],
        "data_summary": {
            "row_count": parsed_data["row_count"],
            "column_count": parsed_data["column_count"],
            "columns": parsed_data["headers"],
        },
    }


@router.get("/uploads")
async def list_uploads():
    return {
        "uploads": [
            {
                "upload_id": uid,
                "user_type": s["user_type"],
                "filename": s["file_info"]["original_filename"],
                "uploaded_at": s["file_info"]["uploaded_at"],
            }
            for uid, s in upload_sessions.items()
        ]
    }

