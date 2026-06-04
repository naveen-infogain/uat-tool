"""
Configuration settings using pydantic-settings.
"""
import os
from typing import List

from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Settings:
    upload_folder: str = os.getenv("UPLOAD_FOLDER", "/tmp/uat_uploads")
    max_file_size: int = 100 * 1024 * 1024  # 100 MB
    allowed_extensions: set = {"xlsx", "xls", "csv", "parquet", "json", "sas7bdat"}
    cors_origins: List[str] = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
    cors_origin_regex: str = os.getenv("CORS_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1)(:\d+)?")
    comparison_timeout: int = 600

    # ── Notifications ─────────────────────────────────────────────────────────
    # Brevo Transactional Email — free tier: 300 emails/day
    # Sign up at https://www.brevo.com/ → SMTP & API → API Keys
    brevo_api_key: str = os.getenv("BREVO_API_KEY", "")
    brevo_from_email: str = os.getenv("BREVO_FROM_EMAIL", "noreply@uat-tool.com")
    brevo_from_name: str = os.getenv("BREVO_FROM_NAME", "UAT Tool")

    # Recipient email addresses
    developer_email: str = os.getenv("DEVELOPER_EMAIL", "")
    business_user_email: str = os.getenv("BUSINESS_USER_EMAIL", "")

    # App URL shown in email CTAs (e.g. http://localhost:3000 or https://uat.yourcompany.com)
    app_url: str = os.getenv("APP_URL", "http://localhost:3000")

    # Microsoft Teams — Incoming Webhook URL
    # In Teams: channel → ··· → Connectors → Incoming Webhook  (legacy)
    # OR: channel → Workflows → "Post to channel when webhook request received" (new)
    teams_webhook_url: str = os.getenv("TEAMS_WEBHOOK_URL", "")


settings = Settings()

