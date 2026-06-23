from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Domain, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import DomainOut, DomainCreate, DomainUpdate, MessageResponse

router = APIRouter(prefix="/api/domains", tags=["domains"])


def _enrich(d: Domain) -> DomainOut:
    out = DomainOut.model_validate(d)
    if d.expiry_date:
        out.days_until_expiry = (d.expiry_date - date.today()).days
    return out


@router.get("", response_model=list[DomainOut])
async def list_domains(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return [_enrich(d) for d in db.query(Domain).order_by(Domain.domain).all()]


@router.post("", response_model=DomainOut, status_code=201)
async def create_domain(
    body: DomainCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    d = Domain(
        domain=body.domain.strip().lower(),
        project_id=body.project_id,
        registrar=body.registrar.strip() or None,
        dns_provider=body.dns_provider.strip() or None,
        expiry_date=body.expiry_date,
        auto_renew=body.auto_renew,
        notes=body.notes.strip() or None,
    )
    db.add(d)
    db.flush()
    log_action(db, current_user, "create_domain", get_client_ip(request), "domain", d.id, d.domain)
    db.commit()
    db.refresh(d)
    return _enrich(d)


@router.put("/{domain_id}", response_model=DomainOut)
async def update_domain(
    domain_id: int,
    body: DomainUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    d = db.query(Domain).filter(Domain.id == domain_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Domain not found")
    d.registrar = body.registrar.strip() or None
    d.dns_provider = body.dns_provider.strip() or None
    d.expiry_date = body.expiry_date
    d.auto_renew = body.auto_renew
    d.notes = body.notes.strip() or None
    d.status = body.status.strip()
    log_action(db, current_user, "update_domain", get_client_ip(request), "domain", domain_id, d.domain)
    db.commit()
    db.refresh(d)
    return _enrich(d)


@router.delete("/{domain_id}", response_model=MessageResponse)
async def delete_domain(
    domain_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    d = db.query(Domain).filter(Domain.id == domain_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Domain not found")
    log_action(db, current_user, "delete_domain", get_client_ip(request), "domain", domain_id, d.domain)
    db.delete(d)
    db.commit()
    return {"message": "Domain deleted"}
