@echo off
REM Netflix Guest Sharing - Quick Start Script
REM Author: Claude & Human
REM Description: Start local web server and open browser

echo.
echo ========================================
echo   Netflix Guest Sharing - Quick Start
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python first.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Python found: OK
echo.

REM Start web server
echo [2/3] Starting web server on http://localhost:8000...
echo.
echo ^> python -m http.server 8000
echo.

start http://localhost:8000
start http://localhost:8000/test-extension.html

echo [3/3] Browser opened!
echo.
echo ========================================
echo   Web App: http://localhost:8000
echo   Test Page: http://localhost:8000/test-extension.html
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server 8000

