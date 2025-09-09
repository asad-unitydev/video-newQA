@echo off
echo ========================================
echo AI Video QA - Simple Backend Only
echo ========================================

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.11+ from: https://www.python.org/
    pause
    exit /b 1
)

echo.
echo [INFO] Starting simplified backend (no Redis/Celery required)...
echo.

cd backend

:: Create uploads directory
if not exist "uploads" mkdir uploads

:: Try to install basic dependencies if not already installed
echo [INFO] Checking Python dependencies...
python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing Flask...
    pip install flask flask-cors
)

python -c "import numpy" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing basic dependencies...
    pip install numpy pillow
)

echo.
echo [INFO] Backend will start on http://localhost:5000
echo [INFO] You can test it by visiting: http://localhost:5000/api/health
echo.
echo [WARNING] This simplified version has limitations:
echo   - No frontend UI (backend API only)
echo   - Limited video analysis (some features may not work without FFmpeg)
echo   - No background job processing
echo.
echo [INFO] For full functionality, please install Docker and use: .\start.bat start
echo.
echo Press any key to continue...
pause >nul

echo.
echo [INFO] Starting Flask development server...
echo [INFO] Press Ctrl+C to stop
echo.

python app_simple.py

