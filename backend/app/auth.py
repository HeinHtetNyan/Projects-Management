import json
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import AdminUser, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user: AdminUser) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise exc
    except JWTError:
        raise exc

    user = db.query(AdminUser).filter(AdminUser.id == int(user_id)).first()
    if not user:
        raise exc
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")
    return user


def log_action(
    db: Session,
    user: AdminUser,
    action: str,
    ip: str = "unknown",
    resource_type: str | None = None,
    resource_id: int | str | None = None,
    resource_name: str | None = None,
    meta: dict | None = None,
) -> None:
    db.add(AuditLog(
        actor_id=user.id,
        actor_name=user.username,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        resource_name=resource_name,
        extra_data=json.dumps(meta) if meta else None,
        ip_address=ip,
    ))


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
