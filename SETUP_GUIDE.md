# AI Video QA Setup Guide for Windows (Without Docker)

## Current Status

✅ **Python 3.11.9** - Installed and working  
❌ **Docker** - Not installed  
❌ **Node.js** - Not installed  
❌ **FFmpeg** - Not installed  

## Quick Solutions

### Option 1: Install Docker (Recommended - Easiest)

1. **Download Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. **Install and start Docker Desktop**
3. **Run the application**:
   ```cmd
   .\start.bat start
   ```

### Option 2: Manual Setup (More Complex)

#### Step 1: Install Required Software

1. **Node.js 18+**: https://nodejs.org/
   - Download and install the LTS version
   - This is needed for the frontend

2. **FFmpeg**: https://ffmpeg.org/download.html
   - Download the Windows build
   - Extract to a folder (e.g., `C:\ffmpeg`)
   - Add `C:\ffmpeg\bin` to your system PATH

#### Step 2: Install Python Dependencies

```cmd
cd backend
pip install -r requirements.txt
```

If that fails, install individually:
```cmd
pip install flask flask-cors
pip install numpy pillow
pip install moviepy pydub librosa pyloudnorm opencv-python
pip install weasyprint markdown python-dotenv
```

#### Step 3: Install Frontend Dependencies

```cmd
cd frontend
npm install
```

#### Step 4: Start the Application

**Terminal 1 (Backend)**:
```cmd
cd backend
python app_simple.py
```

**Terminal 2 (Frontend)**:
```cmd
cd frontend
npm run dev
```

### Option 3: Backend-Only Testing

If you just want to test the backend API:

1. **Install basic dependencies**:
   ```cmd
   cd backend
   pip install flask flask-cors numpy pillow
   ```

2. **Start test server**:
   ```cmd
   python test_server.py
   ```

3. **Test in browser**: http://localhost:5000/api/health

## Common Issues and Solutions

### Issue 1: Python Dependencies Fail to Install

**Problem**: Some packages like `librosa` or `opencv-python` fail to install

**Solution**:
```cmd
# Install Microsoft Visual C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Or use conda instead of pip
conda install -c conda-forge librosa opencv
```

### Issue 2: FFmpeg Not Found

**Problem**: Video analysis fails with "FFmpeg not found"

**Solutions**:
1. **Install FFmpeg**:
   - Download from https://ffmpeg.org/download.html
   - Extract to `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to system PATH
   
2. **Or use Chocolatey** (if installed):
   ```cmd
   choco install ffmpeg
   ```

3. **Or use winget** (Windows 10+):
   ```cmd
   winget install ffmpeg
   ```

### Issue 3: Port Already in Use

**Problem**: "Port 5000 is already in use"

**Solution**:
```cmd
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue 4: CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**: Make sure both frontend and backend are running, and check the proxy settings in `frontend/vite.config.ts`

## Testing the Setup

### 1. Test Backend Only
```cmd
cd backend
python test_server.py
```
Visit: http://localhost:5000/api/health

### 2. Test Full Application (if all dependencies installed)
```cmd
# Terminal 1
cd backend
python app_simple.py

# Terminal 2  
cd frontend
npm run dev
```
Visit: http://localhost:3000

## Current Error Analysis

Based on the console output, here are the issues we've identified:

1. **Docker not installed** - Main deployment method unavailable
2. **Server startup issues** - Need to debug Python server startup
3. **Missing dependencies** - Some Python packages may not be installed

## Next Steps

1. **Choose your preferred option** from above
2. **Install missing dependencies** as needed
3. **Test the setup** using the testing methods
4. **Report any errors** for further troubleshooting

## Alternative: Use Docker (Simplest Solution)

If you want the full experience with minimal setup:

1. Install Docker Desktop for Windows
2. Run: `.\start.bat start`
3. Access: http://localhost:3000

This handles all dependencies automatically and is the recommended approach.

