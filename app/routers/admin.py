"""
Admin web dashboard — all pages and form-POST actions.
All routes require an authenticated session.
"""
import json
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import AdminUser, Project, Customer, ActivationToken, License
from ..crypto import (
    generate_key_pair, derive_public_key,
    encrypt_private_key, decrypt_private_key,
)
from ..auth import hash_password, verify_password, require_login, login_redirect
from ..templates_config import templates
from ..config import settings

router = APIRouter(prefix="/admin")


# Auth helpers

def _ctx(request: Request, db: Session, **extra):
    """Build a base template context (always includes user and app_name)."""
    user = require_login(request, db)
    return {"user": user, "app_name": settings.APP_NAME, **extra}


def _guard(request: Request, db: Session):
    """Return user or redirect."""
    user = require_login(request, db)
    if not user:
        return None, login_redirect()
    return user, None


# Login / Logout

@router.get("/login")
async def login_page(request: Request, error: str = "", db: Session = Depends(get_db)):
    if request.session.get("user_id"):
        return RedirectResponse("/admin/dashboard", status_code=302)
    return templates.TemplateResponse(
        request, "login.html",
        {"error": error, "app_name": settings.APP_NAME},
    )


@router.post("/login")
async def login_post(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return RedirectResponse("/admin/login?error=Invalid+username+or+password", status_code=302)
    request.session["user_id"] = user.id
    request.session["username"] = user.username
    return RedirectResponse("/admin/dashboard", status_code=302)


@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/admin/login", status_code=302)


# Dashboard

@router.get("/dashboard")
async def dashboard(request: Request, db: Session = Depends(get_db)):
    user, redir = _guard(request, db)
    if redir:
        return redir

    total_projects = db.query(Project).count()
    total_customers = db.query(Customer).count()
    pending_tokens = db.query(ActivationToken).filter(ActivationToken.status == "pending").count()
    active_licenses = db.query(License).filter(License.is_active == True).count()

    recent_tokens = (
        db.query(ActivationToken)
        .order_by(ActivationToken.created_at.desc())
        .limit(8)
        .all()
    )
    recent_licenses = (
        db.query(License)
        .order_by(License.activated_at.desc())
        .limit(8)
        .all()
    )

    return templates.TemplateResponse(
        request, "dashboard.html",
        {
            **_ctx(request, db),
            "active_page": "dashboard",
            "total_projects": total_projects,
            "total_customers": total_customers,
            "pending_tokens": pending_tokens,
            "active_licenses": active_licenses,
            "recent_tokens": recent_tokens,
            "recent_licenses": recent_licenses,
        },
    )


# Projects

@router.get("/projects")
async def projects_list(
    request: Request,
    success: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return templates.TemplateResponse(
        request, "projects.html",
        {**_ctx(request, db), "active_page": "projects",
         "projects": projects, "success": success, "error": error},
    )


@router.post("/projects/create")
async def project_create(
    request: Request,
    name: str = Form(...),
    slug: str = Form(...),
    description: str = Form(""),
    deep_link_scheme: str = Form(...),
    import_private_key: str = Form(""),
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir

    slug = slug.strip().lower().replace(" ", "-")
    if db.query(Project).filter(Project.slug == slug).first():
        return RedirectResponse(f"/admin/projects?error=Slug+%22{slug}%22+already+exists", status_code=302)

    if not settings.ENCRYPTION_KEY:
        return RedirectResponse("/admin/projects?error=ENCRYPTION_KEY+not+set+in+.env", status_code=302)

    try:
        if import_private_key.strip():
            private_b64 = import_private_key.strip()
            public_b64 = derive_public_key(private_b64)
        else:
            public_b64, private_b64 = generate_key_pair()

        private_enc = encrypt_private_key(private_b64)
    except Exception as e:
        return RedirectResponse(f"/admin/projects?error=Key+error:+{str(e)[:60]}", status_code=302)

    project = Project(
        name=name.strip(),
        slug=slug,
        description=description.strip(),
        deep_link_scheme=deep_link_scheme.strip(),
        public_key_b64=public_b64,
        private_key_enc=private_enc,
    )
    db.add(project)
    db.commit()
    return RedirectResponse(f"/admin/projects/{project.id}?success=Project+created", status_code=302)


@router.get("/projects/{project_id}")
async def project_detail(
    project_id: int,
    request: Request,
    success: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return RedirectResponse("/admin/projects?error=Project+not+found", status_code=302)
    tokens = (
        db.query(ActivationToken)
        .filter(ActivationToken.project_id == project_id)
        .order_by(ActivationToken.created_at.desc())
        .limit(20)
        .all()
    )
    return templates.TemplateResponse(
        request, "project_detail.html",
        {**_ctx(request, db), "active_page": "projects",
         "project": project, "tokens": tokens,
         "success": success, "error": error},
    )


@router.post("/projects/{project_id}/reimport-key")
async def project_reimport_key(
    project_id: int,
    request: Request,
    private_key: str = Form(...),
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return RedirectResponse("/admin/projects?error=Project+not+found", status_code=302)
    try:
        public_b64 = derive_public_key(private_key.strip())
        project.public_key_b64 = public_b64
        project.private_key_enc = encrypt_private_key(private_key.strip())
        db.commit()
    except Exception as e:
        return RedirectResponse(
            f"/admin/projects/{project_id}?error=Key+import+failed:+{str(e)[:60]}", status_code=302
        )
    return RedirectResponse(f"/admin/projects/{project_id}?success=Key+pair+updated", status_code=302)


@router.post("/projects/{project_id}/delete")
async def project_delete(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        db.delete(project)
        db.commit()
    return RedirectResponse("/admin/projects?success=Project+deleted", status_code=302)


# Customers

@router.get("/customers")
async def customers_list(
    request: Request,
    success: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    customers = db.query(Customer).order_by(Customer.created_at.desc()).all()
    return templates.TemplateResponse(
        request, "customers.html",
        {**_ctx(request, db), "active_page": "customers",
         "customers": customers, "success": success, "error": error},
    )


@router.post("/customers/create")
async def customer_create(
    request: Request,
    name: str = Form(...),
    email: str = Form(""),
    phone: str = Form(""),
    notes: str = Form(""),
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    customer = Customer(
        name=name.strip(),
        email=email.strip() or None,
        phone=phone.strip() or None,
        notes=notes.strip() or None,
    )
    db.add(customer)
    db.commit()
    return RedirectResponse("/admin/customers?success=Customer+added", status_code=302)


@router.post("/customers/{customer_id}/delete")
async def customer_delete(
    customer_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer:
        db.delete(customer)
        db.commit()
    return RedirectResponse("/admin/customers?success=Customer+deleted", status_code=302)


# Tokens

@router.get("/tokens")
async def tokens_list(
    request: Request,
    success: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    tokens = db.query(ActivationToken).order_by(ActivationToken.created_at.desc()).all()
    projects = db.query(Project).order_by(Project.name).all()
    customers = db.query(Customer).order_by(Customer.name).all()
    return templates.TemplateResponse(
        request, "tokens.html",
        {**_ctx(request, db), "active_page": "tokens",
         "tokens": tokens, "projects": projects, "customers": customers,
         "success": success, "error": error,
         "base_url": settings.BASE_URL},
    )


@router.post("/tokens/create")
async def token_create(
    request: Request,
    project_id: int = Form(...),
    customer_id: int = Form(...),
    license_number: str = Form(...),
    license_type: str = Form("lifetime"),
    expires_days: str = Form(""),
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir

    project = db.query(Project).filter(Project.id == project_id).first()
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not project or not customer:
        return RedirectResponse("/admin/tokens?error=Invalid+project+or+customer", status_code=302)

    expires_at = None
    if expires_days.strip():
        try:
            days = int(expires_days)
            expires_at = datetime.utcnow() + timedelta(days=days)
        except ValueError:
            pass

    token_value = secrets.token_urlsafe(32)
    token = ActivationToken(
        token=token_value,
        project_id=project_id,
        customer_id=customer_id,
        license_number=license_number.strip(),
        license_type=license_type.strip(),
        expires_at=expires_at,
    )
    db.add(token)
    db.commit()
    return RedirectResponse(f"/admin/tokens/{token.id}", status_code=302)


@router.get("/tokens/{token_id}")
async def token_detail(
    token_id: int,
    request: Request,
    success: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    token = db.query(ActivationToken).filter(ActivationToken.id == token_id).first()
    if not token:
        return RedirectResponse("/admin/tokens?error=Token+not+found", status_code=302)
    activation_url = f"{settings.BASE_URL}/activate?token={token.token}"
    return templates.TemplateResponse(
        request, "token_detail.html",
        {**_ctx(request, db), "active_page": "tokens",
         "token": token, "activation_url": activation_url, "success": success},
    )


@router.post("/tokens/{token_id}/revoke")
async def token_revoke(
    token_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    token = db.query(ActivationToken).filter(ActivationToken.id == token_id).first()
    if token and token.status == "pending":
        token.status = "revoked"
        db.commit()
    return RedirectResponse(f"/admin/tokens/{token_id}?success=Token+revoked", status_code=302)


# Licenses

@router.get("/licenses")
async def licenses_list(
    request: Request,
    success: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    licenses = db.query(License).order_by(License.activated_at.desc()).all()
    return templates.TemplateResponse(
        request, "licenses.html",
        {**_ctx(request, db), "active_page": "licenses",
         "licenses": licenses, "success": success, "error": error},
    )


@router.post("/licenses/{license_id}/deactivate")
async def license_deactivate(
    license_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user, redir = _guard(request, db)
    if redir:
        return redir
    lic = db.query(License).filter(License.id == license_id).first()
    if lic and lic.is_active:
        lic.is_active = False
        lic.deactivated_at = datetime.utcnow()
        db.commit()
    return RedirectResponse("/admin/licenses?success=License+deactivated", status_code=302)
