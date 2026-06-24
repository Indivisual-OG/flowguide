#!/usr/bin/env python3
"""
FlowGuide Scheduler — opens FlowGuide in browser at configured times.
Run as a background service: python flowguide_scheduler.py &
Or install as a systemd service using install_service.sh
"""
import json, os, subprocess, time, sqlite3
from datetime import datetime

DB_PATH = os.path.expanduser("~/.flowguide/flowguide.db")


def get_settings():
    if not os.path.exists(DB_PATH):
        return {}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("SELECT key, value FROM settings")
    s = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return s


def open_browser():
    url = "http://localhost:8000/tour"
    try:
        subprocess.Popen(["xdg-open", url],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        try:
            subprocess.Popen(["firefox", url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            subprocess.Popen(["chromium-browser", url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def check_and_trigger():
    s = get_settings()
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    if s.get("morning_enabled") == "true":
        if current_time == s.get("morning_time", "08:00"):
            print(f"[{now}] Opening morning tour…")
            open_browser()

    if s.get("evening_enabled") == "true":
        if current_time == s.get("evening_time", "17:30"):
            print(f"[{now}] Opening evening tour…")
            open_browser()


def main():
    print("FlowGuide Scheduler running. Press Ctrl+C to stop.")
    last_minute = ""
    while True:
        current_minute = datetime.now().strftime("%H:%M")
        if current_minute != last_minute:
            last_minute = current_minute
            check_and_trigger()
        time.sleep(10)


if __name__ == "__main__":
    main()
