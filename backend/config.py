"""
Configuration settings using pydantic-settings.
"""
import os
import logging
import secrets
from typing import List

from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def _resolve_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if secret:
        return secret
    logger.warning(
        "JWT_SECRET_KEY not set — using a randomly generated secret for this process. "
        "Tokens will stop validating on restart. Set JWT_SECRET_KEY in the environment for production."
    )
    return secrets.token_urlsafe(48)


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

    # ── Auth ──────────────────────────────────────────────────────────────────
    jwt_secret_key: str = _resolve_jwt_secret()
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Refresh-token cookie. Must be secure=True + samesite="none" once frontend/backend
    # are on different domains (e.g. two separate Cloud Run services).
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_samesite: str = os.getenv("COOKIE_SAMESITE", "lax")

    # First admin account, auto-created on startup if no admin exists yet.
    initial_admin_email: str = os.getenv("INITIAL_ADMIN_EMAIL", "")
    initial_admin_password: str = os.getenv("INITIAL_ADMIN_PASSWORD", "")


settings = Settings()

