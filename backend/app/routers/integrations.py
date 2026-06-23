from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Integration, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import IntegrationOut, IntegrationCreate, MessageResponse

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationOut])
async def list_integrations(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Integration).order_by(Integration.service).all()


@router.post("", response_model=IntegrationOut, status_code=201)
async def create_integration(
    body: IntegrationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    ig = Integration(
        service=body.service.strip(),
        account=body.account.strip() or None,
        project_id=body.project_id,
        related_secrets=body.related_secrets.strip() or None,
        notes=body.notes.strip() or None,
    )
    db.add(ig)
    db.flush()
    log_action(db, current_user, "create_integration", get_client_ip(request), "integration", ig.id, ig.service)
    db.commit()
    db.refresh(ig)
    return ig


@router.delete("/{integration_id}", response_model=MessageResponse)
async def delete_integration(
    integration_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    ig = db.query(Integration).filter(Integration.id == integration_id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Integration not found")
    log_action(db, current_user, "delete_integration", get_client_ip(request), "integration", integration_id, ig.service)
    db.delete(ig)
    db.commit()
    return {"message": "Integration deleted"}
