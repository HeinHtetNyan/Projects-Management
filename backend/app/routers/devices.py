from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Device, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import DeviceOut, MessageResponse

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceOut])
async def list_devices(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Device).order_by(Device.created_at.desc()).all()


@router.post("/{device_id}/block", response_model=DeviceOut)
async def block_device(
    device_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.status = "blocked"
    device.blocked_at = datetime.utcnow()
    log_action(db, current_user, "block_device", get_client_ip(request), "device", device_id, device.hostname or device.fingerprint)
    db.commit()
    db.refresh(device)
    return device


@router.post("/{device_id}/unblock", response_model=DeviceOut)
async def unblock_device(
    device_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.status = "online"
    device.blocked_at = None
    log_action(db, current_user, "unblock_device", get_client_ip(request), "device", device_id, device.hostname or device.fingerprint)
    db.commit()
    db.refresh(device)
    return device
