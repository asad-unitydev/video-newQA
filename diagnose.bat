@echo off
echo ========================================
echo AI Video QA System - Diagnostics
echo ========================================
echo.

echo Checking system requirements...
echo.

:: Check Python
echo [1/7] Checking Python...
python --version 2>nul
if %errorlevel% equ 0 (
    echo   ✅ Python is installed
    python --version
) else (
    echo   ❌ Python is not installed or not in PATH
    echo      Download from: https://www.python.org/
)
echo.

:: Check Node.js
echo [2/7] Checking Node.js...
node --version 2>nul
if %errorlevel% equ 0 (
    echo   ✅ Node.js is installed
    node --version
) else (
    echo   ❌ Node.js is not installed
    echo      Download from: https://nodejs.org/
)
echo.

:: Check npm
echo [3/7] Checking npm...
npm --version 2>nul
if %errorlevel% equ 0 (
    echo   ✅ npm is installed
    npm --version
) else (
    echo   ❌ npm is not installed (comes with Node.js)
)
echo.

:: Check Docker
echo [4/7] Checking Docker...
docker --version 2>nul
if %errorlevel% equ 0 (
    echo   ✅ Docker is installed
    docker --version
    
    :: Check if Docker is running
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo   ✅ Docker is running
    ) else (
        echo   ⚠️  Docker is installed but not running
        echo      Please start Docker Desktop
    )
) else (
    echo   ❌ Docker is not installed
    echo      Download from: https://www.docker.com/products/docker-desktop/
)
echo.

:: Check FFmpeg
echo [5/7] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ FFmpeg is installed
    ffmpeg -version 2>&1 | findstr "ffmpeg version"
) else (
    echo   ❌ FFmpeg is not installed
    echo      Download from: https://ffmpeg.org/download.html
    echo      Or install with: winget install ffmpeg
)
echo.

:: Check Python packages
echo [6/7] Checking Python packages...
cd backend 2>nul
if exist requirements.txt (
    echo   📦 Checking Flask...
    python -c "import flask; print('   ✅ Flask:', flask.__version__)" 2>nul || echo   ❌ Flask not installed
    
    echo   📦 Checking NumPy...
    python -c "import numpy; print('   ✅ NumPy:', numpy.__version__)" 2>nul || echo   ❌ NumPy not installed
    
    echo   📦 Checking OpenCV...
    python -c "import cv2; print('   ✅ OpenCV:', cv2.__version__)" 2>nul || echo   ❌ OpenCV not installed
    
    echo   📦 Checking MoviePy...
    python -c "import moviepy; print('   ✅ MoviePy: installed')" 2>nul || echo   ❌ MoviePy not installed
) else (
    echo   ⚠️  requirements.txt not found in backend directory
)
cd .. 2>nul
echo.

:: Check frontend packages
echo [7/7] Checking Frontend packages...
cd frontend 2>nul
if exist package.json (
    if exist node_modules (
        echo   ✅ Frontend dependencies are installed
    ) else (
        echo   ❌ Frontend dependencies not installed
        echo      Run: cd frontend && npm install
    )
) else (
    echo   ⚠️  package.json not found in frontend directory
)
cd .. 2>nul
echo.

echo ========================================
echo Diagnostic Summary
echo ========================================
echo.
echo Based on the checks above, here are your options:
echo.
echo 🐳 DOCKER OPTION (Recommended):
echo   - Install Docker Desktop if not already installed
echo   - Run: .\start.bat start
echo   - This handles all dependencies automatically
echo.
echo 🛠️ MANUAL OPTION:
echo   1. Install missing software (Node.js, FFmpeg)
echo   2. Install Python packages: cd backend && pip install -r requirements.txt
echo   3. Install frontend packages: cd frontend && npm install
echo   4. Run backend: cd backend && python app_simple.py
echo   5. Run frontend: cd frontend && npm run dev
echo.
echo 🧪 BACKEND-ONLY TESTING:
echo   1. Install basic packages: cd backend && pip install flask flask-cors numpy
echo   2. Run test server: python test_server.py
echo   3. Visit: http://localhost:5000/api/health
echo.
echo For detailed instructions, see: SETUP_GUIDE.md
echo.
pause

