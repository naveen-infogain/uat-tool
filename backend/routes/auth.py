"""
Authentication routes: login, refresh, logout, current user, and admin user management.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from models import User
from services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"
ALLOWED_ROLES = {"developer", "business_user", "admin"}


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/auth",
    )


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "isActive": bool(user.is_active),
    }


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateUserRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    fullName: Optional[str] = None
    role: str


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    isActive: Optional[bool] = None
    newPassword: Optional[str] = Field(default=None, min_length=8)


@router.post("/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    _set_refresh_cookie(response, create_refresh_token(user))
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": _user_out(user)}


@router.post("/auth/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    _set_refresh_cookie(response, create_refresh_token(user))
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": _user_out(user)}


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth")
    return {"success": True}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.post("/auth/users", status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    if body.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}")

    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user = User(
        email=email,
        hashed_password=hash_password(body.password),
        full_name=body.fullName,
        role=body.role,
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.get("/auth/users", response_model=List[dict])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_roles("admin"))):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [_user_out(u) for u in users]


@router.patch("/auth/users/{user_id}")
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        if body.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}")
        user.role = body.role
    if body.isActive is not None:
        user.is_active = 1 if body.isActive else 0
    if body.newPassword:
        user.hashed_password = hash_password(body.newPassword)

    db.commit()
    db.refresh(user)
    return _user_out(user)
