from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Note, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import NoteOut, NoteCreate, NoteUpdate, MessageResponse

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
async def list_notes(
    project_id: Optional[int] = None,
    q: str = "",
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    query = db.query(Note)
    if project_id:
        query = query.filter(Note.project_id == project_id)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            (Note.title.ilike(like)) | (Note.content.ilike(like)) | (Note.tags.ilike(like))
        )
    return query.order_by(Note.updated_at.desc()).all()


@router.post("", response_model=NoteOut, status_code=201)
async def create_note(
    body: NoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    note = Note(
        title=body.title.strip(),
        content=body.content.strip(),
        project_id=body.project_id,
        tags=body.tags.strip() or None,
        created_by=current_user.username,
    )
    db.add(note)
    db.flush()
    log_action(db, current_user, "create_note", get_client_ip(request), "note", note.id, note.title)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    body: NoteUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.title = body.title.strip()
    note.content = body.content.strip()
    note.project_id = body.project_id
    note.tags = body.tags.strip() or None
    note.updated_at = datetime.utcnow()
    log_action(db, current_user, "update_note", get_client_ip(request), "note", note_id, note.title)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", response_model=MessageResponse)
async def delete_note(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    log_action(db, current_user, "delete_note", get_client_ip(request), "note", note_id, note.title)
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
