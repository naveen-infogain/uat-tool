"""
Workflow file routes — persist the UAT file list to the database.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from db import get_db
from models import WorkflowFile

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_dict(wf: WorkflowFile) -> dict:
    extras = wf.extras or {}
    return {
        "id": wf.id,
        "department": wf.department,
        "fileName": wf.file_name,
        "filePath": wf.file_path or "",
        "owner": wf.owner or "",
        "readyForUAT": bool(wf.ready_for_uat),
        "savePath": wf.save_path or "",
        "status": wf.status,
        "pysparkUploadId": wf.pyspark_upload_id,
        "sasUploadId": wf.sas_upload_id,
        "issueComment": wf.issue_comment,
        "comparisonId": wf.comparison_id,
        "pysparkFile": extras.get("pysparkFile"),
        "sasFile": extras.get("sasFile"),
        "pysparkSqlQuery": extras.get("pysparkSqlQuery"),
        "comparisonResult": extras.get("comparisonResult"),
    }


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class WorkflowFileCreate(BaseModel):
    department: str
    fileName: str
    filePath: Optional[str] = ""
    owner: Optional[str] = ""
    readyForUAT: Optional[bool] = False
    savePath: Optional[str] = ""


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


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/workflow-files")
def list_workflow_files(db: Session = Depends(get_db)):
    """Return all workflow files ordered by creation time."""
    rows = db.query(WorkflowFile).order_by(WorkflowFile.created_at.asc()).all()
    return {"files": [_to_dict(r) for r in rows]}


@router.post("/workflow-files", status_code=201)
def add_workflow_files(rows: List[WorkflowFileCreate], db: Session = Depends(get_db)):
    """Bulk-insert new workflow file rows (from file-list upload)."""
    created = []
    for row in rows:
        wf = WorkflowFile(
            department=row.department,
            file_name=row.fileName,
            file_path=row.filePath,
            owner=row.owner,
            ready_for_uat=1 if row.readyForUAT else 0,
            save_path=row.savePath,
            status="not_started",
        )
        db.add(wf)
        db.flush()   # get the auto-generated id
        created.append(_to_dict(wf))
    db.commit()
    return {"files": created}


@router.patch("/workflow-files/{file_id}")
def update_workflow_file(file_id: int, updates: WorkflowFileUpdate, db: Session = Depends(get_db)):
    """Patch a workflow file's status or upload references."""
    wf = db.query(WorkflowFile).filter(WorkflowFile.id == file_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow file not found")

    if updates.status is not None:
        wf.status = updates.status
    if updates.pysparkUploadId is not None:
        wf.pyspark_upload_id = updates.pysparkUploadId
    if updates.sasUploadId is not None:
        wf.sas_upload_id = updates.sasUploadId
    if updates.issueComment is not None:
        wf.issue_comment = updates.issueComment
    if updates.comparisonId is not None:
        wf.comparison_id = updates.comparisonId

    # extras (non-column data)
    extras = dict(wf.extras or {})
    if updates.pysparkFile is not None:
        extras["pysparkFile"] = updates.pysparkFile
    if updates.sasFile is not None:
        extras["sasFile"] = updates.sasFile
    if updates.pysparkSqlQuery is not None:
        extras["pysparkSqlQuery"] = updates.pysparkSqlQuery
    if updates.comparisonResult is not None:
        extras["comparisonResult"] = updates.comparisonResult
    wf.extras = extras

    db.commit()
    db.refresh(wf)
    return _to_dict(wf)


@router.delete("/workflow-files/{file_id}", status_code=204)
def delete_workflow_file(file_id: int, db: Session = Depends(get_db)):
    """Delete a workflow file record."""
    wf = db.query(WorkflowFile).filter(WorkflowFile.id == file_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow file not found")
    db.delete(wf)
    db.commit()
