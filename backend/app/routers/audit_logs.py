from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, AdminUser
from ..auth import get_current_user
from ..schemas import AuditLogOut

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("", response_model=list[AuditLogOut])
async def list_audit_logs(
    q: str = "",
    resource: str = "",
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    query = db.query(AuditLog)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            (AuditLog.actor_name.ilike(like)) |
            (AuditLog.action.ilike(like)) |
            (AuditLog.resource_name.ilike(like))
        )
    if resource.strip():
        query = query.filter(AuditLog.resource_type == resource.strip())
    return query.order_by(AuditLog.created_at.desc()).limit(200).all()
