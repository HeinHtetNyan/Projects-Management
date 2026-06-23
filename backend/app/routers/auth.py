from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminUser
from ..auth import (
    verify_password, create_access_token, get_current_user,
    log_action, get_client_ip,
)
from ..schemas import LoginRequest, TokenResponse, UserInfo

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended")

    token = create_access_token(user)
    log_action(db, user, "login", ip=get_client_ip(request))
    db.commit()
    return TokenResponse(
        access_token=token,
        user=UserInfo.model_validate(user),
    )


@router.get("/me", response_model=UserInfo)
async def me(current_user: AdminUser = Depends(get_current_user)):
    return UserInfo.model_validate(current_user)


@router.post("/logout")
async def logout(
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_action(db, current_user, "logout", ip=get_client_ip(request))
    db.commit()
    return {"message": "Logged out"}
