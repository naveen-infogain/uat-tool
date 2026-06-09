"""
FastAPI main application for the UAT Data Comparison Tool.
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db import init_db, SessionLocal
from models import WorkflowFile
from sqlalchemy import func
from routes.upload import router as upload_router
from routes.compare import router as compare_router
from routes.export import router as export_router
from routes.workflow import router as workflow_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UAT Data Comparison Tool",
    description="Compare PySpark and SAS output files",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cleanup_duplicate_workflow_files():
    """
    FRESH_START=true  → delete ALL records (fresh slate)
    FRESH_START=false → only remove duplicates (default, safe)
    """
    db = SessionLocal()
    try:
        fresh_start = os.getenv("FRESH_START", "false").lower() == "true"

        if fresh_start:
            deleted = db.query(WorkflowFile).delete(synchronize_session=False)
            db.commit()
            logger.info(f"✓ Fresh start — {deleted} records cleared")

        else:
            keep_ids = db.query(func.min(WorkflowFile.id)).group_by(
                WorkflowFile.file_name,
                WorkflowFile.file_path,
            ).all()

            keep_id_list = [row[0] for row in keep_ids]

            if not keep_id_list:
                logger.info("✓ No records found — already fresh")
                return

            deleted = db.query(WorkflowFile).filter(
                WorkflowFile.id.notin_(keep_id_list)
            ).delete(synchronize_session=False)

            db.commit()

            if deleted > 0:
                logger.info(f"✓ Cleaned up {deleted} duplicate records")
            else:
                logger.info("✓ No duplicates found")

    except Exception as e:
        db.rollback()
        logger.error(f"✗ Cleanup failed: {e}")
    finally:
        db.close()


@app.on_event("startup")
def startup():
    os.makedirs(settings.upload_folder, exist_ok=True)
    init_db()
    logger.info("✓ Database initialized")
    logger.info(f"✓ Upload folder: {settings.upload_folder}")
    _cleanup_duplicate_workflow_files()


app.include_router(upload_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(workflow_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "UAT Tool Backend is running"}