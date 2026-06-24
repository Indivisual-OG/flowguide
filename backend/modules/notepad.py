"""Personal Knowledge Notepad module."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db, Note

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    title: Optional[str] = "Untitled"
    content: Optional[str] = ""
    tags: Optional[str] = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None


@router.get("")
async def list_notes(search: Optional[str] = None, tag: Optional[str] = None,
                     limit: int = 50, db: AsyncSession = Depends(get_db)):
    q = select(Note).order_by(desc(Note.updated_at)).limit(limit)
    if search:
        q = q.where(or_(
            Note.title.ilike(f"%{search}%"),
            Note.content.ilike(f"%{search}%"),
            Note.tags.ilike(f"%{search}%"),
        ))
    if tag:
        q = q.where(Note.tags.ilike(f"%{tag}%"))
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {"id": r.id, "title": r.title,
         "preview": r.content[:120] if r.content else "",
         "tags": r.tags, "updated_at": r.updated_at.isoformat()}
        for r in rows
    ]


@router.get("/{note_id}")
async def get_note(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    return {"id": note.id, "title": note.title, "content": note.content,
            "tags": note.tags, "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat()}


@router.post("")
async def create_note(payload: NoteCreate, db: AsyncSession = Depends(get_db)):
    note = Note(title=payload.title, content=payload.content, tags=payload.tags)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"id": note.id, "title": note.title, "status": "created"}


@router.patch("/{note_id}")
async def update_note(note_id: int, payload: NoteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    if payload.title   is not None: note.title   = payload.title
    if payload.content is not None: note.content = payload.content
    if payload.tags    is not None: note.tags    = payload.tags
    note.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "saved"}


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    await db.delete(note)
    await db.commit()
    return {"status": "deleted"}


@router.get("/tags/all")
async def get_all_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note.tags))
    all_tags = set()
    for (tags,) in result.all():
        if tags:
            for t in tags.split(","):
                t = t.strip()
                if t:
                    all_tags.add(t)
    return sorted(all_tags)
