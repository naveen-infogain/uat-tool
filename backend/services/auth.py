"""
Authentication: password hashing, JWT issuing/verification, and FastAPI dependencies.
"""
import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from models import User

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def _create_token(user: User, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user: User) -> str:
    return _create_token(user, timedelta(minutes=settings.access_token_expire_minutes), "access")


def create_refresh_token(user: User) -> str:
    return _create_token(user, timedelta(days=settings.refresh_token_expire_days), "refresh")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: resolve the caller from the Authorization: Bearer header."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_roles(*roles):
    """FastAPI dependency factory: 403s unless the caller's role is in `roles`."""
    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return _dependency


def ensure_seed_admin(db: Session) -> None:
    """Create the first admin account from env vars if no admin exists yet.

    Cloud Run containers can't be exec'd into to run a one-off script, so the
    bootstrap admin is created from INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD
    on startup instead.
    """
    if db.query(User).filter(User.role == "admin").first():
        return

    if not settings.initial_admin_email or not settings.initial_admin_password:
        logger.warning(
            "No admin account exists and INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD are not set — "
            "no one will be able to log in. Set these env vars to bootstrap the first admin."
        )
        return

    existing_user = db.query(User).filter(User.email == settings.initial_admin_email).first()
    if existing_user:
        existing_user.role = "admin"
        existing_user.is_active = 1
        db.commit()
        logger.info(f"✓ Promoted existing user {settings.initial_admin_email} to admin")
        return

    admin = User(
        email=settings.initial_admin_email,
        hashed_password=hash_password(settings.initial_admin_password),
        full_name="Admin",
        role="admin",
        is_active=1,
    )
    db.add(admin)
    db.commit()
    logger.info(f"✓ Seeded initial admin account: {settings.initial_admin_email}")
