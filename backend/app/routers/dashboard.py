from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Project, Customer, ActivationToken, License, Device, Server, AuditLog,
)
from ..auth import get_current_user
from ..models import AdminUser
from ..schemas import DashboardStats, RecentToken, RecentLicense, AuditLogBrief

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    recent_tokens = (
        db.query(ActivationToken)
        .order_by(ActivationToken.created_at.desc())
        .limit(6).all()
    )
    recent_licenses = (
        db.query(License)
        .order_by(License.activated_at.desc())
        .limit(6).all()
    )
    recent_audit = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(8).all()
    )

    return DashboardStats(
        total_projects=db.query(Project).count(),
        total_customers=db.query(Customer).count(),
        pending_tokens=db.query(ActivationToken).filter(ActivationToken.status == "pending").count(),
        active_licenses=db.query(License).filter(License.is_active == True).count(),
        total_devices=db.query(Device).count(),
        online_servers=db.query(Server).filter(Server.status == "running").count(),
        total_servers=db.query(Server).count(),
        recent_tokens=[RecentToken.model_validate(t) for t in recent_tokens],
        recent_licenses=[RecentLicense.model_validate(l) for l in recent_licenses],
        recent_audit=[AuditLogBrief.model_validate(a) for a in recent_audit],
    )
