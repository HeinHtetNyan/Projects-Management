from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Notification, AdminUser
from ..auth import get_current_user
from ..schemas import NotificationOut, MessageResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/{notif_id}/read", response_model=NotificationOut)
async def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.recipient_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
