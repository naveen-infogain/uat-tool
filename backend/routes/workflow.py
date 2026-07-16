"""
Workflow file routes — persist the UAT file list to the database.
"""
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from db import get_db
from models import WorkflowFile, User
from services.auth import get_current_user, require_roles
from services.notification import (
    notify_uat_ready,
    notify_issue_reported,
    notify_uat_approved,
)

router = APIRouter()


def _to_dict(wf: WorkflowFile) -> dict:
    extras = wf.extras or {}
    return {
        "id": wf.id,
        "buName": wf.bu_name or "",
        "department": wf.department,
        "fileName": wf.file_name,
        "filePath": wf.file_path or "",
        "owner": wf.owner or "",
        "readyForUAT": bool(wf.ready_for_uat),
        "savePath": wf.save_path or "",
        "status": wf.status,
        "pysparkUploadId": wf.pyspark_upload_id,
        "sasUploadId": wf.sas_upload_id,
        "developerEmail": wf.developer_email or "",
        "businessUserEmail": wf.business_user_email or "",
        "issueComment": wf.issue_comment,
        "comparisonId": wf.comparison_id,
        "pysparkFile": extras.get("pysparkFile"),
        "sasFile": extras.get("sasFile"),
        "pysparkSqlQuery": extras.get("pysparkSqlQuery"),
        "comparisonResult": extras.get("comparisonResult"),
        "issueAttachment": extras.get("issueAttachment"),
    }


class WorkflowFileCreate(BaseModel):
    buName: Optional[str] = ""
    department: Optional[str] = ""
    fileName: str
    filePath: Optional[str] = ""
    owner: Optional[str] = ""
    readyForUAT: Optional[bool] = False
    savePath: Optional[str] = ""


class WorkflowFileCheckItem(BaseModel):
    fileName: str
    filePath: Optional[str] = ""


class WorkflowFileUpdate(BaseModel):
    status: Optional[str] = None
    pysparkUploadId: Optional[str] = None
    sasUploadId: Optional[str] = None
    issueComment: Optional[str] = None
    comparisonId: Optional[str] = None
    pysparkFile: Optional[str] = None
    sasFile: Optional[str] = None
    pysparkSqlQuery: Optional[str] = None
    comparisonResult: Optional[Dict[str, Any]] = None
    issueAttachment: Optional[Dict[str, Any]] = None


@router.get("/workflow-files")
def list_workflow_files(db: Session = Depends(get_db)):
    rows = db.query(WorkflowFile).order_by(WorkflowFile.created_at.asc()).all()
    return {"files": [_to_dict(r) for r in rows]}


@router.post("/workflow-files/check")
def check_workflow_files(
    rows: List[WorkflowFileCheckItem],
    db: Session = Depends(get_db),
):
    """Check which rows are new vs already in the database (by file_name + file_path)."""
    result = []
    for row in rows:
        existing = db.query(WorkflowFile).filter(
            WorkflowFile.file_name == row.fileName,
            WorkflowFile.file_path == (row.filePath or ""),
        ).first()
        result.append({
            "fileName": row.fileName,
            "filePath": row.filePath or "",
            "rowStatus": "duplicate" if existing else "new",
        })
    return {"rows": result}


@router.post("/workflow-files", status_code=201)
def add_workflow_files(
    rows: List[WorkflowFileCreate],
    db: Session = Depends(get_db),
    department_filter: Optional[str] = Query(default=None),  # ✅ new
    _admin: User = Depends(require_roles("admin")),
):
    """
    Bulk-insert workflow file rows.
    - If department_filter is set: only insert rows matching that department
    - Skip duplicates by file_name + file_path
    """
    created = []
    skipped_duplicate = []
    skipped_department = []

    for row in rows:
        # BU filter: only match against bu_name column
        row_bu = (row.buName or '').strip().lower()
        if department_filter and row_bu != department_filter.strip().lower():
            skipped_department.append(row.fileName)
            continue

        # Duplicate check
        existing = db.query(WorkflowFile).filter(
            WorkflowFile.file_name == row.fileName,
            WorkflowFile.file_path == (row.filePath or ""),
        ).first()

        if existing:
            skipped_duplicate.append(row.fileName)
            continue

        wf = WorkflowFile(
            bu_name=row.buName or "",
            department=row.department or "",
            file_name=row.fileName,
            file_path=row.filePath,
            owner=row.owner,
            ready_for_uat=1 if row.readyForUAT else 0,
            save_path=row.savePath,
            status="not_started",
        )
        db.add(wf)
        db.flush()
        created.append(_to_dict(wf))

    db.commit()

    return {
        "files": created,
        "created_count": len(created),
        "skipped_duplicates": skipped_duplicate,
        "skipped_other_departments": skipped_department,
        "skipped_department_count": len(skipped_department),
    }


@router.patch("/workflow-files/{file_id}")
def update_workflow_file(
    file_id: int,
    updates: WorkflowFileUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(WorkflowFile).filter(WorkflowFile.id == file_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow file not found")

    previous_status = wf.status

    if updates.status is not None:
        wf.status = updates.status
        # Attribute the upload to whoever is actually logged in — derived from
        # the JWT, never client-supplied, so it can't be spoofed.
        if updates.status == "pyspark_uploaded" and current_user.role in ("developer", "admin"):
            wf.developer_email = current_user.email
        elif updates.status == "sas_uploaded" and current_user.role in ("business_user", "admin"):
            wf.business_user_email = current_user.email
        elif updates.status == "not_started":
            wf.developer_email = None
            wf.business_user_email = None
    if updates.pysparkUploadId is not None:
        wf.pyspark_upload_id = updates.pysparkUploadId
    if updates.sasUploadId is not None:
        wf.sas_upload_id = updates.sasUploadId
    if updates.issueComment is not None:
        wf.issue_comment = updates.issueComment
    if updates.comparisonId is not None:
        wf.comparison_id = updates.comparisonId

    extras = dict(wf.extras or {})
    if updates.pysparkFile is not None:
        extras["pysparkFile"] = updates.pysparkFile
    if updates.sasFile is not None:
        extras["sasFile"] = updates.sasFile
    if updates.pysparkSqlQuery is not None:
        extras["pysparkSqlQuery"] = updates.pysparkSqlQuery
    if updates.comparisonResult is not None:
        extras["comparisonResult"] = updates.comparisonResult
    if updates.issueAttachment is not None:
        extras["issueAttachment"] = updates.issueAttachment
    wf.extras = extras

    db.commit()
    db.refresh(wf)

    new_status = wf.status
    if updates.status is not None and new_status != previous_status:
        file_name = wf.file_name
        department = wf.bu_name or wf.department
        if new_status == "uat_ready":
            background_tasks.add_task(notify_uat_ready, file_name, department, wf.developer_email)
        elif new_status == "issue_reported":
            background_tasks.add_task(
                notify_issue_reported, file_name, department, wf.issue_comment, wf.developer_email
            )
        elif new_status == "uat_done":
            completed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
            background_tasks.add_task(
                notify_uat_approved,
                file_name, department, completed_at, wf.developer_email, wf.business_user_email,
            )

    return _to_dict(wf)


@router.delete("/workflow-files/{file_id}", status_code=204)
def delete_workflow_file(file_id: int, db: Session = Depends(get_db)):
    wf = db.query(WorkflowFile).filter(WorkflowFile.id == file_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow file not found")
    db.delete(wf)
    db.commit()