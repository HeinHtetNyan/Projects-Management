from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import License, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import LicenseOut, MessageResponse

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


@router.get("", response_model=list[LicenseOut])
async def list_licenses(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(License).order_by(License.activated_at.desc()).all()


@router.post("/{license_id}/deactivate", response_model=LicenseOut)
async def deactivate_license(
    license_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    if not lic.is_active:
        raise HTTPException(status_code=400, detail="License is already inactive")
    lic.is_active = False
    lic.deactivated_at = datetime.utcnow()
    log_action(db, current_user, "deactivate_license", get_client_ip(request), "license", license_id, lic.license_number)
    db.commit()
    db.refresh(lic)
    return lic
