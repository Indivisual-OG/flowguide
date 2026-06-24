"""
FlowGuide - Database setup and models
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, JSON
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

DB_PATH = os.environ.get("FLOWGUIDE_DB", os.path.expanduser("~/.flowguide/flowguide.db"))
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


# ── Models ──────────────────────────────────────────────────────────────────

class Settings(Base):
    __tablename__ = "settings"
    id          = Column(Integer, primary_key=True, index=True)
    key         = Column(String, unique=True, index=True, nullable=False)
    value       = Column(Text, nullable=True)


class TodoItem(Base):
    __tablename__ = "todo_items"
    id          = Column(Integer, primary_key=True, index=True)
    text        = Column(Text, nullable=False)
    completed   = Column(Boolean, default=False)
    priority    = Column(String, default="normal")   # low / normal / high
    shared_key  = Column(String, nullable=True)       # for shared lists
    position    = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Note(Base):
    __tablename__ = "notes"
    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String, nullable=False, default="Untitled")
    content     = Column(Text, default="")
    tags        = Column(String, default="")          # comma-separated
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Receipt(Base):
    __tablename__ = "receipts"
    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String, nullable=False)
    merchant    = Column(String, nullable=True)
    amount      = Column(Float, nullable=True)
    currency    = Column(String, default="EUR")
    date        = Column(String, nullable=True)
    category    = Column(String, default="Uncategorised")
    raw_text    = Column(Text, nullable=True)
    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class Contact(Base):
    __tablename__ = "contacts"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    email       = Column(String, nullable=True)
    phone       = Column(String, nullable=True)
    birthday    = Column(String, nullable=True)       # MM-DD or YYYY-MM-DD
    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IntentionLog(Base):
    __tablename__ = "intention_log"
    id          = Column(Integer, primary_key=True, index=True)
    date        = Column(String, nullable=False)      # YYYY-MM-DD
    tour_type   = Column(String, default="morning")   # morning / evening
    intention   = Column(Text, nullable=True)
    mood        = Column(Integer, nullable=True)      # 1-5
    energy      = Column(Integer, nullable=True)      # 1-5
    reflection  = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed default settings if not present
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        defaults = {
            "morning_time": "08:00",
            "evening_time": "17:30",
            "morning_enabled": "true",
            "evening_enabled": "true",
            "module_order": '["intention","calendar","todo","notepad","receipts","contacts"]',
            "enabled_modules": '["intention","calendar","todo","notepad","receipts","contacts"]',
            "google_calendar_enabled": "false",
            "theme": "calm",
        }
        for key, value in defaults.items():
            result = await session.execute(select(Settings).where(Settings.key == key))
            if not result.scalar_one_or_none():
                session.add(Settings(key=key, value=value))
        await session.commit()
