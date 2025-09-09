@echo off
echo ========================================
echo AI Video QA - Manual Run (No Docker)
echo ========================================

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.11+ from: https://www.python.org/
    pause
    exit /b 1
)

:: Check FFmpeg
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg not found in PATH
    echo The application may not work properly without FFmpeg
    echo Download from: https://ffmpeg.org/download.html
    echo.
    echo Continue anyway? (y/N)
    set /p "continue="
    if /i "!continue!" neq "y" (
        exit /b 1
    )
)

echo.
echo Starting Backend Server...
echo.

cd backend

:: Create uploads directory
if not exist "uploads" mkdir uploads

:: Set environment variables
set FLASK_APP=app.py
set FLASK_ENV=development
set FLASK_DEBUG=True

:: Start Flask server
echo Backend will start on http://localhost:5000
echo.
echo [INFO] Starting Flask development server...
echo [INFO] Press Ctrl+C to stop
echo.

python app.py

