"""
FastAPI main application for the UAT Data Comparison Tool.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.upload import router as upload_router
from routes.compare import router as compare_router
from routes.export import router as export_router

app = FastAPI(
    title="UAT Data Comparison Tool",
    description="Compare PySpark and SAS output files",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload folder
os.makedirs(settings.upload_folder, exist_ok=True)

# Routers
app.include_router(upload_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "UAT Tool Backend is running"}
