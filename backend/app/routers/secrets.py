from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Secret, SecretVersion, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..crypto import encrypt_value, decrypt_value
from ..config import settings
from ..schemas import (
    SecretOut, SecretCreate, SecretRotate, SecretRevealed,
    SecretVersionOut, MessageResponse,
)

router = APIRouter(prefix="/api/secrets", tags=["secrets"])


@router.get("", response_model=list[SecretOut])
async def list_secrets(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Secret).order_by(Secret.created_at.desc()).all()


@router.post("", response_model=SecretOut, status_code=201)
async def create_secret(
    body: SecretCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    if not settings.ENCRYPTION_KEY:
        raise HTTPException(status_code=400, detail="ENCRYPTION_KEY not set on server")
    try:
        encrypted = encrypt_value(body.value.strip())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encryption failed: {str(e)[:80]}")

    secret = Secret(
        name=body.name.strip(),
        category=body.category.strip(),
        encrypted_value=encrypted,
        project_id=body.project_id,
        environment=body.environment.strip() or None,
        description=body.description.strip() or None,
        created_by=current_user.username,
    )
    db.add(secret)
    db.flush()
    log_action(db, current_user, "create_secret", get_client_ip(request), "secret", secret.id, secret.name, {"category": body.category})
    db.commit()
    db.refresh(secret)
    return secret


@router.post("/{secret_id}/reveal", response_model=SecretRevealed)
async def reveal_secret(
    secret_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    try:
        plaintext = decrypt_value(secret.encrypted_value)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decrypt failed: {str(e)[:80]}")
    log_action(db, current_user, "reveal_secret", get_client_ip(request), "secret", secret_id, secret.name)
    db.commit()
    return SecretRevealed(id=secret.id, name=secret.name, value=plaintext)


@router.post("/{secret_id}/rotate", response_model=SecretOut)
async def rotate_secret(
    secret_id: int,
    body: SecretRotate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    try:
        from datetime import datetime
        db.add(SecretVersion(
            secret_id=secret_id,
            encrypted_value=secret.encrypted_value,
            rotated_by=current_user.username,
        ))
        secret.encrypted_value = encrypt_value(body.new_value.strip())
        secret.rotated_at = datetime.utcnow()
        log_action(db, current_user, "rotate_secret", get_client_ip(request), "secret", secret_id, secret.name)
        db.commit()
        db.refresh(secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Rotation failed: {str(e)[:80]}")
    return secret


@router.delete("/{secret_id}", response_model=MessageResponse)
async def delete_secret(
    secret_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    log_action(db, current_user, "delete_secret", get_client_ip(request), "secret", secret_id, secret.name)
    db.delete(secret)
    db.commit()
    return {"message": "Secret deleted"}


@router.get("/{secret_id}/versions", response_model=list[SecretVersionOut])
async def list_versions(
    secret_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    return (
        db.query(SecretVersion)
        .filter(SecretVersion.secret_id == secret_id)
        .order_by(SecretVersion.created_at.desc())
        .all()
    )


@router.post("/{secret_id}/versions/{version_id}/restore", response_model=SecretOut)
async def restore_version(
    secret_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    from datetime import datetime
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    version = db.query(SecretVersion).filter(
        SecretVersion.id == version_id, SecretVersion.secret_id == secret_id
    ).first()
    if not secret or not version:
        raise HTTPException(status_code=404, detail="Secret or version not found")
    db.add(SecretVersion(
        secret_id=secret_id,
        encrypted_value=secret.encrypted_value,
        rotated_by=f"{current_user.username} (before restore)",
    ))
    secret.encrypted_value = version.encrypted_value
    secret.rotated_at = datetime.utcnow()
    log_action(db, current_user, "restore_secret_version", get_client_ip(request), "secret", secret_id, secret.name, {"version_id": version_id})
    db.commit()
    db.refresh(secret)
    return secret
