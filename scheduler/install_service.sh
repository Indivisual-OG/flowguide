#!/bin/bash
# Installs FlowGuide Scheduler as a systemd user service on Linux

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$HOME/.config/systemd/user"
mkdir -p "$SERVICE_DIR"

cat > "$SERVICE_DIR/flowguide-scheduler.service" <<EOF
[Unit]
Description=FlowGuide Scheduler — auto-opens tours at configured times
After=network.target

[Service]
Type=simple
ExecStart=$(which python3) $SCRIPT_DIR/flowguide_scheduler.py
Restart=always
RestartSec=30
Environment=DISPLAY=:0

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable flowguide-scheduler.service
systemctl --user start  flowguide-scheduler.service

echo "✅ FlowGuide Scheduler installed and started."
echo "   Check status: systemctl --user status flowguide-scheduler"
echo "   View logs:    journalctl --user -u flowguide-scheduler -f"
