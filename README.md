This little tool was conceived on a rainy afternoon - and represents a little first exercise using AI (Claude!) for coding - I am a total n00b, but within 2 hours, I knew a LOT more, what syntax was, how to debug, and where attention needs to be directed. So cool, very creative in its own right, and truly educational :) I think, there is something to having AI meet me where I am at, and skills growing just like life growths - based on what is viable and feasible, instead of totally de novo :) Fabulous!

Enjoy!

--

# FlowGuide

**Your daily guided tour — a mindful, modular ritual for the start and end of your workday.**

FlowGuide walks you through a sequence of personal modules — like a guided meditation, but for your day. Each module is self-contained, optional, and reorderable.

---

## Modules

| Module | Description |
|---|---|
| **Intention & Mindfulness** | Set your daily intention, check your mood & energy, breathing timer, yoga suggestion |
| **Calendar** | Google Calendar sync + iCal/Outlook import |
| **To-Do List** | Drag-and-drop tasks with priorities |
| **Knowledge Notepad** | Tagged notes, auto-save, full-text search |
| **Receipt Tracker** | Upload PDF/photo → OCR extraction → categorise → spending summary |
| **Contacts & Birthdays** | Contact book with upcoming birthday alerts |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) `tesseract-ocr` for offline OCR: `sudo apt install tesseract-ocr`

### Install & Run

```bash
# Clone or extract FlowGuide
cd flowguide

# Make start script executable
chmod +x start.sh

# Start everything
./start.sh
```

Then open **http://localhost:3000** in your browser.

---

## Configuration

All settings are managed through the **Settings** page in the app:

- Enable/disable individual modules
- Drag modules to reorder them in your tour
- Set your morning and evening tour times
- Toggle morning/evening tours independently

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → Enable **Google Calendar API**
3. Create **OAuth 2.0 credentials** (Desktop app)
4. Download the JSON file and save it to:
   ```
   ~/.flowguide/google_credentials.json
   ```
5. In FlowGuide → Calendar module → click **Connect Google Calendar**
6. Authorize in browser → paste the code back into FlowGuide

---

## Auto-Launch Scheduler (Linux)

To have FlowGuide automatically open in your browser at your set times:

```bash
# Install as a systemd user service
chmod +x scheduler/install_service.sh
./scheduler/install_service.sh
```

This installs a lightweight background service that watches the clock and opens your browser at your configured tour times.

---

## Data Storage

All your data is stored **locally** on your machine:

| Data | Location |
|---|---|
| Database | `~/.flowguide/flowguide.db` |
| Receipts | `~/.flowguide/receipts/` |
| Google token | `~/.flowguide/google_token.json` |
| Imported iCal | `~/.flowguide/imported_ical.json` |

No data ever leaves your machine (except Google Calendar API calls if you connect it).

---

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Python + FastAPI + SQLite
- **Drag & Drop:** @dnd-kit
- **Calendar:** Google Calendar API + icalendar
- **OCR:** pytesseract (Tesseract) + pdfplumber

---

## Planned Modules

- Daily Briefing (weather + news digest)
- Spending Dashboard (extended analytics)
- Energy & Mood Tracker (charts over time)
- Custom Link Launcher (open your key apps)
- Shared To-Do (share a list with someone else)
