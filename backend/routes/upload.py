"""
File upload routes with database persistence.
"""
import hashlib
import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from services.file_handler import FileHandler
from models import UploadedFile
from db import get_db
from config import settings

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_type: str = Form(default="developer"),
    sql_query: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """Upload a file and store metadata in database."""
    if user_type not in ("developer", "client"):
        raise HTTPException(status_code=400, detail="Invalid user_type")

    try:
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if len(file_bytes) > settings.max_file_size:
            raise HTTPException(status_code=400, detail=f"File too large (max {settings.max_file_size / 1024 / 1024:.0f} MB)")

        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(settings.allowed_extensions)}",
            )

        file_hash = hashlib.sha256(file_bytes).hexdigest()
        existing_upload = db.query(UploadedFile).filter(UploadedFile.file_hash == file_hash).first()
        if existing_upload:
            existing_metadata = existing_upload.file_metadata or {}
            return {
                "success": True,
                "upload_id": existing_upload.id,
                "file_info": {
                    "original_filename": existing_upload.original_filename,
                    "file_size": existing_upload.file_size,
                    "file_hash": existing_upload.file_hash,
                    "uploaded_at": existing_upload.upload_timestamp.isoformat() if existing_upload.upload_timestamp else None,
                },
                "data_summary": {
                    "row_count": existing_metadata.get("row_count", 0),
                    "column_count": existing_metadata.get("column_count", 0),
                    "columns": existing_metadata.get("headers", []),
                },
                "sql_query": existing_metadata.get("sql_query"),
                "duplicate": True,
            }

        # Process file
        file_info, parsed_data = FileHandler.process(file_bytes, file.filename, settings.upload_folder)

        # Store in database
        upload_id = str(uuid.uuid4())
        uploaded_file = UploadedFile(
            id=upload_id,
            file_hash=file_info["file_hash"],
            original_filename=file_info["original_filename"],
            saved_filename=file_info["saved_filename"],
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=ext,
            user_type=user_type,
            file_metadata={
                "sql_query": sql_query if sql_query else None,
                "row_count": parsed_data["row_count"],
                "column_count": parsed_data["column_count"],
                "headers": parsed_data["headers"],
            }
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

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
            "sql_query": sql_query if sql_query else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/upload/{upload_id}")
async def get_upload(upload_id: str, db: Session = Depends(get_db)):
    upload = db.query(UploadedFile).filter(UploadedFile.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    metadata = upload.file_metadata or {}
    return {
        "success": True,
        "upload_id": upload.id,
        "user_type": upload.user_type,
        "file_info": {
            "original_filename": upload.original_filename,
            "file_size": upload.file_size,
            "file_hash": upload.file_hash,
            "uploaded_at": upload.upload_timestamp.isoformat() if upload.upload_timestamp else None,
        },
        "data_summary": {
            "row_count": metadata.get("row_count", 0),
            "column_count": metadata.get("column_count", 0),
            "columns": metadata.get("headers", []),
        },
        "sql_query": metadata.get("sql_query"),
    }


@router.get("/uploads")
async def list_uploads(db: Session = Depends(get_db)):
    uploads = db.query(UploadedFile).order_by(UploadedFile.upload_timestamp.desc()).all()
    return {
        "uploads": [
            {
                "upload_id": upload.id,
                "user_type": upload.user_type,
                "filename": upload.original_filename,
                "uploaded_at": upload.upload_timestamp.isoformat() if upload.upload_timestamp else None,
            }
            for upload in uploads
        ]
    }

