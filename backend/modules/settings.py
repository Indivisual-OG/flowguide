"""Settings module — read/write app-wide configuration."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from database import get_db, Settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings))
    rows = result.scalars().all()
    data = {row.key: row.value for row in rows}
    # Parse JSON fields
    for k in ("module_order", "enabled_modules"):
        if k in data and data[k]:
            try:
                data[k] = json.loads(data[k])
            except Exception:
                pass
    return data


@router.patch("")
async def update_settings(payload: dict, db: AsyncSession = Depends(get_db)):
    for key, value in payload.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value)
        else:
            value = str(value)
        result = await db.execute(select(Settings).where(Settings.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            db.add(Settings(key=key, value=value))
    await db.commit()
    return {"status": "ok"}
