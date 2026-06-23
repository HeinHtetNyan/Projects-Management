from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminUser
from ..auth import get_current_user, log_action, get_client_ip, hash_password
from ..schemas import AdminUserOut, UserCreate, UserUpdateRole, UserResetPassword, MessageResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[AdminUserOut])
async def list_users(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()


@router.post("", response_model=AdminUserOut, status_code=201)
async def create_user(
    body: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    if db.query(AdminUser).filter(AdminUser.username == body.username.strip()).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = AdminUser(
        username=body.username.strip(),
        email=body.email.strip() or None,
        password_hash=hash_password(body.password),
        role=body.role.strip(),
        status="active",
    )
    db.add(new_user)
    db.flush()
    log_action(db, current_user, "create_user", get_client_ip(request), "user", new_user.id, new_user.username, {"role": body.role})
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}/role", response_model=AdminUserOut)
async def update_role(
    user_id: int,
    body: UserUpdateRole,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = body.role
    log_action(db, current_user, "update_user_role", get_client_ip(request), "user", user_id, target.username, {"new_role": body.role})
    db.commit()
    db.refresh(target)
    return target


@router.patch("/{user_id}/toggle-status", response_model=AdminUserOut)
async def toggle_status(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.status = "suspended" if target.status == "active" else "active"
    log_action(db, current_user, "toggle_user_status", get_client_ip(request), "user", user_id, target.username, {"new_status": target.status})
    db.commit()
    db.refresh(target)
    return target


@router.patch("/{user_id}/reset-password", response_model=AdminUserOut)
async def reset_password(
    user_id: int,
    body: UserResetPassword,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = hash_password(body.new_password)
    log_action(db, current_user, "reset_password", get_client_ip(request), "user", user_id, target.username)
    db.commit()
    db.refresh(target)
    return target
