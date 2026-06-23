import secrets as secrets_mod
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActivationToken, Project, Customer, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..config import settings
from ..schemas import TokenOut, TokenCreate, MessageResponse

router = APIRouter(prefix="/api/tokens", tags=["tokens"])


def _build_token_out(t: ActivationToken) -> TokenOut:
    out = TokenOut.model_validate(t)
    out.activation_url = f"{settings.BASE_URL}/activate?token={t.token}"
    return out


@router.get("", response_model=list[TokenOut])
async def list_tokens(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    tokens = db.query(ActivationToken).order_by(ActivationToken.created_at.desc()).all()
    return [_build_token_out(t) for t in tokens]


@router.post("", response_model=TokenOut, status_code=201)
async def create_token(
    body: TokenCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == body.project_id).first()
    customer = db.query(Customer).filter(Customer.id == body.customer_id).first()
    if not project or not customer:
        raise HTTPException(status_code=400, detail="Invalid project or customer")

    expires_at = None
    if body.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=body.expires_days)

    token = ActivationToken(
        token=secrets_mod.token_urlsafe(32),
        project_id=body.project_id,
        customer_id=body.customer_id,
        license_number=body.license_number.strip(),
        license_type=body.license_type.strip(),
        expires_at=expires_at,
    )
    db.add(token)
    db.flush()
    log_action(
        db, current_user, "create_token", get_client_ip(request),
        "token", token.id, body.license_number,
        {"project": project.name, "customer": customer.name},
    )
    db.commit()
    db.refresh(token)
    return _build_token_out(token)


@router.get("/{token_id}", response_model=TokenOut)
async def get_token(
    token_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    token = db.query(ActivationToken).filter(ActivationToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return _build_token_out(token)


@router.post("/{token_id}/revoke", response_model=TokenOut)
async def revoke_token(
    token_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    token = db.query(ActivationToken).filter(ActivationToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending tokens can be revoked")
    token.status = "revoked"
    log_action(db, current_user, "revoke_token", get_client_ip(request), "token", token_id, token.license_number)
    db.commit()
    db.refresh(token)
    return _build_token_out(token)
