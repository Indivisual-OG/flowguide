"""Calendar module — Google Calendar + iCal/ICS import."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import os, json
from datetime import datetime, date, timedelta

from database import get_db, Settings

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

CREDENTIALS_PATH = os.path.expanduser("~/.flowguide/google_credentials.json")
TOKEN_PATH       = os.path.expanduser("~/.flowguide/google_token.json")
os.makedirs(os.path.expanduser("~/.flowguide"), exist_ok=True)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


def _get_google_service():
    """Return an authenticated Google Calendar service, or None."""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = None
        if os.path.exists(TOKEN_PATH):
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(TOKEN_PATH, "w") as f:
                    f.write(creds.to_json())
            else:
                return None
        return build("calendar", "v3", credentials=creds)
    except Exception:
        return None


@router.get("/auth/status")
async def auth_status():
    service = _get_google_service()
    has_creds = os.path.exists(CREDENTIALS_PATH)
    return {
        "authenticated": service is not None,
        "has_credentials_file": has_creds,
        "credentials_path": CREDENTIALS_PATH,
    }


@router.get("/auth/url")
async def get_auth_url():
    """Generate OAuth URL for Google Calendar."""
    if not os.path.exists(CREDENTIALS_PATH):
        raise HTTPException(400,
            f"Google credentials file not found at {CREDENTIALS_PATH}. "
            "Please download it from Google Cloud Console and place it there.")
    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(CREDENTIALS_PATH, scopes=SCOPES,
            redirect_uri="urn:ietf:wg:oauth:2.0:oob")
        auth_url, _ = flow.authorization_url(prompt="consent")
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/auth/callback")
async def auth_callback(payload: dict):
    """Exchange auth code for tokens."""
    code = payload.get("code")
    if not code:
        raise HTTPException(400, "Missing code")
    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(CREDENTIALS_PATH, scopes=SCOPES,
            redirect_uri="urn:ietf:wg:oauth:2.0:oob")
        flow.fetch_token(code=code)
        creds = flow.credentials
        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())
        return {"status": "authenticated"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/events")
async def get_events(days_ahead: int = 7):
    """Fetch upcoming calendar events."""
    service = _get_google_service()
    if not service:
        return {"events": [], "source": "none", "error": "Not authenticated with Google Calendar"}

    now = datetime.utcnow().isoformat() + "Z"
    end = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + "Z"

    try:
        result = service.events().list(
            calendarId="primary", timeMin=now, timeMax=end,
            maxResults=20, singleEvents=True, orderBy="startTime"
        ).execute()
        events = result.get("items", [])
        formatted = []
        for e in events:
            start = e["start"].get("dateTime", e["start"].get("date"))
            end_t = e["end"].get("dateTime", e["end"].get("date"))
            formatted.append({
                "id": e.get("id"), "title": e.get("summary", "(No title)"),
                "start": start, "end": end_t,
                "location": e.get("location"), "description": e.get("description"),
                "all_day": "T" not in str(start),
            })
        return {"events": formatted, "source": "google"}
    except Exception as e:
        return {"events": [], "source": "google", "error": str(e)}


ICAL_STORE_PATH = os.path.expanduser("~/.flowguide/imported_ical.json")


@router.post("/import/ical")
async def import_ical(file: UploadFile = File(...)):
    """Parse and store an .ics file."""
    content = await file.read()
    try:
        from icalendar import Calendar
        cal = Calendar.from_ical(content)
        events = []
        today = date.today()
        for component in cal.walk():
            if component.name == "VEVENT":
                dtstart = component.get("DTSTART")
                dtend   = component.get("DTEND")
                summary = str(component.get("SUMMARY", "(No title)"))
                start   = dtstart.dt if dtstart else None
                end_t   = dtend.dt   if dtend   else None
                # Normalise to string
                start_str = start.isoformat() if start else None
                end_str   = end_t.isoformat() if end_t else None
                # Only keep future events
                if start:
                    start_date = start if isinstance(start, date) else start.date()
                    if start_date >= today:
                        events.append({
                            "title": summary,
                            "start": start_str,
                            "end": end_str,
                            "location": str(component.get("LOCATION", "")),
                            "description": str(component.get("DESCRIPTION", "")),
                            "all_day": not hasattr(start, "hour"),
                        })
        events.sort(key=lambda x: x["start"] or "")
        with open(ICAL_STORE_PATH, "w") as f:
            json.dump(events, f)
        return {"imported": len(events), "events": events[:10]}
    except Exception as e:
        raise HTTPException(400, f"Failed to parse iCal file: {e}")


@router.get("/events/ical")
async def get_ical_events():
    """Return previously imported iCal events."""
    if not os.path.exists(ICAL_STORE_PATH):
        return {"events": [], "source": "ical"}
    with open(ICAL_STORE_PATH) as f:
        events = json.load(f)
    return {"events": events, "source": "ical"}
