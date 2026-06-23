from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Server, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import ServerOut, ServerCreate, ServerUpdateStatus, MessageResponse

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("", response_model=list[ServerOut])
async def list_servers(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Server).order_by(Server.created_at.desc()).all()


@router.post("", response_model=ServerOut, status_code=201)
async def create_server(
    body: ServerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    server = Server(
        name=body.name.strip(),
        provider=body.provider.strip() or None,
        ip_address=body.ip_address.strip() or None,
        cpu=body.cpu.strip() or None,
        ram=body.ram.strip() or None,
        storage=body.storage.strip() or None,
        operating_system=body.operating_system.strip() or None,
        purpose=body.purpose.strip() or None,
        status=body.status.strip(),
        notes=body.notes.strip() or None,
    )
    db.add(server)
    db.flush()
    log_action(db, current_user, "create_server", get_client_ip(request), "server", server.id, server.name)
    db.commit()
    db.refresh(server)
    return server


@router.patch("/{server_id}/status", response_model=ServerOut)
async def update_server_status(
    server_id: int,
    body: ServerUpdateStatus,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server.status = body.status
    log_action(db, current_user, "update_server_status", get_client_ip(request), "server", server_id, server.name, {"status": body.status})
    db.commit()
    db.refresh(server)
    return server


@router.delete("/{server_id}", response_model=MessageResponse)
async def delete_server(
    server_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    log_action(db, current_user, "delete_server", get_client_ip(request), "server", server_id, server.name)
    db.delete(server)
    db.commit()
    return {"message": "Server deleted"}
