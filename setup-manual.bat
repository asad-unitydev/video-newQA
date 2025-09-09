@echo off
echo ========================================
echo AI Video QA - Manual Setup for Windows
echo ========================================
echo.

echo Step 1: Installing Required Software
echo.
echo You need to install the following:
echo.
echo 1. Python 3.11+ (INSTALLED ✓)
echo 2. Node.js 18+ (Download from: https://nodejs.org/)
echo 3. FFmpeg (Download from: https://ffmpeg.org/download.html)
echo 4. Redis (Optional - for background processing)
echo.
echo Press any key to continue with Python backend setup...
pause >nul

echo.
echo ========================================
echo Setting up Python Backend
echo ========================================

cd backend

echo Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install Python dependencies
    echo.
    echo Try running these commands manually:
    echo   cd backend
    echo   pip install flask flask-cors
    echo   pip install moviepy pydub librosa pyloudnorm opencv-python numpy
    echo   pip install pillow weasyprint markdown python-dotenv
    echo.
    pause
    exit /b 1
)

echo.
echo Python backend setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Install Node.js from: https://nodejs.org/
echo 2. Install FFmpeg from: https://ffmpeg.org/download.html
echo 3. Add FFmpeg to your system PATH
echo.
echo Then run:
echo   .\run-manual.bat
echo.
pause

