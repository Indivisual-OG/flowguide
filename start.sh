#!/bin/bash
# FlowGuide — Start script
# Starts both backend and frontend dev server

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🌿 Starting FlowGuide…"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required. Please install it first."
  exit 1
fi

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "📦 Node.js not found. Installing…"
  sudo apt-get install -y nodejs npm || {
    echo "❌ Could not install Node.js. Please run: sudo apt install nodejs npm"
    exit 1
  }
fi

# Check npm (may be missing even if node is installed)
if ! command -v npm &>/dev/null; then
  echo "📦 npm not found. Installing…"
  sudo apt-get install -y npm || {
    echo "❌ Could not install npm. Please run: sudo apt install npm"
    exit 1
  }
fi

# Check python3-venv is available
if ! python3 -m venv --help &>/dev/null; then
  echo "📦 python3-venv not found. Installing…"
  sudo apt-get install -y python3-venv || {
    echo "❌ Could not install python3-venv. Please run: sudo apt install python3-venv"
    exit 1
  }
fi

# Install backend deps if needed
cd "$SCRIPT_DIR/backend"

# Remove broken venv if activate script is missing
if [ -d ".venv" ] && [ ! -f ".venv/bin/activate" ]; then
  echo "🔧 Removing incomplete virtual environment…"
  rm -rf .venv
fi

if [ ! -d ".venv" ]; then
  echo "📦 Creating Python virtual environment…"
  python3 -m venv .venv
fi

# Verify venv was created properly
if [ ! -f ".venv/bin/activate" ]; then
  echo "❌ Failed to create virtual environment. Try: sudo apt install python3-venv"
  exit 1
fi

source .venv/bin/activate
pip install -q -r requirements.txt

# Install frontend deps if needed
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies…"
  npm install
fi

# Start backend
cd "$SCRIPT_DIR/backend"
source .venv/bin/activate
echo "🔧 Starting backend on http://localhost:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd "$SCRIPT_DIR/frontend"
echo "🎨 Starting frontend on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ FlowGuide is running!"
echo "   Open: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'FlowGuide stopped.'" EXIT

wait
