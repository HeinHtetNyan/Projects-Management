from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Deployment, Project, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import DeploymentOut, DeploymentCreate, MessageResponse

router = APIRouter(prefix="/api/deployments", tags=["deployments"])


@router.get("", response_model=list[DeploymentOut])
async def list_deployments(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Deployment).order_by(Deployment.deployed_at.desc()).all()


@router.post("", response_model=DeploymentOut, status_code=201)
async def create_deployment(
    body: DeploymentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    deployment = Deployment(
        project_id=body.project_id,
        environment=body.environment.strip(),
        version=body.version.strip() or None,
        deployed_by=body.deployed_by.strip() or current_user.username,
        status=body.status.strip(),
        release_notes=body.release_notes.strip() or None,
    )
    db.add(deployment)
    db.flush()

    project_name = None
    if body.project_id:
        p = db.query(Project).filter(Project.id == body.project_id).first()
        project_name = p.name if p else None

    log_action(
        db, current_user, "create_deployment", get_client_ip(request),
        "deployment", deployment.id, project_name or "N/A",
        {"env": body.environment, "version": body.version},
    )
    db.commit()
    db.refresh(deployment)
    return deployment


@router.delete("/{deployment_id}", response_model=MessageResponse)
async def delete_deployment(
    deployment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    log_action(db, current_user, "delete_deployment", get_client_ip(request), "deployment", deployment_id)
    db.delete(dep)
    db.commit()
    return {"message": "Deployment deleted"}
