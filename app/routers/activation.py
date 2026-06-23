"""
Public API + redirect page — called by desktop apps and customer browsers.
"""
import json
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActivationToken, License
from ..crypto import decrypt_private_key, sign_certificate, make_canonical
from ..templates_config import templates
from ..config import settings

router = APIRouter()


class ActivateRequest(BaseModel):
    token: str
    computerId: str


@router.get("/activate")
async def activate_redirect(token: str, request: Request, db: Session = Depends(get_db)):
    """
    Customer clicks the link the admin sent.
    We serve a page that does a JS redirect to the deep link scheme.
    """
    record = db.query(ActivationToken).filter(ActivationToken.token == token).first()
    if not record:
        return templates.TemplateResponse(
            request, "activate.html",
            {"error": "Invalid activation link.", "token": None, "app_name": settings.APP_NAME},
        )

    if record.status == "used":
        return templates.TemplateResponse(
            request, "activate.html",
            {"error": "This activation link has already been used.",
             "token": None, "app_name": record.project.name},
        )
    if record.status == "revoked":
        return templates.TemplateResponse(
            request, "activate.html",
            {"error": "This activation link has been revoked.",
             "token": None, "app_name": record.project.name},
        )
    if record.expires_at and record.expires_at < datetime.utcnow():
        record.status = "expired"
        db.commit()
        return templates.TemplateResponse(
            request, "activate.html",
            {"error": "This activation link has expired.",
             "token": None, "app_name": record.project.name},
        )

    scheme = record.project.deep_link_scheme
    app_name = record.project.name
    return templates.TemplateResponse(
        request, "activate.html",
        {
            "error": None,
            "token": token,
            "scheme": scheme,
            "app_name": app_name,
        },
    )


@router.post("/api/v1/activate")
async def do_activate(body: ActivateRequest, db: Session = Depends(get_db)):
    """
    Called by the desktop app after receiving the deep link.
    Validates the token, signs a certificate, and returns it.
    """
    record = (
        db.query(ActivationToken)
        .filter(ActivationToken.token == body.token)
        .first()
    )

    if not record:
        raise HTTPException(status_code=400, detail="token_invalid")
    if record.status == "used":
        raise HTTPException(status_code=400, detail="token_used")
    if record.status == "revoked":
        raise HTTPException(status_code=400, detail="token_invalid")
    if record.expires_at and record.expires_at < datetime.utcnow():
        record.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="token_expired")

    # Decrypt project private key and sign the certificate
    private_key = decrypt_private_key(record.project.private_key_enc)
    activation_date = datetime.utcnow().strftime("%Y-%m-%d")
    canonical = make_canonical(
        record.license_number,
        record.customer.name,
        body.computerId,
        activation_date,
        record.license_type,
    )
    signature = sign_certificate(private_key, canonical)

    certificate = {
        "licenseNumber": record.license_number,
        "customerName": record.customer.name,
        "computerId": body.computerId,
        "activationDate": activation_date,
        "licenseType": record.license_type,
        "signature": signature,
    }

    # Mark token as used and record the license
    record.status = "used"
    record.used_at = datetime.utcnow()

    db.add(
        License(
            token_id=record.id,
            project_id=record.project_id,
            customer_id=record.customer_id,
            license_number=record.license_number,
            computer_id=body.computerId,
            certificate_json=json.dumps(certificate),
        )
    )
    db.commit()

    return certificate
