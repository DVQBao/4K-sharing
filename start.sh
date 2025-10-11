#!/bin/bash
# Netflix Guest Sharing - Quick Start Script
# Author: Claude & Human
# Description: Start local web server and open browser

echo ""
echo "========================================"
echo "  Netflix Guest Sharing - Quick Start"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python3 not found! Please install Python first."
    exit 1
fi

echo "[1/3] Python found: OK"
echo ""

# Start web server
echo "[2/3] Starting web server on http://localhost:8000..."
echo ""
echo "> python3 -m http.server 8000"
echo ""

# Open browser (works on macOS/Linux)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000 &
    xdg-open http://localhost:8000/test-extension.html &
elif command -v open &> /dev/null; then
    open http://localhost:8000 &
    open http://localhost:8000/test-extension.html &
fi

echo "[3/3] Browser opened!"
echo ""
echo "========================================"
echo "  Web App: http://localhost:8000"
echo "  Test Page: http://localhost:8000/test-extension.html"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000

