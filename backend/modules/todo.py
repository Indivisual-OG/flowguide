"""To-Do List module."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db, TodoItem

router = APIRouter(prefix="/api/todo", tags=["todo"])


class TodoCreate(BaseModel):
    text: str
    priority: Optional[str] = "normal"
    shared_key: Optional[str] = None


class TodoUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    position: Optional[int] = None


class ReorderRequest(BaseModel):
    ids: list[int]


@router.get("")
async def list_todos(shared_key: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(TodoItem).order_by(TodoItem.position, TodoItem.id)
    if shared_key:
        q = q.where(TodoItem.shared_key == shared_key)
    else:
        q = q.where(TodoItem.shared_key == None)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {"id": r.id, "text": r.text, "completed": r.completed,
         "priority": r.priority, "position": r.position,
         "created_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.post("")
async def create_todo(payload: TodoCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TodoItem).order_by(TodoItem.position.desc()).limit(1))
    last = result.scalar_one_or_none()
    position = (last.position + 1) if last else 0
    item = TodoItem(
        text=payload.text,
        priority=payload.priority,
        shared_key=payload.shared_key,
        position=position,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "text": item.text, "completed": item.completed,
            "priority": item.priority, "position": item.position}


@router.patch("/{item_id}")
async def update_todo(item_id: int, payload: TodoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TodoItem).where(TodoItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Todo not found")
    if payload.text      is not None: item.text      = payload.text
    if payload.completed is not None: item.completed = payload.completed
    if payload.priority  is not None: item.priority  = payload.priority
    if payload.position  is not None: item.position  = payload.position
    await db.commit()
    return {"status": "ok"}


@router.delete("/{item_id}")
async def delete_todo(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TodoItem).where(TodoItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Todo not found")
    await db.delete(item)
    await db.commit()
    return {"status": "deleted"}


@router.post("/reorder")
async def reorder_todos(payload: ReorderRequest, db: AsyncSession = Depends(get_db)):
    for pos, item_id in enumerate(payload.ids):
        result = await db.execute(select(TodoItem).where(TodoItem.id == item_id))
        item = result.scalar_one_or_none()
        if item:
            item.position = pos
    await db.commit()
    return {"status": "ok"}
