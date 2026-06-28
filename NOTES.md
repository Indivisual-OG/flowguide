# FlowGuide — Project Notes

## What is FlowGuide?
A modular, locally-running daily ritual app inspired by guided meditation.
It walks the user through a sequence of personal modules at the start and/or end of the workday.
Built for Linux. All data is stored locally — no cloud, no subscriptions.

---

## Tech Stack
- **Frontend:** React 18 + Vite + TailwindCSS + @dnd-kit (drag and drop)
- **Backend:** Python + FastAPI + SQLite (via SQLAlchemy async)
- **Styling:** Custom calm green (`flow`) + grey (`mist`) Tailwind palette
- **Font:** Inter (Google Fonts)

---

## How to Run
```bash
cd flowguide
./start.sh
# Opens at http://localhost:3000
```
The start script auto-creates the Python venv, installs all deps, and starts both servers.
- Backend: http://localhost:8000 (FastAPI, hot-reload)
- Frontend: http://localhost:3000 (Vite dev server, hot-reload)

---

## Data Storage
All data lives in `~/.flowguide/` on the user's machine:
| File | Contents |
|---|---|
| `flowguide.db` | SQLite database (all modules) |
| `receipts/` | Uploaded receipt files |
| `google_token.json` | Google Calendar OAuth token |
| `google_credentials.json` | Google Cloud credentials (user must supply) |
| `imported_ical.json` | Last imported iCal/Outlook events |

---

## Project Structure
```
flowguide/
├── start.sh                        # One-command startup script
├── backend/
│   ├── main.py                     # FastAPI app, router registration
│   ├── database.py                 # SQLAlchemy models + DB init
│   ├── requirements.txt            # Python dependencies (use >= versions for Python 3.14+)
│   └── modules/
│       ├── settings.py             # App-wide settings (key/value store)
│       ├── intention.py            # Intention, mood, energy, breathing, yoga + history/stats endpoints
│       ├── todo.py                 # To-do list with drag-and-drop reorder
│       ├── notepad.py              # Tagged notes / knowledge base
│       ├── receipts.py             # Receipt upload, OCR, categorisation
│       ├── contacts.py             # Contacts, birthdays, vCard import
│       └── calendar_module.py      # Google Calendar + iCal/ICS import
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Router + layout shell
│   │   ├── main.jsx                # React entry point
│   │   ├── utils/api.js            # All API calls (axios)
│   │   ├── styles/index.css        # Tailwind base + component classes
│   │   └── components/
│   │       ├── DashboardPage.jsx   # Home screen with widgets
│   │       ├── TourPage.jsx        # Tour engine (sequences modules)
│   │       ├── HistoryPage.jsx     # Journal history, mood/energy charts, entry timeline
│   │       ├── SettingsPage.jsx    # Module order, enable/disable, tour times
│   │       ├── layout/Sidebar.jsx  # Left nav sidebar
│   │       └── modules/
│   │           ├── IntentionModule.jsx
│   │           ├── CalendarModule.jsx
│   │           ├── TodoModule.jsx
│   │           ├── NotepadModule.jsx
│   │           ├── ReceiptsModule.jsx
│   │           └── ContactsModule.jsx
└── scheduler/
    ├── flowguide_scheduler.py      # Watches clock, opens browser at tour times
    └── install_service.sh          # Installs scheduler as systemd user service
```

---

## Modules Built

### Intention & Mindfulness
- Morning / evening greeting based on time of day
- Mood check-in (emoji scale 1–5)
- Energy check-in (emoji scale 1–5)
- Free-text intention / reflection field
- Random inspirational quote
- Breathing exercise timer (Box Breathing, 4-7-8, etc.) with animated circle
- Yoga/movement suggestion
- Data saved per day + tour type, history stored in DB

### Calendar
- Google Calendar integration (OAuth 2.0 — requires credentials.json from Google Cloud Console)
- iCal / ICS file import (Outlook, Apple Calendar, any service)
- Shows next 7 days of events
- Auth flow: get URL → open in browser → paste code back

### To-Do List
- Add tasks with priority (low / normal / high)
- Drag-and-drop reorder (@dnd-kit)
- Toggle complete / incomplete
- Pending and completed sections
- Shared list support (via shared_key — UI not yet built)

### Knowledge Notepad
- Create / edit / delete notes
- Auto-save while typing (800ms debounce)
- Comma-separated tags
- Filter by tag or full-text search
- Shows preview + last-edited time

### Receipt Tracker
- Upload PDF or image (PNG, JPG, JPEG, WEBP)
- OCR text extraction via pytesseract (Tesseract) + pdfplumber
- Heuristic parsing: merchant name, amount, currency, date
- Manual correction of parsed fields
- Category assignment (12 preset categories)
- Spending summary with bar chart per category
- Receipt files stored in ~/.flowguide/receipts/

### Contacts & Birthdays
- Full contact book (name, email, phone, birthday, notes)
- Birthday countdown (days until next birthday)
- Upcoming birthdays banner (next 60 days)
- Import from .vcf vCard file (supports v2.1, v3.0, v4.0)
- Multi-card .vcf files supported (e.g. full phone export)
- Duplicate detection on import (skips by name match)
- Encoding: UTF-8 with latin-1 fallback

---

## Settings
Stored as key/value rows in SQLite `settings` table.
| Key | Description |
|---|---|
| `morning_time` | e.g. "08:00" |
| `evening_time` | e.g. "17:30" |
| `morning_enabled` | "true" / "false" |
| `evening_enabled` | "true" / "false" |
| `module_order` | JSON array of module IDs |
| `enabled_modules` | JSON array of enabled module IDs |

---

## Known Issues / Things to Watch
- **Python 3.14+:** requirements.txt uses `>=` version pins (not `==`) to ensure compatibility with very new Python versions
- **pytesseract** requires system package: `sudo apt install tesseract-ocr`
- **Google Calendar** requires manually placing `google_credentials.json` at `~/.flowguide/google_credentials.json`
- **ContactForm** must remain defined *outside* the ContactsModule component to prevent focus-loss on keystroke (React remount issue)

---

## Ideas / Backlog
These have been discussed but not yet built:

- **Daily Briefing module** — weather API + news digest
- ~~**Mood & Energy charts**~~ Done — see History page
- **Shared To-Do** — share a list with another person via URL/key
- **Dark mode** — calmer evening theme
- **Mobile-responsive layout** — use from phone on same network
- **Desktop notifications** — nudge at tour time instead of opening browser
- **Custom Link Launcher module** — open favourite apps/URLs at tour start
- **Energy Check-In module** — standalone mood/energy tracker with history chart

---

## User Preferences
- Calm, minimal UI — no clutter
- Local-first — no mandatory cloud services
- Linux (currently), may expand to other platforms later
- Python 3.14 installed on system
- Google account available for Calendar integration
