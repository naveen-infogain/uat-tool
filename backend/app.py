"""
FastAPI main application for the UAT Data Comparison Tool.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db import init_db
from routes.upload import router as upload_router
from routes.compare import router as compare_router
from routes.export import router as export_router
from routes.workflow import router as workflow_router

app = FastAPI(
    title="UAT Data Comparison Tool",
    description="Compare PySpark and SAS output files",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup():
    """Initialize database and create tables."""
    os.makedirs(settings.upload_folder, exist_ok=True)
    init_db()
    print("✓ Database initialized")
    print(f"✓ Upload folder: {settings.upload_folder}")

# Routers
app.include_router(upload_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(workflow_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "UAT Tool Backend is running"}
