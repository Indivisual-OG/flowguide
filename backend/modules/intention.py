"""Intention & Mindfulness module."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db, IntentionLog

router = APIRouter(prefix="/api/intention", tags=["intention"])


class IntentionCreate(BaseModel):
    date: Optional[str] = None
    tour_type: Optional[str] = "morning"
    intention: Optional[str] = None
    mood: Optional[int] = None
    energy: Optional[int] = None
    reflection: Optional[str] = None


@router.get("/today")
async def get_today(tour_type: str = "morning", db: AsyncSession = Depends(get_db)):
    today = date.today().isoformat()
    result = await db.execute(
        select(IntentionLog)
        .where(IntentionLog.date == today, IntentionLog.tour_type == tour_type)
        .order_by(desc(IntentionLog.id))
    )
    row = result.scalar_one_or_none()
    if row:
        return {
            "id": row.id, "date": row.date, "tour_type": row.tour_type,
            "intention": row.intention, "mood": row.mood,
            "energy": row.energy, "reflection": row.reflection,
        }
    return {}


@router.post("")
async def save_intention(payload: IntentionCreate, db: AsyncSession = Depends(get_db)):
    today = date.today().isoformat()
    # Upsert for today
    result = await db.execute(
        select(IntentionLog)
        .where(
            IntentionLog.date == (payload.date or today),
            IntentionLog.tour_type == payload.tour_type
        )
    )
    row = result.scalar_one_or_none()
    if row:
        if payload.intention  is not None: row.intention  = payload.intention
        if payload.mood       is not None: row.mood       = payload.mood
        if payload.energy     is not None: row.energy     = payload.energy
        if payload.reflection is not None: row.reflection = payload.reflection
    else:
        row = IntentionLog(
            date=payload.date or today,
            tour_type=payload.tour_type,
            intention=payload.intention,
            mood=payload.mood,
            energy=payload.energy,
            reflection=payload.reflection,
        )
        db.add(row)
    await db.commit()
    return {"status": "saved", "id": row.id}


@router.get("/history")
async def get_history(limit: int = 90, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IntentionLog).order_by(desc(IntentionLog.date), desc(IntentionLog.id)).limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id, "date": r.date, "tour_type": r.tour_type,
            "intention": r.intention, "mood": r.mood,
            "energy": r.energy, "reflection": r.reflection,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/history/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate stats: avg mood, avg energy, total entries, streak."""
    from sqlalchemy import func
    result = await db.execute(
        select(
            func.count(IntentionLog.id),
            func.avg(IntentionLog.mood),
            func.avg(IntentionLog.energy),
            func.min(IntentionLog.date),
        )
    )
    row = result.one()
    count, avg_mood, avg_energy, first_date = row

    # Calculate current streak (consecutive days with at least one entry)
    all_dates_result = await db.execute(
        select(IntentionLog.date).order_by(desc(IntentionLog.date))
    )
    all_dates = sorted(set(r[0] for r in all_dates_result.all()), reverse=True)
    streak = 0
    check = date.today()
    for d in all_dates:
        if d == check.isoformat():
            streak += 1
            from datetime import timedelta
            check = check - timedelta(days=1)
        elif d < check.isoformat():
            break

    return {
        "total_entries": count,
        "avg_mood":   round(avg_mood, 1)   if avg_mood   else None,
        "avg_energy": round(avg_energy, 1) if avg_energy else None,
        "first_date": first_date,
        "streak_days": streak,
    }


BREATHING_EXERCISES = [
    {"name": "Box Breathing", "description": "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4×.", "duration": 64},
    {"name": "4-7-8 Breathing", "description": "Inhale 4s → Hold 7s → Exhale 8s. Repeat 3×.", "duration": 57},
    {"name": "Coherent Breathing", "description": "Inhale 5s → Exhale 5s. Repeat for 5 minutes.", "duration": 300},
    {"name": "Energising Breath", "description": "Quick inhale through nose → Long exhale through mouth. Repeat 10×.", "duration": 30},
]

YOGA_SUGGESTIONS = [
    {"name": "Morning Sun Salutation", "description": "5 rounds of Surya Namaskar to wake the body.", "duration": "10 min"},
    {"name": "Desk Stretch", "description": "Neck rolls, shoulder shrugs, seated spinal twist. Great between work sessions.", "duration": "5 min"},
    {"name": "Evening Wind-Down", "description": "Child's pose, supine twist, legs-up-the-wall. Calms the nervous system.", "duration": "10 min"},
    {"name": "Power Pose", "description": "Mountain pose, warrior I & II, tree pose. Build confidence and presence.", "duration": "7 min"},
]

QUOTES = [
    "Begin each day as if it were on purpose.",
    "The present moment is the only moment available to us.",
    "Your intention sets the direction of your day.",
    "Small consistent actions create extraordinary results.",
    "Breathe in calm. Breathe out tension.",
    "Every ending is a new beginning.",
]

import random

@router.get("/inspiration")
async def get_inspiration():
    return {
        "quote": random.choice(QUOTES),
        "breathing": random.choice(BREATHING_EXERCISES),
        "yoga": random.choice(YOGA_SUGGESTIONS),
    }
