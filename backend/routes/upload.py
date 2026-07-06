"""
File upload routes with database persistence.
"""
import os
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
    bu: str = Form(default=""),
    workflow_file_path: str = Form(default=""),
    workflow_file_name: str = Form(default=""),
    upload_type: str = Form(default=""),
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
        # Scope the duplicate check by user_type so the SAME file can exist
        # once as a developer/GCP upload and once as a client/SAS upload.
        existing_upload = db.query(UploadedFile).filter(
            UploadedFile.file_hash == file_hash,
            UploadedFile.user_type == user_type,
        ).first()
        if existing_upload:
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
                    "row_count": existing_upload.row_count or 0,
                    "column_count": existing_upload.column_count or 0,
                    "columns": existing_upload.headers or [],
                },
                "sql_query": existing_upload.sql_query,
                "duplicate": True,
            }

        # Build structured subfolder: {BU}/{type}/{Filepath}
        subfolder = FileHandler.build_subfolder(bu, workflow_file_path, upload_type)

        # Process file — saves to upload_folder/subfolder/
        file_info, parsed_data = FileHandler.process(file_bytes, file.filename, settings.upload_folder, subfolder)

        # Relative stored location and folder
        if subfolder:
            stored_path = os.path.join(subfolder, file_info["saved_filename"]).replace("\\", "/")
            stored_folder = subfolder.replace("\\", "/")
        else:
            stored_path = file_info["file_path"].replace("\\", "/")
            stored_folder = None

        upload_id = str(uuid.uuid4())
        uploaded_file = UploadedFile(
            id=upload_id,
            file_hash=file_info["file_hash"],
            original_filename=file_info["original_filename"],
            saved_filename=file_info["saved_filename"],
            file_path=stored_path,
            file_size=file_info["file_size"],
            file_type=ext,
            user_type=user_type,
            # ---- broken-out metadata columns ----
            bu=bu or None,
            upload_type=upload_type or None,
            save_path=stored_folder,
            disk_path=file_info["file_path"],
            workflow_file_name=workflow_file_name or None,
            workflow_file_path=workflow_file_path or None,
            row_count=parsed_data["row_count"],
            column_count=parsed_data["column_count"],
            sql_query=sql_query or None,
            headers=parsed_data["headers"],
            data=parsed_data["data"],
            # kept for backward compatibility (comparator reads disk_path here)
            file_metadata={
                "sql_query": sql_query or None,
                "row_count": parsed_data["row_count"],
                "column_count": parsed_data["column_count"],
                "headers": parsed_data["headers"],
                "bu": bu or None,
                "save_path": stored_folder,
                "workflow_file_name": workflow_file_name or None,
                "workflow_file_path": workflow_file_path or None,
                "upload_type": upload_type or None,
                "disk_path": file_info["file_path"],
            },
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
            "stored_path": stored_path,
            "sql_query": sql_query or None,
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

    return {
        "success": True,
        "upload_id": upload.id,
        "user_type": upload.user_type,
        "upload_type": upload.upload_type,
        "bu": upload.bu,
        "file_path": upload.file_path,
        "disk_path": upload.disk_path,
        "file_info": {
            "original_filename": upload.original_filename,
            "file_size": upload.file_size,
            "file_hash": upload.file_hash,
            "uploaded_at": upload.upload_timestamp.isoformat() if upload.upload_timestamp else None,
        },
        "data_summary": {
            "row_count": upload.row_count or 0,
            "column_count": upload.column_count or 0,
            "columns": upload.headers or [],
        },
        "sql_query": upload.sql_query,
    }


@router.get("/upload/{upload_id}/data")
async def get_upload_data(upload_id: str, limit: int = 100, db: Session = Depends(get_db)):
    """
    Return the ACTUAL rows of an uploaded file by reading it from disk.
    The database stores metadata + a disk_path pointer; the real data is
    fetched from the file itself here.
    """
    upload = db.query(UploadedFile).filter(UploadedFile.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    disk_path = upload.disk_path or (upload.file_metadata or {}).get("disk_path") or upload.file_path
    if not disk_path or not os.path.exists(disk_path):
        raise HTTPException(status_code=404, detail=f"File not found on disk: {disk_path}")

    ext = (upload.file_type or disk_path.rsplit(".", 1)[-1]).lower()
    parsed = FileHandler.parse_file(disk_path, ext)
    rows = parsed["data"]

    return {
        "success": True,
        "upload_id": upload_id,
        "original_filename": upload.original_filename,
        "disk_path": disk_path,
        "headers": parsed["headers"],
        "row_count": parsed["row_count"],
        "column_count": parsed["column_count"],
        "rows": rows[:limit],
        "truncated": len(rows) > limit,
    }


@router.get("/uploads")
async def list_uploads(db: Session = Depends(get_db)):
    uploads = db.query(UploadedFile).order_by(UploadedFile.upload_timestamp.desc()).all()
    return {
        "uploads": [
            {
                "upload_id": upload.id,
                "user_type": upload.user_type,
                "upload_type": upload.upload_type,
                "bu": upload.bu,
                "filename": upload.original_filename,
                "file_path": upload.file_path,
                "uploaded_at": upload.upload_timestamp.isoformat() if upload.upload_timestamp else None,
            }
            for upload in uploads
        ]
    }