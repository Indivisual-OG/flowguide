"""
FlowGuide — Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import init_db
from modules import settings, intention, todo, notepad, receipts, contacts, calendar_module


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FlowGuide", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register module routers
app.include_router(settings.router)
app.include_router(intention.router)
app.include_router(todo.router)
app.include_router(notepad.router)
app.include_router(receipts.router)
app.include_router(contacts.router)
app.include_router(calendar_module.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "FlowGuide"}


# Serve built frontend if present
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_BUILD):
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="static")
